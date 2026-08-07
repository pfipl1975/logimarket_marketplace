export const ADMIN_PARTNERS_PAGE_SIZE = 25;

export interface AdminPartnersQuery {
  q: string;
  page: number;
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

export function parseAdminPartnersQuery(rawInput: unknown): AdminPartnersQuery {
  if (!rawInput || typeof rawInput !== "object") {
    return { q: "", page: 1 };
  }

  const params = rawInput as Record<string, unknown>;

  const rawQ = getSingleString(params.q);
  const q = rawQ ? rawQ.trim().slice(0, 100) : "";

  let page = 1;
  const rawPage = getSingleString(params.page);
  if (rawPage && isCanonicalPositiveInteger(rawPage)) {
    page = parseInt(rawPage, 10);
  }

  return { q, page };
}

export function buildAdminPartnersUrl(
  basePath: string,
  updates: Partial<AdminPartnersQuery>,
  currentQuery: AdminPartnersQuery
): string {
  const merged = { ...currentQuery, ...updates };

  if ("q" in updates && updates.q !== currentQuery.q) {
    merged.page = 1;
  }

  const params = new URLSearchParams();

  if (merged.q) {
    params.set("q", merged.q);
  }

  if (merged.page > 1) {
    params.set("page", merged.page.toString());
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
