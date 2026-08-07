export const ADMIN_OFFERS_PAGE_SIZE = 25;

export type AdminOfferStatusFilter = "draft" | "published" | "archived";
export type AdminOfferModelFilter = "rfq" | "ecommerce" | "outbound" | "unknown";

export interface AdminOffersQuery {
  q: string;
  status: AdminOfferStatusFilter | null;
  model: AdminOfferModelFilter | null;
  partner: number | null;
  category: number | null;
  page: number;
}

function getSingleString(val: unknown): string | null {
  return typeof val === "string" ? val : null;
}

export function isCanonicalPositiveInteger(str: string): boolean {
  if (!/^[1-9]\d*$/.test(str)) return false;
  const num = Number(str);
  return Number.isSafeInteger(num);
}

function parsePositiveSafeInteger(val: unknown): number | null {
  const str = getSingleString(val);
  if (!str) return null;
  if (!isCanonicalPositiveInteger(str)) return null;
  return Number(str);
}

function parseStatus(val: unknown): AdminOfferStatusFilter | null {
  const str = getSingleString(val);
  if (str === "draft" || str === "published" || str === "archived") return str;
  return null;
}

function parseModel(val: unknown): AdminOfferModelFilter | null {
  const str = getSingleString(val);
  if (str === "rfq" || str === "ecommerce" || str === "outbound" || str === "unknown") return str;
  return null;
}

function parseQuery(val: unknown): string {
  const str = getSingleString(val);
  if (!str) return "";
  const trimmed = str.trim();
  if (trimmed.length > 100) return trimmed.slice(0, 100);
  return trimmed;
}

export function parseAdminOffersQuery(searchParams: unknown): AdminOffersQuery {
  if (typeof searchParams !== "object" || searchParams === null) {
    return {
      q: "",
      status: null,
      model: null,
      partner: null,
      category: null,
      page: 1,
    };
  }

  const params = searchParams as Record<string, unknown>;

  return {
    q: parseQuery(params.q),
    status: parseStatus(params.status),
    model: parseModel(params.model),
    partner: parsePositiveSafeInteger(params.partner),
    category: parsePositiveSafeInteger(params.category),
    page: parsePositiveSafeInteger(params.page) ?? 1,
  };
}

export function buildAdminOffersUrl(
  basePath: string,
  updates: Partial<AdminOffersQuery>,
  currentQuery: AdminOffersQuery
): string {
  const merged = { ...currentQuery, ...updates };
  
  // Zmiana filtra (oprócz samej strony) resetuje paginację do strony 1
  const isFilterChange = 
    ("q" in updates && updates.q !== currentQuery.q) ||
    ("status" in updates && updates.status !== currentQuery.status) ||
    ("model" in updates && updates.model !== currentQuery.model) ||
    ("partner" in updates && updates.partner !== currentQuery.partner) ||
    ("category" in updates && updates.category !== currentQuery.category);
    
  if (isFilterChange) {
    merged.page = 1;
  }

  const params = new URLSearchParams();

  if (merged.q) params.set("q", merged.q);
  if (merged.status) params.set("status", merged.status);
  if (merged.model) params.set("model", merged.model);
  if (merged.partner) params.set("partner", merged.partner.toString());
  if (merged.category) params.set("category", merged.category.toString());
  if (merged.page > 1) params.set("page", merged.page.toString());

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
