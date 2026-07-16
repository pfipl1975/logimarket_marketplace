import type { FilterQueryInput, FilterValidationError, NormalizedFilterQuery } from "./types";

export function normalizeFilterQuery(input: FilterQueryInput): { ok: true; value: NormalizedFilterQuery } | { ok: false; errors: FilterValidationError[] } {
  const controlled = input.controlled ?? [];
  const numbers = input.numbers ?? [];
  const years = input.years ?? [];
  const booleans = input.booleans ?? [];
  const errors: FilterValidationError[] = [];
  const seen = new Set<number>();
  for (const filter of [...controlled, ...numbers, ...years, ...booleans]) {
    if (seen.has(filter.attributeId)) errors.push({ code: "DUPLICATE_ATTRIBUTE_FILTER", attributeId: filter.attributeId });
    seen.add(filter.attributeId);
  }
  for (const filter of controlled) if (filter.optionIds.length === 0) errors.push({ code: "EMPTY_OPTION_ARRAY", attributeId: filter.attributeId });
  for (const [kind, filters] of [["number", numbers], ["year", years]] as const) for (const filter of filters) {
    const invalidBound = (value: number | undefined) => value !== undefined && !Number.isFinite(value);
    if (invalidBound(filter.min) || invalidBound(filter.max)) errors.push({ code: kind === "year" ? "INVALID_YEAR_BOUNDS" : "NON_FINITE_NUMBER", attributeId: filter.attributeId });
    else if (filter.min === undefined && filter.max === undefined || (filter.min !== undefined && filter.max !== undefined && filter.min > filter.max) || (kind === "year" && ((filter.min !== undefined && !Number.isInteger(filter.min)) || (filter.max !== undefined && !Number.isInteger(filter.max))))) errors.push({ code: kind === "year" ? "INVALID_YEAR_BOUNDS" : "INVALID_NUMERIC_BOUNDS", attributeId: filter.attributeId });
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: {
    categoryId: input.categoryId,
    controlled: controlled.map((filter) => ({ attributeId: filter.attributeId, optionIds: [...new Set(filter.optionIds)].sort((a, b) => a - b) })).sort((a, b) => a.attributeId - b.attributeId),
    numbers: [...numbers].sort((a, b) => a.attributeId - b.attributeId),
    years: [...years].sort((a, b) => a.attributeId - b.attributeId),
    booleans: [...booleans].sort((a, b) => a.attributeId - b.attributeId),
    ...(input.page === undefined ? {} : { page: input.page, pageSize: input.pageSize }),
  }};
}
