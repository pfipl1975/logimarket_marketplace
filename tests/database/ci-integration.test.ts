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

test("CI_POSTGRES_INTEGRATION_PROOF_PREFLIGHT", async (t) => {
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

    // Post-migration classification must be EXACT_EXISTING
    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const postClassification = classifyRuntimeTarget(fingerprint, publicTables);
    assert.strictEqual(postClassification.state, "EXACT_EXISTING", "Success post-classification must be EXACT_EXISTING");

    // Exact canonical migration identity check for journal
    const diskMigrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_DIR });
    assert.strictEqual(diskMigrations.length, 3, "Disk migrations should have 3 files");

    const journalRes = await pool.query(`SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`);
    const journalRows = journalRes.rows as { hash: string; created_at: string | number }[];
    assert.strictEqual(journalRows.length, 3, "Journal should have exactly 3 rows");

    // row 1: 0000
    assert.strictEqual(journalRows[0].hash, diskMigrations[0].hash, "Row 1 (0000) hash mismatch");
    assert.strictEqual(String(journalRows[0].created_at), String(diskMigrations[0].folderMillis), "Row 1 (0000) created_at mismatch");

    // row 2: 0001
    assert.strictEqual(journalRows[1].hash, diskMigrations[1].hash, "Row 2 (0001) hash mismatch");
    assert.strictEqual(String(journalRows[1].created_at), String(diskMigrations[1].folderMillis), "Row 2 (0001) created_at mismatch");

    // row 3: 0002
    assert.strictEqual(journalRows[2].hash, diskMigrations[2].hash, "Row 3 (0002) hash mismatch");
    assert.strictEqual(String(journalRows[2].created_at), String(diskMigrations[2].folderMillis), "Row 3 (0002) created_at mismatch");
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

    // Directly classify runtime target after failure
    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const postFailureClassification = classifyRuntimeTarget(fingerprint, publicTables);
    assert.strictEqual(postFailureClassification.state, "MIGRATABLE_BASELINE", "Post-failure classification must be MIGRATABLE_BASELINE");

    // Characterize exact journal state after failure
    let journalRows: { hash: string; created_at: string | number }[] = [];
    try {
      const journalRes = await pool.query(`SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`);
      journalRows = journalRes.rows as { hash: string; created_at: string | number }[];
    } catch (err: any) {
      if (err.code === "42P01" || err.code === "3F000") {
        journalRows = [];
      } else {
        throw err;
      }
    }

    const diskMigrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_DIR });
    const m0000 = diskMigrations.find(m => m.folderMillis === 1785589560000);
    const m0001 = diskMigrations.find(m => m.folderMillis === 1785590000000);
    const m0002 = diskMigrations.find(m => m.folderMillis === 1785590500000);

    assert.ok(m0000, "0000 migration must exist on disk");
    assert.ok(m0001, "0001 migration must exist on disk");
    assert.ok(m0002, "0002 migration must exist on disk");

    // 0001 and 0002 must be absent from journal
    assert.strictEqual(journalRows.some(r => r.hash === m0001!.hash || String(r.created_at) === String(m0001!.folderMillis)), false, "0001 journal row must be ABSENT on failure");
    assert.strictEqual(journalRows.some(r => r.hash === m0002!.hash || String(r.created_at) === String(m0002!.folderMillis)), false, "0002 journal row must be ABSENT on failure");

    // Exact state: 0000 baseline was adopted before 0001 precheck failure rolled back 0001
    assert.strictEqual(journalRows.length, 1, "Journal must contain exactly 1 row (0000 baseline adoption)");
    assert.strictEqual(journalRows[0].hash, m0000!.hash, "0000 hash mismatch in journal");
    assert.strictEqual(String(journalRows[0].created_at), String(m0000!.folderMillis), "0000 created_at mismatch in journal");
  });

  await pool.end();
});
