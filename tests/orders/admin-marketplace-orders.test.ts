import test from "node:test";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  ADMIN_ORDER_LIFECYCLES, deriveAdminSellerLifecycle, projectAdminOrders, projectAdminOrderDetail,
  adminOrdersPagination, adminOrdersSearchPredicate, getAdminMarketplaceOrderDetailReadModel,
  type AdminOrderDetailParentRow, type AdminSellerOrderRow, type AdminOrderItemRow,
} from "../../src/lib/admin/orders-read-model-core";
import { isCanonicalPositiveInteger } from "../../src/lib/admin/orders-query";

const now = new Date("2026-10-01T12:00:00Z");
const routedAt = new Date("2026-10-01T11:00:00Z");
const expiresAt = new Date("2026-10-02T11:00:00Z");
const parent: AdminOrderDetailParentRow = { id: 12, createdAt: now, status: "checkout_submitted",
  buyerBusinessName: "Immutable Buyer Ltd", e2BuyerIntentAt: now, customerPoNumber: "PO-12", buyerCountry: "PL", buyerTaxIdentifier: "1234567890" };
function seller(id: number, status: string, decisionStatus: string | null): AdminSellerOrderRow {
  const resolved = decisionStatus !== null && decisionStatus !== "pending_seller_review";
  const byPartner = decisionStatus === "seller_accepted" || decisionStatus === "seller_rejected";
  return { id, marketplaceOrderId: parent.id, partnerId: id + 100, status, decisionStatus,
    sellerLegalName: "Immutable Seller " + id, sellerDisplayName: "Seller " + id,
    routedAt: decisionStatus === null ? null : routedAt, expiresAt: decisionStatus === null ? null : expiresAt,
    resolvedAt: resolved ? now : null, acceptedAt: decisionStatus === "seller_accepted" ? now : null,
    decidedByAuthUserId: byPartner ? "fixture-partner-user" : null, decisionSource: byPartner ? "partner_portal" : null };
}
const rows = [
  seller(1, "submitted", null), seller(2, "submitted", "pending_seller_review"),
  seller(3, "seller_accepted", "seller_accepted"), seller(4, "fulfillment_in_progress", "seller_accepted"),
  seller(5, "fulfilled", "seller_accepted"), seller(6, "seller_rejected", "seller_rejected"),
  seller(7, "expired", "expired"), seller(8, "cancelled", null), seller(9, "unexpected", null),
];
function item(sellerOrderId: number, currency = "PLN"): AdminOrderItemRow {
  return { id: sellerOrderId, sellerOrderId, offerTitle: "Immutable offer " + sellerOrderId, quantity: 1, unitPrice: "1499.00", currency };
}
for (const [index, lifecycle] of ADMIN_ORDER_LIFECYCLES.entries()) {
  test(lifecycle + " is exclusive and counted exactly once", () => {
    assert.equal(deriveAdminSellerLifecycle(rows[index], now), lifecycle);
    const [result] = projectAdminOrders([parent], [rows[index]], now);
    assert.equal(result.lifecycleCounts[lifecycle], 1);
    assert.equal(result.sellerOrderCount, 1);
    assert.equal(Object.values(result.lifecycleCounts).reduce((a, b) => a + b, 0), 1);
  });
}
test("zero sellers is an explicit bounded parent; multi-seller counts retain one row per parent", () => {
  const empty = projectAdminOrders([parent], [], now);
  assert.equal(empty.length, 1); assert.equal(empty[0].sellerOrderCount, 0);
  const second = { ...parent, id: 13 };
  const result = projectAdminOrders([second, parent], [...rows, { ...rows[0], id: 10, marketplaceOrderId: 13 }], now);
  assert.deepEqual(result.map(row => row.id), [13, 12]);
  assert.equal(result[1].sellerOrderCount, 9);
  assert.deepEqual(Object.values(result[1].lifecycleCounts), Array(9).fill(1));
  assert.equal(Object.values(result[1].lifecycleCounts).reduce((a, b) => a + b, 0), result[1].sellerOrderCount);
});
test("inconsistent evidence stays invalid, including acceptance without canonical E7", () => {
  for (const patch of [{ acceptedAt: null }, { resolvedAt: null }, { decidedByAuthUserId: null }, { decisionSource: null }, { routedAt: null }]) {
    assert.equal(deriveAdminSellerLifecycle({ ...rows[2], ...patch }, now), "invalid_order_state");
  }
  assert.equal(deriveAdminSellerLifecycle({ ...rows[1], acceptedAt: now }, now), "invalid_order_state");
  assert.equal(deriveAdminSellerLifecycle({ ...rows[1], status: "fulfilled" }, now), "invalid_order_state");
  assert.equal(deriveAdminSellerLifecycle({ ...rows[0], routedAt }, now), "invalid_order_state");
  assert.equal(deriveAdminSellerLifecycle({ ...rows[2], sellerLegalName: null }, now), "invalid_order_state");
  assert.equal(deriveAdminSellerLifecycle(rows[1], expiresAt), "expired");
});
test("unknown parent state, duplicate IDs and foreign ownership fail closed", () => {
  assert.throws(() => projectAdminOrders([{ ...parent, status: "unknown" }], [], now));
  assert.throws(() => projectAdminOrders([parent, parent], [], now));
  assert.throws(() => projectAdminOrders([parent], [rows[0], rows[0]], now));
  assert.throws(() => projectAdminOrders([parent], [{ ...rows[0], marketplaceOrderId: 999 }], now));
});
test("canonical detail uses immutable identities and separates SellerOrder items and E6/E7 evidence", () => {
  const result = projectAdminOrderDetail(parent, [rows[0], rows[4]], [item(1), item(5, "EUR")], now);
  assert.equal(result.id, 12); assert.equal(result.recordState, "checkout_submitted");
  assert.equal(result.buyerBusinessName, "Immutable Buyer Ltd"); assert.equal(result.customerPoNumber, "PO-12");
  assert.equal(result.e2BuyerIntentAt, now.toISOString());
  assert.equal(result.sellerOrders.length, 2);
  assert.equal(result.sellerOrders[0].lifecycle, "not_routed");
  assert.equal(result.sellerOrders[0].decisionState, "none");
  assert.equal(result.sellerOrders[0].routedAt, null);
  const fulfilled = result.sellerOrders[1];
  assert.equal(fulfilled.lifecycle, "fulfilled"); assert.equal(fulfilled.sellerLegalName, "Immutable Seller 5");
  assert.equal(fulfilled.sellerDisplayName, "Seller 5"); assert.equal(fulfilled.partnerId, 105);
  assert.equal(fulfilled.routedAt, routedAt.toISOString()); assert.equal(fulfilled.expiresAt, expiresAt.toISOString());
  assert.equal(fulfilled.decisionState, "seller_accepted"); assert.equal(fulfilled.resolvedAt, now.toISOString());
  assert.equal(fulfilled.acceptedAt, now.toISOString());
  assert.deepEqual(fulfilled.items, [{ id: 5, offerTitle: "Immutable offer 5", quantity: 1, unitPrice: "1499.00", currency: "EUR" }]);
  assert.equal(result.sellerOrders[0].items[0].currency, "PLN");
  assert.ok(!JSON.stringify(result).includes("fixture-partner-user"));
});
test("detail rejects empty items, mixed currencies, missing seller snapshot and cross-associated items", () => {
  assert.throws(() => projectAdminOrderDetail(parent, [rows[4]], [], now));
  assert.throws(() => projectAdminOrderDetail(parent, [rows[4]], [item(5), { ...item(5, "EUR"), id: 50 }], now));
  assert.throws(() => projectAdminOrderDetail(parent, [{ ...rows[4], sellerLegalName: null }], [item(5)], now));
  assert.throws(() => projectAdminOrderDetail(parent, [rows[4]], [item(1)], now));
  assert.throws(() => projectAdminOrderDetail(parent, [rows[4]], [item(5), item(5)], now));
  for (const patch of [{ unitPrice: "NaN" }, { quantity: 0 }, { currency: "pln" }]) {
    assert.throws(() => projectAdminOrderDetail(parent, [rows[4]], [{ ...item(5), ...patch }], now));
  }
});
test("bounded pagination clamps pages and retains 25 entries per page", () => {
  assert.deepEqual(adminOrdersPagination(0, 1), { totalPages: 1, currentPage: 1, offset: 0 });
  assert.deepEqual(adminOrdersPagination(51, 2), { totalPages: 3, currentPage: 2, offset: 25 });
  assert.deepEqual(adminOrdersPagination(51, 999), { totalPages: 3, currentPage: 3, offset: 50 });
});
test("parent ordering is newest first with descending ID ties", () => {
  const newer = { ...parent, id: 1, createdAt: new Date("2026-10-02T12:00:00Z") };
  const tie = { ...parent, id: 13 };
  assert.deepEqual(projectAdminOrders([parent, newer, tie], [], now).map(row => row.id), [1, 13, 12]);
});
test("search compiles only numeric parent ID or literal Buyer business name, excluding PII", () => {
  const dialect = new PgDialect();
  const id = dialect.sqlToQuery(adminOrdersSearchPredicate("12")!);
  assert.match(id.sql, /"marketplace_orders"."id" =/); assert.deepEqual(id.params, [12]);
  const name = dialect.sqlToQuery(adminOrdersSearchPredicate("ACME_%")!);
  assert.match(name.sql, /"buyer_legal_context_snapshots"."business_name" ilike/);
  assert.deepEqual(name.params, ["%ACME\\_\\%%"]);
  for (const q of ["contact@example.invalid", "123-456", "message", "sessionHash"]) {
    const query = dialect.sqlToQuery(adminOrdersSearchPredicate(q)!);
    assert.match(query.sql, /"business_name"/);
    assert.doesNotMatch(query.sql, /email|phone|message|session_hash|address/);
  }
  assert.equal(adminOrdersSearchPredicate(""), undefined);
});
test("invalid IDs are rejected; absent parent returns null without fetching children", async () => {
  for (const value of ["0", "-1", "01", "1.2", "x", "9007199254740992"]) assert.equal(isCanonicalPositiveInteger(value), false);
  assert.equal(isCanonicalPositiveInteger("12"), true);
  let selects = 0;
  const tx = {
    select() {
      selects++;
      return { from: () => ({ leftJoin: () => ({ where: () => ({ limit: async () => [] }) }) }) };
    },
  };
  const db = { transaction: async (fn: (value: typeof tx) => unknown) => fn(tx) };
  assert.equal(await getAdminMarketplaceOrderDetailReadModel(db as unknown as Parameters<typeof getAdminMarketplaceOrderDetailReadModel>[0], 999), null);
  assert.equal(selects, 1);
});
