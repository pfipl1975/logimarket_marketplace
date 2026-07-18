export type OfferListingView = "grid" | "list";
export type OfferModelFilter = "rfq" | "ecommerce" | "outbound";

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
  [key: string]: string | string[] | undefined;
};

export type CategoryOfferQueryState = {
  view: OfferListingView;
  filters: CategoryOfferFilters;
};

export type CategoryOfferQueryPatch = {
  view?: OfferListingView;
  model?: OfferModelFilter | null;
  featured?: true | null;
  clearFilters?: boolean;
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
  const nextFilters: CategoryOfferFilters = patch.clearFilters
    ? {}
    : { ...state.filters };

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

  if (nextFilters.model) {
    params.set("model", nextFilters.model);
  }

  if (nextFilters.featured) {
    params.set("featured", "1");
  }

  for (const [key, values] of Object.entries(nextFilters.attributeParams ?? {})) {
    for (const value of values) params.append(key, value);
  }

  return `${basePath}?${params.toString()}`;
}
