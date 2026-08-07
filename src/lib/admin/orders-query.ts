export const ADMIN_ORDERS_PAGE_SIZE = 25;

export interface AdminOrdersQuery {
  q: string;
  page: number;
}

export function parseAdminOrdersQuery(rawInput: unknown): AdminOrdersQuery {
  let q = "";
  let page = 1;

  if (rawInput && typeof rawInput === "object") {
    const input = rawInput as Record<string, unknown>;

    if (typeof input.q === "string") {
      q = input.q.trim().substring(0, 100);
    }

    if (typeof input.page === "string") {
      const trimmed = input.page.trim();
      if (/^[1-9]\d*$/.test(trimmed)) {
        const num = Number(trimmed);
        if (Number.isSafeInteger(num) && num > 0) {
          page = num;
        }
      }
    }
  }

  return { q, page };
}

export function buildAdminOrdersUrl(basePath: string, query: AdminOrdersQuery): string {
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
