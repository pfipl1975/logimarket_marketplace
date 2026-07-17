import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { isLocale, type Locale } from "@/lib/i18n/config";
import {
  catalogFilterKinds,
  type CatalogFilterConfiguration,
  type CatalogFilterConfigurationInput,
  type CatalogFilterDefinition,
  type CatalogFilterKind,
  type CatalogFilterOption,
  CatalogFilterConfigurationError,
} from "./configuration-types";

const MAX_CATEGORY_ANCESTRY_DEPTH = 256;
const filterKindsByDataType: Readonly<Record<string, CatalogFilterKind | undefined>> = {
  enum: "enum",
  multi_enum: "multi_enum",
  number: "number",
  year: "year",
  boolean: "boolean",
};

type Db = NodePgDatabase<typeof schema>;
type RawRow = Record<string, unknown>;

export function parsePositiveSafeId(value: unknown): number {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^[1-9]\d*$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new CatalogFilterConfigurationError("INVALID_DATABASE_VALUE");
  }
  return parsed;
}

function parseNonNegativeSafeInteger(value: unknown): number {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new CatalogFilterConfigurationError("INVALID_DATABASE_VALUE");
  }
  return parsed;
}

function parseInput(input: CatalogFilterConfigurationInput): { categoryId: number; locale: Locale } {
  let categoryId: number;
  try {
    if (typeof input.categoryId !== "number") throw new Error("categoryId must be numeric");
    categoryId = parsePositiveSafeId(input.categoryId);
  } catch {
    throw new CatalogFilterConfigurationError("INVALID_CATEGORY_ID");
  }
  if (typeof input.locale !== "string" || !isLocale(input.locale)) {
    throw new CatalogFilterConfigurationError("INVALID_LOCALE");
  }
  return { categoryId, locale: input.locale };
}

function rejectInvalidConfiguration(): never {
  throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
}

function isCanonicalArrayIndex(key: string, length: number): boolean {
  if (!/^(0|[1-9]\d*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length && String(index) === key;
}

function assertPlainJsonValue(value: unknown, activePath = new WeakSet<object>()): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return;
    rejectInvalidConfiguration();
  }
  if (typeof value !== "object" || activePath.has(value)) {
    rejectInvalidConfiguration();
  }
  if (value instanceof Date || value instanceof Map || value instanceof Set || value instanceof WeakMap || value instanceof WeakSet || value instanceof RegExp || ArrayBuffer.isView(value)) {
    rejectInvalidConfiguration();
  }
  activePath.add(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) rejectInvalidConfiguration();
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") rejectInvalidConfiguration();
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) rejectInvalidConfiguration();
      if (key === "length") {
        if (descriptor.value !== value.length || descriptor.writable !== true || descriptor.enumerable !== false || descriptor.configurable !== false) rejectInvalidConfiguration();
        continue;
      }
      if (!isCanonicalArrayIndex(key, value.length) || descriptor.writable !== true || descriptor.enumerable !== true || descriptor.configurable !== true) rejectInvalidConfiguration();
    }
    for (let index = 0; index < value.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || descriptor.writable !== true || descriptor.enumerable !== true || descriptor.configurable !== true) rejectInvalidConfiguration();
      assertPlainJsonValue(descriptor.value, activePath);
    }
  } else {
    if (Object.getPrototypeOf(value) !== Object.prototype) rejectInvalidConfiguration();
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") rejectInvalidConfiguration();
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true || descriptor.writable !== true || descriptor.configurable !== true) rejectInvalidConfiguration();
      assertPlainJsonValue(descriptor.value, activePath);
    }
  }
  activePath.delete(value);
}

export function assertPlainJsonDTO(value: unknown): void {
  assertPlainJsonValue(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

export function assertCatalogFilterConfigurationDTO(value: unknown): asserts value is CatalogFilterConfiguration {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
  }
  const root = value as Record<string, unknown>;
  if (!hasExactKeys(root, ["categoryId", "filters"])) throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
  parsePositiveSafeId(root.categoryId);
  if (!Array.isArray(root.filters)) throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
  const attributeIds = new Set<number>();
  for (const filter of root.filters) {
    if (!filter || typeof filter !== "object" || Array.isArray(filter) || Object.getPrototypeOf(filter) !== Object.prototype) throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
    const record = filter as Record<string, unknown>;
    if (!hasExactKeys(record, ["attributeId", "filterKind", "label", "unit", "sortOrder", "options"])) throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
    const attributeId = parsePositiveSafeId(record.attributeId);
    if (attributeIds.has(attributeId) || !catalogFilterKinds.includes(record.filterKind as CatalogFilterKind) || typeof record.label !== "string" || record.label.length === 0 || !(record.unit === null || typeof record.unit === "string") || !Array.isArray(record.options)) throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
    parseNonNegativeSafeInteger(record.sortOrder);
    attributeIds.add(attributeId);
    const optionIds = new Set<number>();
    for (const option of record.options) {
      if (!option || typeof option !== "object" || Array.isArray(option) || Object.getPrototypeOf(option) !== Object.prototype) throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
      const optionRecord = option as Record<string, unknown>;
      if (!hasExactKeys(optionRecord, ["optionId", "label"])) throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
      const optionId = parsePositiveSafeId(optionRecord.optionId);
      if (optionIds.has(optionId) || typeof optionRecord.label !== "string" || optionRecord.label.length === 0) throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
      optionIds.add(optionId);
    }
    if (["number", "year", "boolean"].includes(record.filterKind as string) && record.options.length !== 0) throw new CatalogFilterConfigurationError("INVALID_CONFIGURATION_DTO");
  }
}

export async function getCatalogFilterConfigurationCore(db: Db, input: CatalogFilterConfigurationInput): Promise<CatalogFilterConfiguration | null> {
  const { categoryId, locale } = parseInput(input);
  const firstResult = await db.execute(sql`
    WITH RECURSIVE category_ancestry AS (
      SELECT c.id, c.parent_id, 0::integer AS depth, ARRAY[c.id]::bigint[] AS path, false AS is_cycle
      FROM categories c
      WHERE c.id = ${categoryId}
      UNION ALL
      SELECT parent.id, parent.parent_id, ancestry.depth + 1, ancestry.path || parent.id,
        parent.id = ANY(ancestry.path) AS is_cycle
      FROM category_ancestry ancestry
      JOIN categories parent ON parent.id = ancestry.parent_id
      WHERE NOT ancestry.is_cycle AND ancestry.depth < ${MAX_CATEGORY_ANCESTRY_DEPTH}
    ), ancestry_state AS (
      SELECT COUNT(*) > 0 AS category_exists,
        COALESCE(bool_or(is_cycle), false) AS has_cycle,
        COALESCE(bool_or(depth >= ${MAX_CATEGORY_ANCESTRY_DEPTH} AND parent_id IS NOT NULL AND NOT is_cycle), false) AS depth_limit_hit
      FROM category_ancestry
    ), ranked_assignments AS (
      SELECT assignment.*, ancestry.depth,
        ROW_NUMBER() OVER (PARTITION BY assignment.attribute_definition_id ORDER BY ancestry.depth ASC) AS rn
      FROM category_ancestry ancestry
      JOIN category_attribute_assignments assignment ON assignment.category_id = ancestry.id
      WHERE NOT ancestry.is_cycle
    ), winning_assignments AS (
      SELECT * FROM ranked_assignments WHERE rn = 1
    ), final_filters AS (
      SELECT winning.attribute_definition_id AS attribute_id, definition.data_type, winning.unit_code, winning.sort_order,
        COALESCE(translation.name, definition.stable_key) AS label
      FROM winning_assignments winning
      JOIN attribute_definitions definition ON definition.id = winning.attribute_definition_id
      LEFT JOIN LATERAL (
        SELECT translation.name
        FROM attribute_definition_translations translation
        WHERE translation.attribute_definition_id = definition.id
          AND translation.locale IN (${locale}, 'pl')
        ORDER BY CASE WHEN translation.locale = ${locale} THEN 0 WHEN translation.locale = 'pl' THEN 1 ELSE 2 END
        LIMIT 1
      ) translation ON true
      WHERE winning.is_filterable = true
        AND definition.is_active = true
        AND definition.data_type IN ('enum', 'multi_enum', 'number', 'year', 'boolean')
    )
    SELECT 'meta'::text AS row_type, state.category_exists, state.has_cycle, state.depth_limit_hit,
      NULL::bigint AS attribute_id, NULL::text AS data_type, NULL::text AS label, NULL::varchar AS unit_code, NULL::integer AS sort_order
    FROM ancestry_state state
    UNION ALL
    SELECT 'filter'::text, state.category_exists, state.has_cycle, state.depth_limit_hit,
      filter.attribute_id, filter.data_type, filter.label, filter.unit_code, filter.sort_order
    FROM final_filters filter CROSS JOIN ancestry_state state
    ORDER BY row_type ASC, sort_order ASC NULLS LAST, attribute_id ASC
  `);
  const rows = firstResult.rows as RawRow[];
  const meta = rows.find((row) => row.row_type === "meta");
  if (!meta) throw new CatalogFilterConfigurationError("INVALID_DATABASE_VALUE");
  if (meta.category_exists !== true) return null;
  if (meta.has_cycle === true) throw new CatalogFilterConfigurationError("CATEGORY_ANCESTRY_CYCLE");
  if (meta.depth_limit_hit === true) throw new CatalogFilterConfigurationError("CATEGORY_ANCESTRY_DEPTH_LIMIT");

  const filters: CatalogFilterDefinition[] = rows.filter((row) => row.row_type === "filter").map((row) => {
    const filterKind = filterKindsByDataType[typeof row.data_type === "string" ? row.data_type : ""];
    if (!filterKind || typeof row.label !== "string" || row.label.length === 0 || !(row.unit_code === null || typeof row.unit_code === "string")) throw new CatalogFilterConfigurationError("INVALID_DATABASE_VALUE");
    return { attributeId: parsePositiveSafeId(row.attribute_id), filterKind, label: row.label, unit: row.unit_code, sortOrder: parseNonNegativeSafeInteger(row.sort_order), options: [] };
  });
  const controlledIds = filters.filter((filter) => filter.filterKind === "enum" || filter.filterKind === "multi_enum").map((filter) => filter.attributeId);
  if (controlledIds.length > 0) {
    const optionResult = await db.execute(sql`
      WITH requested_attributes(attribute_id) AS (SELECT unnest(${sql.param(controlledIds)}::bigint[]))
      SELECT option.id AS option_id, option.attribute_id,
        COALESCE(translation.label, option.stable_key) AS label
      FROM controlled_option_values option
      JOIN requested_attributes requested ON requested.attribute_id = option.attribute_id
      LEFT JOIN LATERAL (
        SELECT translation.label
        FROM controlled_option_value_translations translation
        WHERE translation.controlled_option_value_id = option.id
          AND translation.locale IN (${locale}, 'pl')
        ORDER BY CASE WHEN translation.locale = ${locale} THEN 0 WHEN translation.locale = 'pl' THEN 1 ELSE 2 END
        LIMIT 1
      ) translation ON true
      WHERE option.is_active = true
      ORDER BY option.attribute_id ASC, option.id ASC
    `);
    const optionsByAttribute = new Map<number, CatalogFilterOption[]>();
    for (const row of optionResult.rows as RawRow[]) {
      const attributeId = parsePositiveSafeId(row.attribute_id);
      if (typeof row.label !== "string" || row.label.length === 0) throw new CatalogFilterConfigurationError("INVALID_DATABASE_VALUE");
      const options = optionsByAttribute.get(attributeId) ?? [];
      options.push({ optionId: parsePositiveSafeId(row.option_id), label: row.label });
      optionsByAttribute.set(attributeId, options);
    }
    for (const filter of filters) filter.options = optionsByAttribute.get(filter.attributeId) ?? [];
  }
  const dto = { categoryId, filters };
  assertCatalogFilterConfigurationDTO(dto);
  assertPlainJsonDTO(dto);
  return dto;
}

export { MAX_CATEGORY_ANCESTRY_DEPTH };
