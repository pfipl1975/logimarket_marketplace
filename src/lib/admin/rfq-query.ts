import type { RfqStatus } from "@/lib/schema";

export const ADMIN_RFQ_PAGE_SIZE = 25;

export type AdminRfqStatusFilter = RfqStatus | null;

export interface AdminRfqQuery {
  q: string;
  status: AdminRfqStatusFilter;
  page: number;
}

const VALID_RFQ_STATUSES: readonly RfqStatus[] = ["new", "in_progress", "responded", "closed"];

function isValidRfqStatus(value: string): value is RfqStatus {
  return (VALID_RFQ_STATUSES as readonly string[]).includes(value);
}

export function isCanonicalPositiveInteger(value: string): boolean {
  if (!value) return false;
  if (!/^[1-9][0-9]*$/.test(value)) return false;
  const num = Number(value);
  return Number.isSafeInteger(num) && num > 0;
}

function getSingleString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function parseAdminRfqQuery(rawInput: unknown): AdminRfqQuery {
  if (!rawInput || typeof rawInput !== "object") {
    return { q: "", status: null, page: 1 };
  }

  const params = rawInput as Record<string, unknown>;

  const rawQ = getSingleString(params.q);
  const q = rawQ ? rawQ.trim().slice(0, 100) : "";

  const rawStatus = getSingleString(params.status);
  const status: AdminRfqStatusFilter =
    rawStatus && isValidRfqStatus(rawStatus) ? rawStatus : null;

  let page = 1;
  const rawPage = getSingleString(params.page);
  if (rawPage && isCanonicalPositiveInteger(rawPage)) {
    page = parseInt(rawPage, 10);
  }

  return { q, status, page };
}

export function buildAdminRfqUrl(
  basePath: string,
  updates: Partial<AdminRfqQuery>,
  currentQuery: AdminRfqQuery
): string {
  const merged = { ...currentQuery, ...updates };

  if ("q" in updates && updates.q !== currentQuery.q) {
    merged.page = 1;
  }
  if ("status" in updates && updates.status !== currentQuery.status) {
    merged.page = 1;
  }

  const params = new URLSearchParams();

  if (merged.q) {
    params.set("q", merged.q);
  }

  if (merged.status) {
    params.set("status", merged.status);
  }

  if (merged.page > 1) {
    params.set("page", merged.page.toString());
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
