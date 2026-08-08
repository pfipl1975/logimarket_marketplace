import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { inspect } from "node:util";
import { mutateRfqStatusCore, type RfqMutationTransaction } from "@/lib/rfq/admin-core";
import { AdminRfqStatusMutationSchema } from "@/lib/rfq/schema";

// ---------------------------------------------------------------------------
// Core Workflow Behavioral Tests
// ---------------------------------------------------------------------------
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
    const updateKeys = Object.keys(updates[0] as object);
    assert.strictEqual(updateKeys.length, 1);
    assert.strictEqual(updateKeys[0], "status");
    assert.strictEqual((updates[0] as Record<string, unknown>).status as string, "in_progress");

    // Check that transaction is used with FOR UPDATE
    assert.ok(executedQueries[0].includes("FOR UPDATE"), "SELECT must include FOR UPDATE locking");
  });
});

// ---------------------------------------------------------------------------
// AdminRfqStatusMutationSchema — invalid-input test matrix
// ---------------------------------------------------------------------------
test("AdminRfqStatusMutationSchema Invalid Input Validation", async (t) => {
  const validBase = { rfqId: 1, expectedStatus: "new", targetStatus: "in_progress" };

  await t.test("rfqId = 0 -> reject", () => {
    const res = AdminRfqStatusMutationSchema.safeParse({ ...validBase, rfqId: 0 });
    assert.strictEqual(res.success, false);
  });

  await t.test("rfqId negative -> reject", () => {
    const res = AdminRfqStatusMutationSchema.safeParse({ ...validBase, rfqId: -5 });
    assert.strictEqual(res.success, false);
  });

  await t.test("rfqId fraction -> reject", () => {
    const res = AdminRfqStatusMutationSchema.safeParse({ ...validBase, rfqId: 1.5 });
    assert.strictEqual(res.success, false);
  });

  await t.test("rfqId string -> reject (no coercion)", () => {
    const res = AdminRfqStatusMutationSchema.safeParse({ ...validBase, rfqId: "1" });
    assert.strictEqual(res.success, false);
  });

  await t.test("invalid expectedStatus -> reject", () => {
    const res = AdminRfqStatusMutationSchema.safeParse({ ...validBase, expectedStatus: "pending" });
    assert.strictEqual(res.success, false);
  });

  await t.test("invalid targetStatus -> reject", () => {
    const res = AdminRfqStatusMutationSchema.safeParse({ ...validBase, targetStatus: "open" });
    assert.strictEqual(res.success, false);
  });

  await t.test("valid input -> accept", () => {
    const res = AdminRfqStatusMutationSchema.safeParse(validBase);
    assert.ok(res.success);
    if (res.success) {
      assert.strictEqual(res.data.rfqId, 1);
      assert.strictEqual(res.data.expectedStatus, "new");
      assert.strictEqual(res.data.targetStatus, "in_progress");
    }
  });
});

// ---------------------------------------------------------------------------
// Server Action AUTH-FIRST Contract
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// safeParse failure -> VALIDATION_ERROR mapping contract
// ---------------------------------------------------------------------------
test("mutateRfqStatus safeParse failure -> VALIDATION_ERROR contract", async () => {
  const actionsPath = path.join(process.cwd(), "src/app/actions.ts");
  const sourceCode = fs.readFileSync(actionsPath, "utf-8");

  const mutateStart = sourceCode.indexOf("export async function mutateRfqStatus");
  assert.ok(mutateStart !== -1, "mutateRfqStatus not found");

  const mutateEnd = sourceCode.indexOf("export async function", mutateStart + 1);
  const mutateBlock = sourceCode.substring(mutateStart, mutateEnd === -1 ? undefined : mutateEnd);

  // safeParse must be present
  assert.ok(mutateBlock.includes(".safeParse("), "safeParse call not found");

  // On safeParse failure the action must return VALIDATION_ERROR
  const parsedFailureIdx = mutateBlock.indexOf("!parsed.success");
  assert.ok(parsedFailureIdx !== -1, "!parsed.success guard not found");

  const afterFailureGuard = mutateBlock.substring(parsedFailureIdx, parsedFailureIdx + 200);
  assert.ok(
    afterFailureGuard.includes("VALIDATION_ERROR"),
    "safeParse failure must return VALIDATION_ERROR"
  );
});
