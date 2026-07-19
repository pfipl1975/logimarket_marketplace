import Link from "next/link";
import {
  buildCategoryOfferQueryHref,
  hasActiveCategoryOfferFilters,
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
  | "filtersClear"
  | "filtersModelHeading"
  | "filtersModelRfq"
  | "filtersModelEcommerce"
  | "filtersModelOutbound"
  | "filtersFeaturedOnly"
>;

interface CategoryOfferFiltersProps {
  basePath: string;
  view: OfferListingView;
  filters: CategoryOfferFilters;
  labels: CategoryOfferFilterLabels;
}

const chipBaseClass =
  "inline-flex items-center rounded border px-3 py-1.5 text-xs font-semibold transition-colors";
const activeChipClass = "border-brand-navy bg-brand-navy text-white";
const inactiveChipClass =
  "border-border bg-white text-brand-navy hover:border-brand-teal hover:text-brand-teal";

export function CategoryOfferFilters({
  basePath,
  view,
  filters,
  labels,
}: CategoryOfferFiltersProps) {
  const state = { view, filters };
  const hasActiveFilters = hasActiveCategoryOfferFilters(filters);

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
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
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

        <div className="flex flex-wrap items-center gap-2 lg:border-l lg:border-border lg:pl-5">
          <Link
            href={featuredHref}
            aria-current={filters.featured ? "page" : undefined}
            className={`${chipBaseClass} ${
              filters.featured ? activeChipClass : inactiveChipClass
            }`}
          >
            {labels.filtersFeaturedOnly}
          </Link>

          {hasActiveFilters && (
            <Link
              href={buildCategoryOfferQueryHref(basePath, state, {
                clearFilters: true,
              })}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-brand-teal"
            >
              {labels.filtersClear}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-5 rounded border border-border bg-white p-3 shadow-sm sm:px-4 sm:py-3">
      <div className="hidden md:block">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-navy">
            {labels.filtersHeading}
          </h2>
        </div>
        {renderControls()}
      </div>

      <details className="md:hidden">
        <summary className="cursor-pointer text-sm font-bold text-brand-navy">
          {labels.filtersSummary}
        </summary>
        <div className="mt-3 border-t border-border pt-3">{renderControls()}</div>
      </details>
    </section>
  );
}
