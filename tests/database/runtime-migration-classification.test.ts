import test from "node:test";
import assert from "node:assert";
import { classifyRuntimeTarget } from "../../scripts/database/verify-runtime-schema-fingerprint";
import {
  EXPECTED_BASELINE_TABLES,
  PROD_LEGACY_BASELINE_FINGERPRINT,
  CANONICAL_0000_BASELINE_FINGERPRINT,
  PRE_0003_PRODUCTION_FINGERPRINT,
  FINAL_POST_0003_PRODUCTION_FINGERPRINT,
  PRODUCTION_FINGERPRINT
} from "../../scripts/database/runtime-migration-contract";
import type { TableFingerprintSide } from "../../scripts/database/verify-runtime-schema-fingerprint";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Helper: build a TableFingerprintSide record from a TableContract map
// ---------------------------------------------------------------------------
function buildSide(fp: typeof PRODUCTION_FINGERPRINT): Record<string, TableFingerprintSide> {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of Object.keys(fp)) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(fp[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  return actual;
}

// ===========================================================================
// 1. EMPTY
// ===========================================================================
test("EMPTY", () => {
  const result = classifyRuntimeTarget({}, []);
  assert.strictEqual(result.state, "EMPTY");
});

// ===========================================================================
// 2. BASELINE PROD LEGACY — 15-table state
// ===========================================================================
test("PROD_LEGACY_BASELINE_CLASSIFICATION", () => {
  const actual = buildSide(PROD_LEGACY_BASELINE_FINGERPRINT);
  const tableNames = Object.keys(PROD_LEGACY_BASELINE_FINGERPRINT);
  const result = classifyRuntimeTarget(actual, tableNames);
  assert.strictEqual(result.state, "MIGRATABLE_PROD_LEGACY");
});

test("CANONICAL_0000_BASELINE_CLASSIFICATION", () => {
  const actual = buildSide(CANONICAL_0000_BASELINE_FINGERPRINT);
  const tableNames = Object.keys(CANONICAL_0000_BASELINE_FINGERPRINT);
  const result = classifyRuntimeTarget(actual, tableNames);
  assert.strictEqual(result.state, "MIGRATABLE_BASELINE");
});

// ===========================================================================
// 3. POST-0002 exact state — MIGRATABLE_POST_0002
// ===========================================================================
test("PRE_0003_EXACT_POST_0002", () => {
  const actual = buildSide(PRE_0003_PRODUCTION_FINGERPRINT);
  const tableNames = Object.keys(PRE_0003_PRODUCTION_FINGERPRINT);

  const rfq = PRE_0003_PRODUCTION_FINGERPRINT["rfq_leads"];
  const constraintNames = rfq.constraints.map(c => c.name);
  const indexNames = rfq.explicitIndexes.map(i => i.name);

  assert.ok(constraintNames.includes("rfq_leads_offer_id_fkey"),   "rfq_leads_offer_id_fkey must be in PRE_0003");
  assert.ok(constraintNames.includes("rfq_leads_partner_id_fkey"), "rfq_leads_partner_id_fkey must be in PRE_0003");
  assert.ok(constraintNames.includes("rfq_leads_status_check"),    "rfq_leads_status_check must be in PRE_0003");
  assert.ok(indexNames.includes("idx_rfq_leads_offer"),            "idx_rfq_leads_offer must be in PRE_0003");
  assert.ok(indexNames.includes("idx_rfq_leads_partner"),          "idx_rfq_leads_partner must be in PRE_0003");

  const result = classifyRuntimeTarget(actual, tableNames);
  assert.strictEqual(result.state, "MIGRATABLE_POST_0002");
});

// ===========================================================================
// 4. POST-0002 with one RFQ constraint missing → PARTIAL_OR_DRIFTED
// ===========================================================================
test("RFQ_DRIFT_CLASSIFICATION", () => {
  const actual = buildSide(PRE_0003_PRODUCTION_FINGERPRINT);
  actual["rfq_leads"]!.explicitIndexes = actual["rfq_leads"]!.explicitIndexes.filter(
    i => i.name !== "idx_rfq_leads_offer"
  );
  const result = classifyRuntimeTarget(actual, Object.keys(PRE_0003_PRODUCTION_FINGERPRINT));
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 5. POST-0003 exact — EXACT_EXISTING_POST_0003
// ===========================================================================
test("TARGET_EXACT_19_TABLES", () => {
  const actual = buildSide(FINAL_POST_0003_PRODUCTION_FINGERPRINT);
  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "EXACT_EXISTING_POST_0003");
});

// ===========================================================================
// 6. POST-0003 exact with PostgreSQL Canonical Strings
// ===========================================================================
test("classifyRuntimeTarget - EXACT_EXISTING_POST_0003 (PostgreSQL Canonical Strings)", () => {
  const actual = buildSide(FINAL_POST_0003_PRODUCTION_FINGERPRINT);

  const offerFkIndex = actual["rfq_leads"].constraints.findIndex(c => c.name === "rfq_leads_offer_id_fkey");
  const partnerFkIndex = actual["rfq_leads"].constraints.findIndex(c => c.name === "rfq_leads_partner_id_fkey");

  actual["rfq_leads"].constraints[offerFkIndex].definition = "FOREIGN KEY (offer_id) REFERENCES offers(id)";
  actual["rfq_leads"].constraints[partnerFkIndex].definition = "FOREIGN KEY (partner_id) REFERENCES partners(id)";

  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "EXACT_EXISTING_POST_0003");
});

// ===========================================================================
// 7. PRE_0003 plus unexpected table / drift → PARTIAL_OR_DRIFTED
// ===========================================================================
test("PREVIOUS_PLUS_UNEXPECTED_TABLE", () => {
  const actual = buildSide(PRE_0003_PRODUCTION_FINGERPRINT);
  actual["categories"]!.columns.push({
    name: "drift_col",
    type: "text",
    nullable: true,
    defaultVal: null,
    sequenceName: null
  });
  const result = classifyRuntimeTarget(actual, Object.keys(PRE_0003_PRODUCTION_FINGERPRINT));
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 8. Partially applied 0001 (only one constraint added) → PARTIAL_OR_DRIFTED
// ===========================================================================
test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Partially applied RFQ migration)", () => {
  const actual = buildSide(PRE_0003_PRODUCTION_FINGERPRINT);

  const baseRfqConstraints = CANONICAL_0000_BASELINE_FINGERPRINT["rfq_leads"].constraints;
  actual["rfq_leads"]!.constraints = [
    ...JSON.parse(JSON.stringify(baseRfqConstraints)),
    {
      name: "rfq_leads_status_check",
      type: "CHECK",
      definition: "CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'in_progress'::character varying, 'responded'::character varying, 'closed'::character varying])::text[])))"
    }
  ];
  actual["rfq_leads"]!.explicitIndexes = [];

  const result = classifyRuntimeTarget(actual, Object.keys(PRE_0003_PRODUCTION_FINGERPRINT));
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 9. Wrong CHECK value in post-0003 target → PARTIAL_OR_DRIFTED
// ===========================================================================
test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Wrong CHECK values)", () => {
  const actual = buildSide(FINAL_POST_0003_PRODUCTION_FINGERPRINT);

  actual["rfq_leads"]!.constraints = actual["rfq_leads"]!.constraints.map(c => {
    if (c.name === "rfq_leads_status_check") {
      return {
        ...c,
        definition: "CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'wrong'::character varying])::text[])))"
      };
    }
    return c;
  });

  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 10. Missing index in post-0003 target → PARTIAL_OR_DRIFTED
// ===========================================================================
test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Missing index)", () => {
  const actual = buildSide(FINAL_POST_0003_PRODUCTION_FINGERPRINT);
  actual["rfq_leads"]!.explicitIndexes = actual["rfq_leads"]!.explicitIndexes.filter(i => i.name !== "idx_rfq_leads_offer");
  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 11. Post-0003 + unexpected table → PARTIAL_OR_DRIFTED
// ===========================================================================
test("TARGET_PLUS_UNEXPECTED_TABLE", () => {
  const actual = buildSide(FINAL_POST_0003_PRODUCTION_FINGERPRINT);
  actual["unexpected_table"] = {
    columns: [],
    constraints: [],
    explicitIndexes: [],
    rlsEnabled: false,
    rlsForced: false,
    policyCount: 0,
    triggerCount: 0
  };
  const allTables = [...EXPECTED_BASELINE_TABLES, "unexpected_table"];
  const result = classifyRuntimeTarget(actual, allTables);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 12. MIGRATION_0003_REPLAY_SAFE_STATIC_TEST
// ===========================================================================
test("MIGRATION_0003_REPLAY_SAFE_STATIC_TEST", () => {
  const sqlPath = path.join(process.cwd(), "drizzle-runtime", "0003_prod_legacy_offer_reconciliation.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  assert.ok(sql.includes("0003 precheck failed"), "0003 must contain precheck assertion");
  assert.ok(sql.includes("UPDATE public.offers"), "0003 must contain data transformation DML");
  assert.ok(sql.includes("0003 validation failed"), "0003 must contain post-DML assertion");
  assert.ok(sql.includes("offers_publication_status_check"), "0003 must converge publication status check");
  assert.ok(sql.includes("idx_clicks_tracking"), "0003 must converge clicks tracking index");
});

// ===========================================================================
// 13. NOT_VALID_CHECK_IS_DRIFT
// ===========================================================================
test("NOT_VALID_CHECK_IS_DRIFT", () => {
  // A. Validated CHECK matching expected -> exact state
  const actualValid = buildSide(PROD_LEGACY_BASELINE_FINGERPRINT);
  const resultValid = classifyRuntimeTarget(actualValid, Object.keys(PROD_LEGACY_BASELINE_FINGERPRINT));
  assert.strictEqual(resultValid.state, "MIGRATABLE_PROD_LEGACY");

  // B. Same CHECK but NOT VALID (via definition or isValidated=false) -> PARTIAL_OR_DRIFTED
  const actualInvalidDef = buildSide(PROD_LEGACY_BASELINE_FINGERPRINT);
  const checkIdx = actualInvalidDef["offers"].constraints.findIndex(c => c.name === "offers_publication_status_check");
  actualInvalidDef["offers"].constraints[checkIdx] = {
    ...actualInvalidDef["offers"].constraints[checkIdx],
    definition: actualInvalidDef["offers"].constraints[checkIdx].definition + " NOT VALID",
    isValidated: false,
  };
  const resultInvalidDef = classifyRuntimeTarget(actualInvalidDef, Object.keys(PROD_LEGACY_BASELINE_FINGERPRINT));
  assert.strictEqual(resultInvalidDef.state, "PARTIAL_OR_DRIFTED");

  const actualInvalidFlag = buildSide(PROD_LEGACY_BASELINE_FINGERPRINT);
  actualInvalidFlag["offers"].constraints[checkIdx] = {
    ...actualInvalidFlag["offers"].constraints[checkIdx],
    isValidated: false,
  };
  const resultInvalidFlag = classifyRuntimeTarget(actualInvalidFlag, Object.keys(PROD_LEGACY_BASELINE_FINGERPRINT));
  assert.strictEqual(resultInvalidFlag.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 14. NOT_VALID_FK_IS_DRIFT
// ===========================================================================
test("NOT_VALID_FK_IS_DRIFT", () => {
  // C. Validated FK matching expected -> exact state
  const actualValid = buildSide(PROD_LEGACY_BASELINE_FINGERPRINT);
  const resultValid = classifyRuntimeTarget(actualValid, Object.keys(PROD_LEGACY_BASELINE_FINGERPRINT));
  assert.strictEqual(resultValid.state, "MIGRATABLE_PROD_LEGACY");

  // D. Same FK but convalidated=false / NOT VALID -> PARTIAL_OR_DRIFTED
  const actualInvalidFk = buildSide(PROD_LEGACY_BASELINE_FINGERPRINT);
  const fkIdx = actualInvalidFk["offers"].constraints.findIndex(c => c.name === "offers_partner_id_fkey");
  actualInvalidFk["offers"].constraints[fkIdx] = {
    ...actualInvalidFk["offers"].constraints[fkIdx],
    isValidated: false,
  };
  const resultInvalidFk = classifyRuntimeTarget(actualInvalidFk, Object.keys(PROD_LEGACY_BASELINE_FINGERPRINT));
  assert.strictEqual(resultInvalidFk.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 15. NUM_NONNULLS NORMALIZATION
// ===========================================================================
test("NUM_NONNULLS_NORMALIZATION", () => {
  // A. PROD_FORM == CONTRACT_FORM handled by actual classification comparison.
  // B. Exact 15-table PROD legacy fingerprint with ONLY the real PROD OAV no-cast definition
  const actual = buildSide(PROD_LEGACY_BASELINE_FINGERPRINT);
  const chkIdx = actual["offer_attribute_values"].constraints.findIndex(c => c.name === "chk_oav_value_exclusivity");

  // Replace the definition with the EXACT prod definition
  actual["offer_attribute_values"].constraints[chkIdx].definition =
    "CHECK ((num_nonnulls(value_text, value_number, value_boolean, value_date, value_year, option_id) = 1))";

  const result = classifyRuntimeTarget(actual, Object.keys(PROD_LEGACY_BASELINE_FINGERPRINT));
  assert.strictEqual(result.state, "MIGRATABLE_PROD_LEGACY");

  // C. Negative: changing = 1 to = 2
  const actualWrongCount = buildSide(PROD_LEGACY_BASELINE_FINGERPRINT);
  actualWrongCount["offer_attribute_values"].constraints[chkIdx].definition =
    "CHECK ((num_nonnulls(value_text, value_number, value_boolean, value_date, value_year, option_id) = 2))";
  const resultWrongCount = classifyRuntimeTarget(actualWrongCount, Object.keys(PROD_LEGACY_BASELINE_FINGERPRINT));
  assert.strictEqual(resultWrongCount.state, "PARTIAL_OR_DRIFTED");

  // D. Negative: removing one argument
  const actualMissingArg = buildSide(PROD_LEGACY_BASELINE_FINGERPRINT);
  actualMissingArg["offer_attribute_values"].constraints[chkIdx].definition =
    "CHECK ((num_nonnulls(value_text, value_number, value_boolean, value_date, value_year) = 1))";
  const resultMissingArg = classifyRuntimeTarget(actualMissingArg, Object.keys(PROD_LEGACY_BASELINE_FINGERPRINT));
  assert.strictEqual(resultMissingArg.state, "PARTIAL_OR_DRIFTED");

  // E. Negative: changing an argument column
  const actualWrongCol = buildSide(PROD_LEGACY_BASELINE_FINGERPRINT);
  actualWrongCol["offer_attribute_values"].constraints[chkIdx].definition =
    "CHECK ((num_nonnulls(value_text, wrong_column, value_boolean, value_date, value_year, option_id) = 1))";
  const resultWrongCol = classifyRuntimeTarget(actualWrongCol, Object.keys(PROD_LEGACY_BASELINE_FINGERPRINT));
  assert.strictEqual(resultWrongCol.state, "PARTIAL_OR_DRIFTED");
});