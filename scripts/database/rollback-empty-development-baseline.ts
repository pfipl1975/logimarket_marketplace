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
 * It MUST NOT be run if any runtime baseline table contains rows.
 * It does NOT use CASCADE.
 */

import {
  normalizeProjectRef,
  EXPECTED_BASELINE_TABLES,
  EXPECTED_COUNTS,
  PRODUCTION_FINGERPRINT,
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
  "partner_agreement_evidence_invalidations",
  "partner_agreement_execution_evidence",
  "agreement_versions",
  "seller_acceptance_decisions",
  "seller_order_items",
  "seller_order_seller_snapshots",
  "seller_orders",
  "marketplace_order_seller_disclosures",
  "marketplace_orders",
  "buyer_legal_context_snapshots",
  "clicks",
  "order_items",
  "cart_items",
  "rfq_leads",
  "offer_attribute_option_values",
  "offer_attribute_values",
  "category_attribute_assignments",
  "offers",
  "seller_verification_events",
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

const CYCLIC_CURRENT_EVENT_FOREIGN_KEYS = [
  {
    tableName: "seller_legal_identities",
    constraintName: "seller_legal_identities_current_verification_event_id_seller_verification_events_id_fk",
  },
  {
    tableName: "seller_tax_identifiers",
    constraintName: "seller_tax_identifiers_current_verification_event_id_seller_verification_events_id_fk",
  },
  {
    tableName: "seller_registry_identifiers",
    constraintName: "seller_registry_identifiers_current_verification_event_id_seller_verification_events_id_fk",
  },
] as const;

const EXPECTED_SEQUENCES: readonly string[] = Array.from(
  new Set(
    EXPECTED_BASELINE_TABLES.flatMap((tableName) =>
      PRODUCTION_FINGERPRINT[tableName].columns
        .map((column) => column.sequenceName)
        .filter((sequenceName): sequenceName is string => sequenceName !== null)
    )
  )
);

export type ExpectedRuntimeMigration = {
  folderMillis: number;
  hash: string;
};

function validateRollbackContract(): RollbackPreflightResult {
  const expectedTables = new Set(EXPECTED_BASELINE_TABLES);
  const dropTables = new Set(REVERSE_DROP_ORDER);

  if (
    REVERSE_DROP_ORDER.length !== EXPECTED_COUNTS.TABLES ||
    dropTables.size !== EXPECTED_COUNTS.TABLES ||
    !EXPECTED_BASELINE_TABLES.every((tableName) => dropTables.has(tableName))
  ) {
    return { allowed: false, reason: "Rollback table order does not match the authoritative baseline" };
  }

  if (
    expectedTables.size !== EXPECTED_COUNTS.TABLES ||
    EXPECTED_SEQUENCES.length !== EXPECTED_COUNTS.SEQUENCES
  ) {
    return { allowed: false, reason: "Authoritative rollback contract has inconsistent counts" };
  }

  const expectedCurrentEventForeignKeys = EXPECTED_BASELINE_TABLES.flatMap((tableName) =>
    PRODUCTION_FINGERPRINT[tableName].constraints
      .filter((constraint) =>
        constraint.type === "FOREIGN KEY" &&
        constraint.definition.includes("REFERENCES seller_verification_events(id)")
      )
      .map((constraint) => `${tableName}.${constraint.name}`)
  ).sort();
  const rollbackCycleForeignKeys = CYCLIC_CURRENT_EVENT_FOREIGN_KEYS
    .map(({ tableName, constraintName }) => `${tableName}.${constraintName}`)
    .sort();
  if (
    expectedCurrentEventForeignKeys.length !== CYCLIC_CURRENT_EVENT_FOREIGN_KEYS.length ||
    expectedCurrentEventForeignKeys.some((name, index) => name !== rollbackCycleForeignKeys[index])
  ) {
    return { allowed: false, reason: "Rollback cyclic FK allowlist does not match the authoritative baseline" };
  }

  return { allowed: true };
}

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
  expectedMigrations: readonly ExpectedRuntimeMigration[]
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

  const contractValidation = validateRollbackContract();
  if (!contractValidation.allowed) return contractValidation;

  if (expectedMigrations.length === 0) {
    return { allowed: false, reason: "Expected migration chain is empty" };
  }
  for (let index = 0; index < expectedMigrations.length; index++) {
    const migration = expectedMigrations[index];
    const previous = expectedMigrations[index - 1];
    if (
      !migration.hash ||
      !Number.isSafeInteger(migration.folderMillis) ||
      (previous && migration.folderMillis <= previous.folderMillis)
    ) {
      return { allowed: false, reason: "Expected migration chain is invalid or out of order" };
    }
  }

  // 5. Full fingerprint must be the authoritative post-0009 state
  const { fingerprint, publicTables, security } = await fetchLiveSchemaMetadata(q);
  const classification = classifyRuntimeTarget(fingerprint, publicTables, security);
  if (classification.state !== "EXACT_EXISTING_POST_0009") {
    return {
      allowed: false,
      reason: `Schema is not EXACT_EXISTING: ${classification.state}. Differences: ${classification.differences.join("; ")}`,
    };
  }

  // 6. Exact public-table allowlist, with no missing or extra tables
  const publicTableSet = new Set(publicTables);
  if (
    publicTables.length !== EXPECTED_COUNTS.TABLES ||
    publicTableSet.size !== EXPECTED_COUNTS.TABLES ||
    !EXPECTED_BASELINE_TABLES.every((tableName) => publicTableSet.has(tableName))
  ) {
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

  // 8. Journal must exactly match the complete ordered migration chain
  const journalResult = await q.query(
    `SELECT hash, created_at FROM ${RUNTIME_JOURNAL_SCHEMA}."${RUNTIME_JOURNAL_TABLE}" ORDER BY created_at ASC`
  );
  const journalRows = journalResult.rows as { hash: string; created_at: string }[];

  if (journalRows.length === 0) {
    return { allowed: false, reason: "Journal is empty — no migration chain found" };
  }
  if (journalRows.length !== expectedMigrations.length) {
    return {
      allowed: false,
      reason: `Journal has ${journalRows.length} entries — expected ${expectedMigrations.length}`,
    };
  }

  for (let index = 0; index < expectedMigrations.length; index++) {
    const expected = expectedMigrations[index];
    const actual = journalRows[index];
    if (actual.hash !== expected.hash) {
      return {
        allowed: false,
        reason: `Journal hash mismatch at entry ${index + 1}`,
      };
    }
    if (Number(actual.created_at) !== expected.folderMillis) {
      return {
        allowed: false,
        reason: `Journal created_at mismatch at entry ${index + 1}`,
      };
    }
  }

  // 9. All approved tables must have 0 rows — derived from contract, not user input
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
// No CASCADE anywhere. Touches only the authoritative public-table and
// sequence allowlists, plus the drizzle_runtime journal table + schema.
// ---------------------------------------------------------------------------

export async function executeRollback(client: Queryable): Promise<void> {
  console.log("ROLLBACK: starting single-transaction reverse-order drop");

  await client.query("BEGIN");
  try {
    // Break the three explicit current-event back-references before dropping
    // the event table. Its subject FKs point the other way, forming a cycle.
    for (const { tableName, constraintName } of CYCLIC_CURRENT_EVENT_FOREIGN_KEYS) {
      await client.query(
        `ALTER TABLE public.${tableName} DROP CONSTRAINT IF EXISTS ${constraintName}`
      );
    }

    // Drop tables in explicit reverse dependency order — NO CASCADE
    for (const tableName of REVERSE_DROP_ORDER) {
      await client.query(`DROP TABLE IF EXISTS public.${tableName}`);
    }

    // Drop owned sequences explicitly (they may have already been dropped with
    // tables, but we issue explicit DROP IF EXISTS for the exact approved set)
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
  expectedMigrations: readonly ExpectedRuntimeMigration[],
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
    const preflight = await verifyRollbackPreconditions(pool, env, expectedMigrations);
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
  // The complete ordered hash/timestamp chain is loaded from migration files.
  const { readMigrationFiles } = await import("drizzle-orm/migrator");
  const { RUNTIME_MIGRATIONS_FOLDER } = await import("./runtime-migration-contract");
  const migrations = readMigrationFiles({ migrationsFolder: RUNTIME_MIGRATIONS_FOLDER });

  await rollbackEmptyDevBaseline(process.env, migrations);
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Rollback failed:", e.message);
    process.exit(1);
  });
}
