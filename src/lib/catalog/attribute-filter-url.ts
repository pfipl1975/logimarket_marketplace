import type { CategoryAttributeConfiguration } from "@/lib/catalog/category-attribute-read-model";
import type { AttributeQueryParams } from "./query";
import type { FilterQueryInput } from "@/lib/filters/types";

const MAX_ABSOLUTE_NUMBER = 1_000_000_000;

export type AttributeFilterUrlState = {
  params: AttributeQueryParams;
  input: Pick<FilterQueryInput, "controlled" | "numbers">;
};

function parseFiniteNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= MAX_ABSOLUTE_NUMBER ? parsed : undefined;
}

export function resolveAttributeFilterUrlState(
  definitions: CategoryAttributeConfiguration[],
  rawParams: AttributeQueryParams | undefined,
): AttributeFilterUrlState {
  const raw = rawParams ?? {};
  const params: AttributeQueryParams = {};
  const numbers: NonNullable<FilterQueryInput["numbers"]> = [];
  const controlled: NonNullable<FilterQueryInput["controlled"]> = [];

  for (const definition of definitions) {
    if (!definition.isFilterable) continue;
    const key = definition.stableKey;
    if (definition.dataType === "number") {
      const min = parseFiniteNumber(raw[`af_${key}_min`]?.[0]);
      const max = parseFiniteNumber(raw[`af_${key}_max`]?.[0]);
      if (min === undefined && max === undefined) continue;
      if (min !== undefined && max !== undefined && min > max) continue;
      const filter: { attributeId: number; min?: number; max?: number } = { attributeId: definition.attributeId };
      if (min !== undefined) { filter.min = min; params[`af_${key}_min`] = [String(min)]; }
      if (max !== undefined) { filter.max = max; params[`af_${key}_max`] = [String(max)]; }
      numbers.push(filter);
      continue;
    }

    if (definition.dataType === "enum" || definition.dataType === "multi_enum") {
      const requested = raw[`af_${key}`] ?? [];
      const optionsByKey = new Map(definition.options.map((option) => [option.stableKey, option]));
      const stableKeys = [...new Set(requested)].filter((value) => optionsByKey.has(value));
      if (stableKeys.length === 0) continue;
      params[`af_${key}`] = stableKeys;
      controlled.push({
        attributeId: definition.attributeId,
        optionIds: stableKeys.map((stableKey) => optionsByKey.get(stableKey)!.optionId),
      });
    }
  }

  return { params, input: { controlled, numbers } };
}
