import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  buildBuyerOrderList,
  SELLER_DECISION_STATUSES,
  SELLER_ORDER_STATUSES,
  type BuyerOrderReadRow,
} from "../../src/lib/buyer-orders/read-model-core";

const CREATED = new Date("2026-09-15T12:00:00.000Z");

function row(
  sellerOrderId: number | null,
  sellerOrderStatus: string | null,
  decisionStatus: string | null,
  orderId = 42,
  createdAt = CREATED,
): BuyerOrderReadRow {
  return { orderId, createdAt, sellerOrderId, sellerOrderStatus, decisionStatus };
}

test("zero SellerOrders has zero seller and decision counts", () => {
  const [order] = buildBuyerOrderList([row(null, null, null)]);
  assert.strictEqual(order.sellerOrderCount, 0);
  assert.deepStrictEqual(Object.values(order.decisions), [0, 0, 0, 0, 0, 0]);
});

test("one canonical decision is counted without using parent status", () => {
  const [order] = buildBuyerOrderList([row(7, "seller_accepted", "seller_accepted")]);
  assert.strictEqual(order.sellerOrderCount, 1);
  assert.strictEqual(order.decisions.seller_accepted, 1);
  assert.strictEqual(order.decisions.seller_rejected, 0);
  assert.deepStrictEqual(Object.keys(order).sort(), ["createdAt", "decisions", "orderId", "sellerOrderCount"]);
});

test("mixed canonical decisions are independent and none is discarded", () => {
  assert.deepStrictEqual(SELLER_DECISION_STATUSES, [
    "pending_seller_review", "seller_accepted", "seller_rejected", "expired",
  ]);
  const rows = SELLER_DECISION_STATUSES.map((status, index) =>
    row(index + 1, status === "pending_seller_review" ? "submitted" : status, status),
  );
  const [order] = buildBuyerOrderList(rows);
  assert.strictEqual(order.sellerOrderCount, 4);
  for (const status of SELLER_DECISION_STATUSES) {
    assert.strictEqual(order.decisions[status], 1);
  }
  assert.strictEqual(Object.values(order.decisions).reduce((sum, count) => sum + count, 0), 4);
});

test("all seven schema SellerOrder statuses are recognized without inventing a parent lifecycle", () => {
  assert.deepStrictEqual(SELLER_ORDER_STATUSES, [
    "submitted", "seller_accepted", "fulfillment_in_progress", "fulfilled",
    "seller_rejected", "cancelled", "expired",
  ]);
  const statuses: Array<[string, string | null]> = [
    ["submitted", null],
    ["seller_accepted", "seller_accepted"],
    ["fulfillment_in_progress", "seller_accepted"],
    ["fulfilled", "seller_accepted"],
    ["seller_rejected", "seller_rejected"],
    ["cancelled", null],
    ["expired", "expired"],
  ];
  const [order] = buildBuyerOrderList(statuses.map(([status, decision], index) =>
    row(index + 1, status, decision),
  ));
  assert.strictEqual(order.sellerOrderCount, 7);
  assert.strictEqual(order.decisions.seller_accepted, 3);
  assert.strictEqual(order.decisions.seller_rejected, 1);
  assert.strictEqual(order.decisions.expired, 1);
  assert.strictEqual(order.decisions.not_routed, 1);
  assert.strictEqual(order.decisions.unavailable, 1);
  assert.strictEqual(Object.values(order.decisions).reduce((sum, count) => sum + count, 0), 7);
});

test("missing decision is explicit; impossible statuses fail closed", () => {
  assert.strictEqual(buildBuyerOrderList([row(1, "submitted", null)])[0].decisions.not_routed, 1);
  assert.strictEqual(buildBuyerOrderList([row(1, "cancelled", null)])[0].decisions.unavailable, 1);
  assert.throws(() => buildBuyerOrderList([row(1, "unrecognized", null)]), /Unknown SellerOrder status/);
  assert.throws(() => buildBuyerOrderList([row(1, "submitted", "unrecognized")]), /Unknown seller decision status/);
  assert.throws(() => buildBuyerOrderList([row(null, null, "seller_accepted")]), /without a SellerOrder/);
});

test("newest-first sorting is deterministic and does not mutate source rows", () => {
  const oldDate = new Date("2026-01-01T00:00:00.000Z");
  const sameDate = new Date("2026-02-01T00:00:00.000Z");
  const rows = Object.freeze([
    Object.freeze(row(null, null, null, 3, oldDate)),
    Object.freeze(row(null, null, null, 1, sameDate)),
    Object.freeze(row(null, null, null, 2, sameDate)),
  ]);
  const orderIdsBefore = rows.map((source) => source.orderId);
  const result = buildBuyerOrderList(rows);
  assert.deepStrictEqual(result.map((order) => order.orderId), [2, 1, 3]);
  assert.deepStrictEqual(rows.map((source) => source.orderId), orderIdsBefore);
  assert.notStrictEqual(result[0].createdAt, sameDate);
});

test("presentation projects only safe list fields from a source carrying extra data", () => {
  const source = {
    ...row(1, "seller_accepted", "seller_accepted"),
    buyerAuthUserId: "11111111-1111-4111-8111-111111111111",
    sessionHash: "private-session",
    email: "private@example.com",
    nip: "1234567890",
    company: "Private Buyer Ltd",
    legalContextSnapshotId: 99,
  };
  const [order] = buildBuyerOrderList([source]);
  const serialized = JSON.stringify(order);
  assert.deepStrictEqual(Object.keys(order).sort(), ["createdAt", "decisions", "orderId", "sellerOrderCount"]);
  for (const forbidden of ["buyerAuthUserId", "sessionHash", "private-session", "private@example.com", "1234567890", "Private Buyer Ltd", "legalContextSnapshotId"]) {
    assert.strictEqual(serialized.includes(forbidden), false);
  }
});