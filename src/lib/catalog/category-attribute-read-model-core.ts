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

export function validateCategoryId(categoryId: unknown): number {
  if (typeof categoryId !== "number" || !Number.isFinite(categoryId) || categoryId <= 0) {
    throw new Error(`Invalid categoryId: ${categoryId}`);
  }
  return categoryId;
}

export async function getCategoryAttributeConfigurationFromDb(
  db: NodePgDatabase<typeof schema>,
  categoryId: number,
  locale: Locale,
  onlyVisible = true,
  onlyFilterable = false
): Promise<CategoryAttributeConfiguration[]> {
  validateCategoryId(categoryId);
  const defaultLocale: Locale = "pl";

  // Query 1: assignments + attributes + attribute translations (flat left join)
  const conditions = [
    eq(categoryAttributeAssignments.categoryId, categoryId),
  ];
  if (onlyVisible) {
    conditions.push(eq(categoryAttributeAssignments.isVisible, true));
  }
  if (onlyFilterable) {
    conditions.push(eq(categoryAttributeAssignments.isFilterable, true));
  }

  const flatRows = await db
    .select({
      assignment: categoryAttributeAssignments,
      attribute: attributeDefinitions,
      attrTranslation: attributeDefinitionTranslations,
    })
    .from(categoryAttributeAssignments)
    .innerJoin(
      attributeDefinitions,
      eq(
        categoryAttributeAssignments.attributeDefinitionId,
        attributeDefinitions.id
      )
    )
    .leftJoin(
      attributeDefinitionTranslations,
      eq(
        attributeDefinitionTranslations.attributeDefinitionId,
        attributeDefinitions.id
      )
    )
    .where(and(...conditions))
    .orderBy(
      asc(categoryAttributeAssignments.sortOrder),
      asc(attributeDefinitions.stableKey),
      asc(categoryAttributeAssignments.id)
    );

  if (flatRows.length === 0) {
    return [];
  }

  // Group by assignment to reconstruct translations
  const rowsByAssignment = new Map<number, typeof flatRows>();
  for (const row of flatRows) {
    const list = rowsByAssignment.get(row.assignment.id) ?? [];
    list.push(row);
    rowsByAssignment.set(row.assignment.id, list);
  }

  const attributeIds = [...new Set(flatRows.map((r) => r.attribute.id))];

  // Determine which attributes need options (enum / multi_enum)
  const attributesNeedingOptions = new Set(
    flatRows
      .filter((r) => r.attribute.dataType === "enum" || r.attribute.dataType === "multi_enum")
      .map((r) => r.attribute.id)
  );

  // Query 2: all options + option translations for relevant attributes (flat left join)
  let optionFlatRows: {
    option: typeof controlledOptionValues.$inferSelect;
    optTranslation: typeof controlledOptionValueTranslations.$inferSelect | null;
  }[] = [];

  if (attributesNeedingOptions.size > 0) {
    optionFlatRows = await db
      .select({
        option: controlledOptionValues,
        optTranslation: controlledOptionValueTranslations,
      })
      .from(controlledOptionValues)
      .leftJoin(
        controlledOptionValueTranslations,
        eq(
          controlledOptionValueTranslations.controlledOptionValueId,
          controlledOptionValues.id
        )
      )
      .where(
        and(
          inArray(controlledOptionValues.attributeId, [...attributesNeedingOptions]),
          eq(controlledOptionValues.isActive, true)
        )
      )
      .orderBy(
        asc(controlledOptionValues.stableKey),
        asc(controlledOptionValues.id)
      );
  }

  // Group options by attribute
  const optionsByAttribute = new Map<number, typeof optionFlatRows>();
  for (const row of optionFlatRows) {
    const list = optionsByAttribute.get(row.option.attributeId) ?? [];
    list.push(row);
    optionsByAttribute.set(row.option.attributeId, list);
  }

  // Build DTOs
  const result: CategoryAttributeConfiguration[] = [];
  for (const [assignmentId, assignmentRows] of rowsByAssignment) {
    const { assignment, attribute } = assignmentRows[0];

    const attrTranslations = assignmentRows
      .map((r) => r.attrTranslation)
      .filter((t): t is NonNullable<typeof t> => t !== null);
    const resolvedAttr = resolveTranslation(attrTranslations, locale, defaultLocale);

    const name = resolvedAttr?.name ?? attribute.stableKey;
    const shortLabel = resolvedAttr?.shortLabel ?? null;
    const description = resolvedAttr?.description ?? null;

    const options: CategoryAttributeOption[] = [];
    const attrOptions = optionsByAttribute.get(attribute.id) ?? [];
    // Group option rows by option to handle translations
    const optionRowsByOption = new Map<number, typeof attrOptions>();
    for (const row of attrOptions) {
      const list = optionRowsByOption.get(row.option.id) ?? [];
      list.push(row);
      optionRowsByOption.set(row.option.id, list);
    }
    for (const [optionId, optRows] of optionRowsByOption) {
      const opt = optRows[0].option;
      const optTranslations = optRows
        .map((r) => r.optTranslation)
        .filter((t): t is NonNullable<typeof t> => t !== null);
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
