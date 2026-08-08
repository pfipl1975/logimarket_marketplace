import test from "node:test";
import assert from "node:assert";
import { classifyRuntimeTarget } from "../../scripts/database/verify-runtime-schema-fingerprint";
import { EXPECTED_BASELINE_TABLES, PRODUCTION_FINGERPRINT, PREVIOUS_PRODUCTION_FINGERPRINT } from "../../scripts/database/runtime-migration-contract";
import type { TableFingerprintSide } from "../../scripts/database/verify-runtime-schema-fingerprint";

test("classifyRuntimeTarget - EMPTY", () => {
  const result = classifyRuntimeTarget({}, []);
  assert.strictEqual(result.state, "EMPTY");
});

test("classifyRuntimeTarget - EXACT_EXISTING (New Fingerprint)", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of EXPECTED_BASELINE_TABLES) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "EXACT_EXISTING");
});

test("classifyRuntimeTarget - MIGRATABLE_PREVIOUS (Old Fingerprint)", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of EXPECTED_BASELINE_TABLES) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PREVIOUS_PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "MIGRATABLE_PREVIOUS");
});

test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Unexpected Change)", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of EXPECTED_BASELINE_TABLES) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PREVIOUS_PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  // Introduce drift
  actual["categories"]!.columns.push({
    name: "drift_col",
    type: "text",
    nullable: true,
    defaultVal: null,
    sequenceName: null
  });

  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Partially applied RFQ migration)", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of EXPECTED_BASELINE_TABLES) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PREVIOUS_PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  
  // Add only ONE constraint to simulate partial migration
  actual["rfq_leads"]!.constraints = [
    ...PREVIOUS_PRODUCTION_FINGERPRINT["rfq_leads"].constraints,
    {
      name: "rfq_leads_status_check",
      type: "CHECK",
      definition: "CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'in_progress'::character varying, 'responded'::character varying, 'closed'::character varying])::text[])))"
    }
  ];

  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Wrong CHECK values)", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of EXPECTED_BASELINE_TABLES) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  
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

test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Missing index)", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of EXPECTED_BASELINE_TABLES) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  
  actual["rfq_leads"]!.explicitIndexes = actual["rfq_leads"]!.explicitIndexes.filter(i => i.name !== "idx_rfq_leads_offer");

  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});
