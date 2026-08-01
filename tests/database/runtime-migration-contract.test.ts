import { test } from "node:test";
import assert from "node:assert";
import { normalizeProjectRef, EXPECTED_BASELINE_TABLES } from "../../scripts/database/runtime-migration-contract";

test("normalizeProjectRef extracts refs correctly", () => {
  assert.strictEqual(normalizeProjectRef("postgres://postgres.abc@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"), "abc");
  assert.strictEqual(normalizeProjectRef("postgres://postgres:pass@db.xyz.supabase.co:5432/postgres"), "xyz");
  assert.strictEqual(normalizeProjectRef(undefined), null);
  assert.strictEqual(normalizeProjectRef("invalid"), null);
});

test("EXPECTED_BASELINE_TABLES has 15 items", () => {
  assert.strictEqual(EXPECTED_BASELINE_TABLES.length, 15);
});
