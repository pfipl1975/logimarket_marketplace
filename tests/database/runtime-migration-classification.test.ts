import test from "node:test";
import assert from "node:assert";
import { classifyRuntimeTarget } from "../../scripts/database/verify-runtime-schema-fingerprint";
import { EXPECTED_BASELINE_TABLES, PRODUCTION_FINGERPRINT, PREVIOUS_PRODUCTION_FINGERPRINT } from "../../scripts/database/runtime-migration-contract";
import type { TableFingerprintSide } from "../../scripts/database/verify-runtime-schema-fingerprint";

test("EMPTY", () => {
  const result = classifyRuntimeTarget({}, []);
  assert.strictEqual(result.state, "EMPTY");
});

test("TARGET_EXACT_19_TABLES", () => {
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

test("classifyRuntimeTarget - EXACT_EXISTING (PostgreSQL Canonical Strings)", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of EXPECTED_BASELINE_TABLES) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }

  // Explicitly simulate canonical representation returned by PostgreSQL pg_get_constraintdef
  const offerFkIndex = actual["rfq_leads"].constraints.findIndex(c => c.name === "rfq_leads_offer_id_fkey");
  const partnerFkIndex = actual["rfq_leads"].constraints.findIndex(c => c.name === "rfq_leads_partner_id_fkey");

  actual["rfq_leads"].constraints[offerFkIndex].definition = "FOREIGN KEY (offer_id) REFERENCES offers(id)";
  actual["rfq_leads"].constraints[partnerFkIndex].definition = "FOREIGN KEY (partner_id) REFERENCES partners(id)";

  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "EXACT_EXISTING");
});

test("PREVIOUS_EXACT_15_TABLES", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT)) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PREVIOUS_PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  const result = classifyRuntimeTarget(actual, Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT));
  assert.strictEqual(result.state, "MIGRATABLE_PREVIOUS");
});

test("PREVIOUS_PLUS_UNEXPECTED_TABLE", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT)) {
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

  const result = classifyRuntimeTarget(actual, Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT));
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("classifyRuntimeTarget - PARTIAL_OR_DRIFTED (Partially applied RFQ migration)", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT)) {
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

  const result = classifyRuntimeTarget(actual, Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT));
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

test("TARGET_PLUS_UNEXPECTED_TABLE", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  for (const table of EXPECTED_BASELINE_TABLES) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
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

test("PARTIAL_16_TABLES", () => {
  const actual: Record<string, TableFingerprintSide> = {};
  const tables = Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT);
  for (const table of tables) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PREVIOUS_PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
  // Add one table from the new 19-table target
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
  const actual: Record<string, TableFingerprintSide> = {};
  const tables = Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT);
  for (const table of tables) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PREVIOUS_PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
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
  const actual: Record<string, TableFingerprintSide> = {};
  const tables = Object.keys(PREVIOUS_PRODUCTION_FINGERPRINT);
  for (const table of tables) {
    actual[table] = {
      ...JSON.parse(JSON.stringify(PREVIOUS_PRODUCTION_FINGERPRINT[table])),
      rlsForced: false,
      policyCount: 0,
      triggerCount: 0,
    };
  }
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