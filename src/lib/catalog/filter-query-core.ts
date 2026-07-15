import { and, count, eq, exists, inArray, sql, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { getCategoryDescendantIds } from "./tree";
import { catalogOfferOrder } from "./catalog-offer-order";
import type { FilterValidationError, NormalizedFilterQuery } from "@/lib/filters/types";

type Db = NodePgDatabase<typeof schema>;
type CatalogRow = {
  offer: typeof schema.offers.$inferSelect;
  category: typeof schema.categories.$inferSelect | null;
  partner: typeof schema.partners.$inferSelect | null;
};
type AttributeConfig = { dataType: string; isActive: boolean; assigned: boolean; filterable: boolean };
type OptionConfig = { attributeId: number; isActive: boolean };

export type FilterDbResult = { ok: true; total: number; rows: CatalogRow[] } | { ok: false; errors: FilterValidationError[] };

function requestedAttributeIds(input: NormalizedFilterQuery) {
  return [...input.controlled, ...input.numbers, ...input.years, ...input.booleans].map((filter) => filter.attributeId);
}

async function validateConfiguration(db: Db, input: NormalizedFilterQuery): Promise<{ errors: FilterValidationError[]; dataTypes: Map<number, string> }> {
  const attributeIds = requestedAttributeIds(input);
  if (attributeIds.length === 0) return { errors: [], dataTypes: new Map() };
  const optionIds = input.controlled.flatMap((filter) => filter.optionIds);
  const rows = await db.execute(sql`
    WITH requested_attributes(id) AS (
      SELECT unnest(${sql.param(attributeIds)}::bigint[])
    ), requested_options(id) AS (
      SELECT unnest(${sql.param(optionIds)}::bigint[])
    )
    SELECT
      requested_attributes.id AS requested_attribute_id,
      attribute_definitions.id AS attribute_id,
      attribute_definitions.data_type,
      attribute_definitions.is_active AS attribute_active,
      category_attribute_assignments.attribute_definition_id AS assigned_attribute_id,
      category_attribute_assignments.is_filterable,
      controlled_option_values.id AS option_id,
      controlled_option_values.attribute_id AS option_attribute_id,
      controlled_option_values.is_active AS option_active
    FROM requested_attributes
    LEFT JOIN attribute_definitions ON attribute_definitions.id = requested_attributes.id
    LEFT JOIN category_attribute_assignments ON category_attribute_assignments.category_id = ${input.categoryId}
      AND category_attribute_assignments.attribute_definition_id = requested_attributes.id
    LEFT JOIN requested_options ON TRUE
    LEFT JOIN controlled_option_values ON controlled_option_values.id = requested_options.id
    ORDER BY requested_attributes.id, controlled_option_values.id
  `);
  const attributes = new Map<number, AttributeConfig>();
  const options = new Map<number, OptionConfig>();
  for (const row of rows.rows as Array<Record<string, unknown>>) {
    const requestedId = Number(row.requested_attribute_id);
    if (row.attribute_id !== null) attributes.set(requestedId, {
      dataType: String(row.data_type), isActive: Boolean(row.attribute_active),
      assigned: row.assigned_attribute_id !== null, filterable: Boolean(row.is_filterable),
    });
    if (row.option_id !== null) options.set(Number(row.option_id), { attributeId: Number(row.option_attribute_id), isActive: Boolean(row.option_active) });
  }
  const errors: FilterValidationError[] = [];
  const validateAttribute = (attributeId: number, expectedTypes: string[]) => {
    const current = attributes.get(attributeId);
    if (!current) { errors.push({ code: "UNKNOWN_ATTRIBUTE", attributeId }); return; }
    if (!current.isActive) errors.push({ code: "INACTIVE_ATTRIBUTE", attributeId });
    if (!current.assigned) errors.push({ code: "ATTRIBUTE_NOT_ASSIGNED", attributeId });
    else if (!current.filterable) errors.push({ code: "INACTIVE_ASSIGNMENT", attributeId });
    if (!expectedTypes.includes(current.dataType)) errors.push({ code: "INCOMPATIBLE_FILTER_TYPE", attributeId });
  };
  for (const filter of input.controlled) {
    validateAttribute(filter.attributeId, ["enum", "multi_enum"]);
    for (const optionId of filter.optionIds) {
      const option = options.get(optionId);
      if (!option) errors.push({ code: "UNKNOWN_OPTION", attributeId: filter.attributeId, optionId });
      else if (option.attributeId !== filter.attributeId) errors.push({ code: "OPTION_WRONG_ATTRIBUTE", attributeId: filter.attributeId, optionId });
      else if (!option.isActive) errors.push({ code: "INACTIVE_OPTION", attributeId: filter.attributeId, optionId });
    }
  }
  for (const filter of input.numbers) validateAttribute(filter.attributeId, ["number"]);
  for (const filter of input.years) validateAttribute(filter.attributeId, ["year"]);
  for (const filter of input.booleans) validateAttribute(filter.attributeId, ["boolean"]);
  return { errors, dataTypes: new Map([...attributes].map(([id, value]) => [id, value.dataType])) };
}

function buildPredicates(db: Db, input: NormalizedFilterQuery, categoryIds: number[], dataTypes: Map<number, string>): SQL[] {
  const predicates: SQL[] = [
    eq(schema.offers.isActive, true),
    eq(schema.offers.publicationStatus, "published"),
    inArray(schema.offers.categoryId, categoryIds),
  ];
  for (const filter of input.controlled) {
    const table = dataTypes.get(filter.attributeId) === "multi_enum" ? schema.offerAttributeOptionValues : schema.offerAttributeValues;
    predicates.push(exists(db.select({ value: sql`1` }).from(table).where(and(
      eq(table.offerId, schema.offers.id), eq(table.attributeId, filter.attributeId), inArray(table.optionId, filter.optionIds),
    ))));
  }
  for (const filter of input.numbers) predicates.push(exists(db.select({ value: sql`1` }).from(schema.offerAttributeValues).where(and(
    eq(schema.offerAttributeValues.offerId, schema.offers.id), eq(schema.offerAttributeValues.attributeId, filter.attributeId),
    ...(filter.min === undefined ? [] : [sql`${schema.offerAttributeValues.valueNumber} >= ${filter.min}`]),
    ...(filter.max === undefined ? [] : [sql`${schema.offerAttributeValues.valueNumber} <= ${filter.max}`]),
  ))));
  for (const filter of input.years) predicates.push(exists(db.select({ value: sql`1` }).from(schema.offerAttributeValues).where(and(
    eq(schema.offerAttributeValues.offerId, schema.offers.id), eq(schema.offerAttributeValues.attributeId, filter.attributeId),
    ...(filter.min === undefined ? [] : [sql`${schema.offerAttributeValues.valueYear} >= ${filter.min}`]),
    ...(filter.max === undefined ? [] : [sql`${schema.offerAttributeValues.valueYear} <= ${filter.max}`]),
  ))));
  for (const filter of input.booleans) predicates.push(exists(db.select({ value: sql`1` }).from(schema.offerAttributeValues).where(and(
    eq(schema.offerAttributeValues.offerId, schema.offers.id), eq(schema.offerAttributeValues.attributeId, filter.attributeId), eq(schema.offerAttributeValues.valueBoolean, filter.value),
  ))));
  return predicates;
}

export async function queryFilteredCategoryOffers(db: Db, input: NormalizedFilterQuery): Promise<FilterDbResult> {
  const categories = await db.select({ id: schema.categories.id, parentId: schema.categories.parentId }).from(schema.categories);
  if (!categories.some((category) => category.id === input.categoryId)) return { ok: false, errors: [{ code: "UNKNOWN_CATEGORY" }] };
  const configuration = await validateConfiguration(db, input);
  if (configuration.errors.length) return { ok: false, errors: configuration.errors };
  const categoryRows = categories.map((category) => ({ ...category, name: "", slug: "", createdAt: new Date(0) }));
  const scope = [input.categoryId, ...getCategoryDescendantIds(categoryRows, input.categoryId)];
  const where = and(...buildPredicates(db, input, scope, configuration.dataTypes));
  const countRows = await db.select({ total: count() }).from(schema.offers).where(where);
  const itemBase = db.select({ offer: schema.offers, category: schema.categories, partner: schema.partners })
    .from(schema.offers).leftJoin(schema.categories, eq(schema.offers.categoryId, schema.categories.id))
    .leftJoin(schema.partners, eq(schema.offers.partnerId, schema.partners.id)).where(where).orderBy(...catalogOfferOrder());
  const rows = input.page === undefined ? await itemBase : await itemBase.limit(input.pageSize!).offset((input.page - 1) * input.pageSize!);
  return { ok: true, total: Number(countRows[0]?.total ?? 0), rows };
}
