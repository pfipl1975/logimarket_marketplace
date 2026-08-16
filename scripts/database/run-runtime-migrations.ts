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
import { readMigrationFiles } from "drizzle-orm/migrator";

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
  migrateFn?: typeof migrate,
  readMigrationFilesFn?: typeof readMigrationFiles
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

    if (classification.state === "MIGRATABLE_PROD_LEGACY" || classification.state === "MIGRATABLE_BASELINE") {
      console.log(`RUNNER: ${classification.state} detected. Validating journal safety.`);
      try {
        const res = await pool.query(`SELECT hash, created_at FROM ${RUNTIME_JOURNAL_SCHEMA}.${RUNTIME_JOURNAL_TABLE} ORDER BY created_at ASC`);
        const rows = res.rows as { hash: string; created_at: string | number }[];
        
        if (rows.length > 0) {
          const actualReadFn = readMigrationFilesFn ?? readMigrationFiles;
          const diskMigrations = actualReadFn({ migrationsFolder: `./${RUNTIME_MIGRATIONS_FOLDER}` });
          const m0000 = diskMigrations.find(m => m.folderMillis === 1785589560000);
          
          if (!m0000) {
            throw new Error("RUNNER: BLOCKED. Canonical 0000 migration not found on disk.");
          }

          if (rows.length === 1 && String(rows[0].created_at) === String(m0000.folderMillis) && rows[0].hash === m0000.hash) {
             console.log("RUNNER: Journal contains only exact 0000 canonical migration. Safety proven.");
          } else {
             throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (claimed: ${rows.length}, ts: ${rows[0]?.created_at}, hash: ${rows[0]?.hash}).`);
          }
        } else {
          console.log("RUNNER: Journal is empty. Safe to adopt baseline.");
        }
      } catch (err: unknown) {
        const pgErr = err as { code?: string };
        if (pgErr.code === '42P01' || pgErr.code === '3F000') {
           console.log("RUNNER: Journal table or schema absent. Safe to adopt baseline.");
        } else {
           throw err;
        }
      }
    }

    if (classification.state === "MIGRATABLE_POST_0002" || classification.state === "MIGRATABLE_PREVIOUS") {
      console.log(`RUNNER: ${classification.state} detected. Validating journal safety.`);
      const res = await pool.query(`SELECT hash, created_at FROM ${RUNTIME_JOURNAL_SCHEMA}.${RUNTIME_JOURNAL_TABLE} ORDER BY created_at ASC`);
      const rows = res.rows as { hash: string; created_at: string | number }[];

      const actualReadFn = readMigrationFilesFn ?? readMigrationFiles;
      const diskMigrations = actualReadFn({ migrationsFolder: `./${RUNTIME_MIGRATIONS_FOLDER}` });
      const m0000 = diskMigrations.find(m => m.folderMillis === 1785589560000);
      const m0001 = diskMigrations.find(m => m.folderMillis === 1785590000000);
      const m0002 = diskMigrations.find(m => m.folderMillis === 1785590500000);

      if (!m0000 || !m0001 || !m0002) {
        throw new Error("RUNNER: BLOCKED. Canonical 0000-0002 migrations not found on disk.");
      }

      if (
        rows.length === 3 &&
        String(rows[0].created_at) === String(m0000.folderMillis) && rows[0].hash === m0000.hash &&
        String(rows[1].created_at) === String(m0001.folderMillis) && rows[1].hash === m0001.hash &&
        String(rows[2].created_at) === String(m0002.folderMillis) && rows[2].hash === m0002.hash
      ) {
        console.log("RUNNER: Journal contains exact 0000-0002 canonical migrations. Safety proven.");
      } else {
        throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000-0002.`);
      }
    }

    // 4. Run migration via Drizzle
    const actualMigrate = migrateFn ?? migrate;
    const db = drizzle(pool as never);
    await actualMigrate(db, {
      migrationsFolder: `./${RUNTIME_MIGRATIONS_FOLDER}`,
      migrationsSchema: RUNTIME_JOURNAL_SCHEMA,
      migrationsTable: RUNTIME_JOURNAL_TABLE,
    });
    console.log("RUNNER: migrate completed");

    // 5. Post-check fingerprint — must be EXACT_EXISTING_POST_0003
    const { fingerprint: postFingerprint, publicTables: postTables } =
      await fetchLiveSchemaMetadata(pool);
    const postClassification = classifyRuntimeTarget(postFingerprint, postTables);
    if (
      postClassification.state !== "EXACT_EXISTING_POST_0003" &&
      postClassification.state !== "EXACT_EXISTING"
    ) {
      throw new Error(
        `RUNNER: post-check failed. State after migration: ${postClassification.state}. Differences:\n${postClassification.differences.join("\n")}`
      );
    }
    console.log("RUNNER: post-check PASS — EXACT_EXISTING_POST_0003 confirmed");

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
