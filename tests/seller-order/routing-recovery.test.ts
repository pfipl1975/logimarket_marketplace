import test from "node:test";
import assert from "node:assert/strict";
import { assessRoutingRecovery } from "../../src/lib/seller-order/routing-recovery";
import { parseRecoveryRequest } from "../../scripts/operations/recover-seller-order-routing";

const routedAt = new Date("2026-09-30T12:00:00Z");
const pending = { decisionStatus: "pending_seller_review", expiresAt: new Date(routedAt.getTime() + 86400000),
  acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null };

test("recovery accepts only fresh unrouted or complete canonical pending state", () => {
  assert.equal(assessRoutingRecovery({ status: "submitted", e6RoutedToSellerAt: null }, undefined), "SAFE_TO_ROUTE");
  assert.equal(assessRoutingRecovery({ status: "submitted", e6RoutedToSellerAt: routedAt }, pending), "ALREADY_ROUTED");
  for (const status of ["seller_accepted", "seller_rejected", "expired", "fulfilled"]) {
    assert.equal(assessRoutingRecovery({ status, e6RoutedToSellerAt: routedAt }, pending), "NOT_ELIGIBLE");
  }
});

test("recovery never fills partial decisions, rewrites actors or resets deadlines", () => {
  const order = { status: "submitted", e6RoutedToSellerAt: routedAt };
  assert.equal(assessRoutingRecovery(order, undefined), "CONFLICTING_STATE");
  assert.equal(assessRoutingRecovery({ ...order, e6RoutedToSellerAt: null }, pending), "CONFLICTING_STATE");
  for (const decision of [{ ...pending, expiresAt: null }, { ...pending, decisionStatus: "seller_accepted" },
    { ...pending, decidedByAuthUserId: "actor" }, { ...pending, acceptedAt: routedAt },
    { ...pending, expiresAt: routedAt }, { ...pending, resolvedAt: routedAt }, { ...pending, decisionSource: "partner_portal" }]) {
    assert.equal(assessRoutingRecovery(order, decision), "CONFLICTING_STATE");
  }
});

const args = ["--environment", "PRODUCTION", "--expected-host", "db.example.invalid", "--marketplace-order-id", "1", "--seller-order-id", "2"];
const env = { DATABASE_URL: "postgresql://test:synthetic@db.example.invalid/test" };
test("operations defaults to dry-run and requires an exact target-specific execution authorization", () => {
  assert.equal(parseRecoveryRequest(args, env).execute, false);
  assert.throws(() => parseRecoveryRequest([...args, "--execute"], env), /EXACT_OWNER_AUTHORIZATION_REQUIRED/);
  assert.equal(parseRecoveryRequest([...args, "--execute", "--authorization", "AUTHORIZE_E6_MARKETPLACE_ORDER_1_SELLER_ORDER_2"], env).execute, true);
  assert.throws(() => parseRecoveryRequest([...args, "--execute", "--authorization", "AUTHORIZE_E6_MARKETPLACE_ORDER_1_SELLER_ORDER_3"], env));
});
test("operations rejects unknown flags, duplicate IDs, mismatched hosts and shared writes", () => {
  assert.throws(() => parseRecoveryRequest([...args, "--seller-order-id", "3"], env));
  assert.throws(() => parseRecoveryRequest([...args, "--bulk", "true"], env));
  assert.throws(() => parseRecoveryRequest(args, { DATABASE_URL: "postgresql://test@other.example.invalid/test" }));
  const shared = args.map(value => value === "PRODUCTION" ? "SHARED_DEV" : value);
  assert.throws(() => parseRecoveryRequest([...shared, "--execute", "--authorization", "AUTHORIZE_E6_MARKETPLACE_ORDER_1_SELLER_ORDER_2"], env), /WRITES_FORBIDDEN/);
  const local = args.map(value => value === "PRODUCTION" ? "LOCAL" : value);
  assert.throws(() => parseRecoveryRequest([...local, "--execute", "--authorization", "AUTHORIZE_E6_MARKETPLACE_ORDER_1_SELLER_ORDER_2"], env), /LOCAL_TARGET_REQUIRED/);
});
