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
};

type Props = {
  basePath: string;
  view: OfferListingView;
  filters: CategoryOfferFilters;
  definitions: CategoryAttributeConfiguration[];
  labels: Labels;
};

function AttributeControls({ definitions, filters, labels }: Pick<Props, "definitions" | "filters" | "labels">) {
  const values = filters.attributeParams ?? {};
  return (
    <div className="space-y-5">
      {definitions.map((definition) => {
        const key = definition.stableKey;
        if (definition.dataType === "number") {
          return (
            <fieldset key={definition.attributeId} className="min-w-0">
              <legend className="text-sm font-semibold text-brand-navy">{definition.name}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  {labels.from}
                  <span className="sr-only"> {definition.name}</span>
                  <div className="relative mt-1">
                    <input name={`af_${key}_min`} defaultValue={values[`af_${key}_min`]?.[0] ?? ""} inputMode="decimal" className="w-full rounded border border-border bg-white px-3 py-2 pr-9 text-sm text-brand-navy outline-none focus:border-brand-teal" />
                    {definition.unitCode && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{definition.unitCode}</span>}
                  </div>
                </label>
                <label className="text-xs text-muted-foreground">
                  {labels.to}
                  <span className="sr-only"> {definition.name}</span>
                  <div className="relative mt-1">
                    <input name={`af_${key}_max`} defaultValue={values[`af_${key}_max`]?.[0] ?? ""} inputMode="decimal" className="w-full rounded border border-border bg-white px-3 py-2 pr-9 text-sm text-brand-navy outline-none focus:border-brand-teal" />
                    {definition.unitCode && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{definition.unitCode}</span>}
                  </div>
                </label>
              </div>
            </fieldset>
          );
        }

        if (definition.dataType === "enum" || definition.dataType === "multi_enum") {
          return (
            <label key={definition.attributeId} className="block text-sm font-semibold text-brand-navy">
              {definition.name}
              <select name={`af_${key}`} defaultValue={values[`af_${key}`]?.[0] ?? ""} className="mt-2 w-full rounded border border-border bg-white px-3 py-2 text-sm font-normal text-brand-navy outline-none focus:border-brand-teal">
                <option value="">—</option>
                {definition.options.map((option) => <option key={option.optionId} value={option.stableKey}>{option.label}</option>)}
              </select>
            </label>
          );
        }
        return null;
      })}
    </div>
  );
}

export function CategoryAttributeFilters({ basePath, view, filters, definitions, labels }: Props) {
  if (definitions.length === 0) return null;
  const clearHref = buildCategoryOfferQueryHref(basePath, { view, filters }, { clearAttributeFilters: true });
  const hiddenModel = filters.model ? <input type="hidden" name="model" value={filters.model} /> : null;
  const hiddenFeatured = filters.featured ? <input type="hidden" name="featured" value="1" /> : null;
  const controls = <AttributeControls definitions={definitions} filters={filters} labels={labels} />;

  return (
    <aside className="mt-6 border border-border bg-white p-4 lg:max-w-xs">
      <div className="hidden lg:block">
        <h2 className="text-sm font-bold uppercase tracking-wider text-brand-navy">{labels.heading}</h2>
        <form action={basePath} className="mt-4 space-y-5">
          <input type="hidden" name="view" value={view} />
          {hiddenModel}{hiddenFeatured}{controls}
          <div className="flex items-center gap-3">
            <button type="submit" className="rounded bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal">{labels.apply}</button>
            <Link href={clearHref} className="text-sm font-semibold text-muted-foreground hover:text-brand-teal">{labels.clear}</Link>
          </div>
        </form>
      </div>
      <details className="lg:hidden">
        <summary className="cursor-pointer text-sm font-bold text-brand-navy">{labels.summary}</summary>
        <form action={basePath} className="mt-4 space-y-5 border-t border-border pt-4">
          <input type="hidden" name="view" value={view} />
          {hiddenModel}{hiddenFeatured}{controls}
          <div className="flex items-center gap-3">
            <button type="submit" className="rounded bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal">{labels.apply}</button>
            <Link href={clearHref} className="text-sm font-semibold text-muted-foreground hover:text-brand-teal">{labels.clear}</Link>
          </div>
        </form>
      </details>
    </aside>
  );
}
