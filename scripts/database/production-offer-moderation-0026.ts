import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { canonicalizeMigrationEol, isPortableHashEquivalent } from "./runtime-migration-hashing";
import { validateAppliedMigrationPrefix } from "./runtime-migration-journal";
import { validateProduction0025Chain, type Production0025Client } from "./production-partner-application-0025";
import { createCanonicalRuntimeMigrationDirectory, cleanupCanonicalRuntimeMigrationDirectory } from "./runtime-migration-temp-dir";
import { classifyRuntimeTarget, fetchLiveSchemaMetadata, type Queryable } from "./verify-runtime-schema-fingerprint";

const TAG = "0026_offer_moderation_events";
const TIMESTAMP = 1793480000000;
const APPROVED_0026_GIT_BLOB_SHA1 = "67c60975fcdf9003f0431cc5e5c12a4341c77c4e";
const LOCK_ID = "716987210226";

type Entry = { idx: number; version: string; when: number; tag: string; breakpoints: boolean };
type Journal = { version: string; dialect: string; entries: Entry[] };
type Migration = { hash: string; folderMillis: number };
type Row = { hash: string; created_at: string | number };
export type Production0026Chain = { journal: Journal; migrations: Migration[]; buffers: Map<string, Buffer> };

export function validateProduction0026Chain(
  journal: Journal,
  migrations: Migration[],
  getBuffer: (tag: string) => Buffer,
): void {
  const last = journal.entries?.[26];
  if (
    journal.entries?.length !== 27 || migrations.length !== 27 ||
    last?.idx !== 26 || last.version !== "7" || last.when !== TIMESTAMP ||
    last.tag !== TAG || last.breakpoints !== true ||
    migrations[26]?.folderMillis !== TIMESTAMP
  ) {
    throw new Error("STOP_AND_REPORT: 0026_ONLY_CANONICAL_SUCCESSOR");
  }

  // The existing 0025 production pin continues to protect all 26 historical
  // journal entries, hashes and SQL bytes. No historical rewrite is permitted.
  validateProduction0025Chain(
    { ...journal, entries: journal.entries.slice(0, 26) },
    migrations.slice(0, 26),
    getBuffer,
  );

  const buffer = getBuffer(TAG);
  if (!buffer || !isPortableHashEquivalent(migrations[26].hash, buffer)) {
    throw new Error("STOP_AND_REPORT: 0026_SQL_JOURNAL_HASH");
  }
  const sql = Buffer.from(canonicalizeMigrationEol(buffer), "utf8");
  const gitBlob = crypto.createHash("sha1").update(`blob ${sql.byteLength}\0`).update(sql).digest("hex");
  if (gitBlob !== APPROVED_0026_GIT_BLOB_SHA1) {
    throw new Error("STOP_AND_REPORT: 0026_UNAPPROVED_SQL_BYTES");
  }
}

export function readProduction0026Chain(): Production0026Chain {
  const folder = path.join(process.cwd(), "drizzle-runtime");
  const journal = JSON.parse(fs.readFileSync(path.join(folder, "meta/_journal.json"), "utf8")) as Journal;
  if (!Array.isArray(journal.entries) || journal.entries.length !== 27 ||
    journal.entries.some(entry => !/^\d{4}_[a-z0-9_]+$/.test(entry.tag))) {
    throw new Error("STOP_AND_REPORT: 0026_INVALID_DISK_JOURNAL");
  }
  const migrations = readMigrationFiles({ migrationsFolder: folder });
  const buffers = new Map(journal.entries.map(entry =>
    [entry.tag, fs.readFileSync(path.join(folder, `${entry.tag}.sql`))] as const));
  validateProduction0026Chain(journal, migrations, tag => buffers.get(tag)!);
  return { journal, migrations, buffers };
}

async function assert0026ClientIsolation(client: Queryable): Promise<void> {
  const result = await client.query(`
    SELECT
      (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.offer_moderation_events'::regclass) AS rls_enabled,
      (SELECT count(*)::int FROM pg_trigger
         WHERE tgrelid = 'public.offer_moderation_events'::regclass
           AND NOT tgisinternal AND tgenabled = 'O') AS active_triggers,
      (SELECT count(*)::int FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'reject_offer_moderation_event_mutation'
           AND NOT p.prosecdef AND p.pronargs = 0
           AND p.proconfig = ARRAY['search_path=pg_catalog, public']::text[]) AS safe_functions,
      (SELECT count(*)::int FROM pg_roles
         WHERE rolname IN ('anon', 'authenticated', 'service_role')) AS client_roles,
      (SELECT count(*)::int FROM pg_roles r
         WHERE r.rolname IN ('anon', 'authenticated', 'service_role') AND (
           has_table_privilege(r.oid, 'public.offer_moderation_events'::regclass,
             'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
           OR has_sequence_privilege(r.oid, 'public.offer_moderation_events_id_seq'::regclass,
             'USAGE,SELECT,UPDATE')
           OR has_function_privilege(r.oid, 'public.reject_offer_moderation_event_mutation()'::regprocedure,
             'EXECUTE')
         )) AS exposed_roles
  `);
  const row = result.rows[0] as {
    rls_enabled: boolean; active_triggers: number; safe_functions: number;
    client_roles: number; exposed_roles: number;
  } | undefined;
  if (!row || row.rls_enabled !== true || row.active_triggers !== 2 ||
    row.safe_functions !== 1 || row.client_roles !== 3 || row.exposed_roles !== 0) {
    throw new Error("STOP_AND_REPORT: 0026_RLS_GRANTS_TRIGGERS_CONTRACT");
  }
}

async function stateAndJournal(client: Queryable, chain: Production0026Chain) {
  const metadata = await fetchLiveSchemaMetadata(client);
  const classification = classifyRuntimeTarget(metadata.fingerprint, metadata.publicTables, metadata.security);
  if (classification.state !== "EXACT_EXISTING_POST_0025" &&
      classification.state !== "EXACT_EXISTING_POST_0026") {
    throw new Error(`STOP_AND_REPORT: 0026_INVALID_PHYSICAL_STATE ${classification.state}`);
  }
  const rows = (await client.query(
    "SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC"
  )).rows as Row[];
  validateAppliedMigrationPrefix("production", classification.state, chain.journal, chain.migrations,
    rows, tag => chain.buffers.get(tag)!);
  if (rows.length !== (classification.state === "EXACT_EXISTING_POST_0025" ? 26 : 27)) {
    throw new Error("STOP_AND_REPORT: 0026_JOURNAL_CARDINALITY");
  }
  return classification.state;
}

export async function runProduction0026(
  pool: { connect?(): Promise<Production0025Client> },
  chain: Production0026Chain,
  migrateFn: typeof migrate = migrate,
): Promise<void> {
  if (!pool.connect) throw new Error("STOP_AND_REPORT: 0026_REQUIRES_PINNED_CLIENT");
  const client = await pool.connect();
  let temp: string | null = null;
  try {
    await client.query("SET statement_timeout = '60s'");
    await client.query("SET lock_timeout = '5s'");
    const lock = (await client.query(
      `SELECT pg_try_advisory_lock(${LOCK_ID}::bigint) AS locked`
    )).rows[0] as { locked: boolean } | undefined;
    if (lock?.locked !== true) throw new Error("STOP_AND_REPORT: 0026_CONCURRENT_EXECUTION");

    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const before = await stateAndJournal(client, chain);
    if (before === "EXACT_EXISTING_POST_0026") {
      await assert0026ClientIsolation(client);
      throw new Error("STOP_AND_REPORT: ALREADY_APPLIED_0026_NO_DDL");
    }
    await client.query("ROLLBACK");

    // Only the pinned 0026 SQL is passed to Drizzle. The 26 preceding migrations
    // must already exist and will never be run again by this production runner.
    const only0026 = { ...chain.journal, entries: [chain.journal.entries[26]] };
    temp = createCanonicalRuntimeMigrationDirectory(
      JSON.stringify(only0026), only0026, tag => chain.buffers.get(tag)!);
    await migrateFn(drizzle(client as never), {
      migrationsFolder: temp, migrationsSchema: "drizzle_runtime",
      migrationsTable: "__drizzle_migrations",
    });

    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    if (await stateAndJournal(client, chain) !== "EXACT_EXISTING_POST_0026") {
      throw new Error("STOP_AND_REPORT: 0026_POST_STATE");
    }
    await assert0026ClientIsolation(client);
    await client.query("ROLLBACK");
    console.log("RUNNER: production 0026 fingerprint/journal 27/RLS/grants/triggers PASS");
  } finally {
    // Committed DDL is NOT rolled back by a failed postflight. Never repair,
    // truncate, DROP or rewrite production migration history automatically.
    try { await client.query("ROLLBACK"); } finally {
      client.release(true); // Destroy session and release advisory lock.
      if (temp) cleanupCanonicalRuntimeMigrationDirectory(temp);
    }
  }
}
