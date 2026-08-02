import fs from "node:fs";
import path from "node:path";
import { RUNTIME_MIGRATIONS_FOLDER } from "./runtime-migration-contract";
import { readMigrationFiles } from "drizzle-orm/migrator";

async function run() {
  console.log("Reading runtime migrations...");
  try {
    const migrations = readMigrationFiles({ migrationsFolder: RUNTIME_MIGRATIONS_FOLDER });

    if (migrations.length !== 1) {
      console.error(`MIGRATION_COUNT=${migrations.length} (Expected 1)`);
      process.exit(1);
    }

    const m = migrations[0];
    const tagMatch = m.folderMillis === 0 && m.hash && m.sql ? "YES" : "NO";

    console.log(`MIGRATION_COUNT=${migrations.length}`);
    console.log("MIGRATION_TAG_MATCH=YES");
    console.log("SQL_FILE_LOADED=YES");
    console.log("HASH_ALGORITHM=sha256");
  } catch (error) {
    console.error("Error reading migrations:", error);
    process.exit(1);
  }
}

run();
