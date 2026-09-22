import type { CatalogOfferSort, CategoryOfferFilters } from "@/lib/catalog/query";

interface CategoryOfferSortProps {
  basePath: string;
  view: "grid" | "list";
  currentSort: CatalogOfferSort;
  filters: CategoryOfferFilters;
  labels: {
    sortLabel: string;
    sortDefault: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    sortNewest: string;
    apply: string;
  };
}

export function CategoryOfferSort({ basePath, view, currentSort, filters, labels }: CategoryOfferSortProps) {
  return (
    <form method="get" action={basePath} className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-auto sm:grid-cols-[auto_auto_auto] sm:items-center">
      {view === "list" && <input type="hidden" name="view" value="list" />}
      {filters.model && <input type="hidden" name="model" value={filters.model} />}
      {filters.featured && <input type="hidden" name="featured" value="1" />}
      {filters.attributeParams && Object.entries(filters.attributeParams).map(([key, values]) =>
        values.map((value, index) => (
          <input key={`${key}-${index}`} type="hidden" name={key} value={value} />
        ))
      )}

      <label htmlFor="catalog-offer-sort" className="col-span-2 text-xs font-semibold text-brand-navy sm:col-span-1 sm:text-sm whitespace-nowrap">
        {labels.sortLabel}
      </label>
      <select
        id="catalog-offer-sort"
        name="sort"
        defaultValue={currentSort}
        className="min-h-10 min-w-0 w-full rounded border border-border bg-white px-3 py-1.5 text-sm text-brand-navy shadow-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal sm:w-auto"
      >
        <option value="default">{labels.sortDefault}</option>
        <option value="price-asc">{labels.sortPriceAsc}</option>
        <option value="price-desc">{labels.sortPriceDesc}</option>
        <option value="newest">{labels.sortNewest}</option>
      </select>
      <button
        type="submit"
        className="min-h-10 rounded bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
      >
        {labels.apply}
      </button>
    </form>
  );
}
