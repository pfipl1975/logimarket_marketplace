import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { Pool } from "pg";
import { runMigrations } from "../../scripts/database/run-runtime-migrations";

const MIGRATIONS_DIR = "./drizzle-runtime";
const M0000_FILE = `${MIGRATIONS_DIR}/0000_production_runtime_baseline.sql`;

test("CI_POSTGRES_INTEGRATION_PROOF_PREFLIGHT", async (t) => {
  if (!process.env.DATABASE_URL) {
    console.log("Skipping CI integration test (no DATABASE_URL)");
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
    // Split by semicolons for raw execution since it's a raw dump, 
    // or just execute as a single block if possible. pg can execute multiple statements.
    await pool.query(sql);
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

  await t.test("A. SUCCESS PATH", async () => {
    await setup0000();
    
    // Exact physical 0000 should be adopted.
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

    const journal = await pool.query(`SELECT hash FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`);
    assert.strictEqual(journal.rows.length, 3, "Journal should have 3 rows (0000, 0001, 0002)");
  });

  await t.test("B. FAILURE PATH", async () => {
    await setup0000();
    
    // Create deterministic RFQ data that violates 0001 precheck (invalid status)
    await pool.query(`
      INSERT INTO rfq_leads (offer_id, partner_id, contact_name, email, status) 
      VALUES (999, 999, 'Bad Guy', 'bad@example.com', 'hacked_status')
    `);
    
    let errorThrown = false;
    try {
      await runMigrations(process.env);
    } catch (err: any) {
      errorThrown = true;
      assert.ok(err.message.includes("RFQ migration blocked: invalid status rows exist"), "Should fail with specific 0001 exception");
    }
    assert.strictEqual(errorThrown, true, "runMigrations should have thrown an error");

    // Directly verify physical schema after failure
    const contractColCount = await pool.query(`SELECT count(*) as cnt FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'contract_model'`);
    assert.strictEqual(Number(contractColCount.rows[0].cnt), 0, "contract_model should remain absent");

    const sellersCount = await pool.query(`SELECT count(*) as cnt FROM pg_class WHERE relname = 'sellers'`);
    assert.strictEqual(Number(sellersCount.rows[0].cnt), 0, "seller tables should be absent");

    // Verify journal state after failure
    const journalRes = await pool.query(`SELECT hash FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`).catch(() => null);
    // Depending on transaction handling, journal might be 0000 or absent
    if (journalRes) {
       assert.ok(journalRes.rows.length <= 1, "Journal should not contain 0001 or 0002");
    }
  });

  await pool.end();
});
