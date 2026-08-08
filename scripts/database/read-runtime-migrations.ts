import fs from "node:fs";
import path from "node:path";
import { RUNTIME_MIGRATIONS_FOLDER } from "./runtime-migration-contract";
import { readMigrationFiles } from "drizzle-orm/migrator";

async function run() {
  try {
    const migrations = readMigrationFiles({ migrationsFolder: RUNTIME_MIGRATIONS_FOLDER });

    if (migrations.length !== 2) {
      console.error(`MIGRATION_COUNT=${migrations.length} (Expected 2)`);
      process.exit(1);
    }

    const journalPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "meta", "_journal.json");
    if (!fs.existsSync(journalPath)) {
      console.error("Missing _journal.json");
      process.exit(1);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
    if (journal.entries.length !== 2) {
      console.error(`JOURNAL_COUNT=${journal.entries.length} (Expected 2)`);
      process.exit(1);
    }

    if (journal.entries[0].tag !== "0000_production_runtime_baseline" ||
        journal.entries[1].tag !== "0001_rfq_workflow_hardening") {
      console.error("Migration order or names do not match expected contract");
      process.exit(1);
    }

    if (!migrations[0].sql || !migrations[1].sql) {
      console.error("Failed to load SQL files");
      process.exit(1);
    }

    console.log(`MIGRATION_COUNT=2`);
    console.log(`MIGRATION_0=${journal.entries[0].tag}`);
    console.log(`MIGRATION_1=${journal.entries[1].tag}`);
    console.log(`MIGRATION_ORDER_MATCH=YES`);
    console.log(`SQL_FILES_LOADED=YES`);
    console.log(`HASH_ALGORITHM=sha256`);
    console.log(`RUNTIME_MIGRATION_READ=PASS`);
  } catch (error) {
    console.error("Error reading migrations:", error);
    process.exit(1);
  }
}

run();
