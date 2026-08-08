/**
 * run-runtime-migrations.ts
 *
 * Secure runtime migration runner.
 *
 * IMPORT SIDE-EFFECTS: NONE.
 * pg.Pool is created only inside main().
 * No DATABASE_URL is read at import time.
 */

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { verifyTarget } from "./verify-runtime-migration-target";
import {
  fetchLiveSchemaMetadata,
  classifyRuntimeTarget,
} from "./verify-runtime-schema-fingerprint";
import { queryRuntimeGrants } from "./verify-runtime-data-api-grants";
import {
  RUNTIME_MIGRATIONS_FOLDER,
  RUNTIME_JOURNAL_SCHEMA,
  RUNTIME_JOURNAL_TABLE,
} from "./runtime-migration-contract";

// ---------------------------------------------------------------------------
// Shared Pool factory type — allows injection in tests
// ---------------------------------------------------------------------------

export type PoolFactory = (connectionString: string) => {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
  end(): Promise<void>;
};

// ---------------------------------------------------------------------------
// runMigrations — core logic; accepts injected poolFactory and migrateFn
// ---------------------------------------------------------------------------

export async function runMigrations(
  env: NodeJS.ProcessEnv,
  poolFactory?: PoolFactory,
  migrateFn?: typeof migrate
): Promise<void> {
  // 1. Target guard — validates env vars before any DB connection
  verifyTarget(env);

  const url = env.DATABASE_URL!;
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
    // 2. Metadata-only preflight
    console.log("RUNNER: metadata preflight starting");
    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);

    // 3. Classify target
    const classification = classifyRuntimeTarget(fingerprint, publicTables);
    console.log(`RUNNER: target classification = ${classification.state}`);

    if (classification.state === "PARTIAL_OR_DRIFTED") {
      throw new Error(
        `RUNNER: schema is PARTIAL_OR_DRIFTED. Migration aborted. Differences:\n${classification.differences.join("\n")}`
      );
    }

    // 4. Run migration via Drizzle (EMPTY → create; EXACT_EXISTING → adopt baseline; MIGRATABLE_PREVIOUS → additive migration)
    const actualMigrate = migrateFn ?? migrate;
    const db = drizzle(pool as any);
    await actualMigrate(db, {
      migrationsFolder: `./${RUNTIME_MIGRATIONS_FOLDER}`,
      migrationsSchema: RUNTIME_JOURNAL_SCHEMA,
      migrationsTable: RUNTIME_JOURNAL_TABLE,
    });
    console.log("RUNNER: migrate completed");

    // 5. Post-check fingerprint — must be EXACT_EXISTING
    const { fingerprint: postFingerprint, publicTables: postTables } =
      await fetchLiveSchemaMetadata(pool);
    const postClassification = classifyRuntimeTarget(postFingerprint, postTables);
    if (postClassification.state !== "EXACT_EXISTING") {
      throw new Error(
        `RUNNER: post-check failed. State after migration: ${postClassification.state}. Differences:\n${postClassification.differences.join("\n")}`
      );
    }
    console.log("RUNNER: post-check PASS — EXACT_EXISTING confirmed");

    // 6. Grant post-check
    const grants = await queryRuntimeGrants(pool);
    console.log(`RUNNER: ANON_TABLE_GRANT_COUNT=${grants.ANON_TABLE_GRANT_COUNT}`);
    console.log(
      `RUNNER: AUTHENTICATED_TABLE_GRANT_COUNT=${grants.AUTHENTICATED_TABLE_GRANT_COUNT}`
    );
    console.log(
      `RUNNER: SERVICE_ROLE_TABLE_GRANT_COUNT=${grants.SERVICE_ROLE_TABLE_GRANT_COUNT}`
    );
    console.log(`RUNNER: ANON_SEQUENCE_GRANT_COUNT=${grants.ANON_SEQUENCE_GRANT_COUNT}`);
    console.log(
      `RUNNER: AUTHENTICATED_SEQUENCE_GRANT_COUNT=${grants.AUTHENTICATED_SEQUENCE_GRANT_COUNT}`
    );
    console.log(
      `RUNNER: SERVICE_ROLE_SEQUENCE_GRANT_COUNT=${grants.SERVICE_ROLE_SEQUENCE_GRANT_COUNT}`
    );

    console.log("RUNNER: completed successfully");
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main() {
  await runMigrations(process.env);
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Migration failed:", e.message);
    process.exit(1);
  });
}
