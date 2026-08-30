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

  assert.strictEqual(journal.entries.length, 7);
  for (let i = 0; i < journal.entries.length; i++) {
    assert.strictEqual(journal.entries[i].idx, i, "idx must be sequential");
    if (i > 0) {
      assert.ok(journal.entries[i].when > journal.entries[i - 1].when, "timestamps must be strictly increasing");
    }
  }

  assert.strictEqual(journal.entries[0].tag, "0000_production_runtime_baseline");
  assert.strictEqual(journal.entries[0].when, 1785589560000);
  assert.strictEqual(journal.entries[1].tag, "0001_rfq_workflow_hardening");
  assert.strictEqual(journal.entries[1].when, 1785590000000);
  assert.strictEqual(journal.entries[2].tag, "0002_seller_identity_56b1");
  assert.strictEqual(journal.entries[2].when, 1785590500000);
  assert.strictEqual(journal.entries[3].tag, "0003_prod_legacy_offer_reconciliation");
  assert.strictEqual(journal.entries[3].when, 1785591000000);
  assert.strictEqual(journal.entries[4].tag, "0004_seller_registered_address");
  assert.strictEqual(journal.entries[4].when, 1785591500000);
  assert.strictEqual(journal.entries[5].tag, "0005_marketplace_order_56b2a");
  assert.strictEqual(journal.entries[5].when, 1785592000000);
  assert.strictEqual(journal.entries[6].tag, "0006_seller_verification_evidence");
  assert.strictEqual(journal.entries[6].when, 1785592500000);
});

test("the complete journaled SQL chain is loaded by migrator", () => {
  const migrations = readMigrationFiles({ migrationsFolder: RUNTIME_MIGRATIONS_FOLDER });
  const journal = JSON.parse(fs.readFileSync(path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf-8"));
  assert.strictEqual(migrations.length, journal.entries.length);
  assert.ok(migrations[0].sql.some((s: string) => s.includes("CREATE TABLE")));
  assert.ok(migrations[3].sql.some((s: string) => s.includes("offers_conversion_type_check")));
  assert.ok(migrations[6].sql.some((s: string) => s.includes("seller_verification_events")));
});
