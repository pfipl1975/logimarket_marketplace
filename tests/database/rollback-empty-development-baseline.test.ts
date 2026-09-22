import { test } from "node:test";
import assert from "node:assert";
import { executeRollback } from "../../scripts/database/rollback-empty-development-baseline";
import {
  EXPECTED_BASELINE_TABLES,
  EXPECTED_COUNTS,
  PRODUCTION_FINGERPRINT,
} from "../../scripts/database/runtime-migration-contract";

test("executeRollback drop order and statements", async () => {
  const queries: string[] = [];
  const fakeClient = {
    query: async (q: string) => {
      queries.push(q);
      return { rows: [] };
    }
  };

  await executeRollback(fakeClient as any);

  // 1. Transaction wrapper
  assert.strictEqual(queries[0], "BEGIN");
  assert.strictEqual(queries[queries.length - 1], "COMMIT");

  const dropTables = queries.filter(q => q.startsWith("DROP TABLE IF EXISTS public."));
  const cycleConstraintDrops = queries.filter(q => q.startsWith("ALTER TABLE public.") && q.includes("current_verification_event_id") && q.includes("DROP CONSTRAINT"));

  // No CASCADE
  for (const q of queries) {
    assert.ok(!q.includes("CASCADE"), `Query contains CASCADE: ${q}`);
  }

  assert.strictEqual(dropTables.length, EXPECTED_COUNTS.TABLES);
  assert.deepStrictEqual(cycleConstraintDrops, [
    "ALTER TABLE public.seller_legal_identities DROP CONSTRAINT IF EXISTS seller_legal_identities_current_verification_event_id_seller_verification_events_id_fk",
    "ALTER TABLE public.seller_tax_identifiers DROP CONSTRAINT IF EXISTS seller_tax_identifiers_current_verification_event_id_seller_verification_events_id_fk",
    "ALTER TABLE public.seller_registry_identifiers DROP CONSTRAINT IF EXISTS seller_registry_identifiers_current_verification_event_id_seller_verification_events_id_fk",
  ]);

  const dropSequences = queries.filter(q => q.startsWith("DROP SEQUENCE IF EXISTS public."));
  assert.strictEqual(dropSequences.length, EXPECTED_COUNTS.SEQUENCES);
  const expectedSequences = Array.from(new Set(
    EXPECTED_BASELINE_TABLES.flatMap(tableName =>
      PRODUCTION_FINGERPRINT[tableName].columns
        .map(column => column.sequenceName)
        .filter((sequenceName): sequenceName is string => sequenceName !== null)
    )
  ));
  assert.deepStrictEqual(
    dropSequences.map(q => q.replace("DROP SEQUENCE IF EXISTS public.", "")).sort(),
    expectedSequences.sort(),
    "rollback sequence membership must exactly match the authoritative fingerprint"
  );

  const tableOrder = dropTables.map(q => q.replace("DROP TABLE IF EXISTS public.", ""));
  assert.deepStrictEqual(
    [...tableOrder].sort(),
    [...EXPECTED_BASELINE_TABLES].sort(),
    "rollback table membership must exactly match the authoritative baseline"
  );

  // Helper to get index
  const indexOf = (t: string) => tableOrder.indexOf(t);

  // clicks przed offers
  assert.ok(indexOf("clicks") < indexOf("offers"));
  // clicks przed partners
  assert.ok(indexOf("clicks") < indexOf("partners"));
  // offer attribute tables przed offers
  assert.ok(indexOf("offer_attribute_values") < indexOf("offers"));
  assert.ok(indexOf("offer_attribute_option_values") < indexOf("offers"));
  // translations przed definitions/options
  assert.ok(indexOf("attribute_definition_translations") < indexOf("attribute_definitions"));
  assert.ok(indexOf("controlled_option_value_translations") < indexOf("controlled_option_values"));

  // Wszystkie FK child tables są przed parent tables
  assert.ok(indexOf("order_items") < indexOf("orders"));
  assert.ok(indexOf("order_items") < indexOf("offers"));
  assert.ok(indexOf("cart_items") < indexOf("offers"));
  assert.ok(indexOf("rfq_leads") < indexOf("offers"));
  assert.ok(indexOf("rfq_leads") < indexOf("partners"));
  assert.ok(indexOf("category_attribute_assignments") < indexOf("categories"));
  assert.ok(indexOf("category_attribute_assignments") < indexOf("attribute_definitions"));

  // post-0005 marketplace order domain: every FK child precedes its parent
  assert.ok(indexOf("seller_acceptance_decisions") < indexOf("seller_orders"));
  assert.ok(indexOf("seller_order_items") < indexOf("seller_orders"));
  assert.ok(indexOf("seller_order_items") < indexOf("offers"));
  assert.ok(indexOf("seller_order_seller_snapshots") < indexOf("seller_orders"));
  assert.ok(indexOf("seller_orders") < indexOf("marketplace_orders"));
  assert.ok(indexOf("seller_orders") < indexOf("partners"));
  assert.ok(indexOf("marketplace_order_seller_disclosures") < indexOf("marketplace_orders"));
  assert.ok(indexOf("marketplace_order_seller_disclosures") < indexOf("partners"));
  assert.ok(indexOf("marketplace_orders") < indexOf("buyer_legal_context_snapshots"));

  // post-0006 verification history: explicit cycle-breaking FKs first, then
  // the history child before each subject parent.
  const firstTableDropIdx = queries.indexOf(dropTables[0]);
  assert.ok(cycleConstraintDrops.every(q => queries.indexOf(q) < firstTableDropIdx));
  assert.ok(indexOf("seller_verification_events") < indexOf("seller_legal_identities"));
  assert.ok(indexOf("seller_verification_events") < indexOf("seller_tax_identifiers"));
  assert.ok(indexOf("seller_verification_events") < indexOf("seller_registry_identifiers"));

  // journal usuwany przed schema
  const journalTableIdx = queries.findIndex(q => q === `DROP TABLE IF EXISTS drizzle_runtime."__drizzle_migrations"`);
  const journalSchemaIdx = queries.findIndex(q => q === `DROP SCHEMA IF EXISTS drizzle_runtime`);
  assert.ok(journalTableIdx !== -1);
  assert.ok(journalSchemaIdx !== -1);
  assert.ok(journalTableIdx < journalSchemaIdx);

  // journal usuwany po tabelach
  const lastTableDropIdx = queries.indexOf(dropTables[dropTables.length - 1]);
  assert.ok(lastTableDropIdx < journalTableIdx);
});

test("executeRollback rolls back and never commits after destructive DDL failure", async () => {
  const queries: string[] = [];
  const fakeClient = {
    query: async (q: string) => {
      queries.push(q);
      if (q === "DROP TABLE IF EXISTS public.seller_orders") {
        throw new Error("EXPECTED_DDL_FAILURE");
      }
      return { rows: [] };
    }
  };

  await assert.rejects(() => executeRollback(fakeClient), /EXPECTED_DDL_FAILURE/);
  assert.strictEqual(queries[0], "BEGIN");
  assert.strictEqual(queries[queries.length - 1], "ROLLBACK");
  assert.ok(!queries.includes("COMMIT"));
});
