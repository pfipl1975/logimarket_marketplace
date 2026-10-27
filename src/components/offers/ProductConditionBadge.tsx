import type { ProductCondition } from "@/lib/offers/product-condition";

export function ProductConditionBadge({ value, labels }: {
  value: ProductCondition | null;
  labels: {
    productConditionNew: string;
    productConditionUsed: string;
    productConditionRefurbished: string;
  };
}) {
  if (!value) return null;
  const name = value === "new" ? labels.productConditionNew :
    value === "used" ? labels.productConditionUsed : labels.productConditionRefurbished;
  return <span className="inline-flex items-center rounded border border-brand-teal/30 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">{name}</span>;
}
