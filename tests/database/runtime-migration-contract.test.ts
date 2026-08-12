import { test } from "node:test";
import assert from "node:assert";
import { normalizeProjectRef, EXPECTED_BASELINE_TABLES, PRODUCTION_FINGERPRINT, PREVIOUS_PRODUCTION_FINGERPRINT, BASELINE_PRODUCTION_FINGERPRINT } from "../../scripts/database/runtime-migration-contract";

test("normalizeProjectRef extracts refs correctly", () => {
  assert.strictEqual(normalizeProjectRef("postgres://postgres.abc@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"), "abc");
  assert.strictEqual(normalizeProjectRef("postgres://postgres:pass@db.xyz.supabase.co:5432/postgres"), "xyz");
  assert.strictEqual(normalizeProjectRef(undefined), null);
  assert.strictEqual(normalizeProjectRef("invalid"), null);
});

test("EXPECTED_BASELINE_TABLES has 19 items", () => {
  assert.strictEqual(EXPECTED_BASELINE_TABLES.length, 19);
});

test("CONTRACT_SYNC: 1. Exactly 24 FK", () => {
  const allFks = EXPECTED_BASELINE_TABLES.flatMap(t => PRODUCTION_FINGERPRINT[t].constraints.filter(c => c.type === "FOREIGN KEY"));
  assert.strictEqual(allFks.length, 24);
});

test("CONTRACT_SYNC: 2. No forbidden FKs", () => {
  const allFks = EXPECTED_BASELINE_TABLES.flatMap(t => PRODUCTION_FINGERPRINT[t].constraints.filter(c => c.type === "FOREIGN KEY"));
  const names = allFks.map(f => f.name);
  assert.ok(!names.includes("fk_cart_items_offer"));
  assert.ok(!names.includes("fk_order_items_order"));
  assert.ok(!names.includes("fk_order_items_offer"));
  assert.ok(!names.includes("fk_rfq_leads_offer")); // Old name
  assert.ok(!names.includes("fk_rfq_leads_partner")); // Old name
});

test("CONTRACT_SYNC: 3. Exactly 11 CHECK", () => {
  const allChecks = EXPECTED_BASELINE_TABLES.flatMap(t => PRODUCTION_FINGERPRINT[t].constraints.filter(c => c.type === "CHECK"));
  assert.strictEqual(allChecks.length, 11);
  const names = allChecks.map(c => c.name);
  assert.ok(!names.includes("chk_cart_items_quantity"));
  assert.ok(!names.includes("chk_order_items_quantity"));
  assert.ok(!names.includes("chk_offers_price"));
});

test("CONTRACT_SYNC: 4. Exactly 12 UNIQUE", () => {
  const allUqs = EXPECTED_BASELINE_TABLES.flatMap(t => PRODUCTION_FINGERPRINT[t].constraints.filter(c => c.type === "UNIQUE"));
  assert.strictEqual(allUqs.length, 12);
});

test("CONTRACT_SYNC: 5. Presence of uq_cov_attribute_id_pair", () => {
  const cov = PRODUCTION_FINGERPRINT["controlled_option_values"];
  assert.ok(cov.constraints.some(c => c.name === "uq_cov_attribute_id_pair" && c.type === "UNIQUE"));
});

test("CONTRACT_SYNC: 6. Valid target for composite FK", () => {
  // If uq_cov_attribute_id_pair exists, it acts as a target
  const cov = PRODUCTION_FINGERPRINT["controlled_option_values"];
  assert.ok(cov.constraints.some(c => c.name === "uq_cov_attribute_id_pair" && c.definition === "UNIQUE (attribute_id, id)"));
});

test("CONTRACT_SYNC: 7. Exact clicks columns", () => {
  const cols = PRODUCTION_FINGERPRINT["clicks"].columns;
  assert.strictEqual(cols.find(c => c.name === "offer_id")?.type, "integer");
  assert.strictEqual(cols.find(c => c.name === "offer_id")?.nullable, true);
  assert.strictEqual(cols.find(c => c.name === "partner_id")?.type, "integer");
  assert.strictEqual(cols.find(c => c.name === "partner_id")?.nullable, true);
  assert.strictEqual(cols.find(c => c.name === "clicked_at")?.type, "timestamp without time zone");
  assert.strictEqual(cols.find(c => c.name === "clicked_at")?.nullable, true);
  assert.strictEqual(cols.find(c => c.name === "session_hash")?.nullable, false);
  assert.strictEqual(cols.find(c => c.name === "ip_hash")?.nullable, false);
});

test("CONTRACT_SYNC: 8. Exact rfq_leads columns", () => {
  const cols = PRODUCTION_FINGERPRINT["rfq_leads"].columns;
  assert.strictEqual(cols.find(c => c.name === "status")?.nullable, false);
  assert.strictEqual(cols.find(c => c.name === "created_at")?.type, "timestamp with time zone");
  assert.strictEqual(cols.find(c => c.name === "created_at")?.nullable, true);
});

test("CONTRACT_SYNC: 9. Exact order_items columns", () => {
  const cols = PRODUCTION_FINGERPRINT["order_items"].columns;
  assert.strictEqual(cols.length, 7);
  assert.ok(!cols.find(c => c.name === "created_at"));
});

test("CONTRACT_SYNC: 10. Exact orders columns", () => {
  const cols = PRODUCTION_FINGERPRINT["orders"].columns;
  assert.strictEqual(cols.find(c => c.name === "session_hash")?.nullable, false);
  assert.strictEqual(cols.find(c => c.name === "total_amount")?.nullable, true);
  assert.strictEqual(cols.find(c => c.name === "created_at")?.type, "timestamp with time zone");
  assert.strictEqual(cols.find(c => c.name === "created_at")?.nullable, true);
});

test("CONTRACT_SYNC: 11. Categories/partners timestamps", () => {
  const cat = PRODUCTION_FINGERPRINT["categories"].columns;
  assert.strictEqual(cat.find(c => c.name === "created_at")?.type, "timestamp without time zone");
  assert.strictEqual(cat.find(c => c.name === "created_at")?.nullable, false);

  const part = PRODUCTION_FINGERPRINT["partners"].columns;
  assert.strictEqual(part.find(c => c.name === "created_at")?.type, "timestamp without time zone");
  assert.strictEqual(part.find(c => c.name === "created_at")?.nullable, false);
});

test("CONTRACT_SYNC: 12. Exactly 17 sequence ownerships", () => {
  const allSeqCols = EXPECTED_BASELINE_TABLES.flatMap(t => PRODUCTION_FINGERPRINT[t].columns.filter(c => c.sequenceName !== null));
  assert.strictEqual(allSeqCols.length, 17);
});

test("CONTRACT_SYNC: 13. Exactly 10 explicit indexes", () => {
  const allIdxs = EXPECTED_BASELINE_TABLES.flatMap(t => PRODUCTION_FINGERPRINT[t].explicitIndexes);
  assert.strictEqual(allIdxs.length, 10);
});

test("CONTRACT_SYNC: 14. 19 RLS enabled", () => {
  const rlsCount = EXPECTED_BASELINE_TABLES.filter(t => PRODUCTION_FINGERPRINT[t].rlsEnabled).length;
  assert.strictEqual(rlsCount, 19);
});

test("CONTRACT_SYNC: 15. Zero policies and triggers", () => {
  // The production fingerprint must not define any policy or trigger counts —
  // the runtime contract requires RLS_POLICY_COUNT=0 and TRIGGER_COUNT=0.
  for (const t of EXPECTED_BASELINE_TABLES) {
    const fp = PRODUCTION_FINGERPRINT[t] as unknown as {
      policyCount?: number;
      triggerCount?: number;
    };
    assert.strictEqual(fp.policyCount ?? 0, 0, `${t} must have 0 policies`);
    assert.strictEqual(fp.triggerCount ?? 0, 0, `${t} must have 0 triggers`);
  }
});

test("CONTRACT_SYNC: 16. RFQ schema evolution (BASELINE vs PREVIOUS vs PRODUCTION)", () => {
  const baselineRfq = BASELINE_PRODUCTION_FINGERPRINT["rfq_leads"];
  const previousRfq = PREVIOUS_PRODUCTION_FINGERPRINT["rfq_leads"];
  const productionRfq = PRODUCTION_FINGERPRINT["rfq_leads"];

  // BASELINE (post-0000) has NO RFQ CHECK, NO RFQ FKs, NO RFQ indexes
  assert.ok(!baselineRfq.constraints.some(c => c.name === "rfq_leads_status_check"), "BASELINE must not have rfq_leads_status_check");
  assert.ok(!baselineRfq.constraints.some(c => c.name === "rfq_leads_offer_id_fkey"), "BASELINE must not have rfq_leads_offer_id_fkey");
  assert.ok(!baselineRfq.constraints.some(c => c.name === "rfq_leads_partner_id_fkey"), "BASELINE must not have rfq_leads_partner_id_fkey");
  assert.ok(!baselineRfq.explicitIndexes.some(i => i.name === "idx_rfq_leads_offer"), "BASELINE must not have idx_rfq_leads_offer");
  assert.ok(!baselineRfq.explicitIndexes.some(i => i.name === "idx_rfq_leads_partner"), "BASELINE must not have idx_rfq_leads_partner");

  // PREVIOUS (post-0001) HAS all five RFQ objects added by 0001_rfq_workflow_hardening
  assert.ok(previousRfq.constraints.some(c => c.name === "rfq_leads_status_check"), "PREVIOUS must have rfq_leads_status_check");
  assert.ok(previousRfq.constraints.some(c => c.name === "rfq_leads_offer_id_fkey"), "PREVIOUS must have rfq_leads_offer_id_fkey");
  assert.ok(previousRfq.constraints.some(c => c.name === "rfq_leads_partner_id_fkey"), "PREVIOUS must have rfq_leads_partner_id_fkey");
  assert.ok(previousRfq.explicitIndexes.some(i => i.name === "idx_rfq_leads_offer"), "PREVIOUS must have idx_rfq_leads_offer");
  assert.ok(previousRfq.explicitIndexes.some(i => i.name === "idx_rfq_leads_partner"), "PREVIOUS must have idx_rfq_leads_partner");

  // PRODUCTION (post-0002) rfq_leads is identical to PREVIOUS — 0002 adds no new rfq objects
  assert.strictEqual(productionRfq.constraints.length, previousRfq.constraints.length, "PRODUCTION rfq_leads constraints count must equal PREVIOUS");
  assert.strictEqual(productionRfq.explicitIndexes.length, previousRfq.explicitIndexes.length, "PRODUCTION rfq_leads index count must equal PREVIOUS");
});
