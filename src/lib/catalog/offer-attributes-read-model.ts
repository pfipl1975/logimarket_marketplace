import { inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import type { Locale } from "@/lib/i18n/config";

export type PublicOfferAttribute = {
  attributeId: number;
  stableKey: string;
  name: string;
  unitCode: string | null;
  values: string[];
};

export function projectAttributeValues(
  attrId: number,
  dataType: string,
  configOptions:
    Array<{ optionId: number; stableKey: string; label: string }> | undefined,
  oavRows: Array<{
    attributeId: number;
    valueText: string | null;
    valueNumber: string | null;
    valueBoolean: boolean | null;
    valueDate: Date | null;
    valueYear: number | null;
    optionId: number | null;
  }>,
  oaovRows: Array<{
    attributeId: number;
    optionId: number;
  }>,
  allowFallback: boolean = true,
): string[] {
  const values: string[] = [];

  if (dataType === "multi_enum") {
    const opts = oaovRows.filter((r) => r.attributeId === attrId);
    const sorted = [...opts].sort((a, b) => {
      const cfgA = configOptions?.find((o) => o.optionId === a.optionId);
      const cfgB = configOptions?.find((o) => o.optionId === b.optionId);
      if (cfgA && cfgB) {
        const byStableKey = cfgA.stableKey.localeCompare(cfgB.stableKey);
        if (byStableKey !== 0) return byStableKey;
        return a.optionId - b.optionId;
      }
      if (cfgA) return -1;
      if (cfgB) return 1;
      return a.optionId - b.optionId;
    });
    for (const opt of sorted) {
      const optionConfig = configOptions?.find(
        (o) => o.optionId === opt.optionId,
      );
      if (optionConfig) {
        values.push(optionConfig.label);
      } else if (allowFallback) {
        values.push(`[Option ${opt.optionId}]`);
      }
    }
  } else {
    const val = oavRows.find((r) => r.attributeId === attrId);
    if (val) {
      if (dataType === "text" && val.valueText !== null) {
        values.push(val.valueText);
      } else if (dataType === "number" && val.valueNumber !== null) {
        values.push(val.valueNumber);
      } else if (dataType === "boolean" && val.valueBoolean !== null) {
        values.push(val.valueBoolean ? "true" : "false");
      } else if (dataType === "date" && val.valueDate !== null) {
        const d = new Date(val.valueDate);
        values.push(!isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "");
      } else if (dataType === "year" && val.valueYear !== null) {
        values.push(val.valueYear.toString());
      } else if (dataType === "enum" && val.optionId !== null) {
        const optionConfig = configOptions?.find(
          (o) => o.optionId === val.optionId,
        );
        if (optionConfig) {
          values.push(optionConfig.label);
        } else if (allowFallback) {
          values.push(`[Option ${val.optionId}]`);
        }
      }
    }
  }

  return values;
}

export async function getOffersRelationalAttributes(
  db: NodePgDatabase<typeof schema>,
  offers: { id: number; categoryId: number }[],
  locale: Locale,
): Promise<Record<number, PublicOfferAttribute[]>> {
  if (offers.length === 0) return {};

  const offerIds = offers.map((o) => o.id);
  const uniqueCategoryIds = [...new Set(offers.map((o) => o.categoryId))];

  const assignments = await db
    .select()
    .from(schema.categoryAttributeAssignments)
    .where(
      inArray(
        schema.categoryAttributeAssignments.categoryId,
        uniqueCategoryIds,
      ),
    );

  const visibleAssignments = assignments.filter((a) => a.isVisible);
  if (visibleAssignments.length === 0) return {};

  const assignedAttrIds = [
    ...new Set(visibleAssignments.map((a) => a.attributeDefinitionId)),
  ];

  const defs = await db
    .select()
    .from(schema.attributeDefinitions)
    .where(inArray(schema.attributeDefinitions.id, assignedAttrIds));

  const activeDefIds = new Set(defs.filter((d) => d.isActive).map((d) => d.id));
  if (activeDefIds.size === 0) return {};

  const attrTrans = await db
    .select()
    .from(schema.attributeDefinitionTranslations)
    .where(
      inArray(
        schema.attributeDefinitionTranslations.attributeDefinitionId,
        Array.from(activeDefIds),
      ),
    );

  const options = await db
    .select()
    .from(schema.controlledOptionValues)
    .where(
      inArray(
        schema.controlledOptionValues.attributeId,
        Array.from(activeDefIds),
      ),
    );

  const activeOptIds = new Set(
    options.filter((o) => o.isActive).map((o) => o.id),
  );

  const optTrans =
    activeOptIds.size > 0
      ? await db
          .select()
          .from(schema.controlledOptionValueTranslations)
          .where(
            inArray(
              schema.controlledOptionValueTranslations.controlledOptionValueId,
              Array.from(activeOptIds),
            ),
          )
      : [];

  const oavRows = await db
    .select()
    .from(schema.offerAttributeValues)
    .where(inArray(schema.offerAttributeValues.offerId, offerIds));

  const oaovRows = await db
    .select()
    .from(schema.offerAttributeOptionValues)
    .where(inArray(schema.offerAttributeOptionValues.offerId, offerIds));


  return buildPublicOfferAttributes(
    offers,
    assignments,
    defs,
    attrTrans,
    options,
    optTrans,
    oavRows,
    oaovRows,
    locale
  );
}

export function buildPublicOfferAttributes(
  offers: { id: number; categoryId: number }[],
  assignments: (typeof schema.categoryAttributeAssignments.$inferSelect)[],
  defs: (typeof schema.attributeDefinitions.$inferSelect)[],
  attrTrans: (typeof schema.attributeDefinitionTranslations.$inferSelect)[],
  options: (typeof schema.controlledOptionValues.$inferSelect)[],
  optTrans: (typeof schema.controlledOptionValueTranslations.$inferSelect)[],
  oavRows: (typeof schema.offerAttributeValues.$inferSelect)[],
  oaovRows: (typeof schema.offerAttributeOptionValues.$inferSelect)[],
  locale: Locale
): Record<number, PublicOfferAttribute[]> {
  const visibleAssignments = assignments.filter((a) => a.isVisible);
  const activeDefIds = new Set(defs.filter((d) => d.isActive).map((d) => d.id));

  const result: Record<number, PublicOfferAttribute[]> = {};

  for (const offer of offers) {
    const offerOav = oavRows.filter((r) => r.offerId === offer.id);
    const offerOaov = oaovRows.filter((r) => r.offerId === offer.id);
    const offerAssignments = visibleAssignments.filter(
      (a) =>
        a.categoryId === offer.categoryId &&
        activeDefIds.has(a.attributeDefinitionId),
    );

    offerAssignments.sort((a, b) => a.sortOrder - b.sortOrder);

    const publicAttrs: PublicOfferAttribute[] = [];

    for (const assignment of offerAssignments) {
      const def = defs.find((d) => d.id === assignment.attributeDefinitionId);
      if (!def) continue;

      const tLoc = attrTrans.find(
        (t) => t.attributeDefinitionId === def.id && t.locale === locale,
      );
      const tPl = attrTrans.find(
        (t) => t.attributeDefinitionId === def.id && t.locale === "pl",
      );
      const trans = tLoc || tPl;
      const name = trans?.name ?? def.stableKey;

      const attrOpts = options.filter(
        (o) => o.attributeId === def.id && o.isActive,
      );
      const configOptions = attrOpts.map((opt) => {
        const otLoc = optTrans.find(
          (t) => t.controlledOptionValueId === opt.id && t.locale === locale,
        );
        const otPl = optTrans.find(
          (t) => t.controlledOptionValueId === opt.id && t.locale === "pl",
        );
        const oTrans = otLoc || otPl;
        return {
          optionId: opt.id,
          stableKey: opt.stableKey,
          label: oTrans?.label ?? opt.stableKey,
        };
      });

      const values = projectAttributeValues(
        def.id,
        def.dataType,
        configOptions,
        offerOav,
        offerOaov,
        false, // allowFallback=false
      );

      if (values.length > 0) {
        publicAttrs.push({
          attributeId: def.id,
          stableKey: def.stableKey,
          name,
          unitCode: assignment.unitCode,
          values,
        });
      }
    }

    result[offer.id] = publicAttrs;
  }

  return result;
}
