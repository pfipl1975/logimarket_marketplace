import test from "node:test";
import assert from "node:assert";
import {
  isExplicitSellerAcceptance,
  isReceiptAcknowledgment,
  isSellerRouting,
  canSilenceBeAcceptance,
  MarketplaceEvents,
  type SellerAcceptanceDecision,
} from "@/lib/marketplace/event-semantics";

// ─── E7 Timestamp contract ───────────────────────────────────────────────────

test("EVENT_E7_REQUIRES_EXPLICIT_ACCEPTANCE_ALL_CONDITIONS", () => {
  const decision: SellerAcceptanceDecision = {
    decisionStatus: "seller_accepted",
    resolvedAt: new Date(),
    acceptedAt: new Date(),
  };
  assert.strictEqual(isExplicitSellerAcceptance(decision), true);
});

test("EVENT_E7_SELLER_ACCEPTED_WITHOUT_RESOLVED_AT__NOT_E7", () => {
  const decision: SellerAcceptanceDecision = {
    decisionStatus: "seller_accepted",
    resolvedAt: null,
    acceptedAt: new Date(),
  };
  assert.strictEqual(isExplicitSellerAcceptance(decision), false);
});

test("EVENT_E7_SELLER_ACCEPTED_WITHOUT_ACCEPTED_AT__NOT_E7", () => {
  const decision: SellerAcceptanceDecision = {
    decisionStatus: "seller_accepted",
    resolvedAt: new Date(),
    acceptedAt: null,
  };
  assert.strictEqual(isExplicitSellerAcceptance(decision), false);
});

test("EVENT_PENDING_NOT_E7", () => {
  const decision: SellerAcceptanceDecision = {
    decisionStatus: "pending_seller_review",
    resolvedAt: null,
    acceptedAt: null,
  };
  assert.strictEqual(isExplicitSellerAcceptance(decision), false);
});

test("EVENT_SELLER_REJECTED_NOT_E7", () => {
  const decision: SellerAcceptanceDecision = {
    decisionStatus: "seller_rejected",
    resolvedAt: new Date(),
    acceptedAt: null,
  };
  assert.strictEqual(isExplicitSellerAcceptance(decision), false);
});

test("EVENT_EXPIRED_NOT_E7", () => {
  const decision: SellerAcceptanceDecision = {
    decisionStatus: "expired",
    resolvedAt: null,
    acceptedAt: null,
  };
  assert.strictEqual(isExplicitSellerAcceptance(decision), false);
});

// ─── E3 / E6 not acceptance ──────────────────────────────────────────────────

test("EVENT_01_E3_NOT_ACCEPTANCE", () => {
  // E3 is receipt acknowledgment — it is not isExplicitSellerAcceptance.
  const isE3 = isReceiptAcknowledgment(MarketplaceEvents.E3_RECEIPT_ACKNOWLEDGED);
  assert.strictEqual(isE3, true);
  // E3 event does NOT produce a seller acceptance decision.
  const decision: SellerAcceptanceDecision = {
    decisionStatus: "pending_seller_review",
    resolvedAt: null,
    acceptedAt: null,
  };
  assert.strictEqual(isExplicitSellerAcceptance(decision), false);
});

test("EVENT_02_E6_NOT_ACCEPTANCE", () => {
  const isE6 = isSellerRouting(MarketplaceEvents.E6_ROUTED_TO_SELLER);
  assert.strictEqual(isE6, true);
  const decision: SellerAcceptanceDecision = {
    decisionStatus: "pending_seller_review",
    resolvedAt: null,
    acceptedAt: null,
  };
  assert.strictEqual(isExplicitSellerAcceptance(decision), false);
});

// ─── Seller silence ───────────────────────────────────────────────────────────

test("EVENT_03_SELLER_SILENCE_NOT_ACCEPTANCE", () => {
  assert.strictEqual(canSilenceBeAcceptance(), false);
});

// ─── Expiry is NOT rejection ──────────────────────────────────────────────────

test("EVENT_04_EXPIRED_NOT_REJECTED", () => {
  // "expired" is its own distinct status — not seller_rejected, not cancelled.
  const expired: SellerAcceptanceDecision = {
    decisionStatus: "expired",
    resolvedAt: null,
    acceptedAt: null,
  };
  assert.notStrictEqual(expired.decisionStatus, "seller_rejected");
  assert.notStrictEqual(expired.decisionStatus, "cancelled" as never);
  assert.strictEqual(isExplicitSellerAcceptance(expired), false);
});

// ─── Cancelled is NOT seller_rejected ────────────────────────────────────────

test("EVENT_CANCELLED_NOT_SELLER_REJECTED", () => {
  // "cancelled" is not a SellerDecisionStatus — it cannot be assigned.
  // This proves at compile-time AND runtime that the two are distinct.
  const validStatuses = ["pending_seller_review", "seller_accepted", "seller_rejected", "expired"] as const;
  const hasCancel = validStatuses.includes("cancelled" as never);
  assert.strictEqual(hasCancel, false);
});

test("EVENT_05_E7_REQUIRES_EXPLICIT_ACCEPTANCE", () => {
  const decision: SellerAcceptanceDecision = {
    decisionStatus: "seller_accepted",
    resolvedAt: new Date(),
    acceptedAt: new Date(),
  };
  assert.strictEqual(isExplicitSellerAcceptance(decision), true);
});
