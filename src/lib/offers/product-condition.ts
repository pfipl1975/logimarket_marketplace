/** State is independent of the canonical conversion and publication models. */
export const PRODUCT_CONDITIONS = ["new", "used", "refurbished"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];
export function isProductCondition(value: unknown): value is ProductCondition {
  return value === "new" || value === "used" || value === "refurbished";
}
/** Absent edit payload preserves the stored value; empty choice stores NULL. */
export function parseProductConditionInput(value: unknown):
  | { ok: true; value: ProductCondition | null | undefined }
  | { ok: false } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };
  return isProductCondition(value) ? { ok: true, value } : { ok: false };
}
