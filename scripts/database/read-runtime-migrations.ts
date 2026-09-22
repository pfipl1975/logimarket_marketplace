import fs from "node:fs";
import path from "node:path";
import { RUNTIME_MIGRATIONS_FOLDER } from "./runtime-migration-contract";
import { readMigrationFiles } from "drizzle-orm/migrator";

async function run() {
  try {
    const migrations = readMigrationFiles({ migrationsFolder: RUNTIME_MIGRATIONS_FOLDER });
    const journalPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "meta", "_journal.json");
    if (!fs.existsSync(journalPath)) {
      console.error("Missing _journal.json");
      process.exit(1);
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
    if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
      console.error(`JOURNAL_COUNT=0 (Expected > 0)`);
      process.exit(1);
    }

    if (migrations.length !== journal.entries.length) {
      console.error(`MIGRATION_COUNT=${migrations.length} !== JOURNAL_COUNT=${journal.entries.length}`);
      process.exit(1);
    }

    const tags = new Set<string>();
    const timestamps = new Set<number>();
    let lastTs = -1;

    for (let i = 0; i < journal.entries.length; i++) {
      const entry = journal.entries[i];
      const mig = migrations[i];
      
      if (!entry.tag || !entry.when) {
        console.error(`Invalid journal entry at index ${i}`);
        process.exit(1);
      }

      if (tags.has(entry.tag)) {
        console.error(`Duplicate tag in journal: ${entry.tag}`);
        process.exit(1);
      }
      tags.add(entry.tag);

      if (timestamps.has(entry.when)) {
        console.error(`Duplicate timestamp in journal: ${entry.when}`);
        process.exit(1);
      }
      timestamps.add(entry.when);

      if (entry.when <= lastTs) {
        console.error(`Timestamps not strictly increasing at index ${i}`);
        process.exit(1);
      }
      lastTs = entry.when;

      if (!mig.sql) {
        console.error(`Failed to load SQL file for migration at index ${i}`);
        process.exit(1);
      }
      
      if (mig.folderMillis !== entry.when) {
        console.error(`Disk folderMillis ${mig.folderMillis} does not match journal when ${entry.when} at index ${i}`);
        process.exit(1);
      }
    }

    console.log(`MIGRATION_COUNT=${migrations.length}`);
    for (let i = 0; i < journal.entries.length; i++) {
      console.log(`MIGRATION_${i}=${journal.entries[i].tag}`);
    }
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

