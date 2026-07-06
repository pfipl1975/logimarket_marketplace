export type OfferListingView = "grid" | "list";
export type OfferModelFilter = "rfq" | "ecommerce" | "outbound";

export type CategoryOfferFilters = {
  model?: OfferModelFilter;
  featured?: true;
};

export type CategorySearchParams = {
  view?: string;
  model?: string;
  featured?: string;
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
};

export function resolveOfferListingView(view: string | undefined): OfferListingView {
  return view === "list" ? "list" : "grid";
}

export function resolveCategoryOfferFilters(
  params: CategorySearchParams,
): CategoryOfferFilters {
  return {
    model:
      params.model === "rfq" ||
      params.model === "ecommerce" ||
      params.model === "outbound"
        ? params.model
        : undefined,
    featured: params.featured === "1" ? true : undefined,
  };
}

export function hasActiveCategoryOfferFilters(filters: CategoryOfferFilters): boolean {
  return Boolean(filters.model || filters.featured);
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

  return `${basePath}?${params.toString()}`;
}
