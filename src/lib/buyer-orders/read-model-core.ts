/** Pure presentation model for Buyer-owned MarketplaceOrders. */
export const SELLER_ORDER_STATUSES = [
  "submitted",
  "seller_accepted",
  "fulfillment_in_progress",
  "fulfilled",
  "seller_rejected",
  "cancelled",
  "expired",
] as const;

export const SELLER_DECISION_STATUSES = [
  "pending_seller_review",
  "seller_accepted",
  "seller_rejected",
  "expired",
] as const;

export const BUYER_SELLER_LIFECYCLE_STATUSES = [
  "pending_seller_review",
  "seller_accepted",
  "fulfillment_in_progress",
  "fulfilled",
  "seller_rejected",
  "expired",
  "cancelled",
  "not_routed",
  "unavailable",
] as const;

export type SellerOrderStatus = (typeof SELLER_ORDER_STATUSES)[number];
export type SellerDecisionStatus = (typeof SELLER_DECISION_STATUSES)[number];
export type BuyerSellerLifecycleStatus = (typeof BUYER_SELLER_LIFECYCLE_STATUSES)[number];
export type BuyerSellerLifecycleCounts = Record<BuyerSellerLifecycleStatus, number>;

/** Only these selected columns may cross from the DB adapter into the model. */
export type BuyerOrderReadRow = {
  orderId: number;
  createdAt: Date;
  sellerOrderId: number | null;
  sellerOrderStatus: string | null;
  decisionStatus: string | null;
  routedAt: Date | null;
};

export type BuyerOrderListItem = {
  orderId: number;
  createdAt: Date;
  sellerOrderCount: number;
  lifecycle: BuyerSellerLifecycleCounts;
};

function isSellerOrderStatus(value: string): value is SellerOrderStatus {
  return (SELLER_ORDER_STATUSES as readonly string[]).includes(value);
}

function isSellerDecisionStatus(value: string): value is SellerDecisionStatus {
  return (SELLER_DECISION_STATUSES as readonly string[]).includes(value);
}

function emptyLifecycleCounts(): BuyerSellerLifecycleCounts {
  return {
    pending_seller_review: 0,
    seller_accepted: 0,
    fulfillment_in_progress: 0,
    fulfilled: 0,
    seller_rejected: 0,
    expired: 0,
    cancelled: 0,
    not_routed: 0,
    unavailable: 0,
  };
}

/** Current operational state, backed by canonical decision evidence. */
export function deriveBuyerSellerOrderLifecycleStatus(
  sellerOrderStatus: string,
  decisionStatus: string | null,
  routedAt: Date | null,
): BuyerSellerLifecycleStatus {
  if (!isSellerOrderStatus(sellerOrderStatus)) throw new Error("Unknown SellerOrder status in Buyer order read model");
  if (decisionStatus !== null && !isSellerDecisionStatus(decisionStatus)) throw new Error("Unknown seller decision status in Buyer order read model");
  if (sellerOrderStatus === "submitted") {
    if (decisionStatus === null) return routedAt === null ? "not_routed" : "unavailable";
    if (decisionStatus === "pending_seller_review") return routedAt === null ? "unavailable" : "pending_seller_review";
    throw new Error("Conflicting submitted SellerOrder decision");
  }
  // Cancellation is already a canonical persisted state, independent of a
  // prior decision (including no decision), as in the Partner read model.
  if (sellerOrderStatus === "cancelled") return "cancelled";
  const expectedDecision = sellerOrderStatus === "fulfillment_in_progress" || sellerOrderStatus === "fulfilled"
    ? "seller_accepted" : sellerOrderStatus;
  if (decisionStatus !== expectedDecision) throw new Error("Conflicting SellerOrder lifecycle and decision");
  return sellerOrderStatus;
}

/** Each SellerOrder contributes exactly one current lifecycle count. */
export function buildBuyerOrderList(rows: readonly BuyerOrderReadRow[]): BuyerOrderListItem[] {
  const grouped = new Map<number, { item: BuyerOrderListItem; seenSellerIds: Set<number> }>();

  for (const row of rows) {
    if (!Number.isSafeInteger(row.orderId) || row.orderId <= 0) {
      throw new Error("Invalid MarketplaceOrder ID in Buyer order read model");
    }
    if (!(row.createdAt instanceof Date) || !Number.isFinite(row.createdAt.getTime())) {
      throw new Error("Invalid MarketplaceOrder creation date in Buyer order read model");
    }

    let group = grouped.get(row.orderId);
    if (!group) {
      group = {
        item: {
          orderId: row.orderId,
          createdAt: new Date(row.createdAt.getTime()),
          sellerOrderCount: 0,
          lifecycle: emptyLifecycleCounts(),
        },
        seenSellerIds: new Set<number>(),
      };
      grouped.set(row.orderId, group);
    } else if (group.item.createdAt.getTime() !== row.createdAt.getTime()) {
      throw new Error("Conflicting MarketplaceOrder creation dates in Buyer order read model");
    }

    if (row.sellerOrderId === null) {
      if (row.sellerOrderStatus !== null || row.decisionStatus !== null || row.routedAt !== null) {
        throw new Error("Seller decision exists without a SellerOrder");
      }
      continue;
    }
    if (!Number.isSafeInteger(row.sellerOrderId) || row.sellerOrderId <= 0) {
      throw new Error("Invalid SellerOrder ID in Buyer order read model");
    }
    if (group.seenSellerIds.has(row.sellerOrderId)) {
      throw new Error("Duplicate SellerOrder in Buyer order read model");
    }
    group.seenSellerIds.add(row.sellerOrderId);
    if (row.sellerOrderStatus === null || !isSellerOrderStatus(row.sellerOrderStatus)) {
      throw new Error("Unknown SellerOrder status in Buyer order read model");
    }

    group.item.sellerOrderCount += 1;
    const status = deriveBuyerSellerOrderLifecycleStatus(row.sellerOrderStatus, row.decisionStatus, row.routedAt);
    group.item.lifecycle[status] += 1;
  }

  return Array.from(grouped.values(), ({ item }) => item).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.orderId - a.orderId,
  );
}
