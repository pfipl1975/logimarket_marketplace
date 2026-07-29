import type { OfferModelFilter, CatalogOfferSort } from "@/lib/filters/types";

export type { OfferModelFilter, CatalogOfferSort } from "@/lib/filters/types";

export type OfferListingView = "grid" | "list";

export type AttributeQueryParams = Record<string, string[]>;

export type CategoryOfferFilters = {
  model?: OfferModelFilter;
  featured?: true;
  attributeParams?: AttributeQueryParams;
};

export type CategorySearchParams = {
  view?: string | string[];
  model?: string | string[];
  featured?: string | string[];
  page?: string | string[];
  sort?: string | string[];
  [key: string]: string | string[] | undefined;
};

export type ResolvedCategorySort = {
  sort: CatalogOfferSort;
  isCanonical: boolean;
};

export function resolveCategoryOfferSort(value: string | string[] | undefined): ResolvedCategorySort {
  if (value === undefined) return { sort: "default", isCanonical: true };
  if (Array.isArray(value)) return { sort: "default", isCanonical: false };
  if (value === "default") return { sort: "default", isCanonical: false };
  if (value === "price-asc" || value === "price-desc" || value === "newest") {
    return { sort: value, isCanonical: true };
  }
  return { sort: "default", isCanonical: false };
}

export type CategoryOfferQueryState = {
  view: OfferListingView;
  sort: CatalogOfferSort;
  filters: CategoryOfferFilters;
};

export type CategoryOfferQueryPatch = {
  view?: OfferListingView;
  model?: OfferModelFilter | null;
  featured?: true | null;
  sort?: CatalogOfferSort | null;
  clearAttributeFilters?: boolean;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveOfferListingView(view: string | string[] | undefined): OfferListingView {
  return view === "list" ? "list" : "grid";
}

export function resolveCategoryOfferFilters(
  params: CategorySearchParams,
): CategoryOfferFilters {
  const attributeParams: AttributeQueryParams = {};
  for (const [key, rawValue] of Object.entries(params)) {
    if (!key.startsWith("af_") || rawValue === undefined) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    attributeParams[key] = values.filter((value) => typeof value === "string");
  }

  const model = firstParam(params.model);
  const featured = firstParam(params.featured);
  return {
    model:
      model === "rfq" ||
      model === "ecommerce" ||
      model === "outbound"
        ? model
        : undefined,
    featured: featured === "1" ? true : undefined,
    ...(Object.keys(attributeParams).length > 0 ? { attributeParams } : {}),
  };
}

export function hasActiveCategoryOfferFilters(filters: CategoryOfferFilters): boolean {
  return Boolean(filters.model || filters.featured || Object.keys(filters.attributeParams ?? {}).length > 0);
}

export function buildCategoryOfferQueryHref(
  basePath: string,
  state: CategoryOfferQueryState,
  patch: CategoryOfferQueryPatch,
): string {
  const nextView = patch.view ?? state.view;
  const nextSort = patch.sort !== undefined ? (patch.sort ?? "default") : state.sort;
  const nextFilters: CategoryOfferFilters = { ...state.filters };

  if (patch.clearAttributeFilters) {
    nextFilters.attributeParams = undefined;
  }

  if ("model" in patch) {
    nextFilters.model = patch.model ?? undefined;
  }

  if ("featured" in patch) {
    nextFilters.featured = patch.featured ?? undefined;
  }

  const params = new URLSearchParams();
  params.set("view", nextView);

  if (nextSort !== "default") {
    params.set("sort", nextSort);
  }

  if (nextFilters.model) {
    params.set("model", nextFilters.model);
  }

  if (nextFilters.featured) {
    params.set("featured", "1");
  }

  const attributeKeys = Object.keys(nextFilters.attributeParams ?? {}).sort();
  for (const key of attributeKeys) {
    const values = [...(nextFilters.attributeParams?.[key] ?? [])].sort();
    for (const value of values) {
      params.append(key, value);
    }
  }

  return `${basePath}?${params.toString()}`;
}

export function buildClearAllCategoryFiltersHref(
  basePath: string,
  state: CategoryOfferQueryState,
): string {
  const params = new URLSearchParams();
  if (state.view && state.view !== "grid") {
    params.set("view", state.view);
  }
  if (state.sort !== "default") {
    params.set("sort", state.sort);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
