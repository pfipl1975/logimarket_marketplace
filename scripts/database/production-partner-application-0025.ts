import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { canonicalizeMigrationEol, isPortableHashEquivalent } from "./runtime-migration-hashing";
import { validateAppliedMigrationPrefix } from "./runtime-migration-journal";
import { classifyRuntimeTarget, fetchLiveSchemaMetadata, type Queryable } from "./verify-runtime-schema-fingerprint";
import { createCanonicalRuntimeMigrationDirectory, cleanupCanonicalRuntimeMigrationDirectory } from "./runtime-migration-temp-dir";

// Owner-review candidate: binds all journal metadata and LF SQL bytes, 0000..0025.
const APPROVED_CHAIN_SHA256 = "4a6c564049d2e01c84a6b8dea8f24b692044125d9d775d9ffcebf942ab0a4f5e";
const TAG = "0025_partner_applications";
const LOCK_ID = "716987210225";
type Entry = { idx: number; version: string; when: number; tag: string; breakpoints: boolean };
type Journal = { version: string; dialect: string; entries: Entry[] };
type Migration = { hash: string; folderMillis: number };
type Row = { hash: string; created_at: string | number };
export type Production0025Client = Queryable & { release(destroy?: boolean): void };
export type Production0025Chain = { journal: Journal; migrations: Migration[]; buffers: Map<string, Buffer> };

export function validateProduction0025Chain(journal: Journal, migrations: Migration[], getBuffer: (tag: string) => Buffer): void {
  if (journal.entries.length !== 26 || migrations.length !== 26 || journal.entries[25]?.tag !== TAG) {
    throw new Error("STOP_AND_REPORT: 0025_ONLY_CHAIN_REQUIRED");
  }
  const entries = journal.entries.map((entry, index) => {
    const buffer = getBuffer(entry.tag);
    if (entry.idx !== index || entry.when !== migrations[index].folderMillis ||
        !isPortableHashEquivalent(migrations[index].hash, buffer)) {
      throw new Error("STOP_AND_REPORT: 0025_CHAIN_METADATA_OR_BYTES");
    }
    return { ...entry, sha256: crypto.createHash("sha256").update(canonicalizeMigrationEol(buffer)).digest("hex") };
  });
  const digest = crypto.createHash("sha256").update(JSON.stringify({ version: journal.version, dialect: journal.dialect, entries })).digest("hex");
  if (digest !== APPROVED_CHAIN_SHA256) throw new Error("STOP_AND_REPORT: 0025_UNAPPROVED_CHAIN");
}

export function readProduction0025Chain(): Production0025Chain {
  const folder = path.join(process.cwd(), "drizzle-runtime");
  const fullJournal = JSON.parse(fs.readFileSync(path.join(folder, "meta/_journal.json"), "utf8")) as Journal;
  const fullMigrations = readMigrationFiles({ migrationsFolder: folder });
  // 0025's production authorization is immutable. The only supported
  // successor is the reviewed 0026 candidate; do not pass it to this runner.
  const successor = fullJournal.entries[26];
  if (
    fullJournal.entries.length !== 27 || fullMigrations.length !== 27 ||
    successor?.idx !== 26 || successor.version !== "7" ||
    successor.when !== 1793480000000 ||
    successor.tag !== "0026_offer_moderation_events" ||
    successor.breakpoints !== true
  ) {
    throw new Error("STOP_AND_REPORT: 0025_UNAPPROVED_SUCCESSOR_CHAIN");
  }
  const journal = { ...fullJournal, entries: fullJournal.entries.slice(0, 26) };
  const migrations = fullMigrations.slice(0, 26);
  const buffers = new Map(journal.entries.map(e => [e.tag, fs.readFileSync(path.join(folder, `${e.tag}.sql`))]));
  validateProduction0025Chain(journal, migrations, tag => buffers.get(tag)!);
  return { journal, migrations, buffers };
}

async function stateAndJournal(client: Queryable, chain: Production0025Chain) {
  const metadata = await fetchLiveSchemaMetadata(client);
  const classification = classifyRuntimeTarget(metadata.fingerprint, metadata.publicTables, metadata.security);
  if (!["EXACT_EXISTING_POST_0024", "EXACT_EXISTING_POST_0025"].includes(classification.state)) {
    throw new Error(`STOP_AND_REPORT: 0025_INVALID_PHYSICAL_STATE ${classification.state}`);
  }
  const rows = (await client.query("SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC")).rows as Row[];
  validateAppliedMigrationPrefix("production", classification.state, chain.journal, chain.migrations, rows, tag => chain.buffers.get(tag)!);
  if (rows.length !== (classification.state === "EXACT_EXISTING_POST_0024" ? 25 : 26)) {
    throw new Error("STOP_AND_REPORT: 0025_JOURNAL_CARDINALITY");
  }
  return classification.state;
}

async function assertApplicationAccess(client: Queryable): Promise<void> {
  const tables = ["partner_applications", "partner_application_events", "partner_application_limits"];
  const functions = ["guard_partner_application", "record_partner_application_event", "protect_partner_application_history"];
  const result = await client.query(`
    WITH grants AS (
      SELECT a.grantee FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r'::"char",c.relowner))) a
      WHERE n.nspname='public' AND c.relname=ANY($1) AND c.relkind='r'
      UNION ALL
      SELECT a.grantee FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f'::"char",p.proowner))) a
      WHERE n.nspname='public' AND p.proname=ANY($2)
    ), functions AS (
      SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=ANY($2)
    )
    SELECT (SELECT count(*)::int FROM grants g LEFT JOIN pg_roles r ON r.oid=g.grantee
      WHERE g.grantee=0 OR r.rolname IN ('anon','authenticated','service_role')) AS unsafe_grants,
      (SELECT count(*)::int FROM functions) AS function_count,
      (SELECT count(*)::int FROM functions WHERE prosecdef OR pronargs<>0 OR
        proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[]) AS unsafe_functions
  `, [tables, functions]);
  const row = result.rows[0] as { unsafe_grants: number; function_count: number; unsafe_functions: number } | undefined;
  if (!row || row.unsafe_grants !== 0 || row.function_count !== 3 || row.unsafe_functions !== 0) {
    throw new Error("STOP_AND_REPORT: 0025_RLS_GRANTS_FUNCTION_CONTRACT");
  }
}

export async function runProduction0025(
  pool: { connect?(): Promise<Production0025Client> }, chain: Production0025Chain, migrateFn: typeof migrate = migrate,
): Promise<void> {
  if (!pool.connect) throw new Error("STOP_AND_REPORT: 0025_REQUIRES_PINNED_CLIENT");
  const client = await pool.connect();
  let temp: string | null = null;
  try {
    await client.query("SET statement_timeout = '60s'");
    await client.query("SET lock_timeout = '5s'");
    const lock = (await client.query(`SELECT pg_try_advisory_lock(${LOCK_ID}::bigint) AS locked`)).rows[0] as { locked: boolean };
    if (lock?.locked !== true) throw new Error("STOP_AND_REPORT: 0025_CONCURRENT_EXECUTION");
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const before = await stateAndJournal(client, chain);
    if (before === "EXACT_EXISTING_POST_0025") {
      await assertApplicationAccess(client);
      throw new Error("STOP_AND_REPORT: ALREADY_APPLIED_0025_NO_DDL");
    }
    await client.query("ROLLBACK");
    // The temporary migrator input contains precisely one SQL file; history stays immutable.
    const only0025 = { ...chain.journal, entries: [chain.journal.entries[25]] };
    temp = createCanonicalRuntimeMigrationDirectory(JSON.stringify(only0025), only0025, tag => chain.buffers.get(tag)!);
    await migrateFn(drizzle(client as never), { migrationsFolder: temp, migrationsSchema: "drizzle_runtime", migrationsTable: "__drizzle_migrations" });
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    if (await stateAndJournal(client, chain) !== "EXACT_EXISTING_POST_0025") throw new Error("STOP_AND_REPORT: 0025_POST_STATE");
    await assertApplicationAccess(client);
    await client.query("ROLLBACK");
    console.log("RUNNER: production 0025 fingerprint/journal 26/RLS/grants PASS");
  } finally {
    // A failed post-check does not undo committed DDL. Never repair or rewrite history.
    try { await client.query("ROLLBACK"); } finally {
      client.release(true); // Destroy this connection, releasing its session advisory lock.
      if (temp) cleanupCanonicalRuntimeMigrationDirectory(temp);
    }
  }
}