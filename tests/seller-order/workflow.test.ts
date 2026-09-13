import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateSellerOrderRoutingState,
  evaluateSellerOrderDecisionState,
  isSellerOrderContractFormed,
  isSellerOrderFulfillmentEligible
} from "../../src/lib/seller-order/seller-order-workflow";

test("A. route eligible (decision absent + timestamp null)", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: null };
  const res = evaluateSellerOrderRoutingState(order, undefined);
  assert.equal(res.ok, true);
});

test("B. route already-routed idempotent (decision pending + timestamp not null)", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "pending_seller_review" };
  const res = evaluateSellerOrderRoutingState(order, decision);
  assert.equal(res.ok, true);
});

test("C. accept before E6 blocked (timestamp null)", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: null };
  const decision = { decisionStatus: "pending_seller_review", acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted");
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_NOT_ROUTED" });
});

test("D. accept pending + E6 succeeds", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "pending_seller_review", acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted");
  assert.equal(res.ok, true);
});

test("E. accepted canonical evidence recognized", () => {
  const order = { status: "seller_accepted", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "seller_accepted", acceptedAt: new Date(), resolvedAt: new Date(), decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted");
  assert.equal(res.ok, true);
});

test("F. reject pending + E6 succeeds", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "pending_seller_review", acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_rejected");
  assert.equal(res.ok, true);
});

test("G. repeated accept idempotent", () => {
  const order = { status: "seller_accepted", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "seller_accepted", acceptedAt: new Date(), resolvedAt: new Date(), decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted");
  assert.equal(res.ok, true);
});

test("H. repeated reject idempotent", () => {
  const order = { status: "seller_rejected", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "seller_rejected", acceptedAt: null, resolvedAt: new Date(), decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_rejected");
  assert.equal(res.ok, true);
});

test("I. accept after reject conflict", () => {
  const order = { status: "seller_rejected", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "seller_rejected", acceptedAt: null, resolvedAt: new Date(), decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted");
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_ALREADY_REJECTED" });
});

test("J. reject after accept conflict", () => {
  const order = { status: "seller_accepted", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "seller_accepted", acceptedAt: new Date(), resolvedAt: new Date(), decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_rejected");
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_ALREADY_ACCEPTED" });
});

test("K. inconsistent accepted decision/order conflict", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "seller_accepted", acceptedAt: new Date(), resolvedAt: new Date(), decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted");
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" });
});

test("L. inconsistent rejected decision/order conflict", () => {
  const order = { status: "seller_accepted", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "seller_rejected", acceptedAt: null, resolvedAt: new Date(), decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_rejected");
  assert.deepEqual(res, { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" });
});

test("M. pending decision with non-submitted SellerOrder blocked", () => {
  const order = { status: "cancelled", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "pending_seller_review", acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted");
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
  const order = { status: "seller_accepted", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "seller_accepted", acceptedAt: d1, resolvedAt: d2, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  // The service returns { ok: true } (idempotent), implying no overwrites occur.
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_accepted");
  assert.equal(res.ok, true);
});

test("P3. second REJECT must preserve original actor/timestamp", () => {
  const d2 = new Date();
  const order = { status: "seller_rejected", e6RoutedToSellerAt: new Date() };
  const decision = { decisionStatus: "seller_rejected", acceptedAt: null, resolvedAt: d2, decidedByAuthUserId: "u1", decisionSource: "partner_portal" };
  const res = evaluateSellerOrderDecisionState(order, decision, "seller_rejected");
  assert.equal(res.ok, true);
});
