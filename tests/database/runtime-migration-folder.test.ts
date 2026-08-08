import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { RUNTIME_MIGRATIONS_FOLDER } from "../../scripts/database/runtime-migration-contract";

test("journal exists and is valid", () => {
  const journalPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "meta", "_journal.json");
  assert.ok(fs.existsSync(journalPath));
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
  assert.strictEqual(journal.entries.length, 2);
  assert.strictEqual(journal.entries[0].tag, "0000_production_runtime_baseline");
  assert.strictEqual(journal.entries[0].when, 1785589560000);
  assert.strictEqual(journal.entries[1].tag, "0001_rfq_workflow_hardening");
  assert.strictEqual(journal.entries[1].when, 1785590000000);
});

test("exactly two sql files are loaded by migrator", () => {
  const migrations = readMigrationFiles({ migrationsFolder: RUNTIME_MIGRATIONS_FOLDER });
  assert.strictEqual(migrations.length, 2);
  assert.ok(migrations[0].sql.some((s: string) => s.includes("CREATE TABLE")));
});
