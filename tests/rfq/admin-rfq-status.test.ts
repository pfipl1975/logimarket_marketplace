import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { inspect } from "node:util";
import { mutateRfqStatusCore, type RfqMutationTransaction } from "@/lib/rfq/admin-core";

test("Admin RFQ Core Workflow Behavioral Tests", async (t) => {
  const createMockTx = (initialRows: unknown[]) => {
    const executedQueries: string[] = [];
    const updates: unknown[] = [];
    const tx: RfqMutationTransaction = {
      execute: async (query: unknown) => {
        // Just extract the raw string representation for test assertion
        executedQueries.push(inspect(query, { depth: 10 }));
        return { rows: initialRows } as { rows: unknown[] };
      },
      update: () => ({
        set: (values: unknown) => {
          updates.push(values);
          return {
            where: async () => {}
          };
        }
      })
    };
    return { tx, executedQueries, updates };
  };

  await t.test("missing row -> NOT_FOUND", async () => {
    const { tx, updates } = createMockTx([]);
    const res = await mutateRfqStatusCore(tx, { rfqId: 1, targetStatus: "in_progress", expectedStatus: "new" });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, "NOT_FOUND");
    assert.strictEqual(updates.length, 0);
  });

  await t.test("current === target -> UNCHANGED i brak UPDATE", async () => {
    const { tx, updates } = createMockTx([{ id: 1, status: "in_progress" }]);
    const res = await mutateRfqStatusCore(tx, { rfqId: 1, targetStatus: "in_progress", expectedStatus: "new" });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.code, "UNCHANGED");
    assert.strictEqual(updates.length, 0);
  });

  await t.test("current !== expectedStatus -> CONFLICT i brak UPDATE", async () => {
    const { tx, updates } = createMockTx([{ id: 1, status: "responded" }]);
    const res = await mutateRfqStatusCore(tx, { rfqId: 1, targetStatus: "closed", expectedStatus: "in_progress" });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, "CONFLICT");
    assert.strictEqual(updates.length, 0);
  });

  await t.test("forbidden forward/backward transition -> TRANSITION_NOT_ALLOWED i brak UPDATE", async () => {
    const { tx, updates } = createMockTx([{ id: 1, status: "closed" }]);
    const res = await mutateRfqStatusCore(tx, { rfqId: 1, targetStatus: "in_progress", expectedStatus: "closed" });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, "TRANSITION_NOT_ALLOWED");
    assert.strictEqual(updates.length, 0);
  });

  await t.test("valid transition -> UPDATED dokładnie jeden UPDATE (only status)", async () => {
    const { tx, executedQueries, updates } = createMockTx([{ id: 1, status: "new" }]);
    const res = await mutateRfqStatusCore(tx, { rfqId: 1, targetStatus: "in_progress", expectedStatus: "new" });
    
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.code, "UPDATED");
    
    // Exactly one update payload
    assert.strictEqual(updates.length, 1);
    
    // UPDATE changes only status
    const updateKeys = Object.keys(updates[0]);
    assert.strictEqual(updateKeys.length, 1);
    assert.strictEqual(updateKeys[0], "status");
    assert.strictEqual(updates[0].status as string, "in_progress");

    // Check that transaction is used with FOR UPDATE
    assert.ok(executedQueries[0].includes("FOR UPDATE"), "SELECT must include FOR UPDATE locking");
  });
});

test("mutateRfqStatus Server Action AUTH-FIRST Contract", async () => {
  const actionsPath = path.join(process.cwd(), "src/app/actions.ts");
  const sourceCode = fs.readFileSync(actionsPath, "utf-8");

  const mutateStart = sourceCode.indexOf("export async function mutateRfqStatus");
  assert.ok(mutateStart !== -1, "mutateRfqStatus not found");

  const requireAdminIdx = sourceCode.indexOf("await requireAdmin()", mutateStart);
  assert.ok(requireAdminIdx !== -1, "requireAdmin call is missing");

  const safeParseIdx = sourceCode.indexOf(".safeParse(", mutateStart);
  assert.ok(safeParseIdx !== -1, "Zod safeParse not found");

  const dbTxIdx = sourceCode.indexOf("db.transaction(", mutateStart);
  assert.ok(dbTxIdx !== -1, "db.transaction not found");

  assert.ok(requireAdminIdx < safeParseIdx, "requireAdmin() must execute BEFORE input parsing");
  assert.ok(requireAdminIdx < dbTxIdx, "requireAdmin() must execute BEFORE any database operations");
});
