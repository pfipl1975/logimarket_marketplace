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
import os from "node:os";

import { isPortableHashEquivalent, isLegacyDev0000Exception } from "./runtime-migration-hashing";

export type PoolFactory = (connectionString: string) => {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
  end(): Promise<void>;
};

export async function runMigrations(
  env: NodeJS.ProcessEnv,
  poolFactory?: PoolFactory,
  migrateFn?: typeof migrate,
  readMigrationFilesFn?: typeof readMigrationFiles
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

    if (classification.state === "PARTIAL_OR_DRIFTED" || classification.state === "UNKNOWN") {
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
    
    const journalPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "meta", "_journal.json");
    if (!fs.existsSync(journalPath)) {
      throw new Error("RUNNER: BLOCKED. _journal.json not found");
    }
    const diskJournal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
    
    if (rows.length > diskJournal.entries.length) {
      throw new Error("RUNNER: BLOCKED. Journal has more entries than disk migrations.");
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const diskEntry = diskJournal.entries[i];
      const diskMig = diskMigrations.find(m => m.folderMillis === diskEntry.when);
      
      if (!diskMig) {
        throw new Error(`RUNNER: BLOCKED. Disk migration for timestamp ${diskEntry.when} not found`);
      }
      
      if (String(row.created_at) !== String(diskEntry.when)) {
        throw new Error(`RUNNER: BLOCKED. Journal timestamp mismatch at index ${i}. Expected ${diskEntry.when}, got ${row.created_at}`);
      }
      
      const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, `${diskEntry.tag}.sql`);
      const sqlBuffer = fs.readFileSync(sqlPath);
      
      const isEquivalent = isPortableHashEquivalent(row.hash, sqlBuffer);
      const isLegacy = isLegacyDev0000Exception(
        i,
        Number(row.created_at),
        row.hash,
        env.RUNTIME_MIGRATION_TARGET || "production",
        classification.state
      );

      if (!isEquivalent && !isLegacy) {
        throw new Error(`RUNNER: BLOCKED. Hash mismatch at index ${i}. Journal hash: ${row.hash}`);
      }
    }
    
    console.log("RUNNER: Journal prefix validated successfully.");

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-migrations-"));
    const tempMetaDir = path.join(tempDir, "meta");
    fs.mkdirSync(tempMetaDir);
    fs.copyFileSync(path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "meta", "_journal.json"), path.join(tempMetaDir, "_journal.json"));

    for (const entry of diskJournal.entries) {
      const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, `${entry.tag}.sql`);
      const sqlBuffer = fs.readFileSync(sqlPath);
      const text = sqlBuffer.toString("utf8");
      const lfText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      fs.writeFileSync(path.join(tempDir, `${entry.tag}.sql`), lfText, { encoding: "utf8" });
    }

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
    if (postClassification.state !== "EXACT_EXISTING_POST_0003" && postClassification.state !== "EXACT_EXISTING") {
      throw new Error(`RUNNER: post-check failed. State: ${postClassification.state}`);
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
      fs.rmSync(tempDir, { recursive: true, force: true });
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

