import "server-only";

import { eq, and, inArray, asc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema";
import type { Locale } from "@/lib/i18n/config";

const {
  categoryAttributeAssignments,
  attributeDefinitions,
  attributeDefinitionTranslations,
  controlledOptionValues,
  controlledOptionValueTranslations,
} = schema;

// Inferred ID types from Drizzle schema
export type AssignmentId =
  typeof categoryAttributeAssignments.$inferSelect.id;
export type AttributeId =
  typeof attributeDefinitions.$inferSelect.id;
export type OptionId =
  typeof controlledOptionValues.$inferSelect.id;

export type CategoryAttributeOption = {
  optionId: OptionId;
  stableKey: string;
  label: string;
  description: string | null;
};

export type CategoryAttributeConfiguration = {
  assignmentId: AssignmentId;
  attributeId: AttributeId;
  stableKey: string;
  dataType: string;
  name: string;
  shortLabel: string | null;
  description: string | null;
  unitCode: string | null;
  sortOrder: number;
  isFilterable: boolean;
  isComparable: boolean;
  isRequired: boolean;
  isVisible: boolean;
  options: CategoryAttributeOption[];
};

function resolveTranslation<T extends { locale: string }>(
  rows: T[],
  requestedLocale: Locale,
  defaultLocale: Locale
): T | undefined {
  return (
    rows.find((r) => r.locale === requestedLocale) ??
    rows.find((r) => r.locale === defaultLocale)
  );
}

export async function getCategoryAttributeConfigurationFromDb(
  db: NodePgDatabase<typeof schema>,
  categoryId: number,
  locale: Locale,
  onlyVisible = true,
  onlyFilterable = false
): Promise<CategoryAttributeConfiguration[]> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    throw new Error(`Invalid categoryId: ${categoryId}`);
  }
  const defaultLocale: Locale = "pl";

  // Query 1: assignments + attributes + translations (flat)
  const conditions = [
    eq(categoryAttributeAssignments.categoryId, categoryId),
  ];
  if (onlyVisible) {
    conditions.push(eq(categoryAttributeAssignments.isVisible, true));
  }
  if (onlyFilterable) {
    conditions.push(eq(categoryAttributeAssignments.isFilterable, true));
  }

  const assignmentRows = await db
    .select({
      assignment: categoryAttributeAssignments,
      attribute: attributeDefinitions,
    })
    .from(categoryAttributeAssignments)
    .innerJoin(
      attributeDefinitions,
      eq(
        categoryAttributeAssignments.attributeDefinitionId,
        attributeDefinitions.id
      )
    )
    .where(and(...conditions))
    .orderBy(
      asc(categoryAttributeAssignments.sortOrder),
      asc(attributeDefinitions.stableKey),
      asc(categoryAttributeAssignments.id)
    );

  if (assignmentRows.length === 0) {
    return [];
  }

  const attributeIds = assignmentRows.map((r) => r.attribute.id);

  // Query 2: attribute translations for all attributes
  const attributeTranslationRows = await db
    .select()
    .from(attributeDefinitionTranslations)
    .where(inArray(attributeDefinitionTranslations.attributeDefinitionId, attributeIds));

  // Group translations by attribute
  const translationsByAttribute = new Map<number, typeof attributeTranslationRows>();
  for (const row of attributeTranslationRows) {
    const list = translationsByAttribute.get(row.attributeDefinitionId) ?? [];
    list.push(row);
    translationsByAttribute.set(row.attributeDefinitionId, list);
  }

  // Determine which attributes need options (enum / multi_enum)
  const attributesWithOptions = assignmentRows.filter(
    (r) => r.attribute.dataType === "enum" || r.attribute.dataType === "multi_enum"
  );

  // Query 3: options for enum/multi_enum attributes
  let optionRows: (typeof controlledOptionValues.$inferSelect)[] = [];
  let optionTranslationRows: (typeof controlledOptionValueTranslations.$inferSelect)[] = [];

  if (attributesWithOptions.length > 0) {
    const optionAttributeIds = attributesWithOptions.map((r) => r.attribute.id);
    optionRows = await db
      .select()
      .from(controlledOptionValues)
      .where(
        and(
          inArray(controlledOptionValues.attributeId, optionAttributeIds),
          eq(controlledOptionValues.isActive, true)
        )
      )
      .orderBy(
        asc(controlledOptionValues.stableKey),
        asc(controlledOptionValues.id)
      );

    if (optionRows.length > 0) {
      const optionIds = optionRows.map((o) => o.id);
      optionTranslationRows = await db
        .select()
        .from(controlledOptionValueTranslations)
        .where(inArray(controlledOptionValueTranslations.controlledOptionValueId, optionIds));
    }
  }

  // Group options by attribute
  const optionsByAttribute = new Map<number, typeof optionRows>();
  for (const row of optionRows) {
    const list = optionsByAttribute.get(row.attributeId) ?? [];
    list.push(row);
    optionsByAttribute.set(row.attributeId, list);
  }

  // Group option translations by option
  const optionTranslationsByOption = new Map<number, typeof optionTranslationRows>();
  for (const row of optionTranslationRows) {
    const list = optionTranslationsByOption.get(row.controlledOptionValueId) ?? [];
    list.push(row);
    optionTranslationsByOption.set(row.controlledOptionValueId, list);
  }

  // Build DTOs
  const result: CategoryAttributeConfiguration[] = [];
  for (const { assignment, attribute } of assignmentRows) {
    const attrTranslations = translationsByAttribute.get(attribute.id) ?? [];
    const resolvedAttr = resolveTranslation(attrTranslations, locale, defaultLocale);

    const name = resolvedAttr?.name ?? attribute.stableKey;
    const shortLabel = resolvedAttr?.shortLabel ?? null;
    const description = resolvedAttr?.description ?? null;

    const options: CategoryAttributeOption[] = [];
    const attrOptions = optionsByAttribute.get(attribute.id) ?? [];
    for (const opt of attrOptions) {
      const optTranslations = optionTranslationsByOption.get(opt.id) ?? [];
      const resolvedOpt = resolveTranslation(optTranslations, locale, defaultLocale);
      options.push({
        optionId: opt.id,
        stableKey: opt.stableKey,
        label: resolvedOpt?.label ?? opt.stableKey,
        description: resolvedOpt?.description ?? null,
      });
    }

    result.push({
      assignmentId: assignment.id,
      attributeId: attribute.id,
      stableKey: attribute.stableKey,
      dataType: attribute.dataType,
      name,
      shortLabel,
      description,
      unitCode: assignment.unitCode,
      sortOrder: assignment.sortOrder,
      isFilterable: assignment.isFilterable,
      isComparable: assignment.isComparable,
      isRequired: assignment.isRequired,
      isVisible: assignment.isVisible,
      options,
    });
  }

  return result;
}
