import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { Pool } from "pg";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { runMigrations } from "../../scripts/database/run-runtime-migrations";
import {
  fetchLiveSchemaMetadata,
  classifyRuntimeTarget,
} from "../../scripts/database/verify-runtime-schema-fingerprint";

const MIGRATIONS_DIR = "./drizzle-runtime";
const M0000_FILE = `${MIGRATIONS_DIR}/0000_production_runtime_baseline.sql`;
const M0001_FILE = `${MIGRATIONS_DIR}/0001_rfq_workflow_hardening.sql`;
const M0002_FILE = `${MIGRATIONS_DIR}/0002_seller_identity_56b1.sql`;
const M0003_FILE = `${MIGRATIONS_DIR}/0003_prod_legacy_offer_reconciliation.sql`;

test("CI_POSTGRES_INTEGRATION_PROOF", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("Skipping CI integration test (no DATABASE_URL)");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Clean start: drop public and drizzle_runtime
  const cleanDB = async () => {
    await pool.query(`DROP SCHEMA IF EXISTS public CASCADE;`);
    await pool.query(`DROP SCHEMA IF EXISTS drizzle_runtime CASCADE;`);
    await pool.query(`CREATE SCHEMA public;`);

    // Create Supabase-specific roles required by the baseline migration dump
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
      END
      $$;
    `);
  };

  const setup0000 = async () => {
    await cleanDB();
    const sql = fs.readFileSync(M0000_FILE, "utf-8");
    await pool.query(sql);
  };

  const setupProdLegacyFixture = async () => {
    await setup0000();
    // Reconfigure constraints to match exact physical legacy PROD baseline
    await pool.query(`
      ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;
      ALTER TABLE public.categories ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT;

      ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_category_id_fkey;
      ALTER TABLE public.offers ADD CONSTRAINT offers_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;

      ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_partner_id_fkey;
      ALTER TABLE public.offers ADD CONSTRAINT offers_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;

      ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_conversion_type_check;
      ALTER TABLE public.offers ADD CONSTRAINT offers_conversion_type_check CHECK (((conversion_type)::text = ANY ((ARRAY['rfq'::character varying, 'cart'::character varying, 'outbound'::character varying])::text[])));

      ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_offer_model_check;
      ALTER TABLE public.offers ADD CONSTRAINT offers_offer_model_check CHECK (((offer_model)::text = ANY ((ARRAY['rfq'::character varying, 'ecommerce'::character varying, 'outbound'::character varying])::text[])));

      ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_publication_status_check;
      ALTER TABLE public.offers ADD CONSTRAINT offers_publication_status_check CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'hidden'::character varying, 'archived'::character varying, 'deleted'::character varying])::text[])));

      ALTER TABLE public.clicks DROP CONSTRAINT IF EXISTS clicks_offer_id_fkey;
      ALTER TABLE public.clicks ADD CONSTRAINT clicks_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;

      ALTER TABLE public.clicks DROP CONSTRAINT IF EXISTS clicks_partner_id_fkey;
      ALTER TABLE public.clicks ADD CONSTRAINT clicks_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;

      DROP INDEX IF EXISTS public.idx_clicks_tracking;
      CREATE INDEX idx_clicks_tracking ON public.clicks USING btree (ip_hash, offer_id, clicked_at);
    `);
  };

  const setupPost0002 = async () => {
    await setup0000();
    const sql1 = fs.readFileSync(M0001_FILE, "utf-8");
    await pool.query(sql1);
    const sql2 = fs.readFileSync(M0002_FILE, "utf-8");
    await pool.query(sql2);

    // Create journal with 0000, 0001, 0002
    await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle_runtime;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drizzle_runtime.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);
    const diskMigrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_DIR });
    for (let i = 0; i < 3; i++) {
      await pool.query(
        `INSERT INTO drizzle_runtime.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [diskMigrations[i].hash, diskMigrations[i].folderMillis]
      );
    }
  };

  const getStats = async () => {
    const res = await pool.query(`
      SELECT
        (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname = 'public') as tables,
        (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public') as columns,
        (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'S' AND n.nspname = 'public') as sequences,
        (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE c.contype = 'p' AND n.nspname = 'public') as primary_keys,
        (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE c.contype = 'f' AND n.nspname = 'public') as foreign_keys,
        (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE c.contype = 'u' AND n.nspname = 'public') as uniques,
        (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE c.contype = 'c' AND n.nspname = 'public') as checks,
        (SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public') as indexes,
        (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND c.relrowsecurity = true AND n.nspname = 'public') as rls_tables,
        (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public') as policies
    `);
    return res.rows[0];
  };

  await t.test("PATH A: EMPTY DATABASE -> 0000 -> 0001 -> 0002 -> 0003", async () => {
    await cleanDB();

    // Classify empty state
    const { fingerprint: preFingerprint, publicTables: preTables } = await fetchLiveSchemaMetadata(pool);
    assert.strictEqual(classifyRuntimeTarget(preFingerprint, preTables).state, "EMPTY");

    // Run official runner
    await runMigrations(process.env);

    const stats = await getStats();
    assert.strictEqual(Number(stats.tables), 19, "tables count mismatch");
    assert.strictEqual(Number(stats.columns), 155, "columns count mismatch");
    assert.strictEqual(Number(stats.sequences), 17, "sequences count mismatch");
    assert.strictEqual(Number(stats.primary_keys), 19, "primary_keys mismatch");
    assert.strictEqual(Number(stats.foreign_keys), 24, "foreign_keys mismatch");
    assert.strictEqual(Number(stats.uniques), 12, "uniques mismatch");
    assert.strictEqual(Number(stats.checks), 11, "checks mismatch");
    assert.strictEqual(Number(stats.indexes), 41, "indexes mismatch");
    assert.strictEqual(Number(stats.rls_tables), 19, "rls_tables mismatch");
    assert.strictEqual(Number(stats.policies), 0, "policies mismatch");

    // Post-migration classification must be EXACT_EXISTING_POST_0003
    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const postClassification = classifyRuntimeTarget(fingerprint, publicTables);
    assert.strictEqual(postClassification.state, "EXACT_EXISTING_POST_0003");

    // Journal check: 4 rows
    const diskMigrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_DIR });
    assert.strictEqual(diskMigrations.length, 4, "Disk migrations should have 4 files");

    const journalRes = await pool.query(`SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`);
    const journalRows = journalRes.rows as { hash: string; created_at: string | number }[];
    assert.strictEqual(journalRows.length, 4, "Journal should have exactly 4 rows");

    for (let i = 0; i < 4; i++) {
      assert.strictEqual(journalRows[i].hash, diskMigrations[i].hash, `Row ${i} hash mismatch`);
      assert.strictEqual(String(journalRows[i].created_at), String(diskMigrations[i].folderMillis), `Row ${i} created_at mismatch`);
    }
  });

  await t.test("PATH B: CURRENT POST-0002 -> 0003 ONLY", async () => {
    await setupPost0002();

    // Classify pre-state
    const { fingerprint: preFingerprint, publicTables: preTables } = await fetchLiveSchemaMetadata(pool);
    assert.strictEqual(classifyRuntimeTarget(preFingerprint, preTables).state, "MIGRATABLE_POST_0002");

    // Run official runner
    await runMigrations(process.env);

    // Post-migration classification must be EXACT_EXISTING_POST_0003
    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const postClassification = classifyRuntimeTarget(fingerprint, publicTables);
    assert.strictEqual(postClassification.state, "EXACT_EXISTING_POST_0003");

    // Journal check: exactly 4 rows
    const journalRes = await pool.query(`SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`);
    const journalRows = journalRes.rows as { hash: string; created_at: string | number }[];
    assert.strictEqual(journalRows.length, 4, "Journal should have exactly 4 rows");
  });

  await t.test("PATH C: LEGACY PROD FIXTURE WITH DATA TRANSFORMATION", async () => {
    await setupProdLegacyFixture();

    // Classify pre-state
    const { fingerprint: preFingerprint, publicTables: preTables } = await fetchLiveSchemaMetadata(pool);
    assert.strictEqual(classifyRuntimeTarget(preFingerprint, preTables).state, "MIGRATABLE_PROD_LEGACY");

    // Seed deterministic 9 non-PII test offers
    await pool.query(`
      INSERT INTO public.partners (id, company_name, contact_email)
      VALUES (1, 'Test Partner', 'test@partner.test')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.categories (id, name, slug)
      VALUES (1, 'Test Category', 'test-category')
      ON CONFLICT (id) DO NOTHING;

      -- 3 rows: ecommerce/outbound/published
      INSERT INTO public.offers (id, partner_id, category_id, title, offer_model, conversion_type, publication_status, price_brutto, price_on_request, is_active)
      VALUES
        (101, 1, 1, 'Ecom Offer 1', 'ecommerce', 'outbound', 'published', 100.00, false, true),
        (102, 1, 1, 'Ecom Offer 2', 'ecommerce', 'outbound', 'published', 200.00, false, true),
        (103, 1, 1, 'Ecom Offer 3', 'ecommerce', 'outbound', 'published', 300.00, false, true);

      -- 3 rows: rfq/outbound/draft
      INSERT INTO public.offers (id, partner_id, category_id, title, offer_model, conversion_type, publication_status, outbound_url, is_active)
      VALUES
        (201, 1, 1, 'RFQ Outbound 1', 'rfq', 'outbound', 'draft', 'https://example.com/1', true),
        (202, 1, 1, 'RFQ Outbound 2', 'rfq', 'outbound', 'draft', 'https://example.com/2', true),
        (203, 1, 1, 'RFQ Outbound 3', 'rfq', 'outbound', 'draft', 'https://example.com/3', true);

      -- 3 rows: rfq/rfq/published
      INSERT INTO public.offers (id, partner_id, category_id, title, offer_model, conversion_type, publication_status, is_active)
      VALUES
        (301, 1, 1, 'RFQ Inbound 1', 'rfq', 'rfq', 'published', true),
        (302, 1, 1, 'RFQ Inbound 2', 'rfq', 'rfq', 'published', true),
        (303, 1, 1, 'RFQ Inbound 3', 'rfq', 'rfq', 'published', true);
    `);

    // Capture OIDs to prove no DROP/CREATE occurs on already-final objects
    const getLegacyOids = async () => {
      const res = await pool.query(`
        SELECT
          (SELECT oid FROM pg_constraint WHERE conname = 'categories_parent_id_fkey' AND conrelid = 'public.categories'::regclass) as cat_fkey_oid,
          (SELECT oid FROM pg_constraint WHERE conname = 'offers_category_id_fkey' AND conrelid = 'public.offers'::regclass) as off_cat_fkey_oid,
          (SELECT oid FROM pg_constraint WHERE conname = 'offers_partner_id_fkey' AND conrelid = 'public.offers'::regclass) as off_part_fkey_oid,
          (SELECT oid FROM pg_constraint WHERE conname = 'clicks_offer_id_fkey' AND conrelid = 'public.clicks'::regclass) as clk_off_fkey_oid,
          (SELECT oid FROM pg_constraint WHERE conname = 'clicks_partner_id_fkey' AND conrelid = 'public.clicks'::regclass) as clk_part_fkey_oid,
          (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_clicks_tracking' AND n.nspname = 'public') as idx_oid
      `);
      return res.rows[0];
    };
    const preOids = await getLegacyOids();

    // Run official runner
    await runMigrations(process.env);

    // Verify DDL NO-OP: OIDs must be identical (not reconstructed)
    const postOids = await getLegacyOids();
    assert.strictEqual(postOids.cat_fkey_oid, preOids.cat_fkey_oid, "categories_parent_id_fkey must NOT be reconstructed");
    assert.strictEqual(postOids.off_cat_fkey_oid, preOids.off_cat_fkey_oid, "offers_category_id_fkey must NOT be reconstructed");
    assert.strictEqual(postOids.off_part_fkey_oid, preOids.off_part_fkey_oid, "offers_partner_id_fkey must NOT be reconstructed");
    assert.strictEqual(postOids.clk_off_fkey_oid, preOids.clk_off_fkey_oid, "clicks_offer_id_fkey must NOT be reconstructed");
    assert.strictEqual(postOids.clk_part_fkey_oid, preOids.clk_part_fkey_oid, "clicks_partner_id_fkey must NOT be reconstructed");
    assert.strictEqual(postOids.idx_oid, preOids.idx_oid, "idx_clicks_tracking must NOT be reconstructed");

    // Verify data transformations:
    // Total count must be 9
    const totalCountRes = await pool.query(`SELECT count(*) as cnt FROM public.offers`);
    assert.strictEqual(Number(totalCountRes.rows[0].cnt), 9, "Total offers count must remain 9");

    // 0 rows with legacy tuples
    const legacyEcomRes = await pool.query(`SELECT count(*) as cnt FROM public.offers WHERE offer_model = 'ecommerce' AND conversion_type = 'outbound'`);
    assert.strictEqual(Number(legacyEcomRes.rows[0].cnt), 0, "0 legacy ecommerce/outbound rows");

    const legacyRfqRes = await pool.query(`SELECT count(*) as cnt FROM public.offers WHERE offer_model = 'rfq' AND conversion_type = 'rfq'`);
    assert.strictEqual(Number(legacyRfqRes.rows[0].cnt), 0, "0 legacy rfq/rfq rows");

    // Exactly 3 marketplace/inbound/published
    const ecomTransformedRes = await pool.query(`SELECT count(*) as cnt FROM public.offers WHERE offer_model = 'marketplace' AND conversion_type = 'inbound' AND publication_status = 'published'`);
    assert.strictEqual(Number(ecomTransformedRes.rows[0].cnt), 3, "3 marketplace/inbound rows");

    // Exactly 3 rfq/outbound/draft
    const rfqOutboundRes = await pool.query(`SELECT count(*) as cnt FROM public.offers WHERE offer_model = 'rfq' AND conversion_type = 'outbound' AND publication_status = 'draft'`);
    assert.strictEqual(Number(rfqOutboundRes.rows[0].cnt), 3, "3 rfq/outbound rows preserved");

    // Exactly 3 rfq/inbound/published
    const rfqInboundRes = await pool.query(`SELECT count(*) as cnt FROM public.offers WHERE offer_model = 'rfq' AND conversion_type = 'inbound' AND publication_status = 'published'`);
    assert.strictEqual(Number(rfqInboundRes.rows[0].cnt), 3, "3 rfq/inbound rows");

    // Post-migration classification must be EXACT_EXISTING_POST_0003
    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const postClassification = classifyRuntimeTarget(fingerprint, publicTables);
    assert.strictEqual(postClassification.state, "EXACT_EXISTING_POST_0003");

    // Journal check: 4 rows
    const journalRes = await pool.query(`SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`);
    const journalRows = journalRes.rows as { hash: string; created_at: string | number }[];
    assert.strictEqual(journalRows.length, 4, "Journal should have exactly 4 rows");
  });

  await t.test("NEGATIVE PATH: 0001 FAILURE ROLLBACK", async () => {
    await setup0000();

    // Create invalid status row
    await pool.query(`
      INSERT INTO rfq_leads (offer_id, partner_id, contact_name, email, status) 
      VALUES (999, 999, 'Bad Guy', 'bad@example.com', 'hacked_status')
    `);

    let errorThrown = false;
    try {
      await runMigrations(process.env);
    } catch (err: unknown) {
      errorThrown = true;
      assert.ok((err as Error).message.includes("RFQ migration blocked: invalid status rows exist"));
    }
    assert.strictEqual(errorThrown, true);

    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const postFailureClassification = classifyRuntimeTarget(fingerprint, publicTables);
    assert.strictEqual(postFailureClassification.state, "MIGRATABLE_BASELINE");
  });

  await t.test("NEGATIVE PATH: 0003 FAILURE TUPLE PRECHECK ROLLBACK", async () => {
    await setupProdLegacyFixture();

    // Insert invalid offer tuple that violates 0003 precheck
    await pool.query(`
      INSERT INTO public.partners (id, company_name, contact_email) VALUES (1, 'Test Partner', 'test@test.test') ON CONFLICT DO NOTHING;
      INSERT INTO public.categories (id, name, slug) VALUES (1, 'Test Cat', 'test-cat-neg') ON CONFLICT DO NOTHING;
      INSERT INTO public.offers (id, partner_id, category_id, title, offer_model, conversion_type, publication_status)
      VALUES (999, 1, 1, 'Corrupted Offer', 'outbound', 'outbound', 'draft');
    `);

    let errorThrown = false;
    try {
      await runMigrations(process.env);
    } catch (err: unknown) {
      errorThrown = true;
      assert.ok((err as Error).message.includes("0003 precheck failed: unsupported (offer_model, conversion_type) tuple exists"));
    }
    assert.strictEqual(errorThrown, true);

    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const postFailureClassification = classifyRuntimeTarget(fingerprint, publicTables);
    assert.strictEqual(postFailureClassification.state, "MIGRATABLE_PROD_LEGACY");
  });

  await t.test("NEGATIVE PATH: 0003 FAILURE PUBLICATION STATUS PRECHECK ROLLBACK", async () => {
    await setupProdLegacyFixture();

    // Insert invalid publication status row directly
    await pool.query(`
      ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_publication_status_check;
      INSERT INTO public.partners (id, company_name, contact_email) VALUES (1, 'Test Partner', 'test@test.test') ON CONFLICT DO NOTHING;
      INSERT INTO public.categories (id, name, slug) VALUES (1, 'Test Cat', 'test-cat-neg') ON CONFLICT DO NOTHING;
      INSERT INTO public.offers (id, partner_id, category_id, title, offer_model, conversion_type, publication_status, outbound_url)
      VALUES (998, 1, 1, 'Invalid Status Offer', 'rfq', 'outbound', 'invalid_status', 'https://example.com/test');
    `);

    // Execute 0003 migration directly in a transactional client
    const migration0003Sql = fs.readFileSync(M0003_FILE, "utf-8");
    const client = await pool.connect();
    let errorThrown = false;
    try {
      await client.query("BEGIN;");
      await client.query(migration0003Sql);
      await client.query("COMMIT;");
    } catch (err: unknown) {
      await client.query("ROLLBACK;");
      errorThrown = true;
      assert.ok((err as Error).message.includes("0003 precheck failed: unsupported publication_status exists"));
    } finally {
      client.release();
    }
    assert.strictEqual(errorThrown, true, "PUBLICATION_PRECHECK_DIRECT: must throw 0003 unsupported publication_status exception");

    // PUBLICATION_PRECHECK_ROLLBACK assertions:
    // 1. Pre-existing test row remains unchanged
    const testRowRes = await pool.query(`SELECT publication_status FROM public.offers WHERE id = 998`);
    assert.strictEqual(testRowRes.rows.length, 1);
    assert.strictEqual(testRowRes.rows[0].publication_status, "invalid_status");

    // 2. 0003 DDL did not commit (delivery_options column absent)
    const colRes = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'delivery_options'
    `);
    assert.strictEqual(colRes.rows.length, 0, "PUBLICATION_PRECHECK_ROLLBACK: 0003 DDL must have rolled back cleanly");

    // 3. No journal progression (table absent or 0 rows)
    const journalRes = await pool.query(`
      SELECT count(*) as cnt
      FROM information_schema.tables
      WHERE table_schema = 'drizzle_runtime' AND table_name = '__drizzle_migrations'
    `);
    if (Number(journalRes.rows[0].cnt) > 0) {
      const rowsRes = await pool.query(`SELECT count(*) as cnt FROM drizzle_runtime.__drizzle_migrations`);
      assert.strictEqual(Number(rowsRes.rows[0].cnt), 0, "No journal progression on rollback");
    }
  });

  await t.test("NEGATIVE PATH: NOT VALID CONSTRAINT CAUSES RUNNER ABORT AS PARTIAL_OR_DRIFTED", async () => {
    await setupProdLegacyFixture();

    // Create a NOT VALID constraint on legacy prod fixture
    await pool.query(`
      ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_partner_id_fkey;
      ALTER TABLE public.offers ADD CONSTRAINT offers_partner_id_fkey
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE NOT VALID;
    `);

    // Verify classification is PARTIAL_OR_DRIFTED
    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const classification = classifyRuntimeTarget(fingerprint, publicTables);
    assert.strictEqual(classification.state, "PARTIAL_OR_DRIFTED");
    assert.ok(
      classification.differences.some(d => d.includes("validation status mismatch") || d.includes("NOT VALID") || d.includes("definition mismatch")),
      "Classification must report NOT VALID constraint drift"
    );

    // Official runner must abort before calling migrate
    let runnerThrew = false;
    try {
      await runMigrations(process.env);
    } catch (err: unknown) {
      runnerThrew = true;
      assert.ok((err as Error).message.includes("PARTIAL_OR_DRIFTED"));
    }
    assert.strictEqual(runnerThrew, true, "NOT_VALID_RUNNER_ABORTS: runner must abort on NOT VALID constraint");

    // No journal progression
    const journalRes = await pool.query(`
      SELECT count(*) as cnt
      FROM information_schema.tables
      WHERE table_schema = 'drizzle_runtime' AND table_name = '__drizzle_migrations'
    `);
    if (Number(journalRes.rows[0].cnt) > 0) {
      const rowsRes = await pool.query(`SELECT count(*) as cnt FROM drizzle_runtime.__drizzle_migrations`);
      assert.strictEqual(Number(rowsRes.rows[0].cnt), 0, "No journal progression when runner aborts");
    }
  });

  await pool.end();
});
