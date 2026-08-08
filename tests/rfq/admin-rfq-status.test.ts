import test, { describe } from "node:test";
import assert from "node:assert";
import fs from "fs/promises";
import path from "path";
import { isRfqStatusTransitionAllowed } from "../../src/lib/rfq/workflow";

describe("Admin RFQ Status Workflow", async () => {
  test("transition matrix", () => {
    // new -> new, in_progress, responded, closed
    assert.ok(isRfqStatusTransitionAllowed("new", "new"));
    assert.ok(isRfqStatusTransitionAllowed("new", "in_progress"));
    assert.ok(isRfqStatusTransitionAllowed("new", "responded"));
    assert.ok(isRfqStatusTransitionAllowed("new", "closed"));

    // in_progress -> in_progress, responded, closed
    assert.ok(isRfqStatusTransitionAllowed("in_progress", "in_progress"));
    assert.ok(isRfqStatusTransitionAllowed("in_progress", "responded"));
    assert.ok(isRfqStatusTransitionAllowed("in_progress", "closed"));
    assert.ok(!isRfqStatusTransitionAllowed("in_progress", "new"));

    // responded -> responded, closed
    assert.ok(isRfqStatusTransitionAllowed("responded", "responded"));
    assert.ok(isRfqStatusTransitionAllowed("responded", "closed"));
    assert.ok(!isRfqStatusTransitionAllowed("responded", "new"));
    assert.ok(!isRfqStatusTransitionAllowed("responded", "in_progress"));

    // closed -> closed
    assert.ok(isRfqStatusTransitionAllowed("closed", "closed"));
    assert.ok(!isRfqStatusTransitionAllowed("closed", "new"));
    assert.ok(!isRfqStatusTransitionAllowed("closed", "in_progress"));
    assert.ok(!isRfqStatusTransitionAllowed("closed", "responded"));
  });

  test("mutateRfqStatus Server Action Contract", async () => {
    const actionPath = path.join(process.cwd(), "src/app/actions.ts");
    const sourceCode = await fs.readFile(actionPath, "utf-8");

    // Extract mutateRfqStatus body
    const mutateStart = sourceCode.indexOf("export async function mutateRfqStatus");
    assert.ok(mutateStart !== -1, "mutateRfqStatus is missing");
    
    // Find requireAdmin FIRST
    const requireAdminIdx = sourceCode.indexOf("await requireAdmin()", mutateStart);
    assert.ok(requireAdminIdx !== -1, "await requireAdmin() is missing");

    const parseIdx = sourceCode.indexOf("AdminRfqStatusMutationSchema.safeParse(rawInput)", mutateStart);
    assert.ok(parseIdx !== -1, "Missing Zod parsing");
    
    // REQUIRE: requireAdmin MUST be before Zod parsing
    assert.ok(requireAdminIdx < parseIdx, "requireAdmin MUST be called before Zod parsing");

    // Check transaction and FOR UPDATE
    const txIdx = sourceCode.indexOf("db.transaction(", mutateStart);
    assert.ok(txIdx !== -1, "db.transaction is missing");
    assert.ok(parseIdx < txIdx, "Parsing should happen before transaction");

    const forUpdateIdx = sourceCode.indexOf("FOR UPDATE", txIdx);
    assert.ok(forUpdateIdx !== -1, "FOR UPDATE lock is missing in transaction");

    // Check concurrency and idempotency checks in order
    const unchangedIdx = sourceCode.indexOf("UNCHANGED", forUpdateIdx);
    const conflictIdx = sourceCode.indexOf("CONFLICT", unchangedIdx);
    const transitionForbiddenIdx = sourceCode.indexOf("TRANSITION_NOT_ALLOWED", conflictIdx);
    
    assert.ok(unchangedIdx !== -1, "Idempotency check missing");
    assert.ok(conflictIdx !== -1, "Concurrency CONFLICT check missing");
    assert.ok(transitionForbiddenIdx !== -1, "Transition check missing");

    // Check status-only update
    const updateIdx = sourceCode.indexOf(".update(rfqLeads)", transitionForbiddenIdx);
    assert.ok(updateIdx !== -1, "Missing .update(rfqLeads)");
    const setIdx = sourceCode.indexOf(".set({ status: data.targetStatus })", updateIdx);
    assert.ok(setIdx !== -1, "Update must only target status");
  });
});
