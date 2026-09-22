import Link from "next/link";
import {
  buildCategoryOfferQueryHref,
  type CategoryOfferFilters,
  type OfferListingView,
  type OfferModelFilter,
} from "@/lib/catalog/query";
import type { Dictionary } from "@/lib/i18n/types";

type CategoryOfferFilterLabels = Pick<
  Dictionary["catalog"],
  | "filtersHeading"
  | "filtersSummary"
  | "filtersAll"
  | "filtersModelHeading"
  | "filtersModelRfq"
  | "filtersModelEcommerce"
  | "filtersModelOutbound"
  | "filtersFeaturedOnly"
>;

interface CategoryOfferFiltersProps {
  basePath: string;
  view: "grid" | "list";
  sort: import("@/lib/filters/types").CatalogOfferSort;
  filters: CategoryOfferFilters;
  labels: CategoryOfferFilterLabels;
}

const chipBaseClass =
  "inline-flex min-h-10 items-center rounded border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2";
const activeChipClass = "border-brand-navy bg-brand-navy text-white";
const inactiveChipClass =
  "border-border bg-white text-brand-navy hover:border-brand-teal hover:text-brand-teal";

export function CategoryOfferFilters({
  basePath,
  view,
  sort,
  filters,
  labels,
}: CategoryOfferFiltersProps) {
  const state = { view, sort, filters };

  const modelOptions: Array<{
    key: "all" | OfferModelFilter;
    label: string;
    href: string;
    active: boolean;
  }> = [
    {
      key: "all",
      label: labels.filtersAll,
      href: buildCategoryOfferQueryHref(basePath, state, { model: null }),
      active: !filters.model,
    },
    {
      key: "rfq",
      label: labels.filtersModelRfq,
      href: buildCategoryOfferQueryHref(basePath, state, { model: "rfq" }),
      active: filters.model === "rfq",
    },
    {
      key: "ecommerce",
      label: labels.filtersModelEcommerce,
      href: buildCategoryOfferQueryHref(basePath, state, { model: "ecommerce" }),
      active: filters.model === "ecommerce",
    },
    {
      key: "outbound",
      label: labels.filtersModelOutbound,
      href: buildCategoryOfferQueryHref(basePath, state, { model: "outbound" }),
      active: filters.model === "outbound",
    },
  ];

  const featuredHref = buildCategoryOfferQueryHref(basePath, state, {
    featured: filters.featured ? null : true,
  });

  function renderControls() {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-x-5">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {labels.filtersModelHeading}
          </p>
          <div className="flex flex-wrap gap-2">
            {modelOptions.map((option) => (
              <Link
                key={option.key}
                href={option.href}
                aria-current={option.active ? "page" : undefined}
                className={`${chipBaseClass} ${
                  option.active ? activeChipClass : inactiveChipClass
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:border-l md:border-border md:pl-5">
          <Link
            href={featuredHref}
            aria-current={filters.featured ? "page" : undefined}
            className={`${chipBaseClass} ${
              filters.featured ? activeChipClass : inactiveChipClass
            }`}
          >
            {labels.filtersFeaturedOnly}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="mt-3 rounded-lg border border-border bg-white p-3 shadow-sm sm:px-4 sm:py-3">
      <div className="hidden md:block">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-navy">
            {labels.filtersHeading}
          </h2>
        </div>
        {renderControls()}
      </div>

      <details className="md:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">
          {labels.filtersSummary}
        </summary>
        <div className="mt-3 border-t border-border pt-3">{renderControls()}</div>
      </details>
    </section>
  );
}
