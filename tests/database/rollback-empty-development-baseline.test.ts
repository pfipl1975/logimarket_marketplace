import { test } from "node:test";
import assert from "node:assert";
import { executeRollback } from "../../scripts/database/rollback-empty-development-baseline";

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
  
  // No CASCADE
  for (const q of queries) {
    assert.ok(!q.includes("CASCADE"), `Query contains CASCADE: ${q}`);
  }

  // Exact 15 tables dropped
  assert.strictEqual(dropTables.length, 15);

  const tableOrder = dropTables.map(q => q.replace("DROP TABLE IF EXISTS public.", ""));

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
