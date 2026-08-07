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

export function parseAdminPartnersQuery(searchParams: URLSearchParams): AdminPartnersQuery {
  const rawQ = searchParams.getAll("q")[0];
  const rawPage = searchParams.getAll("page")[0];

  const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 100) : "";
  let page = 1;

  if (typeof rawPage === "string" && isCanonicalPositiveInteger(rawPage)) {
    page = parseInt(rawPage, 10);
  }

  return { q, page };
}

export function buildAdminPartnersUrl(basePath: string, query: AdminPartnersQuery): string {
  const params = new URLSearchParams();

  if (query.q) {
    params.set("q", query.q);
  }

  if (query.page > 1) {
    params.set("page", query.page.toString());
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
