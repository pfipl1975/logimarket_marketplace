import test from "node:test";
import assert from "node:assert/strict";
import { runMigrations } from "../../scripts/database/run-runtime-migrations";
import { PROD_0025_PROJECT_REF, PROD_0025_WRITE_AUTHORIZATION, verifyTarget } from "../../scripts/database/verify-runtime-migration-target";
import { readProduction0025Chain, validateProduction0025Chain } from "../../scripts/database/production-partner-application-0025";

export const production0025TestEnv = {
  NODE_ENV: "test" as const,
  DATABASE_URL: `postgresql://postgres:synthetic@db.${PROD_0025_PROJECT_REF}.supabase.co:5432/postgres?sslmode=verify-full&sslrootcert=synthetic-ca.pem`,
  RUNTIME_MIGRATION_TARGET: "production",
  RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: PROD_0025_PROJECT_REF,
  RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "oczllhpiicrngbcbxndu",
  RUNTIME_MIGRATION_WRITE_AUTHORIZATION: PROD_0025_WRITE_AUTHORIZATION,
  RUNTIME_MIGRATION_EXPECTED_PRE_STATE: "EXACT_EXISTING_POST_0024",
};

test("production 0025 exact target and explicit authorization", () => {
  assert.doesNotThrow(() => verifyTarget(production0025TestEnv));
  assert.doesNotThrow(() => verifyTarget({ ...production0025TestEnv, DATABASE_URL: `postgresql://postgres.${PROD_0025_PROJECT_REF}:synthetic@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=verify-full&sslrootcert=synthetic-ca.pem` }));
});

const badEnvs: [string, NodeJS.ProcessEnv][] = [
  ["missing authorization", { ...production0025TestEnv, RUNTIME_MIGRATION_WRITE_AUTHORIZATION: undefined }],
  ["wrong authorization", { ...production0025TestEnv, RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "WRONG" }],
  ["historical authorization", { ...production0025TestEnv, RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_PROD_RUNTIME_0000_TO_0003" }],
  ["wrong project", { ...production0025TestEnv, RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "other", DATABASE_URL: "postgres://postgres:synthetic@db.other.supabase.co/postgres" }],
  ["forbidden project", { ...production0025TestEnv, RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: PROD_0025_PROJECT_REF }],
  ["missing pre-state", { ...production0025TestEnv, RUNTIME_MIGRATION_EXPECTED_PRE_STATE: undefined }],
  ["POST_0023 pre-state", { ...production0025TestEnv, RUNTIME_MIGRATION_EXPECTED_PRE_STATE: "EXACT_EXISTING_POST_0023" }],
  ["reconciliation reuse", { ...production0025TestEnv, RUNTIME_MIGRATION_RECONCILIATION: "EXACT_POST_0007_JOURNAL_0000_TO_0006" }],
  ["development target", { ...production0025TestEnv, RUNTIME_MIGRATION_TARGET: "development" }],
  ["spoofed pooler", { ...production0025TestEnv, DATABASE_URL: `postgres://postgres.${PROD_0025_PROJECT_REF}:synthetic@evil.invalid/postgres?sslmode=verify-full&sslrootcert=synthetic-ca.pem` }],
  ["transaction pooler", { ...production0025TestEnv, DATABASE_URL: production0025TestEnv.DATABASE_URL.replace(":5432/", ":6543/") }],
  ["wrong database", { ...production0025TestEnv, DATABASE_URL: production0025TestEnv.DATABASE_URL.replace("/postgres?", "/other?") }],
  ["missing TLS", { ...production0025TestEnv, DATABASE_URL: production0025TestEnv.DATABASE_URL.split("?")[0] }],
  ["missing CA", { ...production0025TestEnv, DATABASE_URL: production0025TestEnv.DATABASE_URL.replace("&sslrootcert=synthetic-ca.pem", "") }],
  ["TLS downgrade", { ...production0025TestEnv, DATABASE_URL: production0025TestEnv.DATABASE_URL.replace("verify-full", "no-verify") }],
  ["duplicate TLS override", { ...production0025TestEnv, DATABASE_URL: production0025TestEnv.DATABASE_URL + "&sslmode=disable" }],
  ["connection options override", { ...production0025TestEnv, DATABASE_URL: production0025TestEnv.DATABASE_URL + "&options=unapproved" }],
];
for (const [name, env] of badEnvs) test(`production 0025 refuses ${name} before pool creation`, async () => {
  let opened = false;
  await assert.rejects(runMigrations(env, () => { opened = true; throw Error("unexpected connection"); }));
  assert.equal(opened, false);
});

test("production 0025 pins all 26 journal entries and SQL bytes", () => {
  const chain = readProduction0025Chain();
  assert.equal(chain.journal.entries.length, 26);
  assert.equal(chain.migrations.length, 26);
  assert.equal(chain.journal.entries[25].tag, "0025_partner_applications");
  assert.doesNotThrow(() => validateProduction0025Chain(chain.journal, chain.migrations, tag => chain.buffers.get(tag)!));
  for (const index of [0, 7, 24, 25]) {
    assert.throws(() => validateProduction0025Chain(chain.journal, chain.migrations, tag => tag === chain.journal.entries[index].tag ? Buffer.from("SELECT 1;") : chain.buffers.get(tag)!));
    const altered = structuredClone(chain.journal); altered.entries[index].when++;
    assert.throws(() => validateProduction0025Chain(altered, chain.migrations, tag => chain.buffers.get(tag)!));
  }
  const shorter = structuredClone(chain.journal); shorter.entries.pop();
  assert.throws(() => validateProduction0025Chain(shorter, chain.migrations.slice(0, 25), tag => chain.buffers.get(tag)!));
  const later = structuredClone(chain.journal); later.entries.push({ ...later.entries[25], idx: 26, tag: "0026_unapproved" });
  assert.throws(() => validateProduction0025Chain(later, [...chain.migrations, chain.migrations[25]], tag => chain.buffers.get(tag)!));
  const reordered = structuredClone(chain.journal); [reordered.entries[0], reordered.entries[1]] = [reordered.entries[1], reordered.entries[0]];
  assert.throws(() => validateProduction0025Chain(reordered, chain.migrations, tag => chain.buffers.get(tag)!));
  const metadata = structuredClone(chain.journal); metadata.entries[25].breakpoints = false;
  assert.throws(() => validateProduction0025Chain(metadata, chain.migrations, tag => chain.buffers.get(tag)!));
});
import fs from "node:fs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createCanonicalRuntimeMigrationDirectory, cleanupCanonicalRuntimeMigrationDirectory } from "../../scripts/database/runtime-migration-temp-dir";
import { fetchLiveSchemaMetadata, classifyRuntimeTarget } from "../../scripts/database/verify-runtime-schema-fingerprint";
import { resetDisposableTestDatabase, validateDestructiveTestEnvironment } from "./helpers/destructive-db-safety";

test("production 0025 contract on explicitly classified real isolated PostgreSQL", async t => {
  if (!process.env.PROD_0025_GATE_TEST_URL) { t.skip("No explicitly classified LOCAL/DISPOSABLE_DEV 0025 fixture"); return; }
  assert.ok(["LOCAL", "DISPOSABLE_DEV"].includes(process.env.PROD_0025_GATE_TEST_CLASSIFICATION ?? ""));
  const safety = { ...process.env, TEST_DATABASE_URL: process.env.PROD_0025_GATE_TEST_URL };
  const guard = validateDestructiveTestEnvironment(safety);
  assert.equal(guard.type, "PASS");
  if (guard.type !== "PASS") throw Error("Unsafe fixture");
  const url = new URL(guard.url);
  const fixture = new Pool({ connectionString: guard.url, max: 1 });
  t.after(() => fixture.end());
  const identity = (await fixture.query("SELECT current_database() AS db, inet_server_port() AS port")).rows[0];
  assert.equal(identity.db, "logimarket_test"); assert.equal(identity.port, Number(url.port || 5432));
  const chain = readProduction0025Chain();
  const getBuffer = (tag: string) => chain.buffers.get(tag)!;
  async function seed(count = 25) {
    await resetDisposableTestDatabase(fixture, safety);
    await fixture.query("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF; END $$");
    const journal = { ...chain.journal, entries: chain.journal.entries.slice(0, count) };
    const dir = createCanonicalRuntimeMigrationDirectory(JSON.stringify(journal), journal, getBuffer);
    try { await migrate(drizzle(fixture), { migrationsFolder: dir, migrationsSchema: "drizzle_runtime", migrationsTable: "__drizzle_migrations" }); }
    finally { cleanupCanonicalRuntimeMigrationDirectory(dir); }
  }
  const journalRows = async () => (await fixture.query("SELECT hash,created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at")).rows;
  const physicalState = async () => { const m = await fetchLiveSchemaMetadata(fixture); return classifyRuntimeTarget(m.fingerprint,m.publicTables,m.security).state; };
  let ddlCalls = 0;
  async function execute(afterDdl?: () => Promise<void>) {
    ddlCalls = 0;
    await runMigrations(production0025TestEnv, () => new Pool({ connectionString: guard.type === "PASS" ? guard.url : "", max: 1 }), async (db, config) => {
      ddlCalls++;
      const staged = JSON.parse(fs.readFileSync(config.migrationsFolder + "/meta/_journal.json", "utf8"));
      assert.equal(staged.entries.length, 1); assert.equal(staged.entries[0].tag, "0025_partner_applications");
      assert.deepEqual(fs.readdirSync(config.migrationsFolder).sort(), ["0025_partner_applications.sql", "meta"]);
      await migrate(db, config);
      if (afterDdl) await afterDdl();
    });
  }
  await t.test("POST_0023 refuses without DDL", async () => {
    await seed(24); const before = await journalRows();
    await assert.rejects(execute(), /0025_INVALID_PHYSICAL_STATE/); assert.equal(ddlCalls, 0);
    assert.deepEqual(await journalRows(), before);
  });
  await t.test("POST_0024 drift refuses without DDL", async () => {
    await seed(); await fixture.query("ALTER TABLE public.offers ADD COLUMN synthetic_gate_drift text");
    const before = await journalRows(); await assert.rejects(execute(), /0025_INVALID_PHYSICAL_STATE/);
    assert.equal(ddlCalls, 0); assert.deepEqual(await journalRows(), before);
  });
  for (const [name, sql] of [
    ["hash", "UPDATE drizzle_runtime.__drizzle_migrations SET hash='corrupt-fixture' WHERE created_at=(SELECT min(created_at) FROM drizzle_runtime.__drizzle_migrations)"],
    ["timestamp", "UPDATE drizzle_runtime.__drizzle_migrations SET created_at=created_at+1 WHERE created_at=(SELECT max(created_at) FROM drizzle_runtime.__drizzle_migrations)"],
    ["count", "DELETE FROM drizzle_runtime.__drizzle_migrations WHERE created_at=(SELECT max(created_at) FROM drizzle_runtime.__drizzle_migrations)"],
  ]) await t.test(`POST_0024 corrupt ${name} refuses without DDL or repair`, async () => {
    await seed(); await fixture.query(sql); const before = await journalRows();
    await assert.rejects(execute()); assert.equal(ddlCalls, 0); assert.deepEqual(await journalRows(), before);
  });
  await t.test("session advisory lock refuses concurrent execution", async () => {
    await seed(); const client = await fixture.connect();
    try { await client.query("SELECT pg_advisory_lock(716987210225::bigint)"); await assert.rejects(execute(), /0025_CONCURRENT_EXECUTION/); assert.equal(ddlCalls, 0); }
    finally { await client.query("SELECT pg_advisory_unlock(716987210225::bigint)"); client.release(); }
  });
  await t.test("only 0025 migrates POST_0024 to exact POST_0025; replay has zero DDL", async () => {
    await seed(); assert.equal(await physicalState(), "EXACT_EXISTING_POST_0024");
    const before = await journalRows(); await execute(); assert.equal(ddlCalls, 1);
    assert.equal(await physicalState(), "EXACT_EXISTING_POST_0025");
    const after = await journalRows(); assert.equal(after.length, 26); assert.deepEqual(after.slice(0,25), before);
    await assert.rejects(execute(), /ALREADY_APPLIED_0025_NO_DDL/); assert.equal(ddlCalls, 0);
    assert.deepEqual(await journalRows(), after);
    assert.deepEqual((await fixture.query("SELECT (SELECT count(*)::int FROM legal_documents) documents,(SELECT count(*)::int FROM legal_document_versions) versions,(SELECT count(*)::int FROM legal_pack_versions) packs,(SELECT count(*)::int FROM legal_pack_documents) memberships")).rows[0], {documents:0,versions:0,packs:0,memberships:0});
    const client = await fixture.connect();
    try {
      for (const role of ["anon", "authenticated", "service_role"]) {
        await client.query("BEGIN"); await client.query(`SET LOCAL ROLE ${role}`);
        for (const table of ["partner_applications", "partner_application_events", "partner_application_limits"]) {
          await client.query("SAVEPOINT denied");
          await assert.rejects(client.query(`SELECT * FROM public.${table}`), e => (e as {code:string}).code === "42501");
          await client.query("ROLLBACK TO denied");
        }
        await client.query("ROLLBACK");
      }
    } finally { await client.query("ROLLBACK"); client.release(); }
  });
  await t.test("bad post-migration grant stops without automatic repair", async () => {
    await seed(); await assert.rejects(execute(() => fixture.query("GRANT SELECT ON public.partner_applications TO anon").then(() => undefined)), /0025_RLS_GRANTS_FUNCTION_CONTRACT/);
    assert.equal(ddlCalls, 1); assert.equal((await journalRows()).length, 26);
    assert.equal((await fixture.query("SELECT has_table_privilege('anon','public.partner_applications','SELECT') AS granted")).rows[0].granted, true);
  });
  await t.test("bad post-migration journal stops without rewriting history", async () => {
    await seed(); await assert.rejects(execute(() => fixture.query("UPDATE drizzle_runtime.__drizzle_migrations SET hash='post-fixture-corrupt' WHERE created_at=(SELECT max(created_at) FROM drizzle_runtime.__drizzle_migrations)").then(() => undefined)));
    assert.equal((await journalRows()).at(-1)?.hash, "post-fixture-corrupt");
  });
  await t.test("bad post-migration fingerprint stops without rollback DDL", async () => {
    await seed(); await assert.rejects(execute(() => fixture.query("ALTER TABLE public.partner_applications DISABLE ROW LEVEL SECURITY").then(() => undefined)), /0025_INVALID_PHYSICAL_STATE/);
    assert.equal((await journalRows()).length, 26);
    assert.equal((await fixture.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.partner_applications'::regclass")).rows[0].relrowsecurity, false);
  });
});