import Link from "next/link";
import type { CategoryAttributeConfiguration } from "@/lib/catalog/category-attribute-read-model";
import {
  buildCategoryOfferQueryHref,
  type CategoryOfferFilters,
  type OfferListingView,
} from "@/lib/catalog/query";

type Labels = {
  heading: string;
  summary: string;
  from: string;
  to: string;
  apply: string;
  clear: string;
  booleanAny: string;
  booleanYes: string;
  booleanNo: string;
  multiEnumGuidance: string;
};

type Props = {
  basePath: string;
  view: OfferListingView;
  sort: import("@/lib/filters/types").CatalogOfferSort;
  filters: CategoryOfferFilters;
  definitions: CategoryAttributeConfiguration[];
  labels: Labels;
};

function AttributeControls({ definitions, filters, labels, idPrefix }: Pick<Props, "definitions" | "filters" | "labels"> & { idPrefix: string }) {
  const values = filters.attributeParams ?? {};
  return (
    <>
      {definitions.map((definition) => {
        const key = definition.stableKey;
        if (definition.dataType === "number" || definition.dataType === "year") {
          return (
            <fieldset key={definition.attributeId} className="min-w-0">
              <legend className="text-sm font-semibold text-brand-navy">{definition.name}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="min-w-0 flex flex-col text-xs text-muted-foreground">
                  <span className="whitespace-normal break-words">{labels.from}<span className="sr-only"> {definition.name}</span></span>
                  <div className="relative mt-1">
                    <input
                      name={`af_${key}_min`}
                      defaultValue={values[`af_${key}_min`]?.[0] ?? ""}
                      inputMode={definition.dataType === "year" ? "numeric" : "decimal"}
                      className="min-w-0 w-full rounded border border-border bg-white px-3 py-2 pr-9 text-sm text-brand-navy outline-none focus:border-brand-teal h-[38px]"
                    />
                    {definition.unitCode && (
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                        {definition.unitCode}
                      </span>
                    )}
                  </div>
                </label>
                <label className="min-w-0 flex flex-col text-xs text-muted-foreground">
                  <span className="whitespace-normal break-words">{labels.to}<span className="sr-only"> {definition.name}</span></span>
                  <div className="relative mt-1">
                    <input
                      name={`af_${key}_max`}
                      defaultValue={values[`af_${key}_max`]?.[0] ?? ""}
                      inputMode={definition.dataType === "year" ? "numeric" : "decimal"}
                      className="min-w-0 w-full rounded border border-border bg-white px-3 py-2 pr-9 text-sm text-brand-navy outline-none focus:border-brand-teal h-[38px]"
                    />
                    {definition.unitCode && (
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                        {definition.unitCode}
                      </span>
                    )}
                  </div>
                </label>
              </div>
            </fieldset>
          );
        }

        if (definition.dataType === "enum") {
          return (
            <label key={definition.attributeId} className="block min-w-0 text-sm font-semibold text-brand-navy whitespace-normal break-words">
              {definition.name}
              <select
                name={`af_${key}`}
                defaultValue={values[`af_${key}`]?.[0] ?? ""}
                className="mt-2 w-full rounded border border-border bg-white px-3 py-2 text-sm font-normal text-brand-navy outline-none focus:border-brand-teal h-[38px]"
              >
                <option value="">—</option>
                {definition.options.map((option) => (
                  <option key={option.optionId} value={option.stableKey}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        if (definition.dataType === "boolean") {
          return (
            <label key={definition.attributeId} className="block min-w-0 text-sm font-semibold text-brand-navy whitespace-normal break-words">
              {definition.name}
              <select
                name={`af_${key}`}
                defaultValue={values[`af_${key}`]?.[0] ?? ""}
                className="mt-2 w-full rounded border border-border bg-white px-3 py-2 text-sm font-normal text-brand-navy outline-none focus:border-brand-teal h-[38px]"
              >
                <option value="">{labels.booleanAny}</option>
                <option value="true">{labels.booleanYes}</option>
                <option value="false">{labels.booleanNo}</option>
              </select>
            </label>
          );
        }

        if (definition.dataType === "multi_enum") {
          const activeValues = values[`af_${key}`] ?? [];
          const descId = `${idPrefix}-desc-${definition.attributeId}`;
          return (
            <fieldset key={definition.attributeId} className="min-w-0">
              <legend className="text-sm font-semibold text-brand-navy">{definition.name}</legend>
              <p id={descId} className="mt-1 text-xs text-muted-foreground mb-2">
                {labels.multiEnumGuidance}
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {definition.options.map((option) => {
                  const inputId = `${idPrefix}-opt-${option.optionId}`;
                  return (
                    <div key={option.optionId} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={inputId}
                          name={`af_${key}`}
                          type="checkbox"
                          value={option.stableKey}
                          defaultChecked={activeValues.includes(option.stableKey)}
                          aria-describedby={descId}
                          className="h-4 w-4 rounded border-gray-300 text-brand-navy focus:ring-brand-teal"
                        />
                      </div>
                      <div className="ml-3 text-sm min-w-0">
                        <label htmlFor={inputId} className="font-medium text-brand-navy whitespace-normal break-words cursor-pointer select-none">
                          {option.label}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        }

        return null;
      })}
    </>
  );
}

export function CategoryAttributeFilters({ basePath, view, sort, filters, definitions, labels }: Props) {
  if (definitions.length === 0) return null;
  const clearHref = buildCategoryOfferQueryHref(basePath, { view, sort, filters }, { clearAttributeFilters: true });
  const hiddenModel = filters.model ? <input type="hidden" name="model" value={filters.model} /> : null;
  const hiddenFeatured = filters.featured ? <input type="hidden" name="featured" value="1" /> : null;
  const hasActiveAttributeFilters = Object.keys(filters.attributeParams ?? {}).length > 0;

  return (
    <aside className="mt-6 w-full border border-border bg-white p-4">
      {/* Desktop Navigation & Filters */}
      <div className="hidden md:block">
        <h2 className="text-sm font-bold uppercase tracking-wider text-brand-navy">{labels.heading}</h2>
        <form action={basePath} className="mt-4">
          {view === "list" && <input type="hidden" name="view" value="list" />}
          {sort !== "default" && <input type="hidden" name="sort" value={sort} />}
          {hiddenModel}
          {hiddenFeatured}
          <div className="grid gap-4 items-start md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <AttributeControls definitions={definitions} filters={filters} labels={labels} idPrefix="desktop" />
            <div className="flex items-center gap-3 pt-6 xl:justify-start self-start">
              <button
                type="submit"
                className="rounded bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal whitespace-nowrap min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              >
                {labels.apply}
              </button>
              {hasActiveAttributeFilters && (
                <Link
                  href={clearHref}
                  className="inline-flex min-h-[44px] items-center justify-center rounded border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-gray-50 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 whitespace-nowrap"
                >
                  {labels.clear}
                </Link>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Mobile Accordion & Filters */}
      <details className="md:hidden">
        <summary className="cursor-pointer text-sm font-bold text-brand-navy">{labels.summary}</summary>
        <form action={basePath} className="mt-4 space-y-5 border-t border-border pt-4">
          {view === "list" && <input type="hidden" name="view" value="list" />}
          {sort !== "default" && <input type="hidden" name="sort" value={sort} />}
          {hiddenModel}
          {hiddenFeatured}
          <div className="grid gap-4 grid-cols-1">
            <AttributeControls definitions={definitions} filters={filters} labels={labels} idPrefix="mobile" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="w-full sm:w-auto rounded bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
            >
              {labels.apply}
            </button>
            {hasActiveAttributeFilters && (
              <Link
                href={clearHref}
                className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center rounded border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-gray-50 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              >
                {labels.clear}
              </Link>
            )}
          </div>
        </form>
      </details>
    </aside>
  );
}
