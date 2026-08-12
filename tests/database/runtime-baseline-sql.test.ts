import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { RUNTIME_MIGRATIONS_FOLDER, BASELINE_PRODUCTION_FINGERPRINT } from "../../scripts/database/runtime-migration-contract";

test("baseline sql contains exactly expected objects", () => {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0000_production_runtime_baseline.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  // 15 tables from 0000 baseline
  Object.keys(BASELINE_PRODUCTION_FINGERPRINT).forEach(t => {
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

test("baseline sql explicitly extracts foreign keys", () => {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0000_production_runtime_baseline.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const fkMatches = Array.from(sql.matchAll(/CONSTRAINT\s+"?([a-zA-Z0-9_]+)"?\s+FOREIGN KEY/g)).map(m => m[1]);
  assert.ok(fkMatches.length > 0, "SQL_FOREIGN_KEY_NAMES must not be empty");
  assert.strictEqual(fkMatches.length, 18, "SQL_FOREIGN_KEY_NAMES — dokładnie 18");

  const expectedFks = [
    "fk_adt_attribute_definition",
    "categories_parent_id_fkey",
    "fk_caa_attribute_definition",
    "fk_caa_category",
    "clicks_offer_id_fkey",
    "clicks_partner_id_fkey",
    "fk_covt_controlled_option_value",
    "fk_cov_attribute",
    "fk_oaov_attribute",
    "fk_oaov_attribute_option_pair",
    "fk_oaov_offer",
    "fk_oaov_option",
    "fk_oav_attribute",
    "fk_oav_attribute_option_pair",
    "fk_oav_offer",
    "fk_oav_option",
    "offers_category_id_fkey",
    "offers_partner_id_fkey"
  ];

  for (const efk of expectedFks) {
    assert.ok(fkMatches.includes(efk), `Missing FK: ${efk}`);
  }

  assert.ok(!fkMatches.includes("fk_categories_parent"), "fk_categories_parent is incorrect name");
  assert.ok(!fkMatches.includes("fk_offers_category"), "fk_offers_category is incorrect name");
  assert.ok(!fkMatches.includes("fk_offers_partner"), "fk_offers_partner is incorrect name");
});

test("baseline sql explicitly extracts check constraints", () => {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0000_production_runtime_baseline.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const chkMatches = Array.from(sql.matchAll(/CONSTRAINT\s+"?([a-zA-Z0-9_]+)"?\s+CHECK/g)).map(m => m[1]);
  assert.ok(chkMatches.length > 0, "SQL_CHECK_CONSTRAINT_NAMES must not be empty");
  assert.strictEqual(chkMatches.length, 8, "SQL_CHECK_CONSTRAINT_NAMES — dokładnie 8");
});

test("baseline sql explicitly extracts unique constraints", () => {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0000_production_runtime_baseline.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const uqMatches = Array.from(sql.matchAll(/CONSTRAINT\s+"?([a-zA-Z0-9_]+)"?\s+UNIQUE/g)).map(m => m[1]);
  assert.ok(uqMatches.length > 0, "SQL_UNIQUE_CONSTRAINT_NAMES must not be empty");
  assert.strictEqual(uqMatches.length, 10, "SQL_UNIQUE_CONSTRAINT_NAMES — dokładnie 10");
});
