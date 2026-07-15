import type { FilterErrorCode, FilterQueryInput } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const positiveInteger = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value > 0;

export function parseFilterQueryInput(raw: unknown): { ok: true; value: FilterQueryInput } | { ok: false; errors: FilterErrorCode[] } {
  if (!isObject(raw)) return { ok: false, errors: ["INVALID_INPUT"] };
  if (!positiveInteger(raw.categoryId)) return { ok: false, errors: ["INVALID_IDENTIFIER"] };
  const parsed: FilterQueryInput = { categoryId: raw.categoryId as number };
  for (const key of ["controlled", "numbers", "years", "booleans"] as const) {
    const collection = raw[key];
    if (collection === undefined) continue;
    if (!Array.isArray(collection)) return { ok: false, errors: ["INVALID_INPUT"] };
    for (const filter of collection) {
      if (!isObject(filter) || !positiveInteger(filter.attributeId)) return { ok: false, errors: ["INVALID_IDENTIFIER"] };
      if (key === "controlled" && (!Array.isArray(filter.optionIds) || !filter.optionIds.every(positiveInteger))) return { ok: false, errors: ["INVALID_IDENTIFIER"] };
      if (key === "booleans" && typeof filter.value !== "boolean") return { ok: false, errors: ["INVALID_INPUT"] };
      if ((key === "numbers" || key === "years") && ((filter.min !== undefined && typeof filter.min !== "number") || (filter.max !== undefined && typeof filter.max !== "number"))) return { ok: false, errors: ["INVALID_INPUT"] };
    }
    parsed[key] = collection as never;
  }
  const hasPage = raw.page !== undefined;
  const hasPageSize = raw.pageSize !== undefined;
  if (hasPage !== hasPageSize || (hasPage && (!positiveInteger(raw.page) || !positiveInteger(raw.pageSize) || (raw.pageSize as number) > 100))) return { ok: false, errors: ["INVALID_PAGINATION"] };
  if (hasPage) { parsed.page = raw.page as number; parsed.pageSize = raw.pageSize as number; }
  return { ok: true, value: parsed };
}
