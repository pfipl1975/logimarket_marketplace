import type { CategoryOfferQueryState } from "./query";

export const CATALOG_PAGE_SIZE = 24;

export type ResolvedCategoryPage = {
  page: number;
  isCanonical: boolean;
};

export function resolveCategoryPage(pageParam: string | string[] | undefined): ResolvedCategoryPage {
  if (pageParam === undefined) {
    return { page: 1, isCanonical: true };
  }

  // Reject array of pages
  if (Array.isArray(pageParam)) {
    return { page: 1, isCanonical: false };
  }

  // Reject anything that is not purely digits
  if (!/^\d+$/.test(pageParam)) {
    return { page: 1, isCanonical: false };
  }

  // Reject leading zeros except for "0" itself (which is checked later)
  if (pageParam.length > 1 && pageParam.startsWith("0")) {
    return { page: 1, isCanonical: false };
  }

  const parsed = Number(pageParam);

  // Reject non-safe integers
  if (!Number.isSafeInteger(parsed)) {
    return { page: 1, isCanonical: false };
  }

  // Reject 0 or negative numbers
  if (parsed < 1) {
    return { page: 1, isCanonical: false };
  }

  // "page=1" should canonicalize to omitting the page parameter
  if (parsed === 1) {
    return { page: 1, isCanonical: false };
  }

  return { page: parsed, isCanonical: true };
}

export function buildCategoryPaginationHref(
  basePath: string,
  state: CategoryOfferQueryState,
  page: number
): string {
  const params = new URLSearchParams();
  
  if (state.view !== "grid") {
    params.set("view", state.view);
  }

  if (state.filters.model) {
    params.set("model", state.filters.model);
  }

  if (state.filters.featured) {
    params.set("featured", "1");
  }

  const attributeKeys = Object.keys(state.filters.attributeParams ?? {}).sort();
  for (const key of attributeKeys) {
    const values = [...(state.filters.attributeParams?.[key] ?? [])].sort();
    for (const value of values) {
      params.append(key, value);
    }
  }

  if (page > 1) {
    params.set("page", page.toString());
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
