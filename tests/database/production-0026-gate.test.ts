import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { runMigrations } from "../../scripts/database/run-runtime-migrations";
import { PROD_0025_PROJECT_REF, PROD_0025_WRITE_AUTHORIZATION, PROD_0026_WRITE_AUTHORIZATION, verifyTarget } from "../../scripts/database/verify-runtime-migration-target";
import { readProduction0026Chain, validateProduction0026Chain } from "../../scripts/database/production-offer-moderation-0026";
import { createCanonicalRuntimeMigrationDirectory, cleanupCanonicalRuntimeMigrationDirectory } from "../../scripts/database/runtime-migration-temp-dir";
import { classifyRuntimeTarget, fetchLiveSchemaMetadata } from "../../scripts/database/verify-runtime-schema-fingerprint";
import { resetDisposableTestDatabase, validateDestructiveTestEnvironment } from "./helpers/destructive-db-safety";

const PROD_0026_TEST_ENV = {
  NODE_ENV: "test" as const,
  DATABASE_URL: `postgresql://postgres:synthetic@db.${PROD_0025_PROJECT_REF}.supabase.co:5432/postgres?sslmode=verify-full&sslrootcert=synthetic-ca.pem`,
  RUNTIME_MIGRATION_TARGET: "production",
  RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: PROD_0025_PROJECT_REF,
  RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "oczllhpiicrngbcbxndu",
  RUNTIME_MIGRATION_WRITE_AUTHORIZATION: PROD_0026_WRITE_AUTHORIZATION,
  RUNTIME_MIGRATION_EXPECTED_PRE_STATE: "EXACT_EXISTING_POST_0025",
};

test("0026 has a distinct explicit production target / authorization", () => {
  assert.doesNotThrow(() => verifyTarget(PROD_0026_TEST_ENV));
  assert.doesNotThrow(() => verifyTarget({
    ...PROD_0026_TEST_ENV,
    DATABASE_URL: `postgresql://postgres.${PROD_0025_PROJECT_REF}:synthetic@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=verify-full&sslrootcert=synthetic-ca.pem`,
  }));
  assert.notEqual(PROD_0026_WRITE_AUTHORIZATION, PROD_0025_WRITE_AUTHORIZATION);
});

for (const [name, env] of [
  ["no authorization", { ...PROD_0026_TEST_ENV, RUNTIME_MIGRATION_WRITE_AUTHORIZATION: undefined }],
  ["obsolete 0025 authorization", { ...PROD_0026_TEST_ENV, RUNTIME_MIGRATION_WRITE_AUTHORIZATION: PROD_0025_WRITE_AUTHORIZATION }],
  ["old general authorization", { ...PROD_0026_TEST_ENV, RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_PROD_RUNTIME_0000_TO_0003" }],
  ["missing pre-state", { ...PROD_0026_TEST_ENV, RUNTIME_MIGRATION_EXPECTED_PRE_STATE: undefined }],
  ["0024 pre-state", { ...PROD_0026_TEST_ENV, RUNTIME_MIGRATION_EXPECTED_PRE_STATE: "EXACT_EXISTING_POST_0024" }],
  ["0026 pre-state", { ...PROD_0026_TEST_ENV, RUNTIME_MIGRATION_EXPECTED_PRE_STATE: "EXACT_EXISTING_POST_0026" }],
  ["wrong project", { ...PROD_0026_TEST_ENV, RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "other", DATABASE_URL: "postgres://postgres:synthetic@db.other.supabase.co/postgres" }],
  ["forbidden project", { ...PROD_0026_TEST_ENV, RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: PROD_0025_PROJECT_REF }],
  ["dev mode", { ...PROD_0026_TEST_ENV, RUNTIME_MIGRATION_TARGET: "development" }],
  ["reconciliation", { ...PROD_0026_TEST_ENV, RUNTIME_MIGRATION_RECONCILIATION: "EXACT_POST_0007_JOURNAL_0000_TO_0006" }],
  ["malicious pooler", { ...PROD_0026_TEST_ENV, DATABASE_URL: `postgresql://postgres.${PROD_0025_PROJECT_REF}:synthetic@untrusted-pooler.invalid/postgres?sslmode=verify-full&sslrootcert=synthetic-ca.pem` }],
  ["transaction port", { ...PROD_0026_TEST_ENV, DATABASE_URL: PROD_0026_TEST_ENV.DATABASE_URL.replace(":5432/", ":6543/") }],
  ["wrong database", { ...PROD_0026_TEST_ENV, DATABASE_URL: PROD_0026_TEST_ENV.DATABASE_URL.replace("/postgres?", "/other?") }],
  ["missing TLS", { ...PROD_0026_TEST_ENV, DATABASE_URL: PROD_0026_TEST_ENV.DATABASE_URL.split("?")[0] }],
  ["TLS downgrade", { ...PROD_0026_TEST_ENV, DATABASE_URL: PROD_0026_TEST_ENV.DATABASE_URL.replace("verify-full", "require") }],
  ["missing CA", { ...PROD_0026_TEST_ENV, DATABASE_URL: PROD_0026_TEST_ENV.DATABASE_URL.replace("&sslrootcert=synthetic-ca.pem", "") }],
  ["duplicate TLS option", { ...PROD_0026_TEST_ENV, DATABASE_URL: PROD_0026_TEST_ENV.DATABASE_URL + "&sslmode=disable" }],
  ["connection options override", { ...PROD_0026_TEST_ENV, DATABASE_URL: PROD_0026_TEST_ENV.DATABASE_URL + "&options=-csearch_path%3Dpublic" }],
] as [string, NodeJS.ProcessEnv][]) {
  test(`0026 refuses ${name} before opening any connection`, async () => {
    let opened = false;
    await assert.rejects(runMigrations(env, () => { opened = true; throw Error("unexpected connection"); }));
    assert.equal(opened, false);
  });
}

test("0026 pins unchanged 0000..0025 chain, exact 0026 metadata, journal hash and SQL bytes", () => {
  const chain = readProduction0026Chain();
  assert.equal(chain.journal.entries.length, 27);
  assert.equal(chain.migrations.length, 27);
  assert.equal(chain.journal.entries[26].tag, "0026_offer_moderation_events");
  const validate = (journal = chain.journal, migrations = chain.migrations, getBuffer = (tag: string) => chain.buffers.get(tag)!) =>
    validateProduction0026Chain(journal, migrations, getBuffer);
  assert.doesNotThrow(() => validate());
  for (const index of [0, 7, 24, 25, 26]) {
    const tampered = structuredClone(chain.journal);
    tampered.entries[index].when++;
    assert.throws(() => validate(tampered));
  }
  const metadata = structuredClone(chain.journal); metadata.entries[26].breakpoints = false;
  assert.throws(() => validate(metadata));
  const extra = structuredClone(chain.journal); extra.entries.push({ ...extra.entries[26], idx: 27 });
  assert.throws(() => validate(extra, [...chain.migrations, chain.migrations[26]]));
  assert.throws(() => validate(chain.journal, chain.migrations, tag =>
    tag === "0026_offer_moderation_events" ? Buffer.from("SELECT 1;") : chain.buffers.get(tag)!));
  assert.throws(() => validate(chain.journal, chain.migrations, tag =>
    tag === "0025_partner_applications" ? Buffer.from("SELECT 1;") : chain.buffers.get(tag)!));
});

test("0026 production runner: exact 0025 -> 0026 on classified disposable PostgreSQL only", async t => {
  const testUrl = process.env.PROD_0026_GATE_TEST_URL;
  if (!testUrl) { t.skip("No explicitly configured disposable PostgreSQL fixture"); return; }
  if (process.env.PROD_0026_GATE_TEST_CLASSIFICATION !== "DISPOSABLE_DEV") {
    throw Error("BLOCKED_UNSAFE_QA_DB: expected DISPOSABLE_DEV");
  }
  const safetyEnv = { ...process.env, TEST_DATABASE_URL: testUrl };
  const guard = validateDestructiveTestEnvironment(safetyEnv);
  if (guard.type !== "PASS") throw Error("BLOCKED_UNSAFE_QA_DB: disposable loopback identity not verified");
  const fixture = new Pool({ connectionString: guard.url, max: 2 });
  t.after(() => fixture.end());
  const sqlIdentity = (await fixture.query(
    "SELECT current_database() AS db, inet_server_addr()::text AS host, inet_server_port() AS port"
  )).rows[0];
  assert.equal(sqlIdentity.db, "logimarket_test");
  assert.equal(sqlIdentity.port, Number(new URL(guard.url).port || 5432));

  const chain = readProduction0026Chain();
  async function seedThrough(count = 26) {
    await resetDisposableTestDatabase(fixture, safetyEnv);
    await fixture.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF; END $$");
    const journal = { ...chain.journal, entries: chain.journal.entries.slice(0, count) };
    const folder = createCanonicalRuntimeMigrationDirectory(JSON.stringify(journal), journal, tag => chain.buffers.get(tag)!);
    try {
      await migrate(drizzle(fixture), {
        migrationsFolder: folder, migrationsSchema: "drizzle_runtime", migrationsTable: "__drizzle_migrations",
      });
    } finally { cleanupCanonicalRuntimeMigrationDirectory(folder); }
  }
  const journalRows = async () => (await fixture.query(
    "SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at"
  )).rows;
  const state = async () => {
    const m = await fetchLiveSchemaMetadata(fixture);
    return classifyRuntimeTarget(m.fingerprint, m.publicTables, m.security).state;
  };
  let ddlCalls = 0;
  const execute = async (afterDdl?: () => Promise<void>) => {
    ddlCalls = 0;
    await runMigrations(PROD_0026_TEST_ENV, () => new Pool({ connectionString: guard.url, max: 1 }),
      async (db, config) => {
        ddlCalls++;
        const staged = JSON.parse(fs.readFileSync(config.migrationsFolder + "/meta/_journal.json", "utf8"));
        assert.equal(staged.entries.length, 1);
        assert.equal(staged.entries[0].tag, "0026_offer_moderation_events");
        assert.deepEqual(fs.readdirSync(config.migrationsFolder).sort(), ["0026_offer_moderation_events.sql", "meta"]);
        await migrate(db, config);
        if (afterDdl) await afterDdl();
      });
  };

  await t.test("exact POST_0024 refuses without DDL", async () => {
    await seedThrough(25);
    assert.equal(await state(), "EXACT_EXISTING_POST_0024");
    const before = await journalRows();
    await assert.rejects(execute(), /0026_INVALID_PHYSICAL_STATE/);
    assert.equal(ddlCalls, 0);
    assert.deepEqual(await journalRows(), before);
  });

  await t.test("corrupt 0025 journal hash refuses without DDL or repair", async () => {
    await seedThrough();
    await fixture.query("UPDATE drizzle_runtime.__drizzle_migrations SET hash='tampered' WHERE created_at=(SELECT max(created_at) FROM drizzle_runtime.__drizzle_migrations)");
    const before = await journalRows();
    await assert.rejects(execute());
    assert.equal(ddlCalls, 0);
    assert.deepEqual(await journalRows(), before);
  });

  await t.test("session advisory lock prevents concurrent 0026 execution", async () => {
    await seedThrough();
    const c = await fixture.connect();
    try {
      await c.query("SELECT pg_advisory_lock(716987210226::bigint)");
      await assert.rejects(execute(), /0026_CONCURRENT_EXECUTION/);
      assert.equal(ddlCalls, 0);
    } finally {
      await c.query("SELECT pg_advisory_unlock(716987210226::bigint)");
      c.release();
    }
  });

  await t.test("only pinned 0026 applies; journal prefix preserved; replay has zero DDL", async () => {
    await seedThrough();
    assert.equal(await state(), "EXACT_EXISTING_POST_0025");
    const before = await journalRows(); assert.equal(before.length, 26);
    await execute(); assert.equal(ddlCalls, 1);
    assert.equal(await state(), "EXACT_EXISTING_POST_0026");
    const after = await journalRows(); assert.equal(after.length, 27);
    assert.deepEqual(after.slice(0, 26), before);
    await assert.rejects(execute(), /ALREADY_APPLIED_0026_NO_DDL/);
    assert.equal(ddlCalls, 0);
    assert.deepEqual(await journalRows(), after);
    const rls = (await fixture.query(
      "SELECT relrowsecurity FROM pg_class WHERE oid='public.offer_moderation_events'::regclass"
    )).rows[0];
    assert.equal(rls.relrowsecurity, true);
    for (const role of ["anon", "authenticated", "service_role"]) {
      const roleResult = (await fixture.query(
        "SELECT has_table_privilege($1,'public.offer_moderation_events','SELECT') AS can_read, has_table_privilege($1,'public.offer_moderation_events','INSERT') AS can_write",
        [role],
      )).rows[0];
      assert.deepEqual(roleResult, {can_read:false,can_write:false});
    }
  });

  await t.test("unauthorized grant is detected after committed DDL and never repaired automatically", async () => {
    await seedThrough();
    await assert.rejects(execute(async () => {
      await fixture.query("GRANT SELECT ON public.offer_moderation_events TO anon");
    }), /0026_RLS_GRANTS_TRIGGERS_CONTRACT/);
    assert.equal(ddlCalls, 1);
    assert.equal((await journalRows()).length, 27);
    assert.equal((await fixture.query(
      "SELECT has_table_privilege('anon','public.offer_moderation_events','SELECT') AS can_read"
    )).rows[0].can_read, true);
  });

  await t.test("postflight drift stops without automatic rollback or history rewrite", async () => {
    await seedThrough();
    await assert.rejects(execute(async () => {
      await fixture.query("ALTER TABLE public.offer_moderation_events DISABLE ROW LEVEL SECURITY");
    }), /0026_INVALID_PHYSICAL_STATE/);
    assert.equal(ddlCalls, 1);
    assert.equal((await journalRows()).length, 27);
    assert.equal((await fixture.query(
      "SELECT relrowsecurity FROM pg_class WHERE oid='public.offer_moderation_events'::regclass"
    )).rows[0].relrowsecurity, false);
  });
});
