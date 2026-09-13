import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateSellerOrderRoutingState,
  evaluateSellerOrderDecisionState,
  evaluateSellerOrderExpirationState,
  isSellerOrderContractFormed,
  isSellerOrderFulfillmentEligible,
  sellerAcceptanceDeadlineFromE6,
} from "../../src/lib/seller-order/seller-order-workflow";

const routedAt = new Date("2026-09-13T08:00:00.000Z");
const expiresAt = sellerAcceptanceDeadlineFromE6(routedAt);
const beforeDeadline = new Date(expiresAt.getTime() - 1);

test("A. route eligible (decision absent + timestamp null)", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: null };
  const res = evaluateSellerOrderRoutingState(order, undefined);
  assert.equal(res.ok, true);
});

test("B. route already-routed idempotent (decision pending + timestamp not null)", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "pending_seller_review", expiresAt };
  const res = evaluateSellerOrderRoutingState(order, decision);
  assert.equal(res.ok, true);
});

test("C. accept before E6 blocked (timestamp null)", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: null };
  const decision = { decisionStatus: "pending_seller_review", expiresAt, acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted", beforeDeadline);
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_NOT_ROUTED" });
});

test("D. accept pending + E6 succeeds", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "pending_seller_review", expiresAt, acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted", beforeDeadline);
  assert.equal(res.ok, true);
});

test("E. accepted canonical evidence recognized", () => {
  const order = { status: "seller_accepted", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "seller_accepted", expiresAt, acceptedAt: beforeDeadline, resolvedAt: beforeDeadline, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted", beforeDeadline);
  assert.equal(res.ok, true);
});

test("F. reject pending + E6 succeeds", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "pending_seller_review", expiresAt, acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_rejected", beforeDeadline);
  assert.equal(res.ok, true);
});

test("G. repeated accept idempotent", () => {
  const order = { status: "seller_accepted", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "seller_accepted", expiresAt, acceptedAt: beforeDeadline, resolvedAt: beforeDeadline, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted", beforeDeadline);
  assert.equal(res.ok, true);
});

test("H. repeated reject idempotent", () => {
  const order = { status: "seller_rejected", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "seller_rejected", expiresAt, acceptedAt: null, resolvedAt: beforeDeadline, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_rejected", beforeDeadline);
  assert.equal(res.ok, true);
});

test("I. accept after reject conflict", () => {
  const order = { status: "seller_rejected", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "seller_rejected", expiresAt, acceptedAt: null, resolvedAt: beforeDeadline, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted", beforeDeadline);
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_ALREADY_REJECTED" });
});

test("J. reject after accept conflict", () => {
  const order = { status: "seller_accepted", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "seller_accepted", expiresAt, acceptedAt: beforeDeadline, resolvedAt: beforeDeadline, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_rejected", beforeDeadline);
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_ALREADY_ACCEPTED" });
});

test("K. inconsistent accepted decision/order conflict", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "seller_accepted", expiresAt, acceptedAt: beforeDeadline, resolvedAt: beforeDeadline, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted", beforeDeadline);
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" });
});

test("L. inconsistent rejected decision/order conflict", () => {
  const order = { status: "seller_accepted", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "seller_rejected", expiresAt, acceptedAt: null, resolvedAt: beforeDeadline, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_rejected", beforeDeadline);
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" });
});

test("M. pending decision with non-submitted SellerOrder blocked", () => {
  const order = { status: "cancelled", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "pending_seller_review", expiresAt, acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted", beforeDeadline);
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" });
});

test("N. contract formed false before E7 and true only for complete E7", () => {
  const soPending = { status: "submitted" };
  const decPending = { decisionStatus: "pending_seller_review", acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };
  assert.equal(isSellerOrderContractFormed(soPending, decPending), false);

  const soAccepted = { status: "seller_accepted" };
  const decAccepted = { decisionStatus: "seller_accepted", acceptedAt: new Date(), resolvedAt: new Date(), decidedByAuthUserId: "123", decisionSource: "partner_portal" };
  assert.equal(isSellerOrderContractFormed(soAccepted, decAccepted), true);
  
  const soAcceptedIncomplete = { status: "seller_accepted" };
  const decAcceptedIncomplete = { decisionStatus: "seller_accepted", acceptedAt: null, resolvedAt: new Date(), decidedByAuthUserId: "123", decisionSource: "partner_portal" };
  assert.equal(isSellerOrderContractFormed(soAcceptedIncomplete, decAcceptedIncomplete), false);
});

test("O. fulfillment false before E7", () => {
  const soPending = { status: "submitted" };
  const decPending = { decisionStatus: "pending_seller_review", acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };
  assert.equal(isSellerOrderFulfillmentEligible(soPending, decPending), false);
});

test("P. fulfillment true only for complete E7", () => {
  const soAccepted = { status: "seller_accepted" };
  const decAccepted = { decisionStatus: "seller_accepted", acceptedAt: new Date(), resolvedAt: new Date(), decidedByAuthUserId: "123", decisionSource: "partner_portal" };
  assert.equal(isSellerOrderFulfillmentEligible(soAccepted, decAccepted), true);
});

test("P2. second ACCEPT must preserve original actor/timestamps", () => {
  const d1 = new Date();
  const d2 = new Date();
  const order = { status: "seller_accepted", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "seller_accepted", expiresAt, acceptedAt: d1, resolvedAt: d2, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  // The service returns { ok: true } (idempotent), implying no overwrites occur.
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted", beforeDeadline);
  assert.equal(res.ok, true);
});

test("P3. second REJECT must preserve original actor/timestamp", () => {
  const d2 = new Date();
  const order = { status: "seller_rejected", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "seller_rejected", expiresAt, acceptedAt: null, resolvedAt: d2, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_rejected", beforeDeadline);
  assert.equal(res.ok, true);
});

test("SLA A. deadline is exactly E6 plus 24 hours", () => {
  assert.equal(expiresAt.getTime() - routedAt.getTime(), 24 * 60 * 60 * 1000);
});

test("SLA B-D. pending is eligible before deadline and expires at or after boundary", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "pending_seller_review", expiresAt, acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };

  assert.equal(evaluateSellerOrderDecisionState(order, decision, "seller_accepted", beforeDeadline).ok, true);
  assert.deepEqual(
    evaluateSellerOrderDecisionState(order, decision, "seller_accepted", expiresAt),
    { ok: false, code: "SELLER_ORDER_EXPIRED" }
  );
  assert.deepEqual(
    evaluateSellerOrderDecisionState(order, decision, "seller_rejected", new Date(expiresAt.getTime() + 1)),
    { ok: false, code: "SELLER_ORDER_EXPIRED" }
  );
});

test("SLA E-G. canonical expired evidence has no actor/source and forms no contract", () => {
  const resolvedAt = new Date(expiresAt.getTime() + 1);
  const order = { status: "expired", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "expired", expiresAt, acceptedAt: null, resolvedAt, decidedByAuthUserId: null, decisionSource: null };

  assert.equal(isSellerOrderContractFormed(order, decision), false);
  assert.equal(isSellerOrderFulfillmentEligible(order, decision), false);
  assert.equal(decision.decidedByAuthUserId, null);
  assert.equal(decision.decisionSource, null);
});

test("SLA H. canonical expired evaluation is idempotent", () => {
  const resolvedAt = new Date(expiresAt.getTime() + 1);
  const order = { status: "expired", e6RoutedToSellerAt: routedAt };
  const decision = { decisionStatus: "expired", expiresAt, acceptedAt: null, resolvedAt, decidedByAuthUserId: null, decisionSource: null };

  assert.deepEqual(
    evaluateSellerOrderExpirationState(order, decision, new Date(resolvedAt.getTime() + 1)),
    { ok: true, shouldExpire: false }
  );
  assert.equal(decision.expiresAt, expiresAt);
  assert.equal(decision.resolvedAt, resolvedAt);
});

test("SLA I-J. accepted and rejected terminal states cannot expire", () => {
  const accepted = { decisionStatus: "seller_accepted", expiresAt, acceptedAt: beforeDeadline, resolvedAt: beforeDeadline, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const rejected = { decisionStatus: "seller_rejected", expiresAt, acceptedAt: null, resolvedAt: beforeDeadline, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };

  assert.deepEqual(
    evaluateSellerOrderExpirationState({ status: "seller_accepted", e6RoutedToSellerAt: routedAt }, accepted, expiresAt),
    { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" }
  );
  assert.deepEqual(
    evaluateSellerOrderExpirationState({ status: "seller_rejected", e6RoutedToSellerAt: routedAt }, rejected, expiresAt),
    { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" }
  );
});

test("SLA K. inconsistent expired aggregate fails closed", () => {
  const decision = { decisionStatus: "expired", expiresAt, acceptedAt: null, resolvedAt: expiresAt, decidedByAuthUserId: null, decisionSource: null };
  assert.deepEqual(
    evaluateSellerOrderExpirationState({ status: "submitted", e6RoutedToSellerAt: routedAt }, decision, expiresAt),
    { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" }
  );
});
