import type { ProductCondition } from "@/lib/offers/product-condition";

export type ProductConditionLabels = {
  productConditionLabel: string;
  productConditionUnspecified: string;
  productConditionNew: string;
  productConditionUsed: string;
  productConditionRefurbished: string;
};

/** Optional field: legacy offers remain unclassified until explicitly edited. */
export function ProductConditionSelect({ labels, value = null }: {
  labels: ProductConditionLabels;
  value?: ProductCondition | null;
}) {
  return (
    <div>
      <label htmlFor="productCondition" className="mb-1 block text-sm font-semibold text-brand-navy">
        {labels.productConditionLabel}
      </label>
      <select id="productCondition" name="productCondition" defaultValue={value ?? ""}
        className="mt-1 min-h-11 w-full rounded border border-border bg-white px-3 py-2 text-sm text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal sm:max-w-sm">
        <option value="">{labels.productConditionUnspecified}</option>
        <option value="new">{labels.productConditionNew}</option>
        <option value="used">{labels.productConditionUsed}</option>
        <option value="refurbished">{labels.productConditionRefurbished}</option>
      </select>
    </div>
  );
}
