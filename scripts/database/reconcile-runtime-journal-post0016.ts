import fs from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { readMigrationFiles } from "drizzle-orm/migrator";
import {
  normalizeProjectRef,
  RUNTIME_JOURNAL_SCHEMA,
  RUNTIME_JOURNAL_TABLE,
  RUNTIME_MIGRATIONS_FOLDER,
} from "./runtime-migration-contract";
import { isPortableHashEquivalent } from "./runtime-migration-hashing";
import { validateAppliedMigrationPrefix } from "./runtime-migration-journal";
import {
  classifyRuntimeTarget,
  fetchLiveSchemaMetadata,
} from "./verify-runtime-schema-fingerprint";

export const POST_0016_JOURNAL_RECONCILIATION_MODE =
  "EXACT_POST_0016_ABSENT_RUNTIME_JOURNAL";
export const POST_0016_JOURNAL_RECONCILIATION_AUTHORIZATION =
  "AUTHORIZED_PROD_POST_0016_ABSENT_JOURNAL_RECONCILIATION";

// These versions and names are the Owner-reviewed Supabase recovery evidence.
// Migration hashes and timestamps always come from the checked-out runtime files.
export const POST_0016_RECOVERY_HISTORY = [
  { recoveryVersion: "20260917074408", recoveryName: "emergency_recovery_0000_runtime_baseline", runtimeTag: "0000_production_runtime_baseline" },
  { recoveryVersion: "20260917074429", recoveryName: "emergency_recovery_0001_rfq_workflow_hardening", runtimeTag: "0001_rfq_workflow_hardening" },
  { recoveryVersion: "20260917074446", recoveryName: "emergency_recovery_0002_seller_identity_56b1", runtimeTag: "0002_seller_identity_56b1" },
  { recoveryVersion: "20260917085410", recoveryName: "emergency_recovery_runtime_0003_prod_legacy_offer_reconciliation", runtimeTag: "0003_prod_legacy_offer_reconciliation" },
  { recoveryVersion: "20260917085417", recoveryName: "emergency_recovery_runtime_0004_seller_registered_address", runtimeTag: "0004_seller_registered_address" },
  { recoveryVersion: "20260917085458", recoveryName: "emergency_recovery_runtime_0005_marketplace_order_56b2a", runtimeTag: "0005_marketplace_order_56b2a" },
  { recoveryVersion: "20260917085516", recoveryName: "emergency_recovery_runtime_0006_seller_verification_evidence", runtimeTag: "0006_seller_verification_evidence" },
  { recoveryVersion: "20260917085523", recoveryName: "emergency_recovery_runtime_0007_marketplace_order_rls_hardening", runtimeTag: "0007_marketplace_order_rls_hardening" },
  { recoveryVersion: "20260917085537", recoveryName: "emergency_recovery_runtime_0008_verification_event_function_search_path_hardening", runtimeTag: "0008_verification_event_function_search_path_hardening" },
  { recoveryVersion: "20260917085615", recoveryName: "emergency_recovery_runtime_0009_partner_agreement_evidence", runtimeTag: "0009_partner_agreement_evidence" },
  { recoveryVersion: "20260917085624", recoveryName: "emergency_recovery_runtime_0010_offer_media_foundation", runtimeTag: "0010_offer_media_foundation" },
  { recoveryVersion: "20260917085639", recoveryName: "emergency_recovery_runtime_0011_partner_tax_canonical", runtimeTag: "0011_partner_tax_canonical" },
  { recoveryVersion: "20260917085646", recoveryName: "emergency_recovery_runtime_0012_marketplace_order_buyer_contact_snapshot", runtimeTag: "0012_marketplace_order_buyer_contact_snapshot" },
  { recoveryVersion: "20260917085657", recoveryName: "emergency_recovery_runtime_0013_partner_membership", runtimeTag: "0013_partner_membership" },
  { recoveryVersion: "20260917085709", recoveryName: "emergency_recovery_runtime_0014_seller_acceptance_sla", runtimeTag: "0014_seller_acceptance_sla" },
  { recoveryVersion: "20260917085718", recoveryName: "emergency_recovery_runtime_0015_notification_outbox", runtimeTag: "0015_notification_outbox" },
  { recoveryVersion: "20260917085725", recoveryName: "emergency_recovery_runtime_0016_buyer_order_ownership", runtimeTag: "0016_buyer_order_ownership" },
] as const;

const EXPECTED_PREFIX_LENGTH = POST_0016_RECOVERY_HISTORY.length;
const JOURNAL_NAME = `${RUNTIME_JOURNAL_SCHEMA}.${RUNTIME_JOURNAL_TABLE}`;

type JournalRow = { hash: string; created_at: string | number };
type DiskMigration = { folderMillis: number; hash: string };
type DiskJournal = {
  entries: { idx: number; tag: string; when: number }[];
};

export type ReconcilePost0016Result = "RECONCILED" | "ALREADY_RECONCILED";
export type ReconcilePost0016Options = {
  poolFactory?: (connectionString: string) => Pool;
  // Dependency injection for transaction-failure tests. The CLI never supplies it.
  afterJournalCreated?: () => Promise<void>;
};

function blocked(reason: string): never {
  throw new Error(`BLOCKED_${reason}`);
}

export function verifyPost0016ReconciliationTarget(env: NodeJS.ProcessEnv): string {
  const url = env.DATABASE_URL;
  if (!url) blocked("DATABASE_URL_MISSING");
  const expected = env.RUNTIME_MIGRATION_EXPECTED_PROJECT_REF;
  const forbidden = env.RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF;
  if (!expected) blocked("EXPECTED_REF_MISSING");
  if (!forbidden) blocked("FORBIDDEN_REF_MISSING");
  if (expected === forbidden) blocked("EXPECTED_REF_IS_FORBIDDEN_REF");
  const actual = normalizeProjectRef(url);
  if (!actual) blocked("DATABASE_REF_UNPARSEABLE");
  if (actual === forbidden) blocked("FORBIDDEN_DATABASE_TARGET");
  if (actual !== expected) blocked("DATABASE_REF_MISMATCH");
  if (env.RUNTIME_MIGRATION_TARGET !== "production") blocked("TARGET_NOT_PRODUCTION");
  if (env.RUNTIME_MIGRATION_RECONCILIATION !== POST_0016_JOURNAL_RECONCILIATION_MODE) {
    blocked("RECONCILIATION_MODE_INVALID");
  }
  if (env.RUNTIME_MIGRATION_WRITE_AUTHORIZATION !== POST_0016_JOURNAL_RECONCILIATION_AUTHORIZATION) {
    blocked("RECONCILIATION_AUTHORIZATION_INVALID");
  }
  return url;
}

function readCanonicalDiskChain(): {
  journal: DiskJournal;
  migrations: DiskMigration[];
  getBuffer: (tag: string) => Buffer;
} {
  const folder = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER);
  const journal = JSON.parse(fs.readFileSync(path.join(folder, "meta", "_journal.json"), "utf8")) as DiskJournal;
  const migrations = readMigrationFiles({ migrationsFolder: folder });
  const getBuffer = (tag: string) => fs.readFileSync(path.join(folder, `${tag}.sql`));
  validateCanonicalDiskChain(journal, migrations, getBuffer);
  return { journal, migrations, getBuffer };
}

export function validateCanonicalDiskChain(
  journal: DiskJournal,
  migrations: DiskMigration[],
  getBuffer: (tag: string) => Buffer,
): void {
  if (
    !Array.isArray(journal.entries) ||
    journal.entries.length !== migrations.length ||
    journal.entries.length < EXPECTED_PREFIX_LENGTH
  ) {
    blocked("DISK_CHAIN_LENGTH");
  }
  const tags = new Set<string>();
  let previousWhen = -1;
  for (let i = 0; i < journal.entries.length; i++) {
    const entry = journal.entries[i];
    const migration = migrations[i];
    if (
      entry.idx !== i || !/^00\d\d_[a-z0-9_]+$/.test(entry.tag) ||
      tags.has(entry.tag) || entry.when <= previousWhen ||
      migration.folderMillis !== entry.when ||
      !isPortableHashEquivalent(migration.hash, getBuffer(entry.tag))
    ) {
      blocked("DISK_CHAIN_INVALID");
    }
    tags.add(entry.tag);
    previousWhen = entry.when;
    if (i < EXPECTED_PREFIX_LENGTH) {
      const expectedTag = POST_0016_RECOVERY_HISTORY[i].runtimeTag;
      if (entry.tag !== expectedTag) blocked("DISK_PREFIX_INVALID");
    }
  }
}

async function readRuntimePresence(client: PoolClient): Promise<{ schema: boolean; journal: boolean }> {
  const result = await client.query<{ schema: boolean; journal: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS schema,
            to_regclass($2) IS NOT NULL AS journal`,
    [RUNTIME_JOURNAL_SCHEMA, JOURNAL_NAME],
  );
  return result.rows[0];
}

async function validateExistingJournalShape(client: PoolClient): Promise<void> {
  const columns = await client.query<{
    column_name: string; data_type: string; is_nullable: string; column_default: string | null;
  }>(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position`,
    [RUNTIME_JOURNAL_SCHEMA, RUNTIME_JOURNAL_TABLE],
  );
  const [id, hash, createdAt] = columns.rows;
  if (
    columns.rows.length !== 3 ||
    id.column_name !== "id" || id.data_type !== "integer" || id.is_nullable !== "NO" ||
    !id.column_default?.startsWith("nextval(") ||
    hash.column_name !== "hash" || hash.data_type !== "text" || hash.is_nullable !== "NO" || hash.column_default !== null ||
    createdAt.column_name !== "created_at" || createdAt.data_type !== "bigint" || createdAt.is_nullable !== "YES" || createdAt.column_default !== null
  ) {
    blocked("EXISTING_RUNTIME_JOURNAL_SHAPE");
  }
  const constraints = await client.query<{ definition: string }>(
    `SELECT pg_get_constraintdef(c.oid) AS definition
       FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = $1 AND t.relname = $2 AND c.contype = 'p'`,
    [RUNTIME_JOURNAL_SCHEMA, RUNTIME_JOURNAL_TABLE],
  );
  if (constraints.rows.length !== 1 || constraints.rows[0].definition !== "PRIMARY KEY (id)") {
    blocked("EXISTING_RUNTIME_JOURNAL_SHAPE");
  }
}

async function validateRecoveryHistory(client: PoolClient): Promise<void> {
  const result = await client.query<{ version: string; name: string }>(
    `SELECT version, name FROM supabase_migrations.schema_migrations
      WHERE left(name, 19) = 'emergency_recovery_'
      ORDER BY version, name`,
  );
  if (result.rows.length !== EXPECTED_PREFIX_LENGTH) blocked("RECOVERY_HISTORY_COUNT");
  for (let i = 0; i < EXPECTED_PREFIX_LENGTH; i++) {
    if (String(result.rows[i].version) !== POST_0016_RECOVERY_HISTORY[i].recoveryVersion || result.rows[i].name !== POST_0016_RECOVERY_HISTORY[i].recoveryName) {
      blocked("RECOVERY_HISTORY_MISMATCH");
    }
  }
}

function publicMetadataSignature(metadata: Awaited<ReturnType<typeof fetchLiveSchemaMetadata>>): string {
  return JSON.stringify({
    fingerprint: metadata.fingerprint,
    publicTables: metadata.publicTables,
    security: metadata.security,
  });
}

export async function reconcileRuntimeJournalPost0016(
  env: NodeJS.ProcessEnv,
  options: ReconcilePost0016Options = {},
): Promise<ReconcilePost0016Result> {
  const url = verifyPost0016ReconciliationTarget(env);
  const { journal, migrations, getBuffer } = readCanonicalDiskChain();
  const pool = options.poolFactory?.(url) ?? new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    const client = await pool.connect();
    let inTransaction = false;
    try {
      await client.query("BEGIN");
      inTransaction = true;
      await client.query("SELECT pg_advisory_xact_lock(716987210016::bigint)");

      const before = await fetchLiveSchemaMetadata(client);
      const state = classifyRuntimeTarget(before.fingerprint, before.publicTables, before.security).state;
      if (state !== "EXACT_EXISTING_POST_0016") blocked(`PHYSICAL_STATE_${state}`);

      const presence = await readRuntimePresence(client);
      if (presence.schema || presence.journal) {
        if (!presence.schema || !presence.journal) blocked("EXISTING_RUNTIME_JOURNAL");
        await validateExistingJournalShape(client);
        const existing = await client.query<JournalRow>(
          `SELECT hash, created_at FROM ${JOURNAL_NAME} ORDER BY created_at ASC`,
        );
        if (existing.rows.length !== EXPECTED_PREFIX_LENGTH) blocked("EXISTING_RUNTIME_JOURNAL");
        try {
          validateAppliedMigrationPrefix("production", state, journal, migrations, existing.rows, getBuffer);
        } catch {
          blocked("EXISTING_RUNTIME_JOURNAL");
        }
        await client.query("ROLLBACK");
        inTransaction = false;
        return "ALREADY_RECONCILED";
      }

      await validateRecoveryHistory(client);
      await client.query(`CREATE SCHEMA ${RUNTIME_JOURNAL_SCHEMA}`);
      await client.query(
        `CREATE TABLE ${JOURNAL_NAME} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`,
      );
      for (const migration of migrations.slice(0, EXPECTED_PREFIX_LENGTH)) {
        await client.query(
          `INSERT INTO ${JOURNAL_NAME} (hash, created_at) VALUES ($1, $2)`,
          [migration.hash, migration.folderMillis],
        );
      }
      await options.afterJournalCreated?.();

      await validateExistingJournalShape(client);
      const applied = await client.query<JournalRow>(
        `SELECT hash, created_at FROM ${JOURNAL_NAME} ORDER BY created_at ASC`,
      );
      if (applied.rows.length !== EXPECTED_PREFIX_LENGTH) blocked("POST_JOURNAL_COUNT");
      validateAppliedMigrationPrefix("production", state, journal, migrations, applied.rows, getBuffer);

      const after = await fetchLiveSchemaMetadata(client);
      if (
        classifyRuntimeTarget(after.fingerprint, after.publicTables, after.security).state !== "EXACT_EXISTING_POST_0016" ||
        publicMetadataSignature(before) !== publicMetadataSignature(after)
      ) {
        blocked("PUBLIC_SCHEMA_CHANGED");
      }
      await client.query("COMMIT");
      inTransaction = false;
      return "RECONCILED";
    } catch (error) {
      if (inTransaction) await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  reconcileRuntimeJournalPost0016(process.env)
    .then((result) => console.log(`RUNTIME_POST0016_JOURNAL=${result}`))
    .catch((error: unknown) => {
      const message = error instanceof Error && error.message.startsWith("BLOCKED_")
        ? error.message
        : "BLOCKED_RECONCILIATION_FAILED";
      console.error(message);
      process.exitCode = 1;
    });
}
