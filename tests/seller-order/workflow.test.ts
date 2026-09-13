import test from "node:test";
import assert from "node:assert/strict";
import { isSellerOrderContractFormed, isSellerOrderFulfillmentEligible } from "../../src/lib/seller-order/seller-order-workflow";

test("N. contract formed helper true only after accepted state", () => {
  const soPending = { status: "submitted" };
  const decPending = { decisionStatus: "pending_seller_review", acceptedAt: null, decidedByAuthUserId: null, decisionSource: null };
  assert.equal(isSellerOrderContractFormed(soPending, decPending), false);

  const soAccepted = { status: "seller_accepted" };
  const decAccepted = { decisionStatus: "seller_accepted", acceptedAt: new Date(), decidedByAuthUserId: "123", decisionSource: "partner_portal" };
  assert.equal(isSellerOrderContractFormed(soAccepted, decAccepted), true);
  
  const soAcceptedIncomplete = { status: "seller_accepted" };
  const decAcceptedIncomplete = { decisionStatus: "seller_accepted", acceptedAt: null, decidedByAuthUserId: "123", decisionSource: "partner_portal" };
  assert.equal(isSellerOrderContractFormed(soAcceptedIncomplete, decAcceptedIncomplete as { decisionStatus: string; acceptedAt: Date | null; decidedByAuthUserId: string | null; decisionSource: string | null; }), false);
});

test("O. fulfillment eligibility false before E7", () => {
  const soPending = { status: "submitted" };
  const decPending = { decisionStatus: "pending_seller_review", acceptedAt: null, decidedByAuthUserId: null, decisionSource: null };
  assert.equal(isSellerOrderFulfillmentEligible(soPending, decPending), false);
});

test("P. fulfillment eligibility true only after canonical accepted state", () => {
  const soAccepted = { status: "seller_accepted" };
  const decAccepted = { decisionStatus: "seller_accepted", acceptedAt: new Date(), decidedByAuthUserId: "123", decisionSource: "partner_portal" };
  assert.equal(isSellerOrderFulfillmentEligible(soAccepted, decAccepted), true);
});
