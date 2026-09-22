import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPartnerOrdersListModel,
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

test("filter parser accepts only the five canonical values and defaults safely", () => {
  for (const filter of ["pending", "accepted", "rejected", "expired", "all"]) {
    assert.equal(parsePartnerOrderFilter(filter), filter);
  }
  assert.equal(parsePartnerOrderFilter("unknown"), "pending");
  assert.equal(parsePartnerOrderFilter(undefined), "pending");
  assert.equal(parsePartnerOrderFilter(["all"]), "pending");
});

test("filter counts preserve the canonical grouped status contract", () => {
  const items = allStatuses.map((status, index) => makeOrder(index + 1, status));
  const result = buildPartnerOrdersListModel(items, "all");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.counts, {
    pending: 1,
    accepted: 3,
    rejected: 2,
    expired: 1,
    all: 7,
  });
});

test("each filter returns only its existing status group without mutating source", () => {
  const items = allStatuses.map((status, index) => makeOrder(index + 1, status));
  const sourceOrder = items.map((item) => item.sellerOrderId);
  const expected: Record<string, PartnerOrderEffectiveStatus[]> = {
    pending: ["pending_decision"],
    accepted: ["accepted", "fulfillment_in_progress", "fulfilled"],
    rejected: ["rejected", "cancelled"],
    expired: ["expired"],
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

test("invalid order state makes the list model unavailable and is never counted", () => {
  assert.deepEqual(
    buildPartnerOrdersListModel([makeOrder(1, "invalid_order_state")], "all"),
    { ok: false }
  );
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
