import type { CategoryAttributeConfiguration } from "@/lib/catalog/category-attribute-read-model";
import type { AttributeQueryParams } from "./query";
import type { FilterQueryInput } from "@/lib/filters/types";

const MAX_ABSOLUTE_NUMBER = 1_000_000_000;

export type AttributeFilterUrlState = {
  params: AttributeQueryParams;
  input: Pick<FilterQueryInput, "controlled" | "numbers" | "years" | "booleans">;
  isCanonical: boolean;
};

function parseFiniteNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= MAX_ABSOLUTE_NUMBER ? parsed : undefined;
}

function parseYear(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value || !/^[+-]?\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && Math.abs(parsed) <= MAX_ABSOLUTE_NUMBER ? parsed : undefined;
}

export function resolveAttributeFilterUrlState(
  definitions: CategoryAttributeConfiguration[],
  rawParams: AttributeQueryParams | undefined,
): AttributeFilterUrlState {
  const raw = rawParams ?? {};
  const params: AttributeQueryParams = {};
  const numbers: NonNullable<FilterQueryInput["numbers"]> = [];
  const years: NonNullable<FilterQueryInput["years"]> = [];
  const booleans: NonNullable<FilterQueryInput["booleans"]> = [];
  const controlled: NonNullable<FilterQueryInput["controlled"]> = [];
  
  let isCanonical = true;
  const validKeys = new Set<string>();

  for (const definition of definitions) {
    if (!definition.isFilterable) continue;
    const key = definition.stableKey;
    const minKey = `af_${key}_min`;
    const maxKey = `af_${key}_max`;
    const exactKey = `af_${key}`;

    if (definition.dataType === "number" || definition.dataType === "year") {
      validKeys.add(minKey);
      validKeys.add(maxKey);
      
      const rawMin = raw[minKey];
      const rawMax = raw[maxKey];
      
      if ((rawMin && rawMin.length > 1) || (rawMax && rawMax.length > 1)) {
        isCanonical = false;
        continue;
      }
      
      if ((rawMin && rawMin[0] === "") || (rawMax && rawMax[0] === "")) {
        isCanonical = false;
      }

      const min = definition.dataType === "year" ? parseYear(rawMin?.[0]) : parseFiniteNumber(rawMin?.[0]);
      const max = definition.dataType === "year" ? parseYear(rawMax?.[0]) : parseFiniteNumber(rawMax?.[0]);
      
      if (rawMin?.[0] !== undefined && min === undefined) isCanonical = false;
      if (rawMax?.[0] !== undefined && max === undefined) isCanonical = false;

      if (min === undefined && max === undefined) continue;
      
      if (min !== undefined && max !== undefined && min > max) {
        isCanonical = false;
        continue;
      }
      
      const filter: { attributeId: number; min?: number; max?: number } = { attributeId: definition.attributeId };
      
      if (min !== undefined) { 
        filter.min = min; 
        const minStr = String(min);
        params[minKey] = [minStr];
        if (rawMin?.[0] !== minStr) isCanonical = false;
      }
      if (max !== undefined) { 
        filter.max = max; 
        const maxStr = String(max);
        params[maxKey] = [maxStr]; 
        if (rawMax?.[0] !== maxStr) isCanonical = false;
      }
      
      if (definition.dataType === "year") {
        years.push(filter);
      } else {
        numbers.push(filter);
      }
      continue;
    }

    if (definition.dataType === "boolean") {
      validKeys.add(exactKey);
      const requested = raw[exactKey];
      if (!requested) continue;
      
      if (requested.length !== 1) {
        isCanonical = false;
        continue;
      }
      
      const val = requested[0];
      if (val !== "true" && val !== "false") {
        isCanonical = false;
        continue;
      }
      
      params[exactKey] = [val];
      booleans.push({
        attributeId: definition.attributeId,
        value: val === "true",
      });
      continue;
    }

    if (definition.dataType === "enum") {
      validKeys.add(exactKey);
      const requested = raw[exactKey];
      if (!requested) continue;
      
      if (requested.length !== 1) {
        isCanonical = false;
        continue;
      }
      
      const val = requested[0];
      if (!val) {
        isCanonical = false;
        continue;
      }
      
      const option = definition.options.find(o => o.stableKey === val);
      if (!option) {
        isCanonical = false;
        continue;
      }
      
      params[exactKey] = [val];
      controlled.push({
        attributeId: definition.attributeId,
        optionIds: [option.optionId],
      });
      continue;
    }
    
    if (definition.dataType === "multi_enum") {
      validKeys.add(exactKey);
      const requested = raw[exactKey] ?? [];
      if (requested.length === 0) continue;
      
      const optionsByKey = new Map(definition.options.map((option) => [option.stableKey, option]));
      
      const stableKeys = [...new Set(requested)].filter((value) => {
        if (!value) return false;
        return optionsByKey.has(value);
      });
      
      if (stableKeys.length === 0) {
        isCanonical = false;
        continue;
      }
      
      const sortedKeys = [...stableKeys].sort();
      
      if (requested.length !== stableKeys.length || requested.join(",") !== sortedKeys.join(",")) {
        isCanonical = false;
      }
      
      params[exactKey] = sortedKeys;
      controlled.push({
        attributeId: definition.attributeId,
        optionIds: sortedKeys.map((stableKey) => optionsByKey.get(stableKey)!.optionId),
      });
      continue;
    }
  }
  
  for (const key of Object.keys(raw)) {
    if (key.startsWith("af_") && !validKeys.has(key)) {
      isCanonical = false;
    }
  }

  return { params, input: { controlled, numbers, years, booleans }, isCanonical };
}
