import { test } from "./fixtures/auth";
import { expect } from "@playwright/test";
import { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";

const databaseUrl = requireIsolatedE2EDatabaseUrl();
const database = new Pool({ connectionString: databaseUrl });

test.afterAll(async () => {
  await database.end();
});

test.beforeEach(async () => {
  // Retry-safe cleanup
  const partnerCheck = await database.query("SELECT id FROM partners WHERE company_name = 'PFConsulting - Partner testowy'");
  if (partnerCheck.rows.length > 0) {
    const pId = partnerCheck.rows[0].id;
    await database.query("DELETE FROM partner_agreement_evidence_invalidations WHERE execution_evidence_id IN (SELECT id FROM partner_agreement_execution_evidence WHERE partner_id = $1)", [pId]);
    await database.query("DELETE FROM partner_agreement_execution_evidence WHERE partner_id = $1", [pId]);
    await database.query("DELETE FROM offers WHERE partner_id = $1", [pId]);
    await database.query("DELETE FROM seller_eligibility WHERE partner_id = $1", [pId]);
    await database.query("DELETE FROM seller_registry_identifiers WHERE partner_id = $1", [pId]);
    await database.query("DELETE FROM seller_tax_identifiers WHERE partner_id = $1", [pId]);
    await database.query("DELETE FROM seller_legal_identities WHERE partner_id = $1", [pId]);
    await database.query("DELETE FROM partners WHERE id = $1", [pId]);
  }

  const result = await database.query("SELECT count(*)::int AS count FROM partner_agreement_execution_evidence");
  const count = result.rows[0].count;
  if (count > 0) {
    throw new Error("STOP_TEST_FIXTURE_CONFLICT: non-test agreement evidence exists");
  }
  await database.query("DELETE FROM agreement_versions");

  // Setup synthetic partner
  const catRes = await database.query("SELECT id FROM categories LIMIT 1");
  let catId = 1;
  if (catRes.rows.length > 0) {
    catId = catRes.rows[0].id;
  } else {
    const insertCat = await database.query("INSERT INTO categories (name, slug) VALUES ('Test Category', 'test-category') RETURNING id");
    catId = insertCat.rows[0].id;
  }

  const partnerRes = await database.query(
    "INSERT INTO partners (company_name, contact_email) VALUES ('PFConsulting - Partner testowy', 'test-only@example.com') RETURNING id"
  );
  const partnerId = partnerRes.rows[0].id;

  await database.query(
    "INSERT INTO seller_legal_identities (partner_id, legal_name, jurisdiction_country, verification_status, registered_address_line1, registered_postal_code, registered_city, registered_country_code) VALUES ($1, 'PFConsulting - Partner testowy', 'PL', 'verified', 'Testowa 1', '00-000', 'Test City', 'PL')",
    [partnerId]
  );
  await database.query(
    "INSERT INTO seller_tax_identifiers (partner_id, identifier_type, identifier_value, country_code, canonical_identity_class, canonical_identifier_value, verification_status) VALUES ($1, 'tax_id', '0000000000', 'PL', 'PL:NIP', '0000000000', 'verified')",
    [partnerId]
  );
  await database.query(
    "INSERT INTO seller_registry_identifiers (partner_id, registry_type, registry_value, jurisdiction_country, verification_status) VALUES ($1, 'krs', '0000000000', 'PL', 'verified')",
    [partnerId]
  );
  await database.query(
    "INSERT INTO seller_eligibility (partner_id, eligibility_status) VALUES ($1, 'eligible')",
    [partnerId]
  );

  await database.query(
    "INSERT INTO offers (partner_id, category_id, title, offer_model, conversion_type, price_brutto, price_on_request, is_active, publication_status) VALUES ($1, $2, 'Test Offer A', 'marketplace', 'inbound', 100.00, false, true, 'draft')",
    [partnerId, catId]
  );
  await database.query(
    "INSERT INTO offers (partner_id, category_id, title, offer_model, conversion_type, price_brutto, price_on_request, is_active, publication_status) VALUES ($1, $2, 'Test Offer B', 'marketplace', 'inbound', 150.00, false, true, 'draft')",
    [partnerId, catId]
  );
});

test.describe("Admin Agreement Seller Readiness Flow", () => {
  test("E2E Integration Proof", async ({ adminPage }) => {
    const errors: Error[] = [];
    adminPage.on("pageerror", (err) => errors.push(err));
    adminPage.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(new Error(`Console error: ${msg.text()}`));
      }
    });

    const partnerRes = await database.query("SELECT id FROM partners WHERE company_name = 'PFConsulting - Partner testowy'");
    const partnerId = partnerRes.rows[0].id;

    const offerARes = await database.query("SELECT id FROM offers WHERE title = 'Test Offer A'");
    const offerIdA = offerARes.rows[0].id;

    // A. Go to partner page
    const resA = await adminPage.goto(`/admin/partnerzy/${partnerId}`);
    expect(resA?.status()).toBe(200);

    // Check Seller Readiness
    await expect(adminPage.getByText("Gotowość Sprzedawcy")).toBeVisible();
    await expect(adminPage.getByText("Brak aktywnego regulaminu partnera")).toBeVisible();

    // B. Go to partner agreements
    const resB = await adminPage.goto("/admin/umowy-partnerskie");
    expect(resB?.status()).toBe(200);

    const testHash = "f".repeat(64);
    await adminPage.getByLabel("Wersja").fill("v1.0");
    await adminPage.getByLabel("Odcisk SHA-256 (Canonical Template)").fill(testHash);
    await adminPage.getByRole("button", { name: "Utwórz" }).click();

    // Activate
    const activeRow = adminPage.locator("tr", { hasText: "v1.0" });
    await activeRow.getByRole("button", { name: "Aktywuj" }).click();
    await expect(adminPage.getByRole("status").filter({ hasText: "Pomyślnie aktywowano wersję" })).toBeVisible();

    // Read timestamps from DB for E2E Signed At
    const versionRes = await database.query("SELECT published_at, effective_from FROM agreement_versions WHERE version = 'v1.0'");
    const pubAt = versionRes.rows[0].published_at;
    const effFrom = versionRes.rows[0].effective_from;
    expect(pubAt).not.toBeNull();
    expect(effFrom).not.toBeNull();

    const safeTimeMs = Math.max(pubAt.getTime(), effFrom.getTime()) + 60000;

    // Format timestamp for datetime-local in browser's timezone
    const signedAtLocal = await adminPage.evaluate((time) => {
      const d = new Date(time);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    }, safeTimeMs);

    // C. Go back to partner page
    const resC = await adminPage.goto(`/admin/partnerzy/${partnerId}`);
    expect(resC?.status()).toBe(200);
    await expect(adminPage.getByText("Brak dowodu akceptacji regulaminu")).toBeVisible();
    await expect(adminPage.getByText("Brak aktywnego regulaminu partnera")).not.toBeVisible();

    // D. Register evidence
    await adminPage.getByRole("button", { name: "Rejestracja dowodu zawarcia umowy" }).click();

    await adminPage.locator('input[name="signedAt"]').fill(signedAtLocal);
    await adminPage.locator('input[name="signatoryName"]').fill("Test Signatory");
    await adminPage.locator('input[name="signatoryRole"]').fill("Owner");
    await adminPage.locator('input[name="signatoryEmail"]').fill("test-only@example.com");
    await adminPage.locator('input[name="externalPlatform"]').fill("LM_E2E_TEST");
    await adminPage.locator('input[name="externalTransactionId"]').fill("txn-e2e-12345");
    await adminPage.locator('input[name="signedPdfSha256"]').fill("1".repeat(64));

    await adminPage.getByRole("button", { name: "Zarejestruj dowód" }).click();
    await expect(adminPage.getByText("Dowód zawarcia umowy został zarejestrowany.", { exact: true })).toBeVisible();

    // E. See READY
    await expect(adminPage.getByText("Brak dowodu akceptacji regulaminu")).not.toBeVisible();
    await expect(adminPage.getByText("GOTOWY", { exact: true })).toBeVisible();

    // F. Publish offer A
    const resF = await adminPage.goto(`/admin/oferty/${offerIdA}`);
    expect(resF?.status()).toBe(200);

    // Find publish button
    const publishButton = adminPage.getByRole("button", { name: "Opublikuj" });
    await expect(publishButton).toBeEnabled();
    await publishButton.click();

    // Polling deterministic wait
    await expect.poll(async () => {
      const result = await database.query(
        "SELECT publication_status FROM offers WHERE id = $1",
        [offerIdA]
      );
      return result.rows[0]?.publication_status;
    }, { timeout: 5000 }).toBe("published");

    // Check that there are no errors
    expect(errors.length).toBe(0);
  });
});
