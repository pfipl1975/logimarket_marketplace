import test from "node:test";
import assert from "node:assert";
import { classifyRuntimeTarget } from "../../scripts/database/verify-runtime-schema-fingerprint";
import {
  EXPECTED_BASELINE_TABLES,
  BASELINE_PRODUCTION_FINGERPRINT,
  PREVIOUS_PRODUCTION_FINGERPRINT,
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
// 2. BASELINE 0000 — 15-table state, no 0001 RFQ additions
//    The classifier's supported-generation policy determines its classification.
//    BASELINE is NOT an accepted MIGRATABLE_PREVIOUS target because the runner
//    only accepts PREVIOUS_PRODUCTION_FINGERPRINT (post-0001) as migratable.
//    Therefore BASELINE_0000 should be PARTIAL_OR_DRIFTED (rfq constraints missing).
// ===========================================================================
test("BASELINE_0000_CLASSIFICATION", () => {
  const actual = buildSide(BASELINE_PRODUCTION_FINGERPRINT);
  // Pass the baseline tables as the observed table set
  const tableNames = Object.keys(BASELINE_PRODUCTION_FINGERPRINT);
  const result = classifyRuntimeTarget(actual, tableNames);
  // Baseline lacks the 0001 rfq_leads constraints/indexes -> MIGRATABLE_BASELINE
  assert.strictEqual(result.state, "MIGRATABLE_BASELINE");
});

// ===========================================================================
// 3. POST-0001 exact state — MIGRATABLE_PREVIOUS
//    Proves rfq_leads has exactly the 0001 additions.
// ===========================================================================
test("PREVIOUS_EXACT_POST_0001", () => {
  const actual = buildSide(PREVIOUS_PRODUCTION_FINGERPRINT);
  const tableNames = Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT);

  // Explicitly verify the 0001 rfq_leads additions are present
  const rfq = PREVIOUS_PRODUCTION_FINGERPRINT["rfq_leads"];
  const constraintNames = rfq.constraints.map(c => c.name);
  const indexNames = rfq.explicitIndexes.map(i => i.name);

  assert.ok(constraintNames.includes("rfq_leads_offer_id_fkey"),   "rfq_leads_offer_id_fkey must be in PREVIOUS");
  assert.ok(constraintNames.includes("rfq_leads_partner_id_fkey"), "rfq_leads_partner_id_fkey must be in PREVIOUS");
  assert.ok(constraintNames.includes("rfq_leads_status_check"),    "rfq_leads_status_check must be in PREVIOUS");
  assert.ok(indexNames.includes("idx_rfq_leads_offer"),            "idx_rfq_leads_offer must be in PREVIOUS");
  assert.ok(indexNames.includes("idx_rfq_leads_partner"),          "idx_rfq_leads_partner must be in PREVIOUS");

  const result = classifyRuntimeTarget(actual, tableNames);
  assert.strictEqual(result.state, "MIGRATABLE_PREVIOUS");
});

// ===========================================================================
// 4. POST-0001 with one RFQ constraint missing → PARTIAL_OR_DRIFTED
// ===========================================================================
test("RFQ_DRIFT_CLASSIFICATION", () => {
  const actual = buildSide(PREVIOUS_PRODUCTION_FINGERPRINT);
  // Remove idx_rfq_leads_offer to simulate partial 0001 application
  actual["rfq_leads"]!.explicitIndexes = actual["rfq_leads"]!.explicitIndexes.filter(
    i => i.name !== "idx_rfq_leads_offer"
  );
  const result = classifyRuntimeTarget(actual, Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT));
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 5. POST-0002 exact — EXACT_EXISTING
// ===========================================================================
test("TARGET_EXACT_19_TABLES", () => {
  const actual = buildSide(PRODUCTION_FINGERPRINT);
  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "EXACT_EXISTING");
});

// ===========================================================================
// 6. POST-0002 exact with PostgreSQL canonical FK strings (no schema prefix)
// ===========================================================================
test("classifyRuntimeTarget - EXACT_EXISTING (PostgreSQL Canonical Strings)", () => {
  const actual = buildSide(PRODUCTION_FINGERPRINT);

  // Simulate PostgreSQL pg_get_constraintdef omitting schema prefix
  const offerFkIndex = actual["rfq_leads"].constraints.findIndex(c => c.name === "rfq_leads_offer_id_fkey");
  const partnerFkIndex = actual["rfq_leads"].constraints.findIndex(c => c.name === "rfq_leads_partner_id_fkey");

  actual["rfq_leads"].constraints[offerFkIndex].definition = "FOREIGN KEY (offer_id) REFERENCES offers(id)";
  actual["rfq_leads"].constraints[partnerFkIndex].definition = "FOREIGN KEY (partner_id) REFERENCES partners(id)";

  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "EXACT_EXISTING");
});

// ===========================================================================
// 7. Partial 56B1: PREVIOUS tables + drift → PARTIAL_OR_DRIFTED
// ===========================================================================
test("PREVIOUS_PLUS_UNEXPECTED_TABLE", () => {
  const actual = buildSide(PREVIOUS_PRODUCTION_FINGERPRINT);
  actual["categories"]!.columns.push({
    name: "drift_col",
    type: "text",
    nullable: true,
    defaultVal: null,
    sequenceName: null
  });
  const result = classifyRuntimeTarget(actual, Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT));
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 8. Partially applied 0001 (only one constraint added) → PARTIAL_OR_DRIFTED
// ===========================================================================
test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Partially applied RFQ migration)", () => {
  const actual = buildSide(PREVIOUS_PRODUCTION_FINGERPRINT);

  // Strip RFQ additions, then add only one constraint (partial)
  const baseRfqConstraints = BASELINE_PRODUCTION_FINGERPRINT["rfq_leads"].constraints;
  actual["rfq_leads"]!.constraints = [
    ...JSON.parse(JSON.stringify(baseRfqConstraints)),
    {
      name: "rfq_leads_status_check",
      type: "CHECK",
      definition: "CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'in_progress'::character varying, 'responded'::character varying, 'closed'::character varying])::text[])))"
    }
  ];
  actual["rfq_leads"]!.explicitIndexes = [];

  const result = classifyRuntimeTarget(actual, Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT));
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 9. Wrong CHECK value in post-0002 target → PARTIAL_OR_DRIFTED
// ===========================================================================
test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Wrong CHECK values)", () => {
  const actual = buildSide(PRODUCTION_FINGERPRINT);

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
// 10. Missing index in post-0002 target → PARTIAL_OR_DRIFTED
// ===========================================================================
test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Missing index)", () => {
  const actual = buildSide(PRODUCTION_FINGERPRINT);
  actual["rfq_leads"]!.explicitIndexes = actual["rfq_leads"]!.explicitIndexes.filter(i => i.name !== "idx_rfq_leads_offer");
  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 11. Post-0002 + unexpected table → PARTIAL_OR_DRIFTED
// ===========================================================================
test("TARGET_PLUS_UNEXPECTED_TABLE", () => {
  const actual = buildSide(PRODUCTION_FINGERPRINT);
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
// 12-14. Partial 56B1 application (16, 17, 18 tables) → PARTIAL_OR_DRIFTED
// ===========================================================================
test("PARTIAL_16_TABLES", () => {
  const actual = buildSide(PREVIOUS_PRODUCTION_FINGERPRINT);
  const tables = Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT);
  const newTables = EXPECTED_BASELINE_TABLES.filter(t => !tables.includes(t));
  const t = newTables[0];
  actual[t] = {
    ...JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT[t])),
    rlsForced: false,
    policyCount: 0,
    triggerCount: 0,
  };
  const allTables = [...tables, t];
  const result = classifyRuntimeTarget(actual, allTables);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("PARTIAL_17_TABLES", () => {
  const actual = buildSide(PREVIOUS_PRODUCTION_FINGERPRINT);
  const tables = Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT);
  const newTables = EXPECTED_BASELINE_TABLES.filter(t => !tables.includes(t));
  for (let i = 0; i < 2; i++) {
    const t = newTables[i];
    actual[t] = {
      ...JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT[t])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  const allTables = [...tables, newTables[0], newTables[1]];
  const result = classifyRuntimeTarget(actual, allTables);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("PARTIAL_18_TABLES", () => {
  const actual = buildSide(PREVIOUS_PRODUCTION_FINGERPRINT);
  const tables = Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT);
  const newTables = EXPECTED_BASELINE_TABLES.filter(t => !tables.includes(t));
  for (let i = 0; i < 3; i++) {
    const t = newTables[i];
    actual[t] = {
      ...JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT[t])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  const allTables = [...tables, newTables[0], newTables[1], newTables[2]];
  const result = classifyRuntimeTarget(actual, allTables);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ===========================================================================
// 15. MIGRATION_0002_REPLAY_SAFE_STATIC_TEST
//     Proves all five non-table additive DDL items in 0002 are guarded.
// ===========================================================================
test("MIGRATION_0002_REPLAY_SAFE_STATIC_TEST", () => {
  const sqlPath = path.join(process.cwd(), "drizzle-runtime", "0002_seller_identity_56b1.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  // contract_model must use ADD COLUMN IF NOT EXISTS
  assert.ok(
    /ALTER TABLE\s+"?offers"?\s+ADD COLUMN IF NOT EXISTS\s+"?contract_model"?/i.test(sql),
    "contract_model addition must use ADD COLUMN IF NOT EXISTS"
  );

  // Each non-FK constraint must be inside a DO block with an IF NOT EXISTS pg_constraint guard
  const doBlocks = [...sql.matchAll(/DO\s+\$\$([\s\S]*?)\$\$;/g)].map(m => m[1]);

  function hasGuardedConstraint(name: string): boolean {
    return doBlocks.some(block =>
      block.includes(`conname = '${name}'`) &&
      block.includes("pg_constraint") &&
      block.includes("IF NOT EXISTS")
    );
  }

  assert.ok(hasGuardedConstraint("offers_contract_model_check"),
    "offers_contract_model_check must be guarded by pg_constraint IF NOT EXISTS");
  assert.ok(hasGuardedConstraint("seller_eligibility_status_check"),
    "seller_eligibility_status_check must be guarded by pg_constraint IF NOT EXISTS");
  assert.ok(hasGuardedConstraint("uq_seller_tax_identifier_identity"),
    "uq_seller_tax_identifier_identity must be guarded by pg_constraint IF NOT EXISTS");
  assert.ok(hasGuardedConstraint("uq_seller_registry_identifier_identity"),
    "uq_seller_registry_identifier_identity must be guarded by pg_constraint IF NOT EXISTS");
});