import "server-only";

import { and, eq, inArray, ne } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import type { Locale } from "@/lib/i18n/config";
import { requirePartnerMembership } from "@/lib/auth/partner-membership";
import { isCanonicalPositiveInteger } from "@/lib/admin/offers-query";
import {
  isCanonicalPartnerAttributeStorageShape,
  type PartnerAttributeDataType,
} from "@/lib/partner-offers/attribute-edit-core";

const SUPPORTED_TYPES = new Set<string>([
  "text",
  "number",
  "boolean",
  "date",
  "year",
  "enum",
  "multi_enum",
]);

export type PartnerAttributeEditViewModel = {
  attributeId: number;
  stableKey: string;
  dataType: PartnerAttributeDataType;
  localizedName: string;
  localizedDescription: string | null;
  unitCode: string | null;
  sortOrder: number;
  isRequired: boolean;
  isConsistent: boolean;
  currentValue: {
    hasValue: boolean;
    text?: string;
    number?: string;
    boolean?: boolean;
    date?: string;
    year?: number;
    optionId?: number;
    optionIds?: number[];
  };
  options: Array<{
    optionId: number;
    stableKey: string;
    localizedLabel: string;
    localizedDescription: string | null;
  }>;
};

export type PartnerOfferAttributesEditDto = {
  offerId: number;
  expectedUpdatedAt: string | null;
  configurationState:
    | "editable"
    | "no_assignments"
    | "configuration_inconsistent";
  category: {
    id: number;
    name: string;
    slug: string;
  };
  attributes: PartnerAttributeEditViewModel[];
};

export type PartnerOfferAttributesEditReadResult =
  | { ok: true; data: PartnerOfferAttributesEditDto }
  | {
      ok: false;
      code:
        | "INVALID_ID"
        | "NOT_FOUND"
        | "UNAUTHORIZED"
        | "NOT_EDITABLE"
        | "SYSTEM_ERROR";
    };

type AssignmentRow = {
  attributeDefinitionId: number;
  sortOrder: number;
  isRequired: boolean;
  unitCode: string | null;
};

type DefinitionRow = {
  id: number;
  stableKey: string;
  dataType: string;
  isActive: boolean;
};

type AttributeTranslationRow = {
  attributeDefinitionId: number;
  locale: string;
  name: string;
  description: string | null;
};

type OptionRow = {
  id: number;
  attributeId: number;
  stableKey: string;
  isActive: boolean;
};

type OptionTranslationRow = {
  controlledOptionValueId: number;
  locale: string;
  label: string;
  description: string | null;
};

type ScalarRow = {
  attributeId: number;
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueDate: Date | string | null;
  valueYear: number | null;
  optionId: number | null;
};

type MultiRow = {
  attributeId: number;
  optionId: number;
};

type PartnerAttributeEditModelInput = {
  locale: Locale;
  assignments: AssignmentRow[];
  definitions: DefinitionRow[];
  attributeTranslations: AttributeTranslationRow[];
  options: OptionRow[];
  optionTranslations: OptionTranslationRow[];
  scalarRows: ScalarRow[];
  multiRows: MultiRow[];
};

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toDateKey(value: Date | string | null): string | undefined {
  const iso = toIso(value);
  return iso?.slice(0, 10);
}

function resolveTranslation<T extends { locale: string }>(
  rows: T[],
  locale: Locale,
): T | undefined {
  return (
    rows.find((row) => row.locale === locale) ??
    rows.find((row) => row.locale === "pl")
  );
}

function buildPartnerAttributeEditAttributes(
  input: PartnerAttributeEditModelInput,
): PartnerAttributeEditViewModel[] {
  const definitions = new Map(
    input.definitions.map((definition) => [definition.id, definition]),
  );

  return input.assignments
    .map((assignment): PartnerAttributeEditViewModel | null => {
      const definition = definitions.get(assignment.attributeDefinitionId);
      if (
        definition === undefined ||
        !definition.isActive ||
        !SUPPORTED_TYPES.has(definition.dataType)
      ) {
        return null;
      }

      const attributeTranslation = resolveTranslation(
        input.attributeTranslations.filter(
          (translation) =>
            translation.attributeDefinitionId === definition.id,
        ),
        input.locale,
      );
      const options = input.options
        .filter(
          (option) => option.attributeId === definition.id && option.isActive,
        )
        .map((option) => {
          const translation = resolveTranslation(
            input.optionTranslations.filter(
              (item) => item.controlledOptionValueId === option.id,
            ),
            input.locale,
          );
          return {
            optionId: option.id,
            stableKey: option.stableKey,
            localizedLabel: translation?.label ?? option.stableKey,
            localizedDescription: translation?.description ?? null,
          };
        })
        .sort((left, right) =>
          left.localizedLabel.localeCompare(right.localizedLabel, input.locale),
        );

      const scalarRows = input.scalarRows.filter(
        (row) => row.attributeId === definition.id,
      );
      const multiRows = input.multiRows.filter(
        (row) => row.attributeId === definition.id,
      );
      const scalar = scalarRows[0];
      const multi = multiRows
        .map((row) => row.optionId)
        .sort((left, right) => left - right);
      const activeOptionIds = new Set(options.map((option) => option.optionId));
      const storageIsConsistent = isCanonicalPartnerAttributeStorageShape(
        definition.dataType as PartnerAttributeDataType,
        scalarRows,
        multiRows.length,
      );
      const controlledValueIsConsistent =
        definition.dataType === "enum"
          ? scalar?.optionId === null ||
            scalar?.optionId === undefined ||
            activeOptionIds.has(scalar.optionId)
          : definition.dataType === "multi_enum"
            ? multi.every((optionId) => activeOptionIds.has(optionId))
            : true;
      const isConsistent =
        storageIsConsistent && controlledValueIsConsistent;

      return {
        attributeId: definition.id,
        stableKey: definition.stableKey,
        dataType: definition.dataType as PartnerAttributeDataType,
        localizedName: attributeTranslation?.name ?? definition.stableKey,
        localizedDescription: attributeTranslation?.description ?? null,
        unitCode: assignment.unitCode,
        sortOrder: assignment.sortOrder,
        isRequired: assignment.isRequired,
        isConsistent,
        currentValue: isConsistent
          ? {
              hasValue: scalar !== undefined || multi.length > 0,
              text: scalar?.valueText ?? undefined,
              number: scalar?.valueNumber ?? undefined,
              boolean: scalar?.valueBoolean ?? undefined,
              date: toDateKey(scalar?.valueDate ?? null),
              year: scalar?.valueYear ?? undefined,
              optionId: scalar?.optionId ?? undefined,
              optionIds: multi.length > 0 ? multi : undefined,
            }
          : { hasValue: false },
        options,
      };
    })
    .filter(
      (attribute): attribute is PartnerAttributeEditViewModel =>
        attribute !== null,
    )
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return left.stableKey.localeCompare(right.stableKey);
    });
}

export function buildPartnerAttributeEditReadState(
  input: PartnerAttributeEditModelInput,
): Pick<PartnerOfferAttributesEditDto, "attributes" | "configurationState"> {
  const attributes = buildPartnerAttributeEditAttributes(input);
  const definitions = new Map(
    input.definitions.map((definition) => [definition.id, definition]),
  );
  const hasUnsafeAssignment = input.assignments.some((assignment) => {
    const definition = definitions.get(assignment.attributeDefinitionId);
    return (
      definition === undefined ||
      !definition.isActive ||
      !SUPPORTED_TYPES.has(definition.dataType)
    );
  });
  const hasUnsafeValue = attributes.some((attribute) => !attribute.isConsistent);

  return {
    attributes,
    configurationState:
      input.assignments.length === 0
        ? "no_assignments"
        : hasUnsafeAssignment || hasUnsafeValue
          ? "configuration_inconsistent"
          : "editable",
  };
}

export function buildPartnerAttributeEditViewModel(
  input: PartnerAttributeEditModelInput,
): PartnerAttributeEditViewModel[] {
  return buildPartnerAttributeEditReadState(input).attributes;
}

export async function getPartnerOfferAttributesEditReadModel(
  db: NodePgDatabase<typeof schema>,
  partnerId: number,
  rawOfferId: string,
  locale: Locale,
): Promise<PartnerOfferAttributesEditReadResult> {
  if (!isCanonicalPositiveInteger(rawOfferId)) {
    return { ok: false, code: "INVALID_ID" };
  }
  const offerId = Number(rawOfferId);

  try {
    await requirePartnerMembership(partnerId);
  } catch {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  try {
    const offerRows = await db
      .select({ offer: schema.offers, category: schema.categories })
      .from(schema.offers)
      .leftJoin(
        schema.categories,
        eq(schema.offers.categoryId, schema.categories.id),
      )
      .where(
        and(
          eq(schema.offers.id, offerId),
          eq(schema.offers.partnerId, partnerId),
          ne(schema.offers.publicationStatus, "deleted"),
        ),
      )
      .limit(1);
    const row = offerRows[0];
    if (row === undefined || row.category === null) {
      return { ok: false, code: "NOT_FOUND" };
    }
    if (row.offer.publicationStatus !== "draft") {
      return { ok: false, code: "NOT_EDITABLE" };
    }

    const assignments = await db
      .select({
        attributeDefinitionId:
          schema.categoryAttributeAssignments.attributeDefinitionId,
        sortOrder: schema.categoryAttributeAssignments.sortOrder,
        isRequired: schema.categoryAttributeAssignments.isRequired,
        unitCode: schema.categoryAttributeAssignments.unitCode,
      })
      .from(schema.categoryAttributeAssignments)
      .where(
        eq(
          schema.categoryAttributeAssignments.categoryId,
          row.offer.categoryId,
        ),
      );
    const assignedIds = assignments.map(
      (assignment) => assignment.attributeDefinitionId,
    );

    if (assignedIds.length === 0) {
      return {
        ok: true,
        data: {
          offerId,
          expectedUpdatedAt: toIso(row.offer.updatedAt),
          configurationState: "no_assignments",
          category: {
            id: row.category.id,
            name: row.category.name,
            slug: row.category.slug,
          },
          attributes: [],
        },
      };
    }

    const definitions = await db
      .select({
        id: schema.attributeDefinitions.id,
        stableKey: schema.attributeDefinitions.stableKey,
        dataType: schema.attributeDefinitions.dataType,
        isActive: schema.attributeDefinitions.isActive,
      })
      .from(schema.attributeDefinitions)
      .where(inArray(schema.attributeDefinitions.id, assignedIds));
    const activeSupportedIds = definitions
      .filter(
        (definition) =>
          definition.isActive && SUPPORTED_TYPES.has(definition.dataType),
      )
      .map((definition) => definition.id);

    if (activeSupportedIds.length === 0) {
      return {
        ok: true,
        data: {
          offerId,
          expectedUpdatedAt: toIso(row.offer.updatedAt),
          configurationState: "configuration_inconsistent",
          category: {
            id: row.category.id,
            name: row.category.name,
            slug: row.category.slug,
          },
          attributes: [],
        },
      };
    }

    const attributeTranslations = await db
      .select({
        attributeDefinitionId:
          schema.attributeDefinitionTranslations.attributeDefinitionId,
        locale: schema.attributeDefinitionTranslations.locale,
        name: schema.attributeDefinitionTranslations.name,
        description: schema.attributeDefinitionTranslations.description,
      })
      .from(schema.attributeDefinitionTranslations)
      .where(
        inArray(
          schema.attributeDefinitionTranslations.attributeDefinitionId,
          activeSupportedIds,
        ),
      );
    const options = await db
      .select({
        id: schema.controlledOptionValues.id,
        attributeId: schema.controlledOptionValues.attributeId,
        stableKey: schema.controlledOptionValues.stableKey,
        isActive: schema.controlledOptionValues.isActive,
      })
      .from(schema.controlledOptionValues)
      .where(
        and(
          inArray(schema.controlledOptionValues.attributeId, activeSupportedIds),
          eq(schema.controlledOptionValues.isActive, true),
        ),
      );
    const optionIds = options.map((option) => option.id);
    const optionTranslations =
      optionIds.length > 0
        ? await db
            .select({
              controlledOptionValueId:
                schema.controlledOptionValueTranslations
                  .controlledOptionValueId,
              locale: schema.controlledOptionValueTranslations.locale,
              label: schema.controlledOptionValueTranslations.label,
              description:
                schema.controlledOptionValueTranslations.description,
            })
            .from(schema.controlledOptionValueTranslations)
            .where(
              inArray(
                schema.controlledOptionValueTranslations
                  .controlledOptionValueId,
                optionIds,
              ),
            )
        : [];
    const scalarRows = await db
      .select({
        attributeId: schema.offerAttributeValues.attributeId,
        valueText: schema.offerAttributeValues.valueText,
        valueNumber: schema.offerAttributeValues.valueNumber,
        valueBoolean: schema.offerAttributeValues.valueBoolean,
        valueDate: schema.offerAttributeValues.valueDate,
        valueYear: schema.offerAttributeValues.valueYear,
        optionId: schema.offerAttributeValues.optionId,
      })
      .from(schema.offerAttributeValues)
      .where(
        and(
          eq(schema.offerAttributeValues.offerId, offerId),
          inArray(schema.offerAttributeValues.attributeId, activeSupportedIds),
        ),
      );
    const multiRows = await db
      .select({
        attributeId: schema.offerAttributeOptionValues.attributeId,
        optionId: schema.offerAttributeOptionValues.optionId,
      })
      .from(schema.offerAttributeOptionValues)
      .where(
        and(
          eq(schema.offerAttributeOptionValues.offerId, offerId),
          inArray(
            schema.offerAttributeOptionValues.attributeId,
            activeSupportedIds,
          ),
        ),
      );

    const editState = buildPartnerAttributeEditReadState({
      locale,
      assignments,
      definitions,
      attributeTranslations,
      options,
      optionTranslations,
      scalarRows,
      multiRows,
    });

    return {
      ok: true,
      data: {
        offerId,
        expectedUpdatedAt: toIso(row.offer.updatedAt),
        configurationState: editState.configurationState,
        category: {
          id: row.category.id,
          name: row.category.name,
          slug: row.category.slug,
        },
        attributes: editState.attributes,
      },
    };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("[partner-offer-attributes] stage=read-model", { errorName });
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
