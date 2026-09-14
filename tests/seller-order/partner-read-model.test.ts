import test from "node:test";
import assert from "node:assert/strict";
import { deriveEffectiveStatus } from "../../src/lib/partner-orders/read-model";

test("deriveEffectiveStatus - SLA Logic", async (t) => {
  await t.test("Pending + Before Expires At -> Pending / Actionable", () => {
    const expiresAt = new Date("2026-09-15T12:00:00Z");
    const serverNow = new Date("2026-09-15T10:00:00Z");
    
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "pending_decision");
    assert.equal(result.decisionWindowOpen, true);
  });

  await t.test("Pending + Exactly At Expires At -> Expired / Non-Actionable", () => {
    const expiresAt = new Date("2026-09-15T12:00:00Z");
    const serverNow = new Date("2026-09-15T12:00:00Z");
    
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "expired");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("Pending + After Expires At -> Expired / Non-Actionable", () => {
    const expiresAt = new Date("2026-09-15T12:00:00Z");
    const serverNow = new Date("2026-09-15T14:00:00Z");
    
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "expired");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("Persisted Expired -> Expired", () => {
    const expiresAt = new Date("2026-09-15T12:00:00Z");
    const serverNow = new Date("2026-09-15T10:00:00Z"); // Time doesn't matter if already expired
    
    const result = deriveEffectiveStatus("expired", "expired", expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "expired");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("Persisted Accepted -> Accepted", () => {
    const expiresAt = new Date("2026-09-15T12:00:00Z");
    const serverNow = new Date("2026-09-15T10:00:00Z");
    
    const result = deriveEffectiveStatus("seller_accepted", "seller_accepted", expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "accepted");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("Persisted Rejected -> Rejected", () => {
    const expiresAt = new Date("2026-09-15T12:00:00Z");
    const serverNow = new Date("2026-09-15T10:00:00Z");
    
    const result = deriveEffectiveStatus("seller_rejected", "seller_rejected", expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "rejected");
    assert.equal(result.decisionWindowOpen, false);
  });
});
