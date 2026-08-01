import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { RUNTIME_MIGRATIONS_FOLDER, EXPECTED_BASELINE_TABLES } from "../../scripts/database/runtime-migration-contract";

test("baseline sql contains exactly expected objects", () => {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0000_production_runtime_baseline.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  // 15 tables
  EXPECTED_BASELINE_TABLES.forEach(t => {
    assert.ok(sql.includes(`CREATE TABLE ${t}`));
  });

  // no migration tables
  assert.ok(!sql.includes("CREATE TABLE migration_"));

  // 15 enable RLS
  const rlsMatches = sql.match(/ENABLE ROW LEVEL SECURITY/g);
  assert.strictEqual(rlsMatches?.length, 15);

  // no policies
  assert.ok(!sql.includes("CREATE POLICY"));

  // Revokes
  assert.ok(sql.includes("REVOKE ALL ON TABLE"));
  assert.ok(sql.includes("REVOKE ALL ON SEQUENCE"));
});
