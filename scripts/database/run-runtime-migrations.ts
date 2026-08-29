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
import fs from "node:fs";
import path from "node:path";
import { createCanonicalRuntimeMigrationDirectory, cleanupCanonicalRuntimeMigrationDirectory } from "./runtime-migration-temp-dir";
import { validateAppliedMigrationPrefix } from "./runtime-migration-journal";

export type PoolFactory = (connectionString: string) => {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
  end(): Promise<void>;
};

export async function runMigrations(
  env: NodeJS.ProcessEnv,
  poolFactory?: PoolFactory,
  migrateFn?: typeof migrate,
  readMigrationFilesFn?: typeof readMigrationFiles,
  readDiskJournalFn?: () => { text: string; parsed: { entries: { tag: string; when: number }[] } },
  getMigrationBufferFn?: (tag: string) => Buffer
): Promise<void> {
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
  let tempDir: string | null = null;

  try {
    console.log("RUNNER: metadata preflight starting");
    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const classification = classifyRuntimeTarget(fingerprint, publicTables);
    console.log(`RUNNER: target classification = ${classification.state}`);

    if (classification.state === "PARTIAL_OR_DRIFTED") {
      throw new Error(
        `RUNNER: schema is ${classification.state}. Migration aborted. Differences:\n${classification.differences.join("\n")}`
      );
    }

    let rows: { hash: string; created_at: string | number }[] = [];
    try {
      const res = await pool.query(`SELECT hash, created_at FROM ${RUNTIME_JOURNAL_SCHEMA}.${RUNTIME_JOURNAL_TABLE} ORDER BY created_at ASC`);
      rows = res.rows as { hash: string; created_at: string | number }[];
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "42P01" || pgErr.code === "3F000") {
        console.log("RUNNER: Journal table or schema absent. Treating journal as empty.");
      } else {
        throw err;
      }
    }

    const actualReadFn = readMigrationFilesFn ?? readMigrationFiles;
    const diskMigrations = actualReadFn({ migrationsFolder: `./${RUNTIME_MIGRATIONS_FOLDER}` });
    
    let diskJournal: { text: string; parsed: { entries: { tag: string; when: number }[] } };
    if (readDiskJournalFn) {
      diskJournal = readDiskJournalFn();
    } else {
      const journalPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "meta", "_journal.json");
      if (!fs.existsSync(journalPath)) {
        throw new Error("RUNNER: BLOCKED. _journal.json not found");
      }
      const text = fs.readFileSync(journalPath, "utf-8");
      diskJournal = { text, parsed: JSON.parse(text) };
    }
    
    const getBuffer = getMigrationBufferFn ?? ((tag: string) => {
      return fs.readFileSync(path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, `${tag}.sql`));
    });

    validateAppliedMigrationPrefix(
      env.RUNTIME_MIGRATION_TARGET || "production",
      classification.state,
      diskJournal.parsed,
      diskMigrations,
      rows,
      getBuffer
    );
    console.log("RUNNER: Journal prefix validated successfully.");

    tempDir = createCanonicalRuntimeMigrationDirectory(diskJournal.text, diskJournal.parsed, getBuffer);

    const actualMigrate = migrateFn ?? migrate;
    const db = drizzle(pool as never);
    await actualMigrate(db, {
      migrationsFolder: tempDir,
      migrationsSchema: RUNTIME_JOURNAL_SCHEMA,
      migrationsTable: RUNTIME_JOURNAL_TABLE,
    });
    console.log("RUNNER: migrate completed");

    const { fingerprint: postFingerprint, publicTables: postTables } = await fetchLiveSchemaMetadata(pool);
    const postClassification = classifyRuntimeTarget(postFingerprint, postTables);
    if (postClassification.state !== "EXACT_EXISTING_POST_0005" && postClassification.state !== "EXACT_EXISTING_POST_0004" && postClassification.state !== "EXACT_EXISTING") {
      throw new Error(`RUNNER: post-check failed. State after migration: ${postClassification.state}. Differences:\n${postClassification.differences.join("\n")}`);
    }
    console.log("RUNNER: post-check PASS");

    const grants = await queryRuntimeGrants(pool);
    console.log(`RUNNER: ANON_TABLE_GRANT_COUNT=${grants.ANON_TABLE_GRANT_COUNT}`);
    console.log(`RUNNER: AUTHENTICATED_TABLE_GRANT_COUNT=${grants.AUTHENTICATED_TABLE_GRANT_COUNT}`);
    console.log(`RUNNER: SERVICE_ROLE_TABLE_GRANT_COUNT=${grants.SERVICE_ROLE_TABLE_GRANT_COUNT}`);
    console.log(`RUNNER: ANON_SEQUENCE_GRANT_COUNT=${grants.ANON_SEQUENCE_GRANT_COUNT}`);
    console.log(`RUNNER: AUTHENTICATED_SEQUENCE_GRANT_COUNT=${grants.AUTHENTICATED_SEQUENCE_GRANT_COUNT}`);
    console.log(`RUNNER: SERVICE_ROLE_SEQUENCE_GRANT_COUNT=${grants.SERVICE_ROLE_SEQUENCE_GRANT_COUNT}`);

    console.log("RUNNER: completed successfully");
  } finally {
    await pool.end();
    if (tempDir) {
      cleanupCanonicalRuntimeMigrationDirectory(tempDir);
    }
  }
}

async function main() {
  await runMigrations(process.env);
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Migration failed:", e.message);
    process.exit(1);
  });
}

