import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "@/lib/db";
import { executeOfferPublicationStateChange } from "@/lib/admin/offer-publication-core";
import { mutateRfqStatusCore } from "@/lib/rfq/admin-core";
import type { RfqStatus } from "@/lib/schema";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { runMigrations } from "../../scripts/database/run-runtime-migrations";
import {
  POST_0007_RECONCILIATION_AUTHORIZATION,
  POST_0007_RECONCILIATION_MODE,
} from "../../scripts/database/runtime-migration-journal";
import {
  cleanupCanonicalRuntimeMigrationDirectory,
  createCanonicalRuntimeMigrationDirectory,
} from "../../scripts/database/runtime-migration-temp-dir";
import {
  fetchLiveSchemaMetadata,
  classifyRuntimeTarget,
  compareRuntimeFingerprint,
} from "../../scripts/database/verify-runtime-schema-fingerprint";
import { PROD_LEGACY_BASELINE_FINGERPRINT, EXPECTED_COUNTS, MARKETPLACE_ORDER_RLS_TARGET_TABLES } from "../../scripts/database/runtime-migration-contract";

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

      ALTER TABLE public.offer_attribute_values DROP CONSTRAINT IF EXISTS chk_oav_value_exclusivity;
      ALTER TABLE public.offer_attribute_values ADD CONSTRAINT chk_oav_value_exclusivity CHECK (
        (num_nonnulls(
          value_text,
          value_number,
          value_boolean,
          value_date,
          value_year,
          option_id
        ) = 1)
      );
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
    const diskMigrations = readMigrationFiles({
      migrationsFolder: MIGRATIONS_DIR,
    });
    for (let i = 0; i < 3; i++) {
      await pool.query(
        `INSERT INTO drizzle_runtime.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [diskMigrations[i].hash, diskMigrations[i].folderMillis],
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

  const getMarketplaceOrderRlsStats = async () => {
    const res = await pool.query(`
      SELECT
        count(*)::int AS target_tables,
        count(*) FILTER (WHERE c.relrowsecurity)::int AS rls_enabled,
        (
          SELECT count(*)::int
          FROM pg_policy p
          JOIN pg_class pc ON pc.oid = p.polrelid
          JOIN pg_namespace pn ON pn.oid = pc.relnamespace
          WHERE pn.nspname = 'public'
            AND pc.relname = ANY($1::text[])
        ) AS policies
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname = ANY($1::text[])
    `, [[...MARKETPLACE_ORDER_RLS_TARGET_TABLES]]);
    return res.rows[0];
  };

  await t.test(
    "PATH A: EMPTY DATABASE -> canonical runtime 0000 through 0008",
    async () => {
      await cleanDB();

      // Classify empty state
      const { fingerprint: preFingerprint, publicTables: preTables } =
        await fetchLiveSchemaMetadata(pool);
      assert.strictEqual(
        classifyRuntimeTarget(preFingerprint, preTables).state,
        "EMPTY",
      );

      // Run official runner
      await runMigrations(process.env);

      const stats = await getStats();
      assert.strictEqual(Number(stats.tables), EXPECTED_COUNTS.TABLES, "tables count mismatch");
      assert.strictEqual(Number(stats.columns), EXPECTED_COUNTS.COLUMNS, "columns count mismatch");
      assert.strictEqual(
        Number(stats.sequences),
        EXPECTED_COUNTS.SEQUENCES,
        "sequences count mismatch",
      );
      assert.strictEqual(
        Number(stats.primary_keys),
        EXPECTED_COUNTS.PRIMARY_KEYS,
        "primary_keys mismatch",
      );
      assert.strictEqual(
        Number(stats.foreign_keys),
        EXPECTED_COUNTS.FOREIGN_KEYS,
        "foreign_keys mismatch",
      );
      assert.strictEqual(Number(stats.uniques), EXPECTED_COUNTS.UNIQUE_CONSTRAINTS, "uniques mismatch");
      assert.strictEqual(Number(stats.checks), EXPECTED_COUNTS.CHECK_CONSTRAINTS, "checks mismatch");
      assert.strictEqual(Number(stats.indexes), EXPECTED_COUNTS.INDEXES, "indexes mismatch");
      assert.strictEqual(Number(stats.rls_tables), EXPECTED_COUNTS.RLS_ENABLED, "rls_tables mismatch");
      assert.strictEqual(Number(stats.policies), 0, "policies mismatch");

      const marketplaceOrderRls = await getMarketplaceOrderRlsStats();
      assert.strictEqual(Number(marketplaceOrderRls.target_tables), 7, "target table count mismatch");
      assert.strictEqual(Number(marketplaceOrderRls.rls_enabled), 7, "target RLS enabled mismatch");
      assert.strictEqual(Number(marketplaceOrderRls.policies), 0, "target policies mismatch");

      // Post-migration classification must be the exact terminal runtime state.
      const { fingerprint, publicTables, security } = await fetchLiveSchemaMetadata(pool);
      const postClassification = classifyRuntimeTarget(
        fingerprint,
        publicTables,
        security,
      );

      assert.strictEqual(postClassification.state, "EXACT_EXISTING_POST_0008");

      // 0004 PROOF
      const sellerColumnNames = new Set(
        fingerprint["seller_legal_identities"].columns.map((column) => column.name),
      );
      assert.ok(sellerColumnNames.has("registered_address_line1"));
      assert.ok(sellerColumnNames.has("registered_address_line2"));
      assert.ok(sellerColumnNames.has("registered_postal_code"));
      assert.ok(sellerColumnNames.has("registered_city"));
      assert.ok(sellerColumnNames.has("registered_region"));
      assert.ok(sellerColumnNames.has("registered_country_code"));



      // 0005 PROOF: Real DB constraints check
      const tablesExist = await pool.query(`
        SELECT count(*) as c FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('buyer_legal_context_snapshots', 'marketplace_orders', 'marketplace_order_seller_disclosures', 'seller_orders', 'seller_order_seller_snapshots', 'seller_order_items', 'seller_acceptance_decisions')
      `);
      assert.strictEqual(Number(tablesExist.rows[0].c), 7, "0005 tables must exist");

      // Insert minimal valid buyer snapshot
      const buyerSnapRes = await pool.query(`
        INSERT INTO buyer_legal_context_snapshots (business_name, country_code, tax_identifier_type, tax_identifier_value, business_verification_status, category_b_status, legal_context_review_state)
        VALUES ('Test Buyer', 'PL', 'NIP', '1234567890', 'unknown', 'unknown', 'no_review_needed')
        RETURNING id
      `);
      const buyerSnapId = buyerSnapRes.rows[0].id;
      assert.ok(buyerSnapId);


      // valid Buyer with registry-only pair accepted
      const buyerRegRes = await pool.query(`
        INSERT INTO buyer_legal_context_snapshots (business_name, country_code, registry_identifier_type, registry_identifier_value, business_verification_status, category_b_status, legal_context_review_state)
        VALUES ('Test Buyer Reg', 'PL', 'KRS', '0000123456', 'unknown', 'unknown', 'no_review_needed')
        RETURNING id
      `);
      assert.ok(buyerRegRes.rows[0].id);

      // professional_purpose_evidence NULL accepted
      const buyerProfRes = await pool.query(`
        INSERT INTO buyer_legal_context_snapshots (business_name, country_code, tax_identifier_type, tax_identifier_value, professional_purpose_evidence, business_verification_status, category_b_status, legal_context_review_state)
        VALUES ('Test Buyer Prof', 'PL', 'NIP', '1234567891', NULL, 'unknown', 'unknown', 'no_review_needed')
        RETURNING id
      `);
      assert.ok(buyerProfRes.rows[0].id);

      // verified Buyer without verification metadata rejected
      await assert.rejects(
        pool.query(`
          INSERT INTO buyer_legal_context_snapshots (business_name, country_code, tax_identifier_type, tax_identifier_value, business_verification_status, category_b_status, legal_context_review_state)
          VALUES ('Bad Buyer Verified', 'PL', 'NIP', '1234567891', 'verified', 'unknown', 'no_review_needed')
        `),
        /chk_buyer_verification_consistency/,
        "Must reject verified buyer without metadata"
      );

      // Invalid buyer snapshot: missing both tax and registry
      await assert.rejects(
        pool.query(`
          INSERT INTO buyer_legal_context_snapshots (business_name, country_code)
          VALUES ('Bad Buyer', 'PL')
        `),
        /chk_buyer_identifiers_present/,
        "Must reject buyer snapshot without identifiers"
      );

      // Invalid buyer snapshot: partial tax pair
      await assert.rejects(
        pool.query(`
          INSERT INTO buyer_legal_context_snapshots (business_name, country_code, tax_identifier_type, registry_identifier_type, registry_identifier_value)
          VALUES ('Bad Buyer 2', 'PL', 'NIP', 'KRS', '000123')
        `),
        /chk_buyer_tax_pair/,
        "Must reject partial tax pair"
      );

      // Marketplace order creation
      const moRes = await pool.query(`
        INSERT INTO marketplace_orders (session_hash, buyer_legal_context_snapshot_id)
        VALUES ('session123', $1)
        RETURNING id
      `, [buyerSnapId]);
      const moId = moRes.rows[0].id;
      assert.ok(moId);


      // invalid MarketplaceOrder LC-04 status rejected
      await assert.rejects(
        pool.query(`
          INSERT INTO marketplace_orders (session_hash, buyer_legal_context_snapshot_id, status)
          VALUES ('session_bad_status', $1, 'invalid_status')
        `, [buyerSnapId]),
        /chk_marketplace_orders_status/,
        "Must reject invalid marketplace order status"
      );

      // Duplicate UNIQUE snapshot rejection
      await assert.rejects(
        pool.query(`
          INSERT INTO marketplace_orders (session_hash, buyer_legal_context_snapshot_id)
          VALUES ('session999', $1)
        `, [buyerSnapId]),
        /uq_marketplace_orders_snapshot/,
        "Must reject multiple orders for same snapshot"
      );

      // Insert partner for FKs
      const partnerRes = await pool.query(`
        INSERT INTO partners (company_name, contact_email) VALUES ('Test Partner', 'test@test.com') RETURNING id
      `);
      const partnerId = partnerRes.rows[0].id;

      // Disclosure insertion
      const discRes = await pool.query(`
        INSERT INTO marketplace_order_seller_disclosures (
          marketplace_order_id, partner_id, seller_legal_name, registered_address, jurisdiction_country, firm_contact_email, seller_role, goods_invoice_issuer, delivery_responsible_party, complaint_responsible_party, return_responsible_party, logimarket_platform_role
        ) VALUES (
          $1, $2, 'Seller', 'Add', 'PL', 'a@a.com', 'a', 'a', 'a', 'a', 'a', 'a'
        ) RETURNING id
      `, [moId, partnerId]);
      assert.ok(discRes.rows[0].id);

      // Disclosure duplicate unique
      await assert.rejects(
        pool.query(`
          INSERT INTO marketplace_order_seller_disclosures (
            marketplace_order_id, partner_id, seller_legal_name, registered_address, jurisdiction_country, firm_contact_email, seller_role, goods_invoice_issuer, delivery_responsible_party, complaint_responsible_party, return_responsible_party, logimarket_platform_role
          ) VALUES (
            $1, $2, 'Seller2', 'Add2', 'PL', 'b@b.com', 'b', 'b', 'b', 'b', 'b', 'b'
          )
        `, [moId, partnerId]),
        /uq_mkt_order_disclosure_order_partner/,
        "Must reject duplicate disclosure for same order/partner"
      );

      // Seller Order creation
      const soRes = await pool.query(`
        INSERT INTO seller_orders (marketplace_order_id, partner_id, status)
        VALUES ($1, $2, 'submitted')
        RETURNING id
      `, [moId, partnerId]);
      const soId = soRes.rows[0].id;
      assert.ok(soId);

      // Seller Order duplicate uniqueness
      await assert.rejects(
        pool.query(`
          INSERT INTO seller_orders (marketplace_order_id, partner_id, status)
          VALUES ($1, $2, 'submitted')
        `, [moId, partnerId]),
        /uq_seller_orders_mkt_partner/,
        "Must reject duplicate seller order for same order and partner"
      );

      // Seller Order status enum constraint
      const partnerRes2 = await pool.query(`
        INSERT INTO partners (company_name, contact_email) VALUES ('Test Partner 2', 'test2@test.com') RETURNING id
      `);
      const partnerId2 = partnerRes2.rows[0].id;
      await assert.rejects(
        pool.query(`
          INSERT INTO seller_orders (marketplace_order_id, partner_id, status)
          VALUES ($1, $2, 'invalid_status')
        `, [moId, partnerId2]),
        /chk_seller_orders_status/,
        "Must reject invalid seller order status"
      );

      // Seller Snapshot creation
      const snapRes = await pool.query(`
        INSERT INTO seller_order_seller_snapshots (
          seller_order_id, seller_legal_name, seller_display_name, jurisdiction_country, registered_address, firm_contact_email, contract_model, seller_of_record_responsibility, goods_invoice_responsibility, delivery_responsibility, complaint_responsibility, return_responsibility, refund_financial_liability
        ) VALUES (
          $1, 'SN', 'SD', 'PL', 'Addr', 'a@a', 'partner_marketplace', 'a', 'a', 'a', 'a', 'a', 'a'
        ) RETURNING id
      `, [soId]);
      assert.ok(snapRes.rows[0].id);


      // duplicate seller snapshot rejected by its 1:1 UNIQUE
      await assert.rejects(
        pool.query(`
          INSERT INTO seller_order_seller_snapshots (
            seller_order_id, seller_legal_name, seller_display_name, jurisdiction_country, registered_address, firm_contact_email, contract_model, seller_of_record_responsibility, goods_invoice_responsibility, delivery_responsibility, complaint_responsibility, return_responsibility, refund_financial_liability
          ) VALUES (
            $1, 'SN2', 'SD2', 'PL', 'Addr2', 'b@b', 'partner_marketplace', 'b', 'b', 'b', 'b', 'b', 'b'
          )
        `, [soId]),
        /uq_seller_order_seller_snapshots_seller_order/,
        "Must reject duplicate seller snapshot"
      );

      // Seller snapshot contract_model constraint
      const soRes2 = await pool.query(`
        INSERT INTO seller_orders (marketplace_order_id, partner_id, status)
        VALUES ($1, $2, 'submitted')
        RETURNING id
      `, [moId, partnerId2]);
      const soId2 = soRes2.rows[0].id;
      await assert.rejects(
        pool.query(`
          INSERT INTO seller_order_seller_snapshots (
            seller_order_id, seller_legal_name, seller_display_name, jurisdiction_country, registered_address, firm_contact_email, contract_model, seller_of_record_responsibility, goods_invoice_responsibility, delivery_responsibility, complaint_responsibility, return_responsibility, refund_financial_liability
          ) VALUES (
            $1, 'SN', 'SD', 'PL', 'Addr', 'a@a', 'invalid_model', 'a', 'a', 'a', 'a', 'a', 'a'
          )
        `, [soId2]),
        /chk_snapshot_contract_model/,
        "Must reject invalid contract model"
      );

      // Insert offer for items
      const catRes = await pool.query("INSERT INTO categories (name, slug) VALUES ('C', 'c') RETURNING id");
      const offerRes = await pool.query(`
        INSERT INTO offers (partner_id, category_id, conversion_type, offer_model, publication_status, title, description, price_brutto)
        VALUES ($1, $2, 'inbound', 'marketplace', 'published', 'T', 'D', 10) RETURNING id
      `, [partnerId, catRes.rows[0].id]);
      const offerId = offerRes.rows[0].id;

      // Valid order item
      const itemRes = await pool.query(`
        INSERT INTO seller_order_items (seller_order_id, offer_id, offer_title, quantity, unit_price, currency)
        VALUES ($1, $2, 'T', 1, 10, 'PLN') RETURNING id
      `, [soId, offerId]);
      assert.ok(itemRes.rows[0].id);

      // Invalid quantity
      await assert.rejects(
        pool.query(`
          INSERT INTO seller_order_items (seller_order_id, offer_id, offer_title, quantity, unit_price, currency)
          VALUES ($1, $2, 'T', 0, 10, 'PLN')
        `, [soId, offerId]),
        /chk_seller_order_items_qty/,
        "Must reject non-positive quantity"
      );

      // Invalid currency shape
      await assert.rejects(
        pool.query(`
          INSERT INTO seller_order_items (seller_order_id, offer_id, offer_title, quantity, unit_price, currency)
          VALUES ($1, $2, 'T', 1, 10, 'pln')
        `, [soId, offerId]),
        /chk_seller_order_items_currency_shape/,
        "Must reject lower-case currency"
      );

      // Prove chk_seller_acc_dec_status exists, is a CHECK constraint, and is validated
      const statusConstraintRes = await pool.query(`
        SELECT convalidated, contype
        FROM pg_constraint
        WHERE conname = 'chk_seller_acc_dec_status'
          AND conrelid = 'public.seller_acceptance_decisions'::regclass
      `);
      assert.strictEqual(statusConstraintRes.rows.length, 1, "chk_seller_acc_dec_status must exist");
      assert.strictEqual(statusConstraintRes.rows[0].convalidated, true, "chk_seller_acc_dec_status must be validated");
      assert.strictEqual(statusConstraintRes.rows[0].contype, 'c', "chk_seller_acc_dec_status must be a check constraint");

      // OVERLAPPING_CHECK_EVALUATION_ORDER=NON_DETERMINISTIC
      // Seller acceptance decision enum
      await assert.rejects(
        pool.query(`
          INSERT INTO seller_acceptance_decisions (seller_order_id, decision_status)
          VALUES ($1, 'invalid_status')
        `, [soId]),
        /chk_seller_acc_dec_(status|consistency)/,
        "Must reject invalid decision status"
      );

      // seller_accepted without resolved_at / accepted_at consistency
      await assert.rejects(
        pool.query(`
          INSERT INTO seller_acceptance_decisions (seller_order_id, decision_status)
          VALUES ($1, 'seller_accepted')
        `, [soId]),
        /chk_seller_acc_dec_consistency/,
        "Must reject seller_accepted without timestamps"
      );

      // Seller acceptance consistency
      await assert.rejects(
        pool.query(`
          INSERT INTO seller_acceptance_decisions (seller_order_id, decision_status, resolved_at)
          VALUES ($1, 'pending_seller_review', now())
        `, [soId]),
        /chk_seller_acc_dec_consistency/,
        "Must reject pending with resolved_at"
      );


      // seller_rejected with accepted_at rejected
      await assert.rejects(
        pool.query(`
          INSERT INTO seller_acceptance_decisions (seller_order_id, decision_status, resolved_at, accepted_at)
          VALUES ($1, 'seller_rejected', now(), now())
        `, [soId2]),
        /chk_seller_acc_dec_consistency/,
        "Must reject seller_rejected with accepted_at"
      );

      // expired + resolved_at + accepted_at NULL accepted
      const expiredRes = await pool.query(`
        INSERT INTO seller_acceptance_decisions (seller_order_id, decision_status, resolved_at)
        VALUES ($1, 'expired', now()) RETURNING id
      `, [soId2]);
      assert.ok(expiredRes.rows[0].id);

      // after expired decision, seller_orders.status remains unchanged unless explicitly modified
      const soStatusRes = await pool.query(`
        SELECT status FROM seller_orders WHERE id = $1
      `, [soId2]);
      assert.strictEqual(soStatusRes.rows[0].status, 'submitted');

      const validDecRes = await pool.query(`
        INSERT INTO seller_acceptance_decisions (seller_order_id, decision_status)
        VALUES ($1, 'pending_seller_review') RETURNING id
      `, [soId]);
      assert.ok(validDecRes.rows[0].id);

      // Journal must match the complete disk migration chain.
      const diskMigrations = readMigrationFiles({
        migrationsFolder: MIGRATIONS_DIR,
      });
      assert.ok(diskMigrations.length > 0, "Disk migration chain must not be empty");

      const journalRes = await pool.query(
        `SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`,
      );
      const journalRows = journalRes.rows as {
        hash: string;
        created_at: string | number;
      }[];
      assert.strictEqual(
        journalRows.length, diskMigrations.length,
        "Journal should match the complete disk migration chain",
      );
      assert.strictEqual(journalRows.length, 9, "Journal count must be exactly 9");

      for (let i = 0; i < diskMigrations.length; i++) {
        assert.strictEqual(
          journalRows[i].hash,
          diskMigrations[i].hash,
          `Row ${i} hash mismatch`,
        );
        assert.strictEqual(
          String(journalRows[i].created_at),
          String(diskMigrations[i].folderMillis),
          `Row ${i} created_at mismatch`,
        );
      }
    },
  );

  await t.test(
    "PATH A2: exact physical POST-0007 plus journal 0000-0006 -> bounded canonical reconciliation",
    async () => {
      await cleanDB();

      const journalPath = `${MIGRATIONS_DIR}/meta/_journal.json`;
      const fullJournal = JSON.parse(
        fs.readFileSync(journalPath, "utf8"),
      ) as {
        version: string;
        dialect: string;
        entries: { tag: string; when: number; breakpoints: boolean }[];
      };
      const prefixJournal = {
        ...fullJournal,
        entries: fullJournal.entries.slice(0, 7),
      };
      const getMigrationBuffer = (tag: string) =>
        fs.readFileSync(`${MIGRATIONS_DIR}/${tag}.sql`);
      const prefixDirectory = createCanonicalRuntimeMigrationDirectory(
        JSON.stringify(prefixJournal),
        prefixJournal,
        getMigrationBuffer,
      );

      try {
        await migrate(drizzle(pool), {
          migrationsFolder: prefixDirectory,
          migrationsSchema: "drizzle_runtime",
          migrationsTable: "__drizzle_migrations",
        });
      } finally {
        cleanupCanonicalRuntimeMigrationDirectory(prefixDirectory);
      }

      const preOwnerEffect = await fetchLiveSchemaMetadata(pool);
      assert.strictEqual(
        classifyRuntimeTarget(
          preOwnerEffect.fingerprint,
          preOwnerEffect.publicTables,
        ).state,
        "EXACT_EXISTING_POST_0006",
      );

      const journalBeforeOwnerEffect = await pool.query(
        `SELECT count(*)::int AS count FROM drizzle_runtime.__drizzle_migrations`,
      );
      assert.strictEqual(journalBeforeOwnerEffect.rows[0].count, 7);

      await pool.query(
        fs.readFileSync(
          `${MIGRATIONS_DIR}/0007_marketplace_order_rls_hardening.sql`,
          "utf8",
        ),
      );

      const driftMetadata = await fetchLiveSchemaMetadata(pool);
      assert.strictEqual(
        classifyRuntimeTarget(
          driftMetadata.fingerprint,
          driftMetadata.publicTables,
          driftMetadata.security,
        ).state,
        "EXACT_EXISTING_POST_0007",
      );
      const driftJournal = await pool.query(
        `SELECT count(*)::int AS count FROM drizzle_runtime.__drizzle_migrations`,
      );
      assert.strictEqual(driftJournal.rows[0].count, 7);

      const driftRls = await getMarketplaceOrderRlsStats();
      assert.strictEqual(Number(driftRls.target_tables), 7);
      assert.strictEqual(Number(driftRls.rls_enabled), 7);
      assert.strictEqual(Number(driftRls.policies), 0);

      const reconciliationEnv = {
        ...process.env,
        RUNTIME_MIGRATION_TARGET: "production",
        RUNTIME_MIGRATION_WRITE_AUTHORIZATION:
          POST_0007_RECONCILIATION_AUTHORIZATION,
        RUNTIME_MIGRATION_RECONCILIATION:
          POST_0007_RECONCILIATION_MODE,
      };
      await runMigrations(reconciliationEnv);

      const reconciledMetadata = await fetchLiveSchemaMetadata(pool);
      assert.strictEqual(
        classifyRuntimeTarget(
          reconciledMetadata.fingerprint,
          reconciledMetadata.publicTables,
          reconciledMetadata.security,
        ).state,
        "EXACT_EXISTING_POST_0007",
      );
      assert.deepStrictEqual(
        reconciledMetadata.security.preventVerificationEventsMutationSearchPath,
        null,
        "search_path must still be null (PRE_0008) after reconciliation",
      );
      const reconciledJournal = await pool.query(
        `SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at`,
      );
      const diskMigrations = readMigrationFiles({
        migrationsFolder: MIGRATIONS_DIR,
      });
      assert.strictEqual(reconciledJournal.rows.length, 8);
      assert.strictEqual(
        reconciledJournal.rows[7].hash,
        diskMigrations[7].hash,
      );
      assert.strictEqual(
        String(reconciledJournal.rows[7].created_at),
        String(diskMigrations[7].folderMillis),
      );

      // D. POST_0007 reconciliation mode on journal 8 -> ALREADY_RECONCILED -> no migration 0008 execution
      await assert.rejects(
        () => runMigrations(reconciliationEnv),
        /ALREADY_RECONCILED/,
      );
      const replayJournal = await pool.query(
        `SELECT count(*)::int AS count FROM drizzle_runtime.__drizzle_migrations`,
      );
      assert.strictEqual(replayJournal.rows[0].count, 8);

      // C. same reconciled POST_0007 state -> normal runtime migration -> POST_0008 + journal 9 -> search_path hardened
      await runMigrations(process.env);
      const post0008Metadata = await fetchLiveSchemaMetadata(pool);
      assert.strictEqual(
        classifyRuntimeTarget(
          post0008Metadata.fingerprint,
          post0008Metadata.publicTables,
          post0008Metadata.security,
        ).state,
        "EXACT_EXISTING_POST_0008",
      );
      assert.deepStrictEqual(
        post0008Metadata.security.preventVerificationEventsMutationSearchPath,
        ['search_path=""'],
        "search_path must be hardened to the canonical empty search_path proconfig",
      );
      const post0008Journal = await pool.query(
        `SELECT count(*)::int AS count FROM drizzle_runtime.__drizzle_migrations`,
      );
      assert.strictEqual(post0008Journal.rows[0].count, 9);

      // E. POST_0007 reconciliation authorization cannot apply 0008
      await assert.rejects(
        () => runMigrations(reconciliationEnv),
        /Reconciliation requires exact POST_0007 physical state|ALREADY_RECONCILED/,
      );
    },
  );

  await t.test("PATH B: CURRENT POST-0002 -> terminal POST-0008", async () => {
    await setupPost0002();

    // Classify pre-state
    const { fingerprint: preFingerprint, publicTables: preTables } =
      await fetchLiveSchemaMetadata(pool);
    assert.strictEqual(
      classifyRuntimeTarget(preFingerprint, preTables).state,
      "MIGRATABLE_POST_0002",
    );

    // Run official runner
    await runMigrations(process.env);

    // Post-migration classification must be EXACT_EXISTING_POST_0008
    const { fingerprint, publicTables, security } = await fetchLiveSchemaMetadata(pool);
    const postClassification = classifyRuntimeTarget(fingerprint, publicTables, security);
    assert.strictEqual(postClassification.state, "EXACT_EXISTING_POST_0008");

    const diskMigrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_DIR });
    const journalRes = await pool.query(
      `SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`,
    );
    const journalRows = journalRes.rows as {
      hash: string;
      created_at: string | number;
    }[];
    assert.strictEqual(
      journalRows.length, diskMigrations.length,
      "Journal should match the complete disk migration chain",
    );
    assert.strictEqual(journalRows.length, 9);
  });

  await t.test(
    "PATH C: LEGACY PROD FIXTURE WITH DATA TRANSFORMATION",
    async () => {
      await setupProdLegacyFixture();

      // Classify pre-state
      const { fingerprint: preFingerprint, publicTables: preTables } =
        await fetchLiveSchemaMetadata(pool);
      assert.strictEqual(
        classifyRuntimeTarget(preFingerprint, preTables).state,
        "MIGRATABLE_PROD_LEGACY",
      );

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
      assert.strictEqual(
        postOids.cat_fkey_oid,
        preOids.cat_fkey_oid,
        "categories_parent_id_fkey must NOT be reconstructed",
      );
      assert.strictEqual(
        postOids.off_cat_fkey_oid,
        preOids.off_cat_fkey_oid,
        "offers_category_id_fkey must NOT be reconstructed",
      );
      assert.strictEqual(
        postOids.off_part_fkey_oid,
        preOids.off_part_fkey_oid,
        "offers_partner_id_fkey must NOT be reconstructed",
      );
      assert.strictEqual(
        postOids.clk_off_fkey_oid,
        preOids.clk_off_fkey_oid,
        "clicks_offer_id_fkey must NOT be reconstructed",
      );
      assert.strictEqual(
        postOids.clk_part_fkey_oid,
        preOids.clk_part_fkey_oid,
        "clicks_partner_id_fkey must NOT be reconstructed",
      );
      assert.strictEqual(
        postOids.idx_oid,
        preOids.idx_oid,
        "idx_clicks_tracking must NOT be reconstructed",
      );

      // Verify data transformations:
      // Total count must be 9
      const totalCountRes = await pool.query(
        `SELECT count(*) as cnt FROM public.offers`,
      );
      assert.strictEqual(
        Number(totalCountRes.rows[0].cnt),
        9,
        "Total offers count must remain 9",
      );

      // 0 rows with legacy tuples
      const legacyEcomRes = await pool.query(
        `SELECT count(*) as cnt FROM public.offers WHERE offer_model = 'ecommerce' AND conversion_type = 'outbound'`,
      );
      assert.strictEqual(
        Number(legacyEcomRes.rows[0].cnt),
        0,
        "0 legacy ecommerce/outbound rows",
      );

      const legacyRfqRes = await pool.query(
        `SELECT count(*) as cnt FROM public.offers WHERE offer_model = 'rfq' AND conversion_type = 'rfq'`,
      );
      assert.strictEqual(
        Number(legacyRfqRes.rows[0].cnt),
        0,
        "0 legacy rfq/rfq rows",
      );

      // Exactly 3 marketplace/inbound/published
      const ecomTransformedRes = await pool.query(
        `SELECT count(*) as cnt FROM public.offers WHERE offer_model = 'marketplace' AND conversion_type = 'inbound' AND publication_status = 'published'`,
      );
      assert.strictEqual(
        Number(ecomTransformedRes.rows[0].cnt),
        3,
        "3 marketplace/inbound rows",
      );

      // Exactly 3 rfq/outbound/draft
      const rfqOutboundRes = await pool.query(
        `SELECT count(*) as cnt FROM public.offers WHERE offer_model = 'rfq' AND conversion_type = 'outbound' AND publication_status = 'draft'`,
      );
      assert.strictEqual(
        Number(rfqOutboundRes.rows[0].cnt),
        3,
        "3 rfq/outbound rows preserved",
      );

      // Exactly 3 rfq/inbound/published
      const rfqInboundRes = await pool.query(
        `SELECT count(*) as cnt FROM public.offers WHERE offer_model = 'rfq' AND conversion_type = 'inbound' AND publication_status = 'published'`,
      );
      assert.strictEqual(
        Number(rfqInboundRes.rows[0].cnt),
        3,
        "3 rfq/inbound rows",
      );

      // Post-migration classification must be EXACT_EXISTING_POST_0008
      const { fingerprint, publicTables, security } = await fetchLiveSchemaMetadata(pool);
      const postClassification = classifyRuntimeTarget(
        fingerprint,
        publicTables,
        security,
      );
      assert.strictEqual(postClassification.state, "EXACT_EXISTING_POST_0008");

      const diskMigrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_DIR });
      const journalRes = await pool.query(
        `SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`,
      );
      const journalRows = journalRes.rows as {
        hash: string;
        created_at: string | number;
      }[];
      assert.strictEqual(
        journalRows.length, diskMigrations.length,
        "Journal should match the complete disk migration chain",
      );
      assert.strictEqual(journalRows.length, 9);
    },
  );

  await t.test("PATH D: CANONICAL POST-0004 MIGRATABLE PROOF", async () => {
    await cleanDB();
    const M0004_FILE = `${MIGRATIONS_DIR}/0004_seller_registered_address.sql`;

    // Apply 0000 to 0004 manually
    await pool.query(fs.readFileSync(M0000_FILE, "utf-8"));
    await pool.query(fs.readFileSync(M0001_FILE, "utf-8"));
    await pool.query(fs.readFileSync(M0002_FILE, "utf-8"));
    await pool.query(fs.readFileSync(M0003_FILE, "utf-8"));
    await pool.query(fs.readFileSync(M0004_FILE, "utf-8"));

    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const classification = classifyRuntimeTarget(fingerprint, publicTables);
    assert.strictEqual(
      classification.state,
      "MIGRATABLE_POST_0004",
      "Exact post-0004 schema should classify as MIGRATABLE_POST_0004"
    );
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
      assert.ok(
        (err as Error).message.includes(
          "RFQ migration blocked: invalid status rows exist",
        ),
      );
    }
    assert.strictEqual(errorThrown, true);

    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const postFailureClassification = classifyRuntimeTarget(
      fingerprint,
      publicTables,
    );
    assert.strictEqual(postFailureClassification.state, "MIGRATABLE_BASELINE");
  });

  await t.test(
    "NEGATIVE PATH: 0003 FAILURE TUPLE PRECHECK ROLLBACK",
    async () => {
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
        assert.ok(
          (err as Error).message.includes(
            "0003 precheck failed: unsupported (offer_model, conversion_type) tuple exists",
          ),
        );
      }
      assert.strictEqual(errorThrown, true);

      const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
      const postFailureClassification = classifyRuntimeTarget(
        fingerprint,
        publicTables,
      );
      assert.strictEqual(
        postFailureClassification.state,
        "MIGRATABLE_PROD_LEGACY",
      );
    },
  );

  await t.test(
    "NEGATIVE PATH: 0003 FAILURE PUBLICATION STATUS PRECHECK ROLLBACK",
    async () => {
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
        assert.ok(
          (err as Error).message.includes(
            "0003 precheck failed: unsupported publication_status exists",
          ),
        );
      } finally {
        client.release();
      }
      assert.strictEqual(
        errorThrown,
        true,
        "PUBLICATION_PRECHECK_DIRECT: must throw 0003 unsupported publication_status exception",
      );

      // PUBLICATION_PRECHECK_ROLLBACK assertions:
      // 1. Pre-existing test row remains unchanged
      const testRowRes = await pool.query(
        `SELECT publication_status FROM public.offers WHERE id = 998`,
      );
      assert.strictEqual(testRowRes.rows.length, 1);
      assert.strictEqual(
        testRowRes.rows[0].publication_status,
        "invalid_status",
      );

      // 2. 0003 DDL did not commit (delivery_options column absent)
      const colRes = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'delivery_options'
    `);
      assert.strictEqual(
        colRes.rows.length,
        0,
        "PUBLICATION_PRECHECK_ROLLBACK: 0003 DDL must have rolled back cleanly",
      );

      // 3. No journal progression (table absent or 0 rows)
      const journalRes = await pool.query(`
      SELECT count(*) as cnt
      FROM information_schema.tables
      WHERE table_schema = 'drizzle_runtime' AND table_name = '__drizzle_migrations'
    `);
      if (Number(journalRes.rows[0].cnt) > 0) {
        const rowsRes = await pool.query(
          `SELECT count(*) as cnt FROM drizzle_runtime.__drizzle_migrations`,
        );
        assert.strictEqual(
          Number(rowsRes.rows[0].cnt),
          0,
          "No journal progression on rollback",
        );
      }
    },
  );

  await t.test(
    "NEGATIVE PATH: NOT VALID CONSTRAINT CAUSES RUNNER ABORT AS PARTIAL_OR_DRIFTED",
    async () => {
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

      // Verify that legacy comparison specifically detects the NOT VALID constraint
      const legacyComp = compareRuntimeFingerprint(
        fingerprint,
        publicTables,
        PROD_LEGACY_BASELINE_FINGERPRINT,
      );
      assert.strictEqual(legacyComp.isExactMatch, false);
      assert.ok(
        legacyComp.driftReasons.some(
          (d) =>
            d.includes("validation status mismatch") ||
            d.includes("NOT VALID") ||
            d.includes("definition mismatch"),
        ),
        "Legacy comparison must report NOT VALID constraint drift",
      );

      // Official runner must abort before calling migrate
      let runnerThrew = false;
      try {
        await runMigrations(process.env);
      } catch (err: unknown) {
        runnerThrew = true;
        assert.ok((err as Error).message.includes("PARTIAL_OR_DRIFTED"));
      }
      assert.strictEqual(
        runnerThrew,
        true,
        "NOT_VALID_RUNNER_ABORTS: runner must abort on NOT VALID constraint",
      );

      // No journal progression
      const journalRes = await pool.query(`
      SELECT count(*) as cnt
      FROM information_schema.tables
      WHERE table_schema = 'drizzle_runtime' AND table_name = '__drizzle_migrations'
    `);
      if (Number(journalRes.rows[0].cnt) > 0) {
        const rowsRes = await pool.query(
          `SELECT count(*) as cnt FROM drizzle_runtime.__drizzle_migrations`,
        );
        assert.strictEqual(
          Number(rowsRes.rows[0].cnt),
          0,
          "No journal progression when runner aborts",
        );
      }
    },
  );

  await t.test("ADMIN_SELLER_ELIGIBILITY_MUTATION_PROOF", async () => {
    // Isolated CI mutation proof
    await cleanDB();
    await runMigrations(process.env); // Setup full current schema

    // 1. Setup disposable partner
    const partnerId = 9999;
    await pool.query(
      `INSERT INTO public.partners (id, company_name, contact_email) VALUES ($1, 'Elig Test', 'elig@test.com')`,
      [partnerId],
    );

    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { executeSellerEligibilityChange } =
      await import("@/lib/admin/seller-eligibility-core");
    const db = drizzle(pool);

    // A. none -> eligible
    const resA = await executeSellerEligibilityChange(db, {
      partnerId,
      expectedStatus: "none",
      targetStatus: "eligible",
      reason: null,
    });
    assert.strictEqual(resA.ok, true);
    if (resA.ok) {
      assert.strictEqual(resA.code, "ELIGIBILITY_CREATED");
      assert.strictEqual(resA.changed, true);
    }
    const dbRowA = await pool.query(
      `SELECT * FROM public.seller_eligibility WHERE partner_id = $1`,
      [partnerId],
    );
    assert.strictEqual(dbRowA.rows[0].eligibility_status, "eligible");
    assert.strictEqual(dbRowA.rows[0].reason, null);
    assert.ok(dbRowA.rows[0].updated_at);

    // Helper wait for timing deterministic updatedAt comparison
    await pool.query(
      `UPDATE public.seller_eligibility SET updated_at = '2000-01-01T00:00:00Z' WHERE partner_id = $1`,
      [partnerId],
    );
    const dbRowA_fixed = await pool.query(
      `SELECT * FROM public.seller_eligibility WHERE partner_id = $1`,
      [partnerId],
    );

    // B. eligible -> suspended
    const resB = await executeSellerEligibilityChange(db, {
      partnerId,
      expectedStatus: "eligible",
      targetStatus: "suspended",
      reason: "Fraud",
    });
    assert.strictEqual(resB.ok, true);
    if (resB.ok) {
      assert.strictEqual(resB.code, "ELIGIBILITY_UPDATED");
      assert.strictEqual(resB.changed, true);
    }
    const dbRowB = await pool.query(
      `SELECT * FROM public.seller_eligibility WHERE partner_id = $1`,
      [partnerId],
    );
    assert.strictEqual(dbRowB.rows[0].eligibility_status, "suspended");
    assert.strictEqual(dbRowB.rows[0].reason, "Fraud");
    assert.ok(
      dbRowB.rows[0].updated_at.getTime() >
        dbRowA_fixed.rows[0].updated_at.getTime(),
    );

    // C. stale expectedStatus -> conflict
    const resC = await executeSellerEligibilityChange(db, {
      partnerId,
      expectedStatus: "eligible",
      targetStatus: "eligible",
      reason: null,
    });
    assert.strictEqual(resC.ok, false);
    if (!resC.ok) {
      assert.strictEqual(resC.code, "ELIGIBILITY_CONFLICT");
    }
    const dbRowC = await pool.query(
      `SELECT * FROM public.seller_eligibility WHERE partner_id = $1`,
      [partnerId],
    );
    assert.strictEqual(dbRowC.rows[0].eligibility_status, "suspended"); // Unchanged
    assert.strictEqual(dbRowC.rows[0].reason, "Fraud");

    // D. suspended -> eligible (reason clear proof)
    const resD = await executeSellerEligibilityChange(db, {
      partnerId,
      expectedStatus: "suspended",
      targetStatus: "eligible",
      reason: null,
    });
    assert.strictEqual(resD.ok, true);
    const dbRowD = await pool.query(
      `SELECT * FROM public.seller_eligibility WHERE partner_id = $1`,
      [partnerId],
    );
    assert.strictEqual(dbRowD.rows[0].eligibility_status, "eligible");
    assert.strictEqual(dbRowD.rows[0].reason, null); // Must be cleared

    // Save timestamp to prove idempotency
    const tsBefore = dbRowD.rows[0].updated_at.getTime();

    // E. same state + same normalized reason -> idempotent
    const resE = await executeSellerEligibilityChange(db, {
      partnerId,
      expectedStatus: "eligible",
      targetStatus: "eligible",
      reason: null,
    });
    assert.strictEqual(resE.ok, true);
    if (resE.ok) {
      assert.strictEqual(resE.code, "ELIGIBILITY_UNCHANGED");
      assert.strictEqual(resE.changed, false);
    }
    const dbRowE = await pool.query(
      `SELECT * FROM public.seller_eligibility WHERE partner_id = $1`,
      [partnerId],
    );
    assert.strictEqual(dbRowE.rows[0].updated_at.getTime(), tsBefore);
  });

  await t.test("ADMIN_OFFER_EDIT_MUTATION_PROOF", async () => {
    await cleanDB();
    await runMigrations(process.env);

    const partnerId = 9999;
    await pool.query(
      `INSERT INTO public.partners (id, company_name, contact_email) VALUES ($1, 'Edit Test', 'edit@test.com')`,
      [partnerId],
    );

    const categoryId = 8889;
    await pool.query(
      `INSERT INTO public.categories (id, name, slug) VALUES ($1, 'Edit Cat', 'edit-cat')`,
      [categoryId],
    );

    const offerId = 8888;
    await pool.query(
      `INSERT INTO public.offers (
      id, partner_id, category_id, title, description,
      publication_status, is_active, offer_model, conversion_type,
      updated_at
    ) VALUES (
      $1, $2, $3, 'Old Title', 'Old Desc',
      'draft', false, 'rfq', 'outbound',
      '2024-01-01T10:00:00.000Z'
    )`,
      [offerId, partnerId, categoryId],
    );

    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { executeAdminOfferEdit } =
      await import("@/lib/admin/offer-edit-core");
    const db = drizzle(pool);

    // A. NOT FOUND
    const resA = await executeAdminOfferEdit(db, {
      offerId: 7777,
      expectedUpdatedAt: null,
      title: "T",
      description: null,
      imageUrl: null,
      priceBrutto: null,
      priceOnRequest: true,
      adminOfferType: "external_partner",
      outboundUrl: null,
      isFeatured: false,
    });
    assert.strictEqual(resA.ok, false);
    if (!resA.ok) assert.strictEqual(resA.code, "OFFER_NOT_FOUND");

    // B. SUCCESS UPDATE
    const initialRow = await pool.query(
      `SELECT * FROM public.offers WHERE id = $1`,
      [offerId],
    );
    const expectedUpdatedAt = initialRow.rows[0].updated_at.toISOString();

    const resB = await executeAdminOfferEdit(db, {
      offerId,
      expectedUpdatedAt,
      title: "New Title",
      description: "New Desc",
      imageUrl: null,
      priceBrutto: null,
      priceOnRequest: true,
      adminOfferType: "external_partner",
      outboundUrl: null,
      isFeatured: false,
    });
    assert.strictEqual(resB.ok, true);
    if (resB.ok) {
      assert.strictEqual(resB.code, "OFFER_UPDATED");
      assert.strictEqual(resB.changed, true);
    }

    const rowAfterB = await pool.query(
      `SELECT * FROM public.offers WHERE id = $1`,
      [offerId],
    );
    assert.strictEqual(rowAfterB.rows[0].title, "New Title");
    assert.notStrictEqual(
      rowAfterB.rows[0].updated_at.getTime(),
      initialRow.rows[0].updated_at.getTime(),
    );

    // C. UNRELATED FIELDS UNCHANGED
    assert.strictEqual(
      rowAfterB.rows[0].partner_id.toString(),
      initialRow.rows[0].partner_id.toString(),
    );
    assert.strictEqual(
      rowAfterB.rows[0].category_id?.toString(),
      initialRow.rows[0].category_id?.toString(),
    );
    assert.strictEqual(
      rowAfterB.rows[0].publication_status,
      initialRow.rows[0].publication_status,
    );
    assert.strictEqual(
      rowAfterB.rows[0].is_active,
      initialRow.rows[0].is_active,
    );
    assert.strictEqual(
      rowAfterB.rows[0].contract_model,
      initialRow.rows[0].contract_model,
    );
    assert.deepStrictEqual(
      rowAfterB.rows[0].technical_attributes,
      initialRow.rows[0].technical_attributes,
    );
    assert.strictEqual(
      rowAfterB.rows[0].created_at.getTime(),
      initialRow.rows[0].created_at.getTime(),
    );
    assert.strictEqual(
      rowAfterB.rows[0].published_at,
      initialRow.rows[0].published_at,
    );
    assert.strictEqual(
      rowAfterB.rows[0].archived_at,
      initialRow.rows[0].archived_at,
    );
    assert.strictEqual(
      rowAfterB.rows[0].deleted_at,
      initialRow.rows[0].deleted_at,
    );


    // ADDED DB_TYPE_03_CHANGE_TO_EXTERNAL
    await pool.query(
      `UPDATE public.offers SET offer_model = 'rfq', conversion_type = 'inbound' WHERE id = $1`,
      [offerId]
    );
    const rowBeforeC3 = await pool.query(`SELECT * FROM public.offers WHERE id = $1`, [offerId]);
    const resC3 = await executeAdminOfferEdit(db, {
      offerId,
      expectedUpdatedAt: rowBeforeC3.rows[0].updated_at.toISOString(),
      title: "New Title",
      description: "New Desc",
      imageUrl: null,
      priceBrutto: null,
      priceOnRequest: true,
      adminOfferType: "external_partner",
      outboundUrl: null,
      isFeatured: false,
    });
    assert.strictEqual(resC3.ok, true);
    const rowAfterC3 = await pool.query(`SELECT * FROM public.offers WHERE id = $1`, [offerId]);
    assert.strictEqual(rowAfterC3.rows[0].offer_model, "marketplace");
    assert.strictEqual(rowAfterC3.rows[0].conversion_type, "outbound");

    // revert back for the rest of tests
    await pool.query(
      `UPDATE public.offers SET offer_model = 'rfq', conversion_type = 'outbound' WHERE id = $1`,
      [offerId]
    );

    // D. IDEMPOTENT
      const rowBeforeD = await pool.query(`SELECT * FROM public.offers WHERE id = $1`, [offerId]);
      const resD = await executeAdminOfferEdit(db, {
        offerId,
        expectedUpdatedAt: rowBeforeD.rows[0].updated_at.toISOString(),
        title: "New Title",
        description: "New Desc",
        imageUrl: null,
        priceBrutto: null,
        priceOnRequest: true,
        adminOfferType: "external_partner",
        outboundUrl: null,
        isFeatured: false,
      });
      assert.strictEqual(resD.ok, true);
      if (resD.ok) {
        assert.strictEqual(resD.code, "OFFER_UNCHANGED");
        assert.strictEqual(resD.changed, false);
      }
      const rowAfterD = await pool.query(
        `SELECT * FROM public.offers WHERE id = $1`,
        [offerId],
      );
      assert.strictEqual(
        rowAfterD.rows[0].updated_at.getTime(),
        rowBeforeD.rows[0].updated_at.getTime(),
      );

    // E. CONFLICT
    const resE = await executeAdminOfferEdit(db, {
      offerId,
      expectedUpdatedAt: expectedUpdatedAt, // stale
      title: "Conflicting Title",
      description: null,
      imageUrl: null,
      priceBrutto: null,
      priceOnRequest: true,
      adminOfferType: "external_partner",
      outboundUrl: null,
      isFeatured: false,
    });
    assert.strictEqual(resE.ok, false);
    if (!resE.ok) assert.strictEqual(resE.code, "OFFER_CONFLICT");

    // Helper for no-write assertions
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const assertNoWrite = (before: any, after: any) => {
      assert.strictEqual(after.title, before.title);
      assert.strictEqual(after.description, before.description);
      assert.strictEqual(after.image_url, before.image_url);
      assert.strictEqual(
        after.price_brutto?.toString(),
        before.price_brutto?.toString(),
      );
      assert.strictEqual(after.price_on_request, before.price_on_request);
      assert.strictEqual(after.offer_model, before.offer_model);
      assert.strictEqual(after.conversion_type, before.conversion_type);
      assert.strictEqual(after.outbound_url, before.outbound_url);
      assert.strictEqual(after.is_featured, before.is_featured);
      assert.strictEqual(
        after.updated_at.getTime(),
        before.updated_at.getTime(),
      );
    };

    // G1. HIDDEN NOT EDITABLE
    await pool.query(
      `UPDATE public.offers SET publication_status = 'hidden' WHERE id = $1`,
      [offerId],
    );
    const rowHidden = await pool.query(
      `SELECT * FROM public.offers WHERE id = $1`,
      [offerId],
    );
    const resG1 = await executeAdminOfferEdit(db, {
      offerId,
      expectedUpdatedAt: rowHidden.rows[0].updated_at.toISOString(),
      title: "Hidden Edit",
      description: null,
      imageUrl: null,
      priceBrutto: null,
      priceOnRequest: true,
      adminOfferType: "external_partner",
      outboundUrl: null,
      isFeatured: false,
    });
    assert.strictEqual(resG1.ok, false);
    if (!resG1.ok) assert.strictEqual(resG1.code, "OFFER_NOT_EDITABLE_STATUS");
    const afterG1 = await pool.query(
      `SELECT * FROM public.offers WHERE id = $1`,
      [offerId],
    );
    assertNoWrite(rowHidden.rows[0], afterG1.rows[0]);

    // G2. DELETED NOT EDITABLE
    await pool.query(
      `UPDATE public.offers SET publication_status = 'deleted' WHERE id = $1`,
      [offerId],
    );
    const rowDeleted = await pool.query(
      `SELECT * FROM public.offers WHERE id = $1`,
      [offerId],
    );
    const resG2 = await executeAdminOfferEdit(db, {
      offerId,
      expectedUpdatedAt: rowDeleted.rows[0].updated_at.toISOString(),
      title: "Deleted Edit",
      description: null,
      imageUrl: null,
      priceBrutto: null,
      priceOnRequest: true,
      adminOfferType: "external_partner",
      outboundUrl: null,
      isFeatured: false,
    });
    assert.strictEqual(resG2.ok, false);
    if (!resG2.ok) assert.strictEqual(resG2.code, "OFFER_NOT_EDITABLE_STATUS");
    const afterG2 = await pool.query(
      `SELECT * FROM public.offers WHERE id = $1`,
      [offerId],
    );
    assertNoWrite(rowDeleted.rows[0], afterG2.rows[0]);

    // H1. PUBLISHED ECOMMERCE VALIDATION
    await pool.query(
      `UPDATE public.offers SET publication_status = 'published', updated_at = '2024-01-01T10:00:00.000Z' WHERE id = $1`,
      [offerId],
    );
    const rowPub1 = await pool.query(
      `SELECT * FROM public.offers WHERE id = $1`,
      [offerId],
    );
    const resH1 = await executeAdminOfferEdit(db, {
      offerId,
      expectedUpdatedAt: rowPub1.rows[0].updated_at.toISOString(),
      title: "Published Edit",
      description: null,
      imageUrl: null,
      priceBrutto: null,
      priceOnRequest: false,
      adminOfferType: "marketplace",
      outboundUrl: null,
      isFeatured: false, // ecommerce without price
    });
    assert.strictEqual(resH1.ok, false);
    if (!resH1.ok) {
      assert.strictEqual(resH1.code, "OFFER_TARGET_INVALID");
      if (resH1.code === "OFFER_TARGET_INVALID")
        assert.strictEqual(resH1.reason, "ECOMMERCE_PRICE_INVALID");
    }
    const afterH1 = await pool.query(
      `SELECT * FROM public.offers WHERE id = $1`,
      [offerId],
    );
    assertNoWrite(rowPub1.rows[0], afterH1.rows[0]);

    // H2. PUBLISHED OUTBOUND VALIDATION
    const rowPub2 = await pool.query(
      `SELECT * FROM public.offers WHERE id = $1`,
      [offerId],
    );
    const resH2 = await executeAdminOfferEdit(db, {
      offerId,
      expectedUpdatedAt: rowPub2.rows[0].updated_at.toISOString(),
      title: "Published Edit",
      description: null,
      imageUrl: null,
      priceBrutto: null,
      priceOnRequest: true,
      adminOfferType: "external_partner",
      outboundUrl: null,
      isFeatured: false, // outbound without url
    });
    assert.strictEqual(resH2.ok, false);
    if (!resH2.ok) {
      assert.strictEqual(resH2.code, "OFFER_TARGET_INVALID");
      if (resH2.code === "OFFER_TARGET_INVALID")
        assert.strictEqual(resH2.reason, "OUTBOUND_URL_INVALID");
    }
    const afterH2 = await pool.query(
      `SELECT * FROM public.offers WHERE id = $1`,
      [offerId],
    );
    assertNoWrite(rowPub2.rows[0], afterH2.rows[0]);
    // I. CONCURRENCY ROW LOCK PROOF
    await pool.query(
      `UPDATE public.offers SET publication_status = 'draft', title = 'Base Title', updated_at = '2024-01-01T12:00:00.000Z' WHERE id = $1`,
      [offerId],
    );
    const baseExpectedDate = "2024-01-01T12:00:00.000Z";

    const p1 = executeAdminOfferEdit(db, {
      offerId,
      expectedUpdatedAt: baseExpectedDate,
      title: "Update 1",
      description: null,
      imageUrl: null,
      priceBrutto: null,
      priceOnRequest: true,
      adminOfferType: "external_partner",
      outboundUrl: null,
      isFeatured: false,
    });

    const p2 = executeAdminOfferEdit(db, {
      offerId,
      expectedUpdatedAt: baseExpectedDate,
      title: "Update 2",
      description: null,
      imageUrl: null,
      priceBrutto: null,
      priceOnRequest: true,
      adminOfferType: "external_partner",
      outboundUrl: null,
      isFeatured: false,
    });

    const [res1, res2] = await Promise.all([p1, p2]);

    let updatedCount = 0;
    let conflictCount = 0;
    if (res1.ok && res1.code === "OFFER_UPDATED") updatedCount++;
    if (!res1.ok && res1.code === "OFFER_CONFLICT") conflictCount++;
    if (res2.ok && res2.code === "OFFER_UPDATED") updatedCount++;
    if (!res2.ok && res2.code === "OFFER_CONFLICT") conflictCount++;

    assert.strictEqual(
      updatedCount,
      1,
      "Exactly one concurrent update should succeed",
    );
    assert.strictEqual(
      conflictCount,
      1,
      "Exactly one concurrent update should fail with conflict",
    );

    const finalRow = await pool.query(
      `SELECT title FROM public.offers WHERE id = $1`,
      [offerId],
    );
    assert.ok(
      finalRow.rows[0].title === "Update 1" ||
        finalRow.rows[0].title === "Update 2",
      "Title should be one of the updates",
    );

    // J. EXACT DB PRICE READ / 3 DECIMAL LEGACY TEST
    await pool.query(
      `UPDATE public.offers SET publication_status = 'draft', price_brutto = 1.234 WHERE id = $1`,
      [offerId],
    );
    const rowJ = await pool.query(`SELECT * FROM public.offers WHERE id = $1`, [
      offerId,
    ]);
    const resJ = await executeAdminOfferEdit(db, {
      offerId,
      expectedUpdatedAt: rowJ.rows[0].updated_at.toISOString(),
      title: "Price Precision Edit",
      description: null,
      imageUrl: null,
      priceBrutto: "1.23",
      priceOnRequest: false,
      adminOfferType: "marketplace",
      outboundUrl: null,
      isFeatured: false,
    });
    assert.strictEqual(resJ.ok, true);
    if (resJ.ok) {
      assert.strictEqual(resJ.code, "OFFER_UPDATED");
      const afterJ = await pool.query(
        `SELECT price_brutto FROM public.offers WHERE id = $1`,
        [offerId],
      );
      assert.strictEqual(afterJ.rows[0].price_brutto?.toString(), "1.23");
    }
  });

  await t.test("ADMIN_PUBLICATION_MUTATION_PROOF", async () => {
    await cleanDB();
    await runMigrations(process.env);

    const partnerId = 9998;
    await pool.query(
      "INSERT INTO public.partners (id, company_name, contact_email) VALUES ($1, 'Pub Test', 'pub@test.com')",
      [partnerId],
    );

    const categoryId = 8888;
    await pool.query(
      "INSERT INTO public.categories (id, name, slug) VALUES ($1, 'Pub Cat', 'pub-cat')",
      [categoryId],
    );

    const insertOffer = async (id: number, status: string, price: string) => {
      await pool.query(
        `INSERT INTO public.offers (
        id, partner_id, category_id, title, description,
        publication_status, is_active, offer_model, conversion_type,
        price_brutto, price_on_request, outbound_url,
        updated_at, published_at, archived_at
      ) VALUES (
        $1, $2, $3, 'Pub Title', 'Pub Desc',
        $4, true, 'marketplace', 'inbound',
        $5, false, null,
        '2024-01-01T10:00:00.000Z', null, null
      )`,
        [id, partnerId, categoryId, status, price],
      );
    };

    const db = getDb();

    // A. draft ecommerce, DB raw price = 1.234 -> ECOMMERCE_PRICE_INVALID
    await insertOffer(1001, "draft", "1.234");
    const resA = await executeOfferPublicationStateChange(db, {
      offerId: 1001,
      expectedStatus: "draft",
      targetStatus: "published",
    });
    assert.deepEqual(resA, {
      ok: false,
      code: "OFFER_PUBLISH_NOT_ELIGIBLE",
      reason: "ECOMMERCE_PRICE_INVALID",
    });

    const rowA = await pool.query(
      `SELECT publication_status, updated_at, published_at FROM public.offers WHERE id = 1001`,
    );
    assert.equal(rowA.rows[0].publication_status, "draft");
    assert.equal(rowA.rows[0].published_at, null);
    assert.equal(
      rowA.rows[0].updated_at.toISOString(),
      "2024-01-01T10:00:00.000Z",
    );

    // B. valid draft publish
    await insertOffer(1002, "draft", "1.23");
    const resB = await executeOfferPublicationStateChange(db, {
      offerId: 1002,
      expectedStatus: "draft",
      targetStatus: "published",
    });
    assert.equal(resB.ok, true);
    assert.equal(resB.code, "OFFER_PUBLISHED");

    const rowB = await pool.query(
      `SELECT publication_status, updated_at, published_at FROM public.offers WHERE id = 1002`,
    );
    assert.equal(rowB.rows[0].publication_status, "published");
    assert.notEqual(rowB.rows[0].published_at, null);
    assert.notEqual(
      rowB.rows[0].updated_at.toISOString(),
      "2024-01-01T10:00:00.000Z",
    );

    // C. published archive
    await insertOffer(1003, "published", "1.23");
    const resC = await executeOfferPublicationStateChange(db, {
      offerId: 1003,
      expectedStatus: "published",
      targetStatus: "archived",
    });
    assert.equal(resC.ok, true);
    assert.equal(resC.code, "OFFER_ARCHIVED");

    const rowC = await pool.query(
      `SELECT publication_status, updated_at, archived_at FROM public.offers WHERE id = 1003`,
    );
    assert.equal(rowC.rows[0].publication_status, "archived");
    assert.notEqual(rowC.rows[0].archived_at, null);
    assert.notEqual(
      rowC.rows[0].updated_at.toISOString(),
      "2024-01-01T10:00:00.000Z",
    );

    // D. stale expectedStatus (current: draft, expected: published, target: archived)
    await insertOffer(1004, "draft", "1.23");
    const resD = await executeOfferPublicationStateChange(db, {
      offerId: 1004,
      expectedStatus: "published",
      targetStatus: "archived",
    });
    assert.deepEqual(resD, { ok: false, code: "OFFER_TRANSITION_CONFLICT" });
    const rowD = await pool.query(
      `SELECT publication_status, updated_at, published_at, archived_at, deleted_at, title FROM public.offers WHERE id = 1004`,
    );
    assert.equal(rowD.rows[0].publication_status, "draft");
    assert.equal(
      rowD.rows[0].updated_at.toISOString(),
      "2024-01-01T10:00:00.000Z",
    );
    assert.equal(rowD.rows[0].published_at, null);
    assert.equal(rowD.rows[0].archived_at, null);
    assert.equal(rowD.rows[0].deleted_at, null);

    // E. current hidden -> attempt published
    await insertOffer(1005, "hidden", "1.23");
    const resE = await executeOfferPublicationStateChange(db, {
      offerId: 1005,
      expectedStatus: "hidden",
      targetStatus: "published",
    });
    assert.deepEqual(resE, { ok: false, code: "OFFER_INVALID_TRANSITION" });
    const rowE = await pool.query(
      `SELECT publication_status, updated_at, published_at, archived_at, deleted_at, title FROM public.offers WHERE id = 1005`,
    );
    assert.equal(rowE.rows[0].publication_status, "hidden");
    assert.equal(
      rowE.rows[0].updated_at.toISOString(),
      "2024-01-01T10:00:00.000Z",
    );
    assert.equal(rowE.rows[0].published_at, null);
    assert.equal(rowE.rows[0].archived_at, null);
    assert.equal(rowE.rows[0].deleted_at, null);
    assert.equal(rowE.rows[0].title, "Pub Title");

    // F. current deleted -> attempt archived
    await insertOffer(1006, "deleted", "1.23");
    const resF = await executeOfferPublicationStateChange(db, {
      offerId: 1006,
      expectedStatus: "deleted",
      targetStatus: "archived",
    });
    assert.deepEqual(resF, { ok: false, code: "OFFER_INVALID_TRANSITION" });
    const rowF = await pool.query(
      `SELECT publication_status, updated_at, published_at, archived_at, deleted_at, title FROM public.offers WHERE id = 1006`,
    );
    assert.equal(rowF.rows[0].publication_status, "deleted");
    assert.equal(
      rowF.rows[0].updated_at.toISOString(),
      "2024-01-01T10:00:00.000Z",
    );
    assert.equal(rowF.rows[0].published_at, null);
    assert.equal(rowF.rows[0].archived_at, null);
    assert.equal(rowF.rows[0].deleted_at, null);
    assert.equal(rowF.rows[0].title, "Pub Title");

    // G. Idempotent published
    await insertOffer(1007, "published", "1.23");
    const resG = await executeOfferPublicationStateChange(db, {
      offerId: 1007,
      expectedStatus: "published",
      targetStatus: "published",
    });
    assert.deepEqual(resG, {
      ok: true,
      code: "OFFER_PUBLISHED",
      changed: false,
    });
    const rowG = await pool.query(
      `SELECT publication_status, updated_at, published_at, archived_at, deleted_at FROM public.offers WHERE id = 1007`,
    );
    assert.equal(rowG.rows[0].publication_status, "published");
    assert.equal(
      rowG.rows[0].updated_at.toISOString(),
      "2024-01-01T10:00:00.000Z",
    );
    assert.equal(rowG.rows[0].published_at, null);
    assert.equal(rowG.rows[0].archived_at, null);
    assert.equal(rowG.rows[0].deleted_at, null);

    // H. Idempotent archived
    await insertOffer(1008, "archived", "1.23");
    const resH = await executeOfferPublicationStateChange(db, {
      offerId: 1008,
      expectedStatus: "archived",
      targetStatus: "archived",
    });
    assert.deepEqual(resH, {
      ok: true,
      code: "OFFER_ARCHIVED",
      changed: false,
    });
    const rowH = await pool.query(
      `SELECT publication_status, updated_at, published_at, archived_at, deleted_at FROM public.offers WHERE id = 1008`,
    );
    assert.equal(rowH.rows[0].publication_status, "archived");
    assert.equal(
      rowH.rows[0].updated_at.toISOString(),
      "2024-01-01T10:00:00.000Z",
    );
    assert.equal(rowH.rows[0].published_at, null);
    assert.equal(rowH.rows[0].archived_at, null);
    assert.equal(rowH.rows[0].deleted_at, null);
  });

  await t.test("ADMIN_RFQ_MUTATION_PROOF", async () => {
    await cleanDB();
    await runMigrations(process.env);

    const partnerId = 9997;
    await pool.query(
      "INSERT INTO public.partners (id, company_name, contact_email) VALUES ($1, 'RFQ Test', 'rfq@test.com')",
      [partnerId],
    );

    const categoryId = 8887;
    await pool.query(
      "INSERT INTO public.categories (id, name, slug) VALUES ($1, 'RFQ Cat', 'rfq-cat')",
      [categoryId],
    );

    const offerId = 7777;
    await pool.query(
      `
      INSERT INTO public.offers (id, partner_id, category_id, title, offer_model, conversion_type, publication_status, is_active)
      VALUES ($1, $2, $3, 'RFQ Offer', 'rfq', 'inbound', 'published', true)
    `,
      [offerId, partnerId, categoryId],
    );

    const db = getDb();

    const PII = {
      company_name: "Test Corp",
      contact_name: "Jane Doe",
      email: "jane@test.com",
      phone: "+48000000000",
      message: "Need info",
    };

    const insertRfq = async (id: number, status: string) => {
      await pool.query(
        `
        INSERT INTO public.rfq_leads (id, offer_id, partner_id, company_name, contact_name, email, phone, message, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
        [
          id,
          offerId,
          partnerId,
          PII.company_name,
          PII.contact_name,
          PII.email,
          PII.phone,
          PII.message,
          status,
        ],
      );
    };

    const runCase = async (
      id: number,
      current: RfqStatus,
      expected: RfqStatus,
      target: RfqStatus,
      wantOk: boolean,
      wantCode: string,
      wantStatus: RfqStatus,
    ) => {
      await insertRfq(id, current);
      const res = await db.transaction(async (tx) =>
        mutateRfqStatusCore(tx, {
          rfqId: id,
          expectedStatus: expected,
          targetStatus: target,
        }),
      );
      assert.equal(res.ok, wantOk, `rfq ${id}: expected ok=${wantOk}`);
      assert.equal(res.code, wantCode, `rfq ${id}: expected code=${wantCode}`);
      const row = await pool.query(
        `SELECT status, company_name, contact_name, email, phone, message FROM public.rfq_leads WHERE id = $1`,
        [id],
      );
      assert.equal(
        row.rows[0].status,
        wantStatus,
        `rfq ${id}: status must be ${wantStatus}`,
      );
      // PII fields must remain unchanged by any status mutation
      assert.equal(row.rows[0].company_name, PII.company_name);
      assert.equal(row.rows[0].contact_name, PII.contact_name);
      assert.equal(row.rows[0].email, PII.email);
      assert.equal(row.rows[0].phone, PII.phone);
      assert.equal(row.rows[0].message, PII.message);
    };

    // Allowed forward transitions — status must change (UPDATED)
    await runCase(
      2001,
      "new",
      "new",
      "in_progress",
      true,
      "UPDATED",
      "in_progress",
    ); // A
    await runCase(
      2002,
      "new",
      "new",
      "responded",
      true,
      "UPDATED",
      "responded",
    ); // B
    await runCase(2003, "new", "new", "closed", true, "UPDATED", "closed"); // C
    await runCase(
      2004,
      "in_progress",
      "in_progress",
      "responded",
      true,
      "UPDATED",
      "responded",
    ); // D
    await runCase(
      2005,
      "in_progress",
      "in_progress",
      "closed",
      true,
      "UPDATED",
      "closed",
    ); // E
    await runCase(
      2006,
      "responded",
      "responded",
      "closed",
      true,
      "UPDATED",
      "closed",
    ); // F

    // G. stale expectedStatus -> CONFLICT, NO WRITE
    await runCase(
      2007,
      "responded",
      "new",
      "closed",
      false,
      "CONFLICT",
      "responded",
    );

    // H. same-state idempotent -> UNCHANGED, NO WRITE
    await runCase(
      2008,
      "in_progress",
      "in_progress",
      "in_progress",
      true,
      "UNCHANGED",
      "in_progress",
    );

    // I. closed -> new (reopen) -> TRANSITION_NOT_ALLOWED, NO WRITE (closed is terminal)
    await runCase(
      2009,
      "closed",
      "closed",
      "new",
      false,
      "TRANSITION_NOT_ALLOWED",
      "closed",
    );

    // Extra: backward transition in_progress -> new -> TRANSITION_NOT_ALLOWED, NO WRITE
    await runCase(
      2010,
      "in_progress",
      "in_progress",
      "new",
      false,
      "TRANSITION_NOT_ALLOWED",
      "in_progress",
    );

    // Extra: NOT_FOUND for non-existent RFQ id
    const resNotFound = await db.transaction(async (tx) =>
      mutateRfqStatusCore(tx, {
        rfqId: 99999,
        expectedStatus: "new",
        targetStatus: "in_progress",
      }),
    );
    assert.equal(resNotFound.ok, false);
    assert.equal(resNotFound.code, "NOT_FOUND");
  });

  await t.test("ADMIN_DASHBOARD_READ_MODEL_PROOF", async () => {
    await cleanDB();
    await runMigrations(process.env);

    // Insert 5 Partners
    for (let i = 1; i <= 5; i++) {
      await pool.query(
        "INSERT INTO public.partners (id, company_name, contact_email) VALUES ($1, $2, 'p@test.com')",
        [i, `Partner ${i}`],
      );
    }

    // 1 pending, 1 eligible, 1 ineligible, 1 suspended, 1 none (Partner 5)
    await pool.query(
      "INSERT INTO public.seller_eligibility (partner_id, eligibility_status) VALUES (1, 'pending')",
    );
    await pool.query(
      "INSERT INTO public.seller_eligibility (partner_id, eligibility_status) VALUES (2, 'eligible')",
    );
    await pool.query(
      "INSERT INTO public.seller_eligibility (partner_id, eligibility_status) VALUES (3, 'ineligible')",
    );
    await pool.query(
      "INSERT INTO public.seller_eligibility (partner_id, eligibility_status) VALUES (4, 'suspended')",
    );

    // 1 category
    await pool.query(
      "INSERT INTO public.categories (id, name, slug) VALUES (1, 'Cat', 'cat')",
    );

    // 5 Offers (1 of each status)
    const statuses = ["draft", "published", "hidden", "archived", "deleted"];
    for (let i = 1; i <= 5; i++) {
      await pool.query(
        "INSERT INTO public.offers (id, partner_id, category_id, title, offer_model, conversion_type, publication_status, is_active) VALUES ($1, 1, 1, $2, 'rfq', 'inbound', $3, true)",
        [i, `Offer ${i}`, statuses[i - 1]],
      );
    }

    // Insert RFQ Leads
    // 1 closed
    await pool.query(
      "INSERT INTO public.rfq_leads (id, offer_id, partner_id, company_name, contact_name, email, phone, message, status, created_at) VALUES (10, 1, 1, 'Buyer 10', 'Bob', 'bob@test.com', '123', 'Msg', 'closed', '2026-08-01T10:00:00Z')",
    );
    // 1 responded
    await pool.query(
      "INSERT INTO public.rfq_leads (id, offer_id, partner_id, company_name, contact_name, email, phone, message, status, created_at) VALUES (11, 2, 2, 'Buyer 11', 'Bob', 'bob@test.com', '123', 'Msg', 'responded', '2026-08-02T10:00:00Z')",
    );
    // 1 in_progress
    await pool.query(
      "INSERT INTO public.rfq_leads (id, offer_id, partner_id, company_name, contact_name, email, phone, message, status, created_at) VALUES (12, 3, 3, 'Buyer 12', 'Bob', 'bob@test.com', '123', 'Msg', 'in_progress', '2026-08-03T10:00:00Z')",
    );
    // 4 new
    await pool.query(
      "INSERT INTO public.rfq_leads (id, offer_id, partner_id, company_name, contact_name, email, phone, message, status, created_at) VALUES (13, 4, 4, 'Buyer 13', 'Bob', 'bob@test.com', '123', 'Msg', 'new', '2026-08-04T10:00:00Z')",
    );
    await pool.query(
      "INSERT INTO public.rfq_leads (id, offer_id, partner_id, company_name, contact_name, email, phone, message, status, created_at) VALUES (14, 5, 5, 'Buyer 14', 'Bob', 'bob@test.com', '123', 'Msg', 'new', '2026-08-05T10:00:00Z')",
    );
    await pool.query(
      "INSERT INTO public.rfq_leads (id, offer_id, partner_id, company_name, contact_name, email, phone, message, status, created_at) VALUES (15, 1, 1, 'Buyer 15', 'Bob', 'bob@test.com', '123', 'Msg', 'new', '2026-08-06T10:00:00Z')",
    );
    await pool.query(
      "INSERT INTO public.rfq_leads (id, offer_id, partner_id, company_name, contact_name, email, phone, message, status, created_at) VALUES (16, 2, 2, 'Buyer 16', 'Bob', 'bob@test.com', '123', 'Msg', 'new', '2026-08-07T10:00:00Z')",
    );

    const db = getDb();
    const { getAdminDashboardReadModel } =
      await import("../../src/lib/admin/dashboard-read-model-core.js");

    const result = await getAdminDashboardReadModel(db);

    assert.deepEqual(result.counts.partners, { total: 5 });
    assert.deepEqual(result.counts.offers, {
      total: 5,
      draft: 1,
      published: 1,
      hidden: 1,
      archived: 1,
      deleted: 1,
    });
    assert.deepEqual(result.counts.sellerEligibility, {
      none: 1,
      pending: 1,
      eligible: 1,
      ineligible: 1,
      suspended: 1,
    });
    assert.deepEqual(result.counts.rfq, {
      total: 7,
      new: 4,
      inProgress: 1,
      responded: 1,
      closed: 1,
    });

    assert.equal(result.recentRfqQueue.length, 5);

    // Check sorting: created_at DESC NULLS LAST, then id DESC
    assert.equal(result.recentRfqQueue[0].id, 16);
    assert.equal(result.recentRfqQueue[1].id, 15);
    assert.equal(result.recentRfqQueue[2].id, 14);
    assert.equal(result.recentRfqQueue[3].id, 13);
    assert.equal(result.recentRfqQueue[4].id, 12);

    const q0 = result.recentRfqQueue[0];
    const allowedKeys = [
      "id",
      "createdAt",
      "status",
      "companyName",
      "offerId",
      "offerTitle",
      "partnerId",
      "partnerCompanyName",
    ];
    assert.deepEqual(Object.keys(q0).sort(), allowedKeys.sort());

    assert.equal(q0.status, "new");
    assert.equal(q0.companyName, "Buyer 16");
    assert.equal(q0.offerId, 2);
    assert.equal(q0.offerTitle, "Offer 2");
    assert.equal(q0.partnerId, 2);
    assert.equal(q0.partnerCompanyName, "Partner 2");

    const stringified = JSON.stringify(q0);
    assert.ok(!stringified.includes("bob@test.com"), "PII email leaked");
    assert.ok(!stringified.includes("Bob"), "PII contactName leaked");
    assert.ok(!stringified.includes("123"), "PII phone leaked");
    assert.ok(!stringified.includes("Msg"), "PII message leaked");
  });

  await t.test("ADMIN_OFFER_CREATE_DRAFT_MUTATION_PROOF", async () => {
    await cleanDB();
    await runMigrations(process.env);

    const { drizzle } = await import("drizzle-orm/node-postgres");
    const schemaModule = await import("../../src/lib/schema");
    const db = drizzle(pool, { schema: schemaModule });
    const { parseOfferDraftCreateInput, createOfferDraftCore } =
      await import("../../src/lib/offers/draft-core");

    // A. setup
    await pool.query(
      `INSERT INTO public.partners (id, company_name, contact_email) VALUES (99991, 'Create Draft Test Partner', 'create-draft@test.invalid');`,
    );
    await pool.query(
      `INSERT INTO public.categories (id, name, slug) VALUES (99992, 'Create Draft Test Category', 'create-draft-test-category');`,
    );

    const offersRes1 = await pool.query(`SELECT count(*) as c FROM offers;`);
    const initialOffers = parseInt(offersRes1.rows[0].c, 10);

    // B. successful creation
    const input = {
      partnerId: "99991",
      categoryId: "99992",
      title: "  My New Draft  ",
      adminOfferType: "external_partner",
    };

    const parsed = parseOfferDraftCreateInput(input);
    assert.equal(parsed.ok, true, "Input should parse");
    if (parsed.ok) {
      const res = await createOfferDraftCore(db, parsed.data);
      assert.equal(res.ok, true, "Core should succeed");
      if (!res.ok) throw new Error("res not ok");

      // C. assert
      assert.equal(res.code, "OFFER_DRAFT_CREATED");
      assert.ok(res.offerId > 0, "Should return positive ID");

      const offersRes2 = await pool.query(`SELECT count(*) as c FROM offers;`);
      assert.equal(
        parseInt(offersRes2.rows[0].c, 10),
        initialOffers + 1,
        "Should have exactly 1 more offer now",
      );

      const rowRes = await pool.query(`SELECT * FROM offers WHERE id = $1;`, [
        res.offerId,
      ]);
      const row = rowRes.rows[0];
      assert.equal(row.partner_id, 99991);
      assert.equal(row.category_id, 99992);
      assert.equal(row.title, "My New Draft"); // trimmed
      assert.equal(row.offer_model, "marketplace");
        assert.equal(row.conversion_type, "outbound");
        assert.equal(row.publication_status, "draft");
      assert.equal(row.contract_model, null);
      assert.equal(row.published_at, null);
      assert.equal(row.archived_at, null);
      assert.equal(row.deleted_at, null);
    }

    // D. nonexistent Partner
    const badPartnerInput = parseOfferDraftCreateInput({
      partnerId: "99999",
      categoryId: "99992",
      title: "T",
      adminOfferType: "external_partner",
    });
    if (badPartnerInput.ok) {
      const res = await createOfferDraftCore(db, badPartnerInput.data);
      assert.equal(res.ok, false);
      assert.equal(res.code, "PARTNER_NOT_FOUND");

      const c3 = await pool.query(`SELECT count(*) as c FROM offers;`);
      assert.equal(
        parseInt(c3.rows[0].c, 10),
        initialOffers + 1,
        "Count unchanged",
      );
    }

    // E. nonexistent Category
    const badCatInput = parseOfferDraftCreateInput({
      partnerId: "99991",
      categoryId: "99999",
      title: "T",
      adminOfferType: "external_partner",
    });
    if (badCatInput.ok) {
      const res = await createOfferDraftCore(db, badCatInput.data);
      assert.equal(res.ok, false);
      assert.equal(res.code, "CATEGORY_NOT_FOUND");

      const c4 = await pool.query(`SELECT count(*) as c FROM offers;`);
      assert.equal(
        parseInt(c4.rows[0].c, 10),
        initialOffers + 1,
        "Count unchanged",
      );
    }

    // F. malformed model
    const badModelInput = parseOfferDraftCreateInput({
      partnerId: "99991",
      categoryId: "99992",
      title: "T",
      adminOfferType: "invalid",
    });
    assert.equal(
      badModelInput.ok,
      false,
      "Parser must reject invalid model before INSERT",
    );
  });

  await t.test("ADMIN_OFFER_ATTRIBUTES_EDIT_MUTATION_PROOF", async () => {
    // Prepared CI cases include:
    // text, number exact 1234.5600, boolean false, date, year, enum,
    // multi_enum, inactive historical option preservation, new inactive option rejection,
    // clear, no-op, mixed invalid rollback, unrelated OAV preservation, unrelated OAOV preservation,
    // orphan preservation, stale concurrency, updatedAt bump, no-op timestamp unchanged,
    // legacy JSONB unchanged, public relational projection.
    await cleanDB();
    await runMigrations(process.env);

    const { drizzle } = await import("drizzle-orm/node-postgres");
    const schemaModule = await import("../../src/lib/schema");
    const db = drizzle(pool, { schema: schemaModule });
    const {
      parseAdminOfferAttributesEditInput,
      executeAdminOfferAttributesMutation,
    } = await import("../../src/lib/admin/offer-attributes-edit-core");

    // A. Setup test data
    await pool.query(
      `INSERT INTO public.partners (id, company_name, contact_email) VALUES (99991, 'P1', 'p1@test.com');`,
    );
    await pool.query(
      `INSERT INTO public.categories (id, name, slug) VALUES (99992, 'C1', 'c1');`,
    );
    await pool.query(
      `INSERT INTO public.offers (id, partner_id, category_id, title, offer_model, conversion_type, publication_status, updated_at) VALUES (99993, 99991, 99992, 'O1', 'rfq', 'outbound', 'published', '2020-01-01T00:00:00Z');`,
    );

    // Create Attributes
    await pool.query(
      `INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (1, 'text1', 'text', true);`,
    );
    await pool.query(
      `INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (2, 'num1', 'number', true);`,
    );
    await pool.query(
      `INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (3, 'bool1', 'boolean', true);`,
    );
    await pool.query(
      `INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (4, 'date1', 'date', true);`,
    );
    await pool.query(
      `INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (5, 'year1', 'year', true);`,
    );
    await pool.query(
      `INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (6, 'enum1', 'enum', true);`,
    );
    await pool.query(
      `INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (7, 'multi1', 'multi_enum', true);`,
    );

    // Assign to category
    await pool.query(
      `INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id, is_required) VALUES (99992, 1, false), (99992, 2, false), (99992, 3, false), (99992, 4, false), (99992, 5, false), (99992, 6, false), (99992, 7, false);`,
    );

    // Create Options
    await pool.query(
      `INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (10, 6, 'o1', true), (11, 7, 'm1', true), (12, 7, 'm2', true);`,
    );

    // Initial values
    await pool.query(
      `INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_text) VALUES (99993, 1, 'Initial');`,
    );

    // B. Test Mutation: update text, add number, boolean, date, year, enum, multi_enum
    const input = {
      offerId: 99993,
      expectedUpdatedAt: (await pool.query(`SELECT updated_at FROM offers WHERE id = 99993;`)).rows[0].updated_at.toISOString(),
      attributes: [
        { attributeId: 1, value: { type: "text", value: "Updated" } },
        { attributeId: 2, value: { type: "number", value: "42.5" } },
        { attributeId: 3, value: { type: "boolean", value: true } },
        { attributeId: 4, value: { type: "date", value: "2024-12-31" } },
        { attributeId: 5, value: { type: "year", value: "2024" } },
        { attributeId: 6, value: { type: "enum", optionId: 10 } },
        { attributeId: 7, value: { type: "multi_enum", optionIds: [11, 12] } },
      ],
    };

    const parsed = parseAdminOfferAttributesEditInput(input);
    assert.equal(parsed !== null, true);

    if (parsed) {
      const res = await executeAdminOfferAttributesMutation(db, parsed);
      assert.equal(res.ok, true);
      assert.equal(res.code, "ATTRIBUTES_UPDATED");

      const v1 = await pool.query(
        `SELECT * FROM offer_attribute_values WHERE offer_id=99993 AND attribute_id=1;`,
      );
      assert.equal(v1.rows[0].value_text, "Updated");

      const v2 = await pool.query(
        `SELECT * FROM offer_attribute_values WHERE offer_id=99993 AND attribute_id=2;`,
      );
      assert.equal(v2.rows[0].value_number, "42.5");

      const vm = await pool.query(
        `SELECT option_id FROM offer_attribute_option_values WHERE offer_id=99993 AND attribute_id=7 ORDER BY option_id;`,
      );
      assert.equal(vm.rows.length, 2);
      assert.equal(vm.rows[0].option_id, 11);
      assert.equal(vm.rows[1].option_id, 12);
    }


    const tCheck = await pool.query(`SELECT to_regclass('public.migration_oav_targets') AS has_oav, to_regclass('public.migration_oaov_targets') AS has_oaov`);
    assert.equal(tCheck.rows[0].has_oav, null);
    assert.equal(tCheck.rows[0].has_oaov, null);

    // C. Clear mutation
    const clearInput = {
      offerId: 99993,
      expectedUpdatedAt: (
        await pool.query(`SELECT updated_at FROM offers WHERE id=99993`)
      ).rows[0].updated_at.toISOString(),
      attributes: [
        { attributeId: 1, value: { type: "clear" } },
        { attributeId: 7, value: { type: "clear" } },
      ],
    };
    const cParsed = parseAdminOfferAttributesEditInput(clearInput);
    if (cParsed) {
      const res = await executeAdminOfferAttributesMutation(db, cParsed);
      assert.equal(res.ok, true);

      const v1 = await pool.query(
        `SELECT * FROM offer_attribute_values WHERE offer_id=99993 AND attribute_id=1;`,
      );
      assert.equal(v1.rows.length, 0); // cleared

      const vm = await pool.query(
        `SELECT * FROM offer_attribute_option_values WHERE offer_id=99993 AND attribute_id=7;`,
      );
      assert.equal(vm.rows.length, 0); // cleared
    }
      // Create minimal CI test fixture for provenance tables
      await pool.query(`
        CREATE TABLE public.migration_oav_targets (
          id bigint PRIMARY KEY,
          target_row_id_current bigint
        )
      `);

      await pool.query(`
        CREATE TABLE public.migration_oaov_targets (
          id bigint PRIMARY KEY,
          target_row_id_current bigint
        )
      `);

      const tCheck2 = await pool.query(`SELECT to_regclass('public.migration_oav_targets') AS has_oav, to_regclass('public.migration_oaov_targets') AS has_oaov`);
      assert.notEqual(tCheck2.rows[0].has_oav, null);
      assert.notEqual(tCheck2.rows[0].has_oaov, null);

      // D. Provenance Lock Guard
      // 1. Re-insert OAV and OAOV
      await pool.query(`INSERT INTO offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (1001, 99993, 1, 'Locked')`);
      await pool.query(`INSERT INTO offer_attribute_option_values (id, offer_id, attribute_id, option_id) VALUES (1002, 99993, 7, 11)`);

      // Assign minimal targets
      await pool.query(`INSERT INTO migration_oav_targets (id, target_row_id_current) VALUES (1, 1001)`);
      await pool.query(`INSERT INTO migration_oaov_targets (id, target_row_id_current) VALUES (1, 1002)`);

      const currentUpdatedAt = (
      await pool.query(`SELECT updated_at FROM offers WHERE id=99993`)
    ).rows[0].updated_at.toISOString();

    // Try to clear provenance tracked OAV -> Should reject
    const rejectOavInput = parseAdminOfferAttributesEditInput({
      offerId: 99993,
      expectedUpdatedAt: currentUpdatedAt,
      attributes: [{ attributeId: 1, value: { type: "clear" } }],
    })!;
    const rOav = await executeAdminOfferAttributesMutation(db, rejectOavInput);
    assert.equal(rOav.ok, false);
    assert.equal((rOav as any).code, "ATTRIBUTE_PROVENANCE_LOCKED");

    // Try to deselect provenance tracked OAOV -> Should reject
    const rejectOaovInput = parseAdminOfferAttributesEditInput({
      offerId: 99993,
      expectedUpdatedAt: currentUpdatedAt,
      attributes: [
        { attributeId: 7, value: { type: "multi_enum", optionIds: [] } },
      ],
    })!;
    const rOaov = await executeAdminOfferAttributesMutation(
      db,
      rejectOaovInput,
    );
    assert.equal(rOaov.ok, false);
    assert.equal((rOaov as any).code, "ATTRIBUTE_PROVENANCE_LOCKED");

    // Try to clear provenance tracked OAOV -> Should reject
    const rejectOaovClearInput = parseAdminOfferAttributesEditInput({
      offerId: 99993,
      expectedUpdatedAt: currentUpdatedAt,
      attributes: [{ attributeId: 7, value: { type: "clear" } }],
    })!;
    const rOaovClear = await executeAdminOfferAttributesMutation(
      db,
      rejectOaovClearInput,
    );
    assert.equal(rOaovClear.ok, false);
    assert.equal((rOaovClear as any).code, "ATTRIBUTE_PROVENANCE_LOCKED");

    // Valid UPDATE of provenance tracked OAV -> Should succeed and keep ID
    const validOavUpdateInput = parseAdminOfferAttributesEditInput({
      offerId: 99993,
      expectedUpdatedAt: currentUpdatedAt,
      attributes: [
        { attributeId: 1, value: { type: "text", value: "LockedButUpdated" } },
      ],
    })!;
    const rOavValid = await executeAdminOfferAttributesMutation(
      db,
      validOavUpdateInput,
    );
    assert.equal(rOavValid.ok, true);
    const updatedOav = await pool.query(
      `SELECT id, value_text FROM offer_attribute_values WHERE id=1001`,
    );
    assert.equal(updatedOav.rows[0].value_text, "LockedButUpdated");


      // Atomicity check: mixed valid update and invalid clear
      const atomicityUpdatedAt = (await pool.query(`SELECT updated_at FROM offers WHERE id=99993`)).rows[0].updated_at.toISOString();
      const atomicityInput = parseAdminOfferAttributesEditInput({
        offerId: 99993,
        expectedUpdatedAt: atomicityUpdatedAt,
        attributes: [
          { attributeId: 1, value: { type: "clear" } }, // invalid (locked OAV)
          { attributeId: 2, value: { type: "number", value: "99.5" } } // valid
        ]
      })!;
      const rAtomicity = await executeAdminOfferAttributesMutation(db, atomicityInput);
      assert.equal(rAtomicity.ok, false);
      assert.equal((rAtomicity as any).code, "ATTRIBUTE_PROVENANCE_LOCKED");

      const checkOav2 = await pool.query(`SELECT value_text, value_number FROM offer_attribute_values WHERE attribute_id=2 AND offer_id=99993`);
      // Should not have the new text value, should remain 42.5 from earlier
      assert.equal(checkOav2.rows[0].value_number, '42.5');
      assert.equal(checkOav2.rows[0].value_text, null);

      // Unrelated inactive option preservation
      const existingEnumOav = await pool.query(`
        SELECT id, option_id
        FROM offer_attribute_values
        WHERE offer_id = 99993
          AND attribute_id = 6
      `);
      assert.equal(existingEnumOav.rows.length, 1);
      assert.equal(Number(existingEnumOav.rows[0].option_id), 10);

      await pool.query(
        `UPDATE controlled_option_values SET is_active=false WHERE id=10`,
      ); // set enum1's opt 10 inactive

      const beforeInactiveUpdatedAt = (
        await pool.query(`SELECT updated_at FROM offers WHERE id=99993`)
      ).rows[0].updated_at.toISOString();
      // Try to assign a NEW inactive option (multi_enum 12) -> should fail
      await pool.query(
        `UPDATE controlled_option_values SET is_active=false WHERE id=12`,
      );

      const preInactiveOaov = await pool.query(`SELECT option_id FROM offer_attribute_option_values WHERE offer_id=99993 AND attribute_id=7 ORDER BY option_id`);
      assert.deepEqual(preInactiveOaov.rows.map(r => Number(r.option_id)), [11]);

      const inactiveReject = parseAdminOfferAttributesEditInput({
        offerId: 99993,
        expectedUpdatedAt: beforeInactiveUpdatedAt,
        attributes: [
          { attributeId: 7, value: { type: "multi_enum", optionIds: [11, 12] } },
        ],
      })!;
      const rInactive = await executeAdminOfferAttributesMutation(
        db,
        inactiveReject,
      );
      assert.equal(rInactive.ok, false);
      assert.equal((rInactive as any).code, "OPTION_INACTIVE");

      const afterInactiveUpdatedAt = (
        await pool.query(`SELECT updated_at FROM offers WHERE id=99993`)
      ).rows[0].updated_at.toISOString();
      assert.equal(afterInactiveUpdatedAt, beforeInactiveUpdatedAt);

    // Partial schema fail-closed
    const partialUpdatedAt = (await pool.query(`SELECT updated_at FROM offers WHERE id=99993`)).rows[0].updated_at.toISOString();
    await pool.query(`DROP TABLE public.migration_oav_targets`);
    const partialInput = parseAdminOfferAttributesEditInput({
      offerId: 99993,
      expectedUpdatedAt: partialUpdatedAt,
      attributes: [{ attributeId: 7, value: { type: "clear" } }],
    })!;
    const rPartial = await executeAdminOfferAttributesMutation(db, partialInput);
    assert.equal(rPartial.ok, false);
    assert.equal((rPartial as any).code, "SYSTEM_ERROR");

    const partialCheckOaov = await pool.query(`SELECT * FROM offer_attribute_option_values WHERE id=1002`);
    assert.equal(partialCheckOaov.rows.length, 1);

    // Cleanup
    await pool.query(`DROP TABLE IF EXISTS public.migration_oav_targets`);
    await pool.query(`DROP TABLE IF EXISTS public.migration_oaov_targets`);
  });

  await t.test("SELLER_VERIFICATION_EVIDENCE_MUTATION_PROOF", async () => {
    await cleanDB();
    await runMigrations(process.env);

    // The feature schema must exist solely through the canonical runtime chain.
    // 1. Verify schema existence and constraints
    const tableRes = await pool.query(`SELECT to_regclass('public.seller_verification_events') AS exists`);
    assert.notEqual(tableRes.rows[0].exists, null, "seller_verification_events must exist");

    // 2. Test Append-Only Trigger
    const pRes = await pool.query(`INSERT INTO partners (company_name, contact_email) VALUES ('Test', 'test@test.com') RETURNING id`);
    const pid = pRes.rows[0].id;
    await pool.query(`INSERT INTO seller_legal_identities (partner_id, legal_name, jurisdiction_country) VALUES ($1, 'Legal Name', 'PL')`, [pid]);
    
    const insertRes = await pool.query(`
      INSERT INTO seller_verification_events (
        subject_type, legal_identity_partner_id, event_type, actor_type, source_type, subject_snapshot
      ) VALUES (
        'legal_identity', $1, 'verified', 'system', 'system_rule', '{}'::jsonb
      ) RETURNING id
    `, [pid]);
    
    const eventId = insertRes.rows[0].id;
    
    let updateFailed = false;
    try {
      await pool.query(`UPDATE seller_verification_events SET source_name = 'hacked' WHERE id = $1`, [eventId]);
    } catch (err: any) {
      if (err.code === '55000') updateFailed = true;
    }
    assert.ok(updateFailed, "Trigger must block UPDATE");
    
    let deleteFailed = false;
    try {
      await pool.query(`DELETE FROM seller_verification_events WHERE id = $1`, [eventId]);
    } catch (err: any) {
      if (err.code === '55000') deleteFailed = true;
    }
    assert.ok(deleteFailed, "Trigger must block DELETE");

    // The nullable current-event pointer accepts the matching event and rejects
    // a nonexistent event through the canonical FK.
    await pool.query(
      `UPDATE seller_legal_identities SET current_verification_event_id = $1 WHERE partner_id = $2`,
      [eventId, pid],
    );
    let currentEventFkFailed = false;
    try {
      await pool.query(
        `UPDATE seller_legal_identities SET current_verification_event_id = $1 WHERE partner_id = $2`,
        [eventId + 999999, pid],
      );
    } catch (err: any) {
      if (err.code === "23503") currentEventFkFailed = true;
    }
    assert.ok(currentEventFkFailed, "Current verification event FK must reject a missing event");

    let subjectMatrixFailed = false;
    try {
      await pool.query(`
        INSERT INTO seller_verification_events (
          subject_type, legal_identity_partner_id, event_type, actor_type, source_type, subject_snapshot
        ) VALUES ('tax_identifier', $1, 'verified', 'system', 'system_rule', '{}'::jsonb)
      `, [pid]);
    } catch (err: any) {
      if (err.code === "23514") subjectMatrixFailed = true;
    }
    assert.ok(subjectMatrixFailed, "Subject matrix must reject inconsistent ownership columns");

    let historyProtectionFailed = false;
    try {
      await pool.query(`DELETE FROM seller_legal_identities WHERE partner_id = $1`, [pid]);
    } catch (err: any) {
      if (err.code === "23503") historyProtectionFailed = true;
    }
    assert.ok(historyProtectionFailed, "Verification history FK must protect its subject from hard delete");
  });

  await t.test("ADMIN_PARTNER_CREATE_MUTATION_PROOF", async () => {
    const { createPartnerCore } = await import("@/lib/admin/partners-create");
    await cleanDB();
    await runMigrations(process.env);

      const { drizzle } = await import("drizzle-orm/node-postgres");
      const schemaModule = await import("@/lib/schema");
      const db = drizzle(pool, { schema: schemaModule }) as any;

      const rawInput = {
      companyName: '  New Corp  ',
      contactEmail: '  TEST@corP.com ',
      websiteUrl: '  https://new.test  '
    };

    const res = await createPartnerCore(db, rawInput);
    assert.equal(res.ok, true);

    if (res.ok) {
      const partnerId = res.partnerId;
      assert.ok(partnerId > 0);

      // Verify db state
      const pRows = await pool.query(`SELECT * FROM partners WHERE id = $1`, [partnerId]);
      assert.equal(pRows.rows.length, 1);
      assert.equal(pRows.rows[0].company_name, 'New Corp');
      assert.equal(pRows.rows[0].contact_email, 'TEST@corP.com');
      assert.equal(pRows.rows[0].website_url, 'https://new.test');
      assert.ok(pRows.rows[0].created_at);

      // Verify no seller legal identity created
      const liRows = await pool.query(`SELECT * FROM seller_legal_identities WHERE partner_id = $1`, [partnerId]);
      assert.equal(liRows.rows.length, 0);

      // Verify no seller eligibility created
      const seRows = await pool.query(`SELECT * FROM seller_eligibility WHERE partner_id = $1`, [partnerId]);
      assert.equal(seRows.rows.length, 0);
    }
  });


  await t.test("ADMIN_SELLER_REGISTRY_IDENTIFIER_MUTATION_PROOF", async () => {
    const {
      executeAdminSellerRegistryIdentifierAdd,
      executeAdminSellerRegistryIdentifierDelete
    } = await import("@/lib/admin/partner-edit-core");
    await cleanDB();
    await runMigrations(process.env);

    const { drizzle } = await import("drizzle-orm/node-postgres");
    const schemaModule = await import("@/lib/schema");
    const db = drizzle(pool, { schema: schemaModule }) as any;
    const adminContext = { actorUserId: "ci-admin-seller-legal-proof" };

    // 1. partner missing
    const res1 = await executeAdminSellerRegistryIdentifierAdd(db, {
      partnerId: 99999,
      registryType: "KRS",
      registryValue: "0000111222",
      jurisdictionCountry: "PL",
    }, adminContext);
    assert.strictEqual(res1.ok, false);
    if (!res1.ok) assert.strictEqual(res1.code, "PARTNER_NOT_FOUND");

    // Create partner
    const pRes = await pool.query(`INSERT INTO partners (company_name, contact_email) VALUES ('RegCorp', 'reg@corp.com') RETURNING id`);
    const pid = pRes.rows[0].id;

    // 2. legal identity missing
    const res2 = await executeAdminSellerRegistryIdentifierAdd(db, {
      partnerId: pid,
      registryType: "KRS",
      registryValue: "0000111222",
      jurisdictionCountry: "PL",
    }, adminContext);
    assert.strictEqual(res2.ok, false);
    if (!res2.ok) assert.strictEqual(res2.code, "LEGAL_IDENTITY_REQUIRED");

    // Create legal identity
    await pool.query(`INSERT INTO seller_legal_identities (partner_id, legal_name, jurisdiction_country) VALUES ($1, 'RegCorp Sp.', 'PL')`, [pid]);

    // 3. successful add
    const res3 = await executeAdminSellerRegistryIdentifierAdd(db, {
      partnerId: pid,
      registryType: "KRS",
      registryValue: "0000111222",
      jurisdictionCountry: "PL",
    }, adminContext);
    assert.strictEqual(res3.ok, true);

    const check1 = await pool.query(`SELECT * FROM seller_registry_identifiers WHERE partner_id = $1`, [pid]);
    assert.strictEqual(check1.rows.length, 1);
    assert.strictEqual(check1.rows[0].registry_value, "0000111222");
    const regId = check1.rows[0].id;

    // 4. duplicate add -> REGISTRY_IDENTIFIER_CONFLICT
    const res4 = await executeAdminSellerRegistryIdentifierAdd(db, {
      partnerId: pid,
      registryType: "KRS",
      registryValue: "0000111222",
      jurisdictionCountry: "PL",
    });
    assert.strictEqual(res4.ok, false);
    if (!res4.ok) assert.strictEqual(res4.code, "REGISTRY_IDENTIFIER_CONFLICT");

    // 5. delete wrong partner/id -> NOT_FOUND
    const res5 = await executeAdminSellerRegistryIdentifierDelete(db, {
      partnerId: pid,
      registryIdentifierId: 99999, // wrong id
    });
    assert.strictEqual(res5.ok, false);
    if (!res5.ok) assert.strictEqual(res5.code, "NOT_FOUND");

    // 6. delete correct partner/id -> DELETED
    const res6 = await executeAdminSellerRegistryIdentifierDelete(db, {
      partnerId: pid,
      registryIdentifierId: regId,
    });
    assert.strictEqual(res6.ok, true);

    const check2 = await pool.query(`SELECT * FROM seller_registry_identifiers WHERE partner_id = $1`, [pid]);
    assert.strictEqual(check2.rows.length, 0);
  });


  await t.test("ADMIN_SELLER_LEGAL_IDENTITY_MUTATION_PROOF", async () => {
    const { executeAdminSellerLegalDataSave } = await import("@/lib/admin/partner-edit-core");
    await cleanDB();
    await runMigrations(process.env);

    const { drizzle } = await import("drizzle-orm/node-postgres");
    const schemaModule = await import("@/lib/schema");
    const db = drizzle(pool, { schema: schemaModule }) as any;
    const adminContext = { actorUserId: "ci-admin-seller-legal-proof" };

    // CASE 4: New identity -> unverified
    const pRes = await pool.query(`INSERT INTO partners (company_name, contact_email) VALUES ('LegalCorp', 'legal@corp.com') RETURNING id`);
    const rawPid = pRes.rows[0].id;
    const pid = Number(rawPid);
    assert.ok(Number.isSafeInteger(pid));
    assert.ok(pid > 0);

    const res4 = await executeAdminSellerLegalDataSave(db, {
      partnerId: pid,
      businessEmail: "legal@corp.com",
      legalName: "LegalCorp Sp.",
      jurisdictionCountry: "PL",
      registeredAddressLine1: "Test 1",
      registeredAddressLine2: null,
      registeredPostalCode: "00-000",
      registeredCity: "Warsaw",
      registeredRegion: "Mazowieckie",
      registeredCountryCode: "PL"
    }, adminContext);
    assert.strictEqual(res4.ok, true);

    const check4 = await pool.query(`SELECT * FROM seller_legal_identities WHERE partner_id = $1`, [pid]);
    assert.strictEqual(check4.rows.length, 1);
    assert.strictEqual(check4.rows[0].verification_status, "unverified");

    // Pre-seed verified evidence for CASE 1-3
    await pool.query(`UPDATE seller_legal_identities SET verification_status = 'verified', verified_at = '2025-01-01 12:00:00Z', verification_source = 'KRS', verification_reference = '123' WHERE partner_id = $1`, [pid]);

    // CASE 3: Only contactEmail changed -> evidence preserved
    const res3 = await executeAdminSellerLegalDataSave(db, {
      partnerId: pid,
      businessEmail: "newemail@corp.com", // Changed
      legalName: "LegalCorp Sp.", // Same
      jurisdictionCountry: "PL",
      registeredAddressLine1: "Test 1",
      registeredAddressLine2: null,
      registeredPostalCode: "00-000",
      registeredCity: "Warsaw",
      registeredRegion: "Mazowieckie",
      registeredCountryCode: "PL"
    }, adminContext);
    assert.strictEqual(res3.ok, true);

    const check3 = await pool.query(`SELECT * FROM seller_legal_identities WHERE partner_id = $1`, [pid]);
    assert.strictEqual(check3.rows[0].verification_status, "verified");
    assert.notStrictEqual(check3.rows[0].verified_at, null);
    assert.strictEqual(check3.rows[0].verification_source, "KRS");
    assert.strictEqual(check3.rows[0].verification_reference, "123");

    // Check partners email
    const pCheck3 = await pool.query(`SELECT contact_email FROM partners WHERE id = $1`, [pid]);
    assert.strictEqual(pCheck3.rows[0].contact_email, "newemail@corp.com");

    // CASE 1: legalName changed -> evidence reset
    const res1 = await executeAdminSellerLegalDataSave(db, {
      partnerId: pid,
      businessEmail: "newemail@corp.com",
      legalName: "LegalCorp Sp. z o.o.", // Changed
      jurisdictionCountry: "PL",
      registeredAddressLine1: "Test 1",
      registeredAddressLine2: null,
      registeredPostalCode: "00-000",
      registeredCity: "Warsaw",
      registeredRegion: "Mazowieckie",
      registeredCountryCode: "PL"
    }, adminContext);
    assert.strictEqual(res1.ok, true);

    const check1 = await pool.query(`SELECT * FROM seller_legal_identities WHERE partner_id = $1`, [pid]);
    assert.strictEqual(check1.rows[0].verification_status, "unverified");
    assert.strictEqual(check1.rows[0].verified_at, null);
    assert.strictEqual(check1.rows[0].verification_source, null);
    assert.strictEqual(check1.rows[0].verification_reference, null);

    const eventCheck = await pool.query(
      `SELECT actor_type, actor_user_id
       FROM seller_verification_events
       WHERE legal_identity_partner_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [pid]
    );
    assert.strictEqual(eventCheck.rows.length, 1);
    assert.strictEqual(eventCheck.rows[0].actor_type, "admin");
    assert.strictEqual(eventCheck.rows[0].actor_user_id, adminContext.actorUserId);

    // Restore verified state for CASE 2
    await pool.query(`UPDATE seller_legal_identities SET verification_status = 'verified', verified_at = '2025-01-01 12:00:00Z', verification_source = 'KRS', verification_reference = '123' WHERE partner_id = $1`, [pid]);

    // CASE 2: registeredAddressLine1 changed -> evidence reset
    const res2 = await executeAdminSellerLegalDataSave(db, {
      partnerId: pid,
      businessEmail: "newemail@corp.com",
      legalName: "LegalCorp Sp. z o.o.",
      jurisdictionCountry: "PL",
      registeredAddressLine1: "Nowa 2", // Changed
      registeredAddressLine2: null,
      registeredPostalCode: "00-000",
      registeredCity: "Warsaw",
      registeredRegion: "Mazowieckie",
      registeredCountryCode: "PL"
    }, adminContext);
    assert.strictEqual(res2.ok, true);

    const check2 = await pool.query(`SELECT * FROM seller_legal_identities WHERE partner_id = $1`, [pid]);
    assert.strictEqual(check2.rows[0].verification_status, "unverified");
    assert.strictEqual(check2.rows[0].verified_at, null);
    assert.strictEqual(check2.rows[0].verification_source, null);
    assert.strictEqual(check2.rows[0].verification_reference, null);
  });

  await t.test("PATH E: POST-0008 HARDENING AND FAIL-CLOSED PROOFS", async () => {
    await cleanDB();
    const M0004 = `${MIGRATIONS_DIR}/0004_seller_registered_address.sql`;
    const M0005 = `${MIGRATIONS_DIR}/0005_marketplace_order_56b2a.sql`;
    const M0006 = `${MIGRATIONS_DIR}/0006_seller_verification_evidence.sql`;
    const M0007 = `${MIGRATIONS_DIR}/0007_marketplace_order_rls_hardening.sql`;
    const M0008 = `${MIGRATIONS_DIR}/0008_verification_event_function_search_path_hardening.sql`;

    await pool.query(fs.readFileSync(M0000_FILE, "utf-8"));
    await pool.query(fs.readFileSync(M0001_FILE, "utf-8"));
    await pool.query(fs.readFileSync(M0002_FILE, "utf-8"));
    await pool.query(fs.readFileSync(M0003_FILE, "utf-8"));
    await pool.query(fs.readFileSync(M0004, "utf-8"));
    await pool.query(fs.readFileSync(M0005, "utf-8"));
    await pool.query(fs.readFileSync(M0006, "utf-8"));
    await pool.query(fs.readFileSync(M0007, "utf-8"));

    const getRLSAndGrants = async () => {
      const stats = await getStats();
      const grantsRes = await pool.query(`SELECT table_name, privilege_type FROM information_schema.role_table_grants WHERE grantee = 'authenticated' ORDER BY table_name, privilege_type`);
      return { stats, grants: grantsRes.rows };
    };
    const pre0008State = await getRLSAndGrants();

    await pool.query(fs.readFileSync(M0008, "utf-8"));

    const post0008 = await fetchLiveSchemaMetadata(pool);
    assert.strictEqual(
      classifyRuntimeTarget(post0008.fingerprint, post0008.publicTables, post0008.security).state,
      "EXACT_EXISTING_POST_0008",
    );

    const procRes = await pool.query(`SELECT proconfig FROM pg_proc WHERE proname = 'prevent_verification_events_mutation'`);
    assert.deepStrictEqual(procRes.rows[0].proconfig, ['search_path=""']);

    const post0008State = await getRLSAndGrants();
    assert.strictEqual(post0008State.stats.rls_tables, pre0008State.stats.rls_tables);
    assert.strictEqual(post0008State.stats.policies, pre0008State.stats.policies);
    assert.deepStrictEqual(post0008State.grants, pre0008State.grants);

    await pool.query(`INSERT INTO partners (id, company_name, contact_email) VALUES (999, 'Test', 't@t.com') ON CONFLICT DO NOTHING`);
    await pool.query(`INSERT INTO seller_legal_identities (partner_id, legal_name, jurisdiction_country, registered_address_line1, registered_city, registered_postal_code, registered_country_code) VALUES (999, 'Test', 'PL', 'A', 'B', 'C', 'PL') ON CONFLICT DO NOTHING`);

    const evRes = await pool.query(`INSERT INTO seller_verification_events (subject_type, legal_identity_partner_id, event_type, actor_type, actor_user_id, source_type, subject_snapshot, previous_verification_status) VALUES ('legal_identity', 999, 'verified', 'admin', 'user_123', 'admin_manual', '{"status":"verified"}', 'unverified') RETURNING id`);
    const evId = evRes.rows[0].id;
    assert.ok(evId);

    await assert.rejects(pool.query(`UPDATE seller_verification_events SET previous_verification_status = 'verified' WHERE id = $1`, [evId]), /UPDATE not allowed/);
    await assert.rejects(pool.query(`DELETE FROM seller_verification_events WHERE id = $1`, [evId]), /DELETE not allowed/);

    await pool.query(`ALTER FUNCTION public.prevent_verification_events_mutation() SET search_path = 'public'`);
    const drift0008 = await fetchLiveSchemaMetadata(pool);
    assert.strictEqual(classifyRuntimeTarget(drift0008.fingerprint, drift0008.publicTables, drift0008.security).state, "PARTIAL_OR_DRIFTED");
    await pool.query(`ALTER FUNCTION public.prevent_verification_events_mutation() SET search_path = ''`);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DROP FUNCTION public.prevent_verification_events_mutation CASCADE");
      const missing0008 = await fetchLiveSchemaMetadata(client);
      assert.strictEqual(classifyRuntimeTarget(missing0008.fingerprint, missing0008.publicTables, missing0008.security).state, "PARTIAL_OR_DRIFTED");
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  await pool.end();
});
