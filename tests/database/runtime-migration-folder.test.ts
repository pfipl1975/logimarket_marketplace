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
  assert.strictEqual(journal.entries.length, 1);
  assert.strictEqual(journal.entries[0].tag, "0000_production_runtime_baseline");
});

test("exactly one sql file is loaded by migrator", () => {
  const migrations = readMigrationFiles({ migrationsFolder: RUNTIME_MIGRATIONS_FOLDER });
  assert.strictEqual(migrations.length, 1);
  assert.ok(migrations[0].sql.some((s: string) => s.includes("CREATE TABLE")));
});
