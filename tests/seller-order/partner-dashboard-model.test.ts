import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPartnerDashboardModel,
  DASHBOARD_STATUS_ORDER,
} from "../../src/lib/partner-dashboard/model-core";
import { formatPartnerOrderRemainingTime } from "../../src/lib/partner-orders/presentation";
import type {
  PartnerOrderEffectiveStatus,
  PartnerOrderListItem,
} from "../../src/lib/partner-orders/read-model";

const REFERENCE_NOW = new Date("2026-09-16T12:00:00.000Z");

function makeOrder(
  sellerOrderId: number,
  effectiveStatus: PartnerOrderEffectiveStatus,
  overrides: Partial<PartnerOrderListItem> = {}
): PartnerOrderListItem {
  const pending = effectiveStatus === "pending_decision";
  return {
    sellerOrderId,
    publicOrderReference: `ORD-SO-${sellerOrderId}`,
    createdAt: new Date("2026-09-16T08:00:00.000Z"),
    routedAt: new Date("2026-09-15T12:00:00.000Z"),
    expiresAt: pending ? new Date("2026-09-17T12:00:00.000Z") : null,
    serverNow: new Date(REFERENCE_NOW),
    persistedStatus: pending ? "submitted" : effectiveStatus,
    effectiveStatus,
    decisionWindowOpen: pending,
    buyerBusinessName: `Buyer ${sellerOrderId}`,
    currency: "PLN",
    orderTotal: `${sellerOrderId}.00`,
    itemCount: 1,
    ...overrides,
  };
}

function requireAvailable(
  result: ReturnType<typeof buildPartnerDashboardModel>
) {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("dashboard model unexpectedly unavailable");
  return result;
}

test("zero orders produce an honest 30-day empty dashboard", () => {
  const model = requireAvailable(buildPartnerDashboardModel([], REFERENCE_NOW));

  assert.deepEqual(model.kpis, { pending: 0, accepted: 0, rejected: 0, expired: 0 });
  assert.equal(model.activity.length, 30);
  assert.equal(model.activity[0].dateKey, "2026-08-18");
  assert.equal(model.activity[29].dateKey, "2026-09-16");
  assert.ok(model.activity.every((bucket) => bucket.count === 0));
  assert.ok(model.statusDistribution.every((entry) => entry.count === 0));
  assert.deepEqual(model.attention, []);
  assert.deepEqual(model.latest, []);
});

test("KPIs use exact current states without folding fulfillment into accepted", () => {
  const model = requireAvailable(
    buildPartnerDashboardModel(
      [
        makeOrder(1, "pending_decision"),
        makeOrder(2, "accepted"),
        makeOrder(3, "rejected"),
        makeOrder(4, "expired"),
        makeOrder(5, "fulfillment_in_progress"),
        makeOrder(6, "fulfilled"),
        makeOrder(7, "cancelled"),
      ],
      REFERENCE_NOW
    )
  );

  assert.deepEqual(model.kpis, { pending: 1, accepted: 1, rejected: 1, expired: 1 });
  assert.deepEqual(
    model.statusDistribution,
    DASHBOARD_STATUS_ORDER.map((status) => ({ status, count: 1 }))
  );
});

test("invalid effective state fails the complete dashboard closed", () => {
  const model = buildPartnerDashboardModel(
    [makeOrder(1, "invalid_order_state")],
    REFERENCE_NOW
  );

  assert.deepEqual(model, { ok: false });
});

test("30-day activity includes exact UTC boundaries and every zero day", () => {
  const model = requireAvailable(
    buildPartnerDashboardModel(
      [
        makeOrder(1, "accepted", { createdAt: new Date("2026-08-18T00:00:00.000Z") }),
        makeOrder(2, "accepted", { createdAt: new Date("2026-08-17T23:59:59.999Z") }),
        makeOrder(3, "accepted", { createdAt: new Date("2026-09-16T23:59:59.999Z") }),
        makeOrder(4, "accepted", { createdAt: new Date("2026-09-17T00:00:00.000Z") }),
      ],
      REFERENCE_NOW
    )
  );

  assert.equal(model.activity.length, 30);
  assert.deepEqual(
    model.activity.map((bucket) => bucket.dateKey),
    [...model.activity.map((bucket) => bucket.dateKey)].sort()
  );
  assert.equal(model.activity.find((bucket) => bucket.dateKey === "2026-08-18")?.count, 1);
  assert.equal(model.activity.find((bucket) => bucket.dateKey === "2026-09-16")?.count, 1);
  assert.equal(model.activity.reduce((sum, bucket) => sum + bucket.count, 0), 2);
});

test("attention contains only open pending decisions, earliest first, capped at five", () => {
  const items = Array.from({ length: 7 }, (_, index) =>
    makeOrder(index + 1, "pending_decision", {
      expiresAt: new Date(`2026-09-${23 - index}T12:00:00.000Z`),
    })
  );
  items.push(makeOrder(20, "accepted"));

  const model = requireAvailable(buildPartnerDashboardModel(items, REFERENCE_NOW));
  assert.deepEqual(model.attention.map((order) => order.sellerOrderId), [7, 6, 5, 4, 3]);
  assert.equal(model.attention.length, 5);
  assert.ok(model.attention.every((order) => order.decisionWindowOpen));
});

test("latest orders are deterministic, capped at five, and preserve per-order currencies", () => {
  const items = [
    makeOrder(1, "accepted", { createdAt: new Date("2026-09-10T10:00:00Z"), currency: "PLN", orderTotal: "10.10" }),
    makeOrder(2, "accepted", { createdAt: new Date("2026-09-12T10:00:00Z"), currency: "EUR", orderTotal: "20.20" }),
    makeOrder(3, "accepted", { createdAt: new Date("2026-09-12T10:00:00Z"), currency: "USD", orderTotal: "30.30" }),
    makeOrder(4, "accepted", { createdAt: new Date("2026-09-13T10:00:00Z") }),
    makeOrder(5, "accepted", { createdAt: new Date("2026-09-14T10:00:00Z") }),
    makeOrder(6, "accepted", { createdAt: new Date("2026-09-15T10:00:00Z") }),
  ];
  const sourceOrder = items.map((item) => item.sellerOrderId);

  const model = requireAvailable(buildPartnerDashboardModel(items, REFERENCE_NOW));

  assert.deepEqual(model.latest.map((order) => order.sellerOrderId), [6, 5, 4, 3, 2]);
  assert.deepEqual(items.map((item) => item.sellerOrderId), sourceOrder);
  assert.deepEqual(
    model.latest.filter((order) => order.sellerOrderId === 3 || order.sellerOrderId === 2)
      .map((order) => [order.orderTotal, order.currency]),
    [["30.30", "USD"], ["20.20", "EUR"]]
  );
  assert.equal("total" in model, false);
  assert.equal("revenue" in model, false);
});

test("countdown uses the trusted server timestamp", () => {
  const labels = { timeExpired: "Expired", h: "h", m: "m" };
  assert.equal(
    formatPartnerOrderRemainingTime(
      new Date("2026-09-16T14:30:00Z"),
      REFERENCE_NOW,
      labels
    ),
    "2h 30m"
  );
  assert.equal(
    formatPartnerOrderRemainingTime(REFERENCE_NOW, REFERENCE_NOW, labels),
    "Expired"
  );
});
