import type { Pool } from "pg";
import { createHash } from "node:crypto";
import { requireIsolatedE2EDatabaseUrl } from "./buyer-trust-fixtures";

export const CHECKOUT_READY_BUYER_ID = "22222222-2222-4222-8222-222222222222";
export const CHECKOUT_NEW_BUYER_ID = "33333333-3333-4333-8333-333333333333";
export const CHECKOUT_READY_BUYER_NIP = "0000000069";
export const CHECKOUT_NEW_BUYER_NIP = "0000000075";
export const CHECKOUT_SELLER_NIP = "0000000081";
export const CHECKOUT_OFFER_TITLE = "Checkout Synthetic Offer";
export const CHECKOUT_READY_BUYER_LEGAL_NAME = "LM Checkout Ready Buyer Przedsiębiorstwo Testowych Rozwiązań Magazynowych Sp. z o.o.";
export const CHECKOUT_READY_BUYER_INVOICE_ADDRESS = {
  street: "Testowa Aleja Przemysłowych Rozwiązań Magazynowych i Logistycznych",
  buildingNumber: "12",
  unitNumber: "3",
  postalCode: "00-001",
  city: "Warszawa",
  countryCode: "PL",
} as const;
export const CHECKOUT_SELLER_NAME = "LM Checkout Synthetic Seller";

/** These rows belong exclusively to the classified, disposable Browser E2E database. */
export async function createBuyerCheckoutSellerFixture(database: Pool) {
  requireIsolatedE2EDatabaseUrl();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const conflictingEvidence = await client.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM partner_agreement_execution_evidence WHERE external_platform != 'LM_E2E_TEST'",
    );
    if (conflictingEvidence.rows[0].count !== 0) {
      throw new Error("STOP_TEST_FIXTURE_CONFLICT: non-test agreement evidence exists");
    }

    // The one-worker E2E suite may have left a different synthetic version active.
    // Leave every version without explicitly marked E2E evidence untouched.
    await client.query(`
      UPDATE agreement_versions
      SET status = 'archived',
          effective_to = COALESCE(effective_to, CURRENT_TIMESTAMP + interval '1 minute')
      WHERE status = 'active'
        AND id IN (
          SELECT agreement_version_id
          FROM partner_agreement_execution_evidence
          WHERE external_platform = 'LM_E2E_TEST'
        )
    `);
    const remainingActive = await client.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM agreement_versions WHERE agreement_type = 'partner_agreement_b2b' AND status = 'active'",
    );
    if (remainingActive.rows[0].count !== 0) {
      throw new Error("STOP_TEST_FIXTURE_CONFLICT: active agreement is not E2E-owned");
    }

    const category = await client.query<{ id: string }>("SELECT id FROM categories ORDER BY id LIMIT 1");
    const categoryId = category.rows[0]?.id ?? (await client.query<{ id: string }>(
      "INSERT INTO categories (name, slug) VALUES ('Checkout Test Category', 'checkout-test-category') RETURNING id",
    )).rows[0].id;
    const companyName = CHECKOUT_SELLER_NAME;
    const partner = await client.query<{ id: string }>(
      "INSERT INTO partners (company_name, contact_email) VALUES ($1, 'seller@checkout.example.invalid') RETURNING id",
      [companyName],
    );
    const partnerId = partner.rows[0].id;
    await client.query(
      "INSERT INTO seller_legal_identities (partner_id, legal_name, jurisdiction_country, verification_status, registered_address_line1, registered_postal_code, registered_city, registered_country_code) VALUES ($1, $2, 'PL', 'verified', 'Testowa 1', '00-001', 'Miasto Testowe', 'PL')",
      [partnerId, companyName],
    );
    await client.query(
      "INSERT INTO seller_tax_identifiers (partner_id, identifier_type, identifier_value, country_code, canonical_identity_class, canonical_identifier_value, verification_status) VALUES ($1, 'tax_id', $2, 'PL', 'PL:NIP', $2, 'verified')",
      [partnerId, CHECKOUT_SELLER_NIP],
    );
    await client.query("INSERT INTO seller_eligibility (partner_id, eligibility_status) VALUES ($1, 'eligible')", [partnerId]);
    const agreementHash = createHash("sha256").update("lm-e2e-checkout-agreement-template-v1").digest("hex");
    const agreement = await client.query<{ id: number }>(`
      INSERT INTO agreement_versions
        (agreement_type, version, canonical_template_hash_sha256, status, effective_from, published_at)
      VALUES ('partner_agreement_b2b', 'e2e.checkout.1', $1, 'active', CURRENT_TIMESTAMP - interval '2 minutes', CURRENT_TIMESTAMP - interval '2 minutes')
      RETURNING id
    `, [agreementHash]);
    const evidenceHash = createHash("sha256").update("lm-e2e-checkout-agreement-evidence-v1").digest("hex");
    await client.query(`
      INSERT INTO partner_agreement_execution_evidence
        (partner_id, agreement_version_id, status, execution_method, signed_at,
         signatory_name, signatory_role, signatory_email, external_platform,
         external_transaction_id, signed_pdf_sha256, recorded_by_admin_user_id)
      VALUES ($1, $2, 'accepted', 'platform_documentary_electronic', CURRENT_TIMESTAMP - interval '1 minute',
              'E2E Seller Signatory', 'Owner', 'signatory@checkout.example.invalid', 'LM_E2E_TEST',
              'lm-e2e-checkout-agreement-1', $3, '00000000-0000-0000-0000-000000000000')
    `, [partnerId, agreement.rows[0].id, evidenceHash]);
    const offer = await client.query<{ id: string }>(
      "INSERT INTO offers (partner_id, category_id, title, offer_model, conversion_type, price_brutto, price_on_request, is_active, publication_status) VALUES ($1, $2, $3, 'marketplace', 'inbound', 100.00, false, true, 'published') RETURNING id",
      [partnerId, categoryId, CHECKOUT_OFFER_TITLE],
    );
    const organization = await client.query<{ id: string }>(`
      INSERT INTO buyer_organizations (legal_name, jurisdiction_country, verification_status)
      VALUES ($1, 'PL', 'pending') RETURNING id
    `, [CHECKOUT_READY_BUYER_LEGAL_NAME]);
    const organizationId = organization.rows[0].id;
    await client.query(`
      INSERT INTO buyer_organization_memberships
        (auth_user_id, buyer_organization_id, membership_role, membership_status)
      VALUES ($1, $2, 'organization_admin', 'active')
    `, [CHECKOUT_READY_BUYER_ID, organizationId]);
    await client.query(`
      INSERT INTO buyer_tax_identifiers
        (buyer_organization_id, identifier_type, identifier_value, country_code,
         canonical_identity_class, canonical_identifier_value)
      VALUES ($1, 'tax_id', $2, 'PL', 'PL:NIP', $2)
    `, [organizationId, CHECKOUT_READY_BUYER_NIP]);
    await client.query(`
      INSERT INTO buyer_organization_addresses
        (buyer_organization_id, address_type, street, building_number, unit_number,
         postal_code, city, country_code)
      VALUES ($1, 'registered', $2, $3, $4, $5, $6, $7)
    `, [organizationId, CHECKOUT_READY_BUYER_INVOICE_ADDRESS.street,
      CHECKOUT_READY_BUYER_INVOICE_ADDRESS.buildingNumber, CHECKOUT_READY_BUYER_INVOICE_ADDRESS.unitNumber,
      CHECKOUT_READY_BUYER_INVOICE_ADDRESS.postalCode, CHECKOUT_READY_BUYER_INVOICE_ADDRESS.city,
      CHECKOUT_READY_BUYER_INVOICE_ADDRESS.countryCode]);
    await client.query(`
      INSERT INTO buyer_user_profiles
        (auth_user_id, first_name, last_name, contact_email, phone)
      VALUES ($1, 'E2E', 'Ready Buyer', 'ready-buyer@checkout.example.invalid', '+48123000000')
    `, [CHECKOUT_READY_BUYER_ID]);
    const readyMembership = await client.query<{ count: number }>(`
      SELECT count(*)::int AS count FROM buyer_organization_memberships
      WHERE auth_user_id = $1 AND membership_status = 'active' AND ended_at IS NULL
    `, [CHECKOUT_READY_BUYER_ID]);
    const newMembership = await client.query<{ count: number }>(`
      SELECT count(*)::int AS count FROM buyer_organization_memberships
      WHERE auth_user_id = $1 AND membership_status = 'active' AND ended_at IS NULL
    `, [CHECKOUT_NEW_BUYER_ID]);
    if (readyMembership.rows[0].count !== 1 || newMembership.rows[0].count !== 0) {
      throw new Error("STOP_TEST_FIXTURE_CONFLICT: Buyer membership cardinality");
    }
    await client.query("COMMIT");
    return { partnerId, offerId: offer.rows[0].id, sellerName: companyName, organizationId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
