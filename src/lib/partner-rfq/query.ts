import { isCanonicalPositiveInteger } from "@/lib/admin/rfq-query";
import type { RfqStatus } from "@/lib/schema";

export const PARTNER_RFQ_STATUSES = ["new", "in_progress", "responded", "closed"] as const satisfies readonly RfqStatus[];
export const PARTNER_RFQ_FILTERS = [...PARTNER_RFQ_STATUSES, "all"] as const;
export const PARTNER_RFQ_PAGE_SIZE = 25;
export type PartnerRfqFilter = typeof PARTNER_RFQ_FILTERS[number];
export type PartnerRfqQuery = { status: PartnerRfqFilter; page: number };

export function isRfqStatus(value: unknown): value is RfqStatus {
  return PARTNER_RFQ_STATUSES.some(status => status === value);
}

export function parsePartnerRfqQuery(raw: unknown): PartnerRfqQuery {
  const params = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const status = PARTNER_RFQ_FILTERS.find(value => value === params.status) ?? "new";
  const page = typeof params.page === "string" && isCanonicalPositiveInteger(params.page) ? Number(params.page) : 1;
  return { status, page };
}

export function parsePartnerRfqId(raw: unknown): number | null {
  return typeof raw === "string" && isCanonicalPositiveInteger(raw) ? Number(raw) : null;
}

export function partnerRfqUrl(base: string, status: PartnerRfqFilter, page = 1) {
  const params = new URLSearchParams({ status });
  if (page > 1) params.set("page", String(page));
  return `${base}?${params}`;
}
