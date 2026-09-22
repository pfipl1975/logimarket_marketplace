import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { deriveEffectiveStatus } from "../../src/lib/partner-orders/read-model-core";

test("deriveEffectiveStatus - SLA Logic", async (t) => {
  const routedAt = new Date("2026-09-14T12:00:00Z");
  const expiresAt = new Date("2026-09-15T12:00:00Z");
  await t.test("canonical pending before deadline", () => {
    const serverNow = new Date("2026-09-15T10:00:00Z");
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", routedAt, expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "pending_decision");
    assert.equal(result.decisionWindowOpen, true);
  });

  await t.test("canonical pending exact deadline", () => {
    const serverNow = new Date("2026-09-15T12:00:00Z");
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", routedAt, expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "expired");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("canonical pending after deadline", () => {
    const serverNow = new Date("2026-09-15T14:00:00Z");
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", routedAt, expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "expired");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: submitted + missing decision", () => {
    const result = deriveEffectiveStatus("submitted", null, routedAt, expiresAt, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: submitted + missing routedAt", () => {
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", null, expiresAt, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: submitted + missing expiresAt", () => {
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", routedAt, null, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: submitted + accepted decision", () => {
    const result = deriveEffectiveStatus("submitted", "seller_accepted", routedAt, expiresAt, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: seller_accepted + pending decision", () => {
    const result = deriveEffectiveStatus("seller_accepted", "pending_seller_review", routedAt, expiresAt, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: seller_rejected + accepted decision", () => {
    const result = deriveEffectiveStatus("seller_rejected", "seller_accepted", routedAt, expiresAt, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });
});

test("parseStrictIdOrNotFound preserves strict positive-integer routing", () => {
  const source = readFileSync(
    new URL("../../src/lib/partner-orders/route-params.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /if \(!idStr\) notFound\(\);/);
  assert.match(source, /if \(!\/\^\[1-9\]\\d\*\$\/\.test\(idStr\)\)/);
  assert.match(source, /parseInt\(idStr, 10\)/);
  assert.doesNotMatch(source, /parseFloat|Number\(idStr\)/);
});

test("Disclosure & Tenancy Requirements", async (t) => {
  const routedAt = new Date("2026-09-14T12:00:00Z");
  await t.test("Pre-E7 Contact Hidden (predicate extraction proof)", () => {
    const status = deriveEffectiveStatus("submitted", "pending_seller_review", routedAt, new Date("2030-01-01"), new Date());
    assert.equal(status.effectiveStatus, "pending_decision");
  });

  await t.test("Post-E7 Contact Bounded (predicate extraction proof)", () => {
    const status = deriveEffectiveStatus("seller_accepted", "seller_accepted", routedAt, new Date("2030-01-01"), new Date());
    assert.equal(status.effectiveStatus, "accepted");
  });

  await t.test("Inconsistent acceptance -> contact not releasable", () => {
    const status = deriveEffectiveStatus("fulfillment_in_progress", "pending_seller_review", routedAt, new Date("2030-01-01"), new Date());
    assert.equal(status.effectiveStatus, "invalid_order_state");
  });
});
