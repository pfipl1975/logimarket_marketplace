/**
 * rollback-empty-development-baseline.ts
 *
 * Safe rollback of the production-exact runtime baseline on an empty DEV environment.
 *
 * IMPORT SIDE-EFFECTS: NONE.
 * pg.Pool is created only inside main().
 * No DATABASE_URL is read at import time.
 *
 * Required environment variables:
 *   RUNTIME_MIGRATION_TARGET=development
 *   RUNTIME_MIGRATION_EXPECTED_PROJECT_REF  — must match the DEV ref
 *   RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF — must not match (production guard)
 *   RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION=AUTHORIZED_EMPTY_DEV_BASELINE_ROLLBACK
 *
 * This entrypoint MUST NOT be run against production.
 * It MUST NOT be run if any of the 15 runtime tables contains rows.
 * It does NOT use CASCADE.
 */

import {
  normalizeProjectRef,
  EXPECTED_BASELINE_TABLES,
  RUNTIME_JOURNAL_SCHEMA,
  RUNTIME_JOURNAL_TABLE,
} from "./runtime-migration-contract";
import {
  fetchLiveSchemaMetadata,
  classifyRuntimeTarget,
  Queryable,
} from "./verify-runtime-schema-fingerprint";

// ---------------------------------------------------------------------------
// Exact rollback constants — derived from the approved contract only
// ---------------------------------------------------------------------------

const REVERSE_DROP_ORDER: readonly string[] = [
  "clicks",
  "order_items",
  "cart_items",
  "rfq_leads",
  "offer_attribute_option_values",
  "offer_attribute_values",
  "category_attribute_assignments",
  "offers",
  "seller_tax_identifiers",
  "seller_registry_identifiers",
  "seller_eligibility",
  "seller_legal_identities",
  "orders",
  "controlled_option_value_translations",
  "controlled_option_values",
  "attribute_definition_translations",
  "attribute_definitions",
  "categories",
  "partners",
] as const;

const EXPECTED_SEQUENCES: readonly string[] = [
  "attribute_definition_translations_id_seq",
  "attribute_definitions_id_seq",
  "cart_items_id_seq",
  "categories_id_seq",
  "category_attribute_assignments_id_seq",
  "clicks_id_seq",
  "controlled_option_value_translations_id_seq",
  "controlled_option_values_id_seq",
  "offer_attribute_option_values_id_seq",
  "offer_attribute_values_id_seq",
  "offers_id_seq",
  "order_items_id_seq",
  "orders_id_seq",
  "partners_id_seq",
  "rfq_leads_id_seq",
  "seller_registry_identifiers_id_seq",
  "seller_tax_identifiers_id_seq",
] as const;

const BASELINE_CREATED_AT = 1785589560000;

// ---------------------------------------------------------------------------
// verifyRollbackPreconditions — pure guard, no DDL
// ---------------------------------------------------------------------------

export type RollbackPreflightResult = {
  allowed: boolean;
  reason?: string;
};

export async function verifyRollbackPreconditions(
  q: Queryable,
  env: NodeJS.ProcessEnv,
  expectedHash: string
): Promise<RollbackPreflightResult> {
  // 1. Authorization token
  if (
    env.RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION !==
    "AUTHORIZED_EMPTY_DEV_BASELINE_ROLLBACK"
  ) {
    return { allowed: false, reason: "Missing or invalid RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION" };
  }

  // 2. Target guard
  if (env.RUNTIME_MIGRATION_TARGET !== "development") {
    return { allowed: false, reason: "RUNTIME_MIGRATION_TARGET must be development" };
  }

  const expectedRef = env.RUNTIME_MIGRATION_EXPECTED_PROJECT_REF;
  const forbiddenRef = env.RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF;
  const url = env.DATABASE_URL;

  if (!expectedRef) return { allowed: false, reason: "Missing RUNTIME_MIGRATION_EXPECTED_PROJECT_REF" };
  if (!forbiddenRef) return { allowed: false, reason: "Missing RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF" };
  if (!url) return { allowed: false, reason: "Missing DATABASE_URL" };

  // 3. Refs must be different
  if (expectedRef === forbiddenRef) {
    return { allowed: false, reason: "Expected ref equals forbidden ref — production guard" };
  }

  // 4. URL must point to expected DEV
  const ref = normalizeProjectRef(url);
  if (!ref) return { allowed: false, reason: "Cannot parse project ref from DATABASE_URL" };
  if (ref !== expectedRef) {
    return { allowed: false, reason: "DATABASE_URL does not point to expected DEV project ref" };
  }
  if (ref === forbiddenRef) {
    return { allowed: false, reason: "DATABASE_URL points to forbidden (production) ref" };
  }

  // 5. Full fingerprint must be EXACT_EXISTING
  const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(q);
  const classification = classifyRuntimeTarget(fingerprint, publicTables);
  if (classification.state !== "EXACT_EXISTING") {
    return {
      allowed: false,
      reason: `Schema is not EXACT_EXISTING: ${classification.state}. Differences: ${classification.differences.join("; ")}`,
    };
  }

  // 6. Exactly 19 tables, no extra public tables
  if (publicTables.length !== EXPECTED_BASELINE_TABLES.length) {
    return {
      allowed: false,
      reason: `Expected exactly ${EXPECTED_BASELINE_TABLES.length} public tables, found ${publicTables.length}`,
    };
  }

  // 7. Policy count must be 0 across all tables
  for (const [tableName, contract] of Object.entries(fingerprint)) {
    if ((contract.policyCount ?? 0) > 0) {
      return {
        allowed: false,
        reason: `Table ${tableName} has ${contract.policyCount} policies — expected 0`,
      };
    }
  }

  // 8. Journal must have exactly one baseline row with correct hash and created_at
  const journalResult = await q.query(
    `SELECT hash, created_at FROM ${RUNTIME_JOURNAL_SCHEMA}."${RUNTIME_JOURNAL_TABLE}" ORDER BY created_at ASC`
  );
  const journalRows = journalResult.rows as { hash: string; created_at: string }[];

  if (journalRows.length === 0) {
    return { allowed: false, reason: "Journal is empty — no baseline entry found" };
  }
  if (journalRows.length > 1) {
    return {
      allowed: false,
      reason: `Journal has ${journalRows.length} entries — expected exactly 1`,
    };
  }

  const entry = journalRows[0];
  if (entry.hash !== expectedHash) {
    return {
      allowed: false,
      reason: `Journal hash mismatch — expected ${expectedHash.slice(0, 12)}..., got ${entry.hash.slice(0, 12)}...`,
    };
  }

  const createdAt = Number(entry.created_at);
  if (createdAt !== BASELINE_CREATED_AT) {
    return {
      allowed: false,
      reason: `Journal created_at mismatch — expected ${BASELINE_CREATED_AT}, got ${createdAt}`,
    };
  }

  // 9. No later runtime migration entries (already checked by length === 1 above)

  // 10. All 15 approved tables must have 0 rows — derived from contract, not user input
  for (const tableName of EXPECTED_BASELINE_TABLES) {
    const countResult = await q.query(
      `SELECT COUNT(*) AS n FROM public.${tableName}`
    );
    const n = Number((countResult.rows[0] as { n: string }).n);
    if (n > 0) {
      return {
        allowed: false,
        reason: `Table ${tableName} has ${n} row(s) — rollback requires empty tables`,
      };
    }
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// executeRollback — ALL destructive DDL on ONE client in ONE transaction.
// No CASCADE anywhere. Touches only the 15 approved public tables, the 15
// approved sequences, and the drizzle_runtime journal table + schema.
// ---------------------------------------------------------------------------

export async function executeRollback(client: Queryable): Promise<void> {
  console.log("ROLLBACK: starting single-transaction reverse-order drop");

  await client.query("BEGIN");
  try {
    // Drop tables in explicit reverse dependency order — NO CASCADE
    for (const tableName of REVERSE_DROP_ORDER) {
      await client.query(`DROP TABLE IF EXISTS public.${tableName}`);
    }

    // Drop owned sequences explicitly (they may have already been dropped with
    // tables, but we issue explicit DROP IF EXISTS for the exact 15 approved
    // sequences)
    for (const seqName of EXPECTED_SEQUENCES) {
      await client.query(`DROP SEQUENCE IF EXISTS public.${seqName}`);
    }

    // Drop the new epoch journal table explicitly, then the now-empty schema —
    // NO CASCADE, and no other schema is ever touched
    await client.query(
      `DROP TABLE IF EXISTS ${RUNTIME_JOURNAL_SCHEMA}."${RUNTIME_JOURNAL_TABLE}"`
    );
    await client.query(`DROP SCHEMA IF EXISTS ${RUNTIME_JOURNAL_SCHEMA}`);

    await client.query("COMMIT");
    console.log("ROLLBACK: transaction committed");
  } catch (error) {
    await client.query("ROLLBACK");
    console.log("ROLLBACK: transaction rolled back due to error");
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Pool / client factory types (injectable for tests)
// ---------------------------------------------------------------------------

export type TransactionClient = Queryable & { release(): void };

export type RollbackPool = Queryable & {
  connect(): Promise<TransactionClient>;
  end(): Promise<void>;
};

export type PoolFactory = (connectionString: string) => RollbackPool;

// ---------------------------------------------------------------------------
// rollbackEmptyDevBaseline — full entrypoint logic; injectable for tests
// ---------------------------------------------------------------------------

export async function rollbackEmptyDevBaseline(
  env: NodeJS.ProcessEnv,
  expectedHash: string,
  poolFactory?: PoolFactory
): Promise<void> {
  const url = env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");

  const factory: PoolFactory =
    poolFactory ??
    ((cs) => {
      const { Pool } = require("pg");
      return new Pool({
        connectionString: cs,
        max: 1,
        connectionTimeoutMillis: 10_000,
      });
    });

  const pool = factory(url);
  try {
    const preflight = await verifyRollbackPreconditions(pool, env, expectedHash);
    if (!preflight.allowed) {
      throw new Error(`ROLLBACK_ALLOWED=NO — ${preflight.reason}`);
    }

    // All destructive DDL runs on a single PoolClient (never pool.query,
    // which could hop between connections)
    const client = await pool.connect();
    try {
      await executeRollback(client);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main() {
  // Hash must be loaded from migration files at runtime, not hard-coded
  const { readMigrationFiles } = await import("drizzle-orm/migrator");
  const { RUNTIME_MIGRATIONS_FOLDER } = await import("./runtime-migration-contract");
  const migrations = readMigrationFiles({ migrationsFolder: RUNTIME_MIGRATIONS_FOLDER });

  if (migrations.length !== 1) {
    throw new Error(`Expected exactly 1 migration, found ${migrations.length}`);
  }
  const expectedHash = migrations[0].hash;

  await rollbackEmptyDevBaseline(process.env, expectedHash);
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Rollback failed:", e.message);
    process.exit(1);
  });
}
