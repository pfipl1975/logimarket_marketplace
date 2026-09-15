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

export const SELLER_DECISION_SUMMARY_KEYS = [
  ...SELLER_DECISION_STATUSES,
  "not_routed",
  "unavailable",
] as const;

export type SellerOrderStatus = (typeof SELLER_ORDER_STATUSES)[number];
export type SellerDecisionStatus = (typeof SELLER_DECISION_STATUSES)[number];
export type SellerDecisionSummaryKey = (typeof SELLER_DECISION_SUMMARY_KEYS)[number];
export type SellerDecisionCounts = Record<SellerDecisionSummaryKey, number>;

/** Only these selected columns may cross from the DB adapter into the model. */
export type BuyerOrderReadRow = {
  orderId: number;
  createdAt: Date;
  sellerOrderId: number | null;
  sellerOrderStatus: string | null;
  decisionStatus: string | null;
};

export type BuyerOrderListItem = {
  orderId: number;
  createdAt: Date;
  sellerOrderCount: number;
  decisions: SellerDecisionCounts;
};

function isSellerOrderStatus(value: string): value is SellerOrderStatus {
  return (SELLER_ORDER_STATUSES as readonly string[]).includes(value);
}

function isSellerDecisionStatus(value: string): value is SellerDecisionStatus {
  return (SELLER_DECISION_STATUSES as readonly string[]).includes(value);
}

function emptyDecisionCounts(): SellerDecisionCounts {
  return {
    pending_seller_review: 0,
    seller_accepted: 0,
    seller_rejected: 0,
    expired: 0,
    not_routed: 0,
    unavailable: 0,
  };
}

/**
 * Decision records are authoritative even when SellerOrder later enters
 * fulfillment. A SellerOrder without a decision is shown explicitly, never
 * silently counted as accepted or rejected.
 */
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
          decisions: emptyDecisionCounts(),
        },
        seenSellerIds: new Set<number>(),
      };
      grouped.set(row.orderId, group);
    } else if (group.item.createdAt.getTime() !== row.createdAt.getTime()) {
      throw new Error("Conflicting MarketplaceOrder creation dates in Buyer order read model");
    }

    if (row.sellerOrderId === null) {
      if (row.sellerOrderStatus !== null || row.decisionStatus !== null) {
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
    if (row.decisionStatus === null) {
      const key = row.sellerOrderStatus === "submitted" ? "not_routed" : "unavailable";
      group.item.decisions[key] += 1;
    } else if (isSellerDecisionStatus(row.decisionStatus)) {
      group.item.decisions[row.decisionStatus] += 1;
    } else {
      throw new Error("Unknown seller decision status in Buyer order read model");
    }
  }

  return Array.from(grouped.values(), ({ item }) => item).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.orderId - a.orderId,
  );
}