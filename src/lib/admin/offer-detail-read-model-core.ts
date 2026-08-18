import { eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import type { TechnicalAttributes } from "@/lib/schema";
import { resolveCanonicalOfferModel, type CanonicalOfferModelResolution } from "@/lib/offers/model";
import { isPublicOfferDetailStatus } from "@/lib/offers/status";
import { getCategoryAttributeConfigurationFromDb } from "@/lib/catalog/category-attribute-read-model-core";
import type { CategoryAttributeConfiguration } from "@/lib/catalog/category-attribute-read-model-core";
import type { Locale } from "@/lib/i18n/config";
import { isCanonicalPositiveInteger } from "./offers-query";

export interface AdminOfferDetailRelationalAttribute {
  attributeId: number;
  stableKey: string;
  dataType: string;
  name: string;
  unitCode: string | null;
  values: string[];
  isAssignedToCategory: boolean;
}

export interface AdminOfferDetailDto {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;

  partnerId: number;
  partnerName: string;

  categoryId: number;
  categoryName: string;
  categorySlug: string;

  /** Exact raw string from DB (numeric type), never Number()-converted */
  priceBrutto: string | null;
  priceOnRequest: boolean;

  rawOfferModel: string;
  rawConversionType: string;
  canonicalModel: CanonicalOfferModelResolution;
  contractModel: string | null;

  outboundUrl: string | null;

  isActive: boolean;
  isFeatured: boolean;

  publicationStatus: string;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;

  technicalAttributes: TechnicalAttributes;
  relationalAttributes: AdminOfferDetailRelationalAttribute[];

  publicPreviewAllowed: boolean;
}

export type AdminOfferDetailResult =
  | { ok: true; data: AdminOfferDetailDto }
  | { ok: false; code: "INVALID_ID" | "NOT_FOUND" };

/**
 * Pure projection helper — projects a single attribute's value(s) from raw DB rows.
 * Extracted for deterministic unit testing without DB.
 */
export function projectAttributeValues(
  attrId: number,
  dataType: string,
  config: CategoryAttributeConfiguration | undefined,
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
  }>
): string[] {
  const values: string[] = [];

  if (dataType === "multi_enum") {
    // Deterministic order: sort by stableKey if available in config, fallback to optionId
    const opts = oaovRows.filter((r) => r.attributeId === attrId);
    const sorted = [...opts].sort((a, b) => {
      const cfgA = config?.options.find((o) => o.optionId === a.optionId);
      const cfgB = config?.options.find((o) => o.optionId === b.optionId);
      if (cfgA && cfgB) return cfgA.stableKey.localeCompare(cfgB.stableKey);
      return a.optionId - b.optionId;
    });
    for (const opt of sorted) {
      const optionConfig = config?.options.find((o) => o.optionId === opt.optionId);
      // Show label if available, otherwise show numeric optionId (no template literal interpolation risk)
      values.push(optionConfig ? optionConfig.label : `[Option ${opt.optionId}]`);
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
        const optionConfig = config?.options.find((o) => o.optionId === val.optionId);
        // Show label if available, otherwise show numeric optionId
        values.push(optionConfig ? optionConfig.label : `[Option ${val.optionId}]`);
      }
    }
  }

  return values;
}

export async function getAdminOfferDetailReadModel(
  db: NodePgDatabase<typeof schema>,
  rawId: string,
  locale: Locale
): Promise<AdminOfferDetailResult> {
  if (!isCanonicalPositiveInteger(rawId)) {
    return { ok: false, code: "INVALID_ID" };
  }
  const id = parseInt(rawId, 10);

  const offerRows = await db
    .select({
      offer: schema.offers,
      partner: schema.partners,
      category: schema.categories,
    })
    .from(schema.offers)
    .leftJoin(schema.partners, eq(schema.offers.partnerId, schema.partners.id))
    .leftJoin(schema.categories, eq(schema.offers.categoryId, schema.categories.id))
    .where(eq(schema.offers.id, id))
    .limit(1);

  if (offerRows.length === 0) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const { offer, partner, category } = offerRows[0];

  const categoryConfig = await getCategoryAttributeConfigurationFromDb(
    db,
    offer.categoryId,
    locale,
    false,
    false
  );
  const configByAttrId = new Map(categoryConfig.map((c) => [c.attributeId, c]));

  const oavRows = await db
    .select()
    .from(schema.offerAttributeValues)
    .where(eq(schema.offerAttributeValues.offerId, id));

  const oaovRows = await db
    .select()
    .from(schema.offerAttributeOptionValues)
    .where(eq(schema.offerAttributeOptionValues.offerId, id));

  const attrIds = new Set([
    ...oavRows.map((r) => r.attributeId),
    ...oaovRows.map((r) => r.attributeId),
  ]);

  const allDefinitions =
    attrIds.size > 0
      ? await db
          .select()
          .from(schema.attributeDefinitions)
          .where(inArray(schema.attributeDefinitions.id, Array.from(attrIds)))
      : [];

  const defByAttrId = new Map(allDefinitions.map((d) => [d.id, d]));

  const relationalAttributes: AdminOfferDetailRelationalAttribute[] = [];

  for (const attrId of attrIds) {
    const config = configByAttrId.get(attrId);
    const def = defByAttrId.get(attrId);

    const stableKey = def?.stableKey ?? `unknown_${attrId}`;
    const dataType = def?.dataType ?? "unknown";
    const name = config?.name ?? stableKey;
    const unitCode = config?.unitCode ?? null;
    const isAssignedToCategory = config !== undefined;

    const values = projectAttributeValues(attrId, dataType, config, oavRows, oaovRows);

    relationalAttributes.push({
      attributeId: attrId,
      stableKey,
      dataType,
      name,
      unitCode,
      values,
      isAssignedToCategory,
    });
  }

  // Sort by category config sortOrder if available (assigned first), then by stableKey
  relationalAttributes.sort((a, b) => {
    const configA = configByAttrId.get(a.attributeId);
    const configB = configByAttrId.get(b.attributeId);
    if (configA && configB) {
      if (configA.sortOrder !== configB.sortOrder) return configA.sortOrder - configB.sortOrder;
      return a.stableKey.localeCompare(b.stableKey);
    } else if (configA) {
      return -1;
    } else if (configB) {
      return 1;
    }
    return a.stableKey.localeCompare(b.stableKey);
  });

  return {
    ok: true,
    data: {
      id: Number(offer.id),
      title: offer.title,
      description: offer.description,
      imageUrl: offer.imageUrl,

      partnerId: Number(offer.partnerId),
      partnerName: partner?.companyName ?? "—",

      categoryId: Number(offer.categoryId),
      categoryName: category?.name ?? "—",
      categorySlug: category?.slug ?? "—",

      // priceBrutto: preserve exact raw DB string, do NOT convert through Number()
      priceBrutto: offer.priceBrutto,
      priceOnRequest: offer.priceOnRequest,

      rawOfferModel: offer.offerModel,
      rawConversionType: offer.conversionType,
      canonicalModel: resolveCanonicalOfferModel(offer.offerModel, offer.conversionType),
      contractModel: offer.contractModel,

      outboundUrl: offer.outboundUrl,

      isActive: offer.isActive,
      isFeatured: offer.isFeatured,

      publicationStatus: offer.publicationStatus,
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt?.toISOString() ?? null,
      publishedAt: offer.publishedAt?.toISOString() ?? null,
      archivedAt: offer.archivedAt?.toISOString() ?? null,
      deletedAt: offer.deletedAt?.toISOString() ?? null,

      technicalAttributes: offer.technicalAttributes as TechnicalAttributes,
      relationalAttributes,

      publicPreviewAllowed: isPublicOfferDetailStatus(offer.publicationStatus),
    },
  };
}
