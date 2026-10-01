import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPartnerOrdersListModel,
  matchesPartnerOrderFilter,
  PARTNER_ORDER_FILTERS,
  parsePartnerOrderFilter,
} from "../../src/lib/partner-orders/list-presentation";
import { getPartnerOrderStatusLabel } from "../../src/lib/partner-orders/presentation";
import type {
  PartnerOrderEffectiveStatus,
  PartnerOrderListItem,
} from "../../src/lib/partner-orders/read-model";

function makeOrder(
  sellerOrderId: number,
  effectiveStatus: PartnerOrderEffectiveStatus
): PartnerOrderListItem {
  const pending = effectiveStatus === "pending_decision";
  return {
    sellerOrderId,
    publicOrderReference: `ORD-SO-${sellerOrderId}`,
    createdAt: new Date("2026-09-16T12:00:00Z"),
    routedAt: new Date("2026-09-15T12:00:00Z"),
    expiresAt: pending ? new Date("2026-09-17T12:00:00Z") : null,
    serverNow: new Date("2026-09-16T12:00:00Z"),
    persistedStatus: pending ? "submitted" : effectiveStatus,
    effectiveStatus,
    decisionWindowOpen: pending,
    buyerBusinessName: `Buyer ${sellerOrderId}`,
    currency: "PLN",
    orderTotal: `${sellerOrderId}.00`,
    itemCount: 1,
  };
}

const allStatuses: PartnerOrderEffectiveStatus[] = [
  "pending_decision",
  "accepted",
  "fulfillment_in_progress",
  "fulfilled",
  "rejected",
  "cancelled",
  "expired",
];

test("filter parser accepts all eight canonical values and defaults safely", () => {
  for (const filter of ["pending", "accepted", "in_progress", "fulfilled", "rejected", "expired", "cancelled", "all"]) {
    assert.equal(parsePartnerOrderFilter(filter), filter);
  }
  assert.equal(parsePartnerOrderFilter("unknown"), "pending");
  assert.equal(parsePartnerOrderFilter(undefined), "pending");
  assert.equal(parsePartnerOrderFilter(["all"]), "pending");
});

test("each valid order contributes to exactly one lifecycle count and all", () => {
  const items = allStatuses.map((status, index) => makeOrder(index + 1, status));
  const result = buildPartnerOrdersListModel(items, "all");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.counts, {
    pending: 1,
    accepted: 1,
    in_progress: 1,
    fulfilled: 1,
    rejected: 1,
    expired: 1,
    cancelled: 1,
    all: 7,
  });
  assert.equal(
    PARTNER_ORDER_FILTERS.filter((filter) => filter !== "all")
      .reduce((sum, filter) => sum + result.counts[filter], 0),
    result.counts.all
  );
});

test("each filter returns only its current lifecycle without mutating source", () => {
  const items = allStatuses.map((status, index) => makeOrder(index + 1, status));
  const sourceOrder = items.map((item) => item.sellerOrderId);
  const expected: Record<string, PartnerOrderEffectiveStatus[]> = {
    pending: ["pending_decision"],
    accepted: ["accepted"],
    in_progress: ["fulfillment_in_progress"],
    fulfilled: ["fulfilled"],
    rejected: ["rejected"],
    expired: ["expired"],
    cancelled: ["cancelled"],
    all: allStatuses,
  };

  for (const [filter, statuses] of Object.entries(expected)) {
    const result = buildPartnerOrdersListModel(items, filter);
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.deepEqual(
      result.filteredItems.map((item) => item.effectiveStatus),
      statuses
    );
  }
  assert.deepEqual(items.map((item) => item.sellerOrderId), sourceOrder);
});

for (const [status, filter] of [
  ["pending_decision", "pending"],
  ["accepted", "accepted"],
  ["fulfillment_in_progress", "in_progress"],
  ["fulfilled", "fulfilled"],
  ["rejected", "rejected"],
  ["expired", "expired"],
  ["cancelled", "cancelled"],
] as const) {
  test(`${status} matches only ${filter} and all`, () => {
    assert.deepEqual(
      PARTNER_ORDER_FILTERS.filter((candidate) => matchesPartnerOrderFilter(status, candidate)),
      [filter, "all"]
    );
    const result = buildPartnerOrdersListModel([makeOrder(1, status)], filter);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.filteredItems.length, 1);
    assert.equal(result.counts.all, 1);
    assert.equal(Object.values(result.counts).reduce((sum, count) => sum + count, 0), 2);
  });
}

test("fulfillment states are not accepted and cancelled is not rejected", () => {
  assert.equal(matchesPartnerOrderFilter("fulfilled", "accepted"), false);
  assert.equal(matchesPartnerOrderFilter("fulfillment_in_progress", "accepted"), false);
  assert.equal(matchesPartnerOrderFilter("cancelled", "rejected"), false);
});

test("invalid order state makes the list model unavailable and is never counted", () => {
  for (const filter of PARTNER_ORDER_FILTERS) {
    assert.equal(matchesPartnerOrderFilter("invalid_order_state", filter), false);
    assert.deepEqual(
      buildPartnerOrdersListModel([makeOrder(1, "fulfilled"), makeOrder(2, "invalid_order_state")], filter),
      { ok: false }
    );
  }
});

test("precise effective statuses use the shared Partner vocabulary", () => {
  const labels = {
    statusPending: "pending",
    statusAccepted: "accepted",
    statusFulfillmentInProgress: "in progress",
    statusFulfilled: "fulfilled",
    statusRejected: "rejected",
    statusExpired: "expired",
    statusCancelled: "cancelled",
  };

  assert.deepEqual(
    allStatuses.map((status) => getPartnerOrderStatusLabel(status, labels)),
    ["pending", "accepted", "in progress", "fulfilled", "rejected", "cancelled", "expired"]
  );
  assert.equal(getPartnerOrderStatusLabel("invalid_order_state", labels), null);
});
