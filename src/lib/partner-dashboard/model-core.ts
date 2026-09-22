import type {
  PartnerOrderEffectiveStatus,
  PartnerOrderListItem,
} from "@/lib/partner-orders/read-model";

export const DASHBOARD_STATUS_ORDER = [
  "pending_decision",
  "accepted",
  "fulfillment_in_progress",
  "fulfilled",
  "rejected",
  "expired",
  "cancelled",
] as const satisfies readonly PartnerOrderEffectiveStatus[];

export type DashboardStatus = (typeof DASHBOARD_STATUS_ORDER)[number];

export type DashboardOrderSummary = {
  sellerOrderId: number;
  publicOrderReference: string;
  createdAt: Date;
  expiresAt: Date | null;
  serverNow: Date;
  effectiveStatus: DashboardStatus;
  decisionWindowOpen: boolean;
  buyerBusinessName: string;
  currency: string;
  orderTotal: string;
  itemCount: number;
};

export type PartnerDashboardModel = {
  ok: true;
  kpis: {
    pending: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  activity: Array<{ dateKey: string; count: number }>;
  statusDistribution: Array<{ status: DashboardStatus; count: number }>;
  attention: DashboardOrderSummary[];
  latest: DashboardOrderSummary[];
};

export type PartnerDashboardModelResult = PartnerDashboardModel | { ok: false };

const DAY_MS = 24 * 60 * 60 * 1000;

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function toUtcDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toSummary(item: PartnerOrderListItem): DashboardOrderSummary {
  return {
    sellerOrderId: item.sellerOrderId,
    publicOrderReference: item.publicOrderReference,
    createdAt: new Date(item.createdAt.getTime()),
    expiresAt: item.expiresAt ? new Date(item.expiresAt.getTime()) : null,
    serverNow: new Date(item.serverNow.getTime()),
    effectiveStatus: item.effectiveStatus as DashboardStatus,
    decisionWindowOpen: item.decisionWindowOpen,
    buyerBusinessName: item.buyerBusinessName,
    currency: item.currency,
    orderTotal: item.orderTotal,
    itemCount: item.itemCount,
  };
}

function isStructurallyValid(item: PartnerOrderListItem): boolean {
  if (
    !Number.isSafeInteger(item.sellerOrderId) ||
    item.sellerOrderId <= 0 ||
    !Number.isSafeInteger(item.itemCount) ||
    item.itemCount <= 0 ||
    !item.publicOrderReference ||
    !item.buyerBusinessName ||
    !item.currency ||
    !item.orderTotal ||
    !isValidDate(item.createdAt) ||
    !isValidDate(item.serverNow)
  ) {
    return false;
  }

  if (item.expiresAt !== null && !isValidDate(item.expiresAt)) return false;
  if (item.effectiveStatus === "invalid_order_state") return false;
  if (!DASHBOARD_STATUS_ORDER.includes(item.effectiveStatus as DashboardStatus)) return false;

  if (item.decisionWindowOpen) {
    return (
      item.effectiveStatus === "pending_decision" &&
      item.expiresAt !== null &&
      item.expiresAt.getTime() > item.serverNow.getTime()
    );
  }

  return item.effectiveStatus !== "pending_decision";
}

export function buildPartnerDashboardModel(
  items: readonly PartnerOrderListItem[],
  referenceNow: Date
): PartnerDashboardModelResult {
  if (!isValidDate(referenceNow) || items.some((item) => !isStructurallyValid(item))) {
    return { ok: false };
  }

  const todayUtc = Date.UTC(
    referenceNow.getUTCFullYear(),
    referenceNow.getUTCMonth(),
    referenceNow.getUTCDate()
  );
  const firstDayUtc = todayUtc - 29 * DAY_MS;
  const activity = Array.from({ length: 30 }, (_, index) => ({
    dateKey: toUtcDateKey(new Date(firstDayUtc + index * DAY_MS)),
    count: 0,
  }));
  const activityByDate = new Map(activity.map((bucket) => [bucket.dateKey, bucket]));

  const statusCounts = new Map<DashboardStatus, number>(
    DASHBOARD_STATUS_ORDER.map((status) => [status, 0])
  );

  for (const item of items) {
    const createdAtMs = item.createdAt.getTime();
    if (createdAtMs >= firstDayUtc && createdAtMs < todayUtc + DAY_MS) {
      const bucket = activityByDate.get(toUtcDateKey(item.createdAt));
      if (bucket) bucket.count += 1;
    }
    const status = item.effectiveStatus as DashboardStatus;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  const kpis = {
    pending: statusCounts.get("pending_decision") ?? 0,
    accepted: statusCounts.get("accepted") ?? 0,
    rejected: statusCounts.get("rejected") ?? 0,
    expired: statusCounts.get("expired") ?? 0,
  };

  const attention = items
    .filter(
      (item) =>
        item.effectiveStatus === "pending_decision" &&
        item.decisionWindowOpen &&
        item.expiresAt !== null
    )
    .slice()
    .sort((left, right) => {
      const deadlineDifference = left.expiresAt!.getTime() - right.expiresAt!.getTime();
      return deadlineDifference || left.sellerOrderId - right.sellerOrderId;
    })
    .slice(0, 5)
    .map(toSummary);

  const latest = items
    .slice()
    .sort((left, right) => {
      const createdDifference = right.createdAt.getTime() - left.createdAt.getTime();
      return createdDifference || right.sellerOrderId - left.sellerOrderId;
    })
    .slice(0, 5)
    .map(toSummary);

  return {
    ok: true,
    kpis,
    activity,
    statusDistribution: DASHBOARD_STATUS_ORDER.map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    attention,
    latest,
  };
}
