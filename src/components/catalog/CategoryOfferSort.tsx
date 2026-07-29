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
    <form method="get" action={basePath} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      {view === "list" && <input type="hidden" name="view" value="list" />}
      {filters.model && <input type="hidden" name="model" value={filters.model} />}
      {filters.featured && <input type="hidden" name="featured" value="1" />}
      {filters.attributeParams && Object.entries(filters.attributeParams).map(([key, values]) =>
        values.map((value, index) => (
          <input key={`${key}-${index}`} type="hidden" name={key} value={value} />
        ))
      )}

      <label htmlFor="catalog-offer-sort" className="text-sm font-medium text-brand-navy whitespace-nowrap">
        {labels.sortLabel}
      </label>
      <select
        id="catalog-offer-sort"
        name="sort"
        defaultValue={currentSort}
        className="w-full sm:w-auto rounded border border-border bg-white px-3 py-1.5 text-sm text-brand-navy shadow-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
      >
        <option value="default">{labels.sortDefault}</option>
        <option value="price-asc">{labels.sortPriceAsc}</option>
        <option value="price-desc">{labels.sortPriceDesc}</option>
        <option value="newest">{labels.sortNewest}</option>
      </select>
      <button
        type="submit"
        className="w-full sm:w-auto rounded bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
      >
        {labels.apply}
      </button>
    </form>
  );
}
