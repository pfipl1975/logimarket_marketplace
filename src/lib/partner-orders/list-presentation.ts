import type {
  PartnerOrderEffectiveStatus,
  PartnerOrderListItem,
} from "@/lib/partner-orders/read-model";

export const PARTNER_ORDER_FILTERS = [
  "pending",
  "accepted",
  "in_progress",
  "fulfilled",
  "rejected",
  "expired",
  "cancelled",
  "all",
] as const;

export type PartnerOrderFilter = (typeof PARTNER_ORDER_FILTERS)[number];
export type ValidPartnerOrderStatus = Exclude<
  PartnerOrderEffectiveStatus,
  "invalid_order_state"
>;

export type PartnerOrderFilterCounts = Record<PartnerOrderFilter, number>;

export type PartnerOrdersListModel =
  | {
      ok: true;
      activeFilter: PartnerOrderFilter;
      counts: PartnerOrderFilterCounts;
      filteredItems: PartnerOrderListItem[];
    }
  | { ok: false };

const VALID_STATUSES = new Set<PartnerOrderEffectiveStatus>([
  "pending_decision",
  "accepted",
  "fulfillment_in_progress",
  "fulfilled",
  "rejected",
  "expired",
  "cancelled",
]);

export function parsePartnerOrderFilter(value: unknown): PartnerOrderFilter {
  return typeof value === "string" &&
    PARTNER_ORDER_FILTERS.includes(value as PartnerOrderFilter)
    ? (value as PartnerOrderFilter)
    : "pending";
}

export function matchesPartnerOrderFilter(
  status: PartnerOrderEffectiveStatus,
  filter: PartnerOrderFilter
): boolean {
  if (!VALID_STATUSES.has(status)) return false;
  if (filter === "all") return true;
  if (filter === "pending") return status === "pending_decision";
  if (filter === "in_progress") return status === "fulfillment_in_progress";
  return status === filter;
}

export function buildPartnerOrdersListModel(
  items: readonly PartnerOrderListItem[],
  requestedFilter: unknown
): PartnerOrdersListModel {
  if (items.some((item) => !VALID_STATUSES.has(item.effectiveStatus))) {
    return { ok: false };
  }

  const activeFilter = parsePartnerOrderFilter(requestedFilter);
  const counts = Object.fromEntries(
    PARTNER_ORDER_FILTERS.map((filter) => [
      filter,
      items.filter((item) => matchesPartnerOrderFilter(item.effectiveStatus, filter)).length,
    ])
  ) as PartnerOrderFilterCounts;

  return {
    ok: true,
    activeFilter,
    counts,
    filteredItems: items.filter((item) =>
      matchesPartnerOrderFilter(item.effectiveStatus, activeFilter)
    ),
  };
}
