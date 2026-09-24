import { Pool } from "pg";
import {
  E2E_ADMIN_USER_ID,
  E2E_BUYER_FIXTURES,
  E2E_BUYER_USER_ID,
  requireIsolatedE2EDatabaseUrl,
  type E2EBuyerFixture,
} from "./buyer-trust-fixtures";

async function insertBuyerFixture(
  client: import("pg").PoolClient,
  fixture: E2EBuyerFixture,
) {
  await client.query(
    `INSERT INTO buyer_organizations (
       id, legal_name, jurisdiction_country, verification_status
     ) VALUES ($1, $2, 'PL', 'pending')`,
    [fixture.organizationId, fixture.legalName],
  );

  await client.query(
    `INSERT INTO buyer_organization_memberships (
       id, auth_user_id, buyer_organization_id, membership_role, membership_status
     ) VALUES ($1, $2, $3, 'organization_admin', 'active')`,
    [fixture.membershipId, E2E_BUYER_USER_ID, fixture.organizationId],
  );

  await client.query(
    `INSERT INTO buyer_tax_identifiers (
       id, buyer_organization_id, identifier_type, identifier_value, country_code,
       canonical_identity_class, canonical_identifier_value
     ) VALUES ($1, $2, 'tax_id', $3, 'PL', 'PL:NIP', $3)`,
    [fixture.taxIdentifierId, fixture.organizationId, fixture.nip],
  );

  await client.query(
    `INSERT INTO buyer_registry_identifiers (
       id, buyer_organization_id, registry_type, registry_value, jurisdiction_country
     ) VALUES ($1, $2, 'commercial_register', $3, 'PL')`,
    [fixture.registryIdentifierId, fixture.organizationId, fixture.registryValue],
  );

  if (fixture.initialStatus !== "verified" || fixture.initialVerificationEventId === null) {
    return;
  }

  await client.query(
    `INSERT INTO buyer_organization_verification_events (
       id, buyer_organization_id, event_type, outcome_status, actor_type, actor_user_id,
       source_type, source_name, source_reference, verification_method, reason_code,
       previous_verification_status, legal_name_snapshot, jurisdiction_country_snapshot,
       tax_identifier_id, tax_identifier_type_snapshot, tax_identifier_value_snapshot,
       tax_country_code_snapshot, registry_identifier_id, registry_type_snapshot,
       registry_value_snapshot, registry_country_code_snapshot
     ) VALUES (
       $1, $2, 'verified', 'verified', 'admin', $3,
       'admin_manual', 'LogiMarket E2E Admin', 'Deterministic verified fixture',
       'manual_admin', NULL, 'pending', $4, 'PL',
       $5, 'tax_id', $6, 'PL', $7, 'commercial_register', $8, 'PL'
     )`,
    [
      fixture.initialVerificationEventId,
      fixture.organizationId,
      E2E_ADMIN_USER_ID,
      fixture.legalName,
      fixture.taxIdentifierId,
      fixture.nip,
      fixture.registryIdentifierId,
      fixture.registryValue,
    ],
  );

  await client.query(
    `UPDATE buyer_tax_identifiers
     SET trusted_by_verification_event_id = $1
     WHERE id = $2 AND buyer_organization_id = $3`,
    [fixture.initialVerificationEventId, fixture.taxIdentifierId, fixture.organizationId],
  );
  await client.query(
    `UPDATE buyer_registry_identifiers
     SET trusted_by_verification_event_id = $1
     WHERE id = $2 AND buyer_organization_id = $3`,
    [fixture.initialVerificationEventId, fixture.registryIdentifierId, fixture.organizationId],
  );
  await client.query(
    `UPDATE buyer_organizations
     SET verification_status = 'verified', current_verification_event_id = $1,
         verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [fixture.initialVerificationEventId, fixture.organizationId],
  );
}

async function run() {
  const connectionString = requireIsolatedE2EDatabaseUrl();
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log("Setting up E2E fixtures...");
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO buyer_organizations (id, legal_name, jurisdiction_country, verification_status)
      VALUES (999999, 'E2E Smoke Test Organization', 'PL', 'pending')
    `);
    for (const fixture of Object.values(E2E_BUYER_FIXTURES)) {
      await insertBuyerFixture(client, fixture);
    }

    const { insertOfferMediaFixtures } = await import("./public-offer-media-fixtures");
    await insertOfferMediaFixtures(client);

    await client.query("COMMIT");
    console.log("E2E fixtures applied successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Fixture setup failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
