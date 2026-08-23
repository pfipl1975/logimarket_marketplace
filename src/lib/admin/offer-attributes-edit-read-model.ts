import { eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import type { Locale } from "@/lib/i18n/config";

export type AdminAttributeEditViewModel = {
  attributeId: number;
  stableKey: string;
  dataType: string;
  localizedName: string;
  localizedShortLabel: string | null;
  localizedDescription: string | null;
  unitCode: string | null;
  sortOrder: number;
  isRequiredIndicator: boolean;
  isOrphan: boolean;
  isAttributeActive: boolean;
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
  options: {
    optionId: number;
    stableKey: string;
    localizedLabel: string;
    isActive: boolean;
  }[];
};

export type AdminOfferAttributesEditReadResult =
  | {
      ok: true;
      offerId: number;
      expectedUpdatedAt: string | null;
      categoryId: number;
      attributes: AdminAttributeEditViewModel[];
    }
  | { ok: false; code: "INVALID_ID" | "NOT_FOUND" };

export async function getAdminOfferAttributesEditModel(
  db: NodePgDatabase<typeof schema>,
  offerId: number,
  locale: Locale,
): Promise<AdminOfferAttributesEditReadResult> {
  // 1. Fetch Offer to get categoryId and expectedUpdatedAt
  const offerRows = await db
    .select({
      categoryId: schema.offers.categoryId,
      updatedAt: schema.offers.updatedAt,
      publicationStatus: schema.offers.publicationStatus,
    })
    .from(schema.offers)
    .where(eq(schema.offers.id, offerId))
    .limit(1);

  if (offerRows.length === 0) return { ok: false, code: "NOT_FOUND" };
  const { categoryId, updatedAt } = offerRows[0];
  const expectedUpdatedAt = updatedAt?.toISOString() ?? null;

  // 2. Fetch Category Assignments (all, regardless of isActive for now, we check attribute isActive later)
  const assignments = await db
    .select()
    .from(schema.categoryAttributeAssignments)
    .where(eq(schema.categoryAttributeAssignments.categoryId, categoryId));

  const assignedAttrIds = new Set(
    assignments.map((a) => a.attributeDefinitionId),
  );

  // 3. Fetch current values for this offer
  const oavRows = await db
    .select()
    .from(schema.offerAttributeValues)
    .where(eq(schema.offerAttributeValues.offerId, offerId));

  const oaovRows = await db
    .select()
    .from(schema.offerAttributeOptionValues)
    .where(eq(schema.offerAttributeOptionValues.offerId, offerId));

  const valueAttrIds = new Set([
    ...oavRows.map((r) => r.attributeId),
    ...oaovRows.map((r) => r.attributeId),
  ]);

  // The final set of attributes is assigned ones + orphan ones (has value but not assigned)
  const allAttrIds = new Set([...assignedAttrIds, ...valueAttrIds]);

  if (allAttrIds.size === 0) {
    return { ok: true, offerId, expectedUpdatedAt, categoryId, attributes: [] };
  }

  // 4. Fetch definitions for all these attributes
  const definitions = await db
    .select()
    .from(schema.attributeDefinitions)
    .where(inArray(schema.attributeDefinitions.id, Array.from(allAttrIds)));

  // 5. Fetch translations for these attributes
  const attrTranslations = await db
    .select()
    .from(schema.attributeDefinitionTranslations)
    .where(
      inArray(
        schema.attributeDefinitionTranslations.attributeDefinitionId,
        Array.from(allAttrIds),
      ),
    );

  // 6. Fetch options (and translations) for these attributes
  const options = await db
    .select()
    .from(schema.controlledOptionValues)
    .where(
      inArray(
        schema.controlledOptionValues.attributeId,
        Array.from(allAttrIds),
      ),
    );

  const optionIds = options.map((o) => o.id);
  const optTranslations =
    optionIds.length > 0
      ? await db
          .select()
          .from(schema.controlledOptionValueTranslations)
          .where(
            inArray(
              schema.controlledOptionValueTranslations.controlledOptionValueId,
              optionIds,
            ),
          )
      : [];

  // 7. Assemble View Model
  const attributes: AdminAttributeEditViewModel[] = [];

  for (const def of definitions) {
    const isAssigned = assignedAttrIds.has(def.id);
    const assignment = assignments.find(
      (a) => a.attributeDefinitionId === def.id,
    );
    const isOrphan = !isAssigned && valueAttrIds.has(def.id);

    // Fallback translation: requested locale -> 'pl' -> stableKey
    const tLoc = attrTranslations.find(
      (t) => t.attributeDefinitionId === def.id && t.locale === locale,
    );
    const tPl = attrTranslations.find(
      (t) => t.attributeDefinitionId === def.id && t.locale === "pl",
    );
    const trans = tLoc || tPl;

    const localizedName = trans?.name ?? def.stableKey;
    const localizedShortLabel = trans?.shortLabel ?? null;
    const localizedDescription = trans?.description ?? null;

    // Collect options
    const attrOptions = options.filter((o) => o.attributeId === def.id);
    const optionsVm = attrOptions.map((opt) => {
      const otLoc = optTranslations.find(
        (t) => t.controlledOptionValueId === opt.id && t.locale === locale,
      );
      const otPl = optTranslations.find(
        (t) => t.controlledOptionValueId === opt.id && t.locale === "pl",
      );
      const oTrans = otLoc || otPl;
      return {
        optionId: opt.id,
        stableKey: opt.stableKey,
        localizedLabel: oTrans?.label ?? opt.stableKey,
        isActive: opt.isActive,
      };
    });
    // sort options by stableKey for consistency
    optionsVm.sort((a, b) => a.stableKey.localeCompare(b.stableKey));

    // Determine current value
    const scalarVal = oavRows.find((r) => r.attributeId === def.id);
    const multiVal = oaovRows.filter((r) => r.attributeId === def.id);

    const hasValue = !!scalarVal || multiVal.length > 0;

    let dateStr = undefined;
    if (scalarVal?.valueDate) {
      const d = new Date(scalarVal.valueDate);
      if (!isNaN(d.getTime())) dateStr = d.toISOString().split("T")[0];
    }

    attributes.push({
      attributeId: def.id,
      stableKey: def.stableKey,
      dataType: def.dataType,
      localizedName,
      localizedShortLabel,
      localizedDescription,
      unitCode: assignment?.unitCode ?? null,
      sortOrder: assignment?.sortOrder ?? 9999,
      isRequiredIndicator: assignment?.isRequired ?? false,
      isOrphan,
      isAttributeActive: def.isActive,
      currentValue: {
        hasValue,
        text: scalarVal?.valueText ?? undefined,
        number: scalarVal?.valueNumber ?? undefined,
        boolean: scalarVal?.valueBoolean ?? undefined,
        date: dateStr,
        year: scalarVal?.valueYear ?? undefined,
        optionId: scalarVal?.optionId ?? undefined,
        optionIds:
          multiVal.length > 0 ? multiVal.map((m) => m.optionId) : undefined,
      },
      options: optionsVm,
    });
  }

  // Sort: assigned first (by sortOrder), then orphans (by stableKey)
  attributes.sort((a, b) => {
    if (!a.isOrphan && b.isOrphan) return -1;
    if (a.isOrphan && !b.isOrphan) return 1;
    if (!a.isOrphan && !b.isOrphan) {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.stableKey.localeCompare(b.stableKey);
    }
    return a.stableKey.localeCompare(b.stableKey);
  });

  return { ok: true, offerId, expectedUpdatedAt, categoryId, attributes };
}
