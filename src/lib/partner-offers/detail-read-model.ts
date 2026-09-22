import "server-only";
import { eq, and, ne, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import {
  resolveCanonicalOfferModel,
  type CanonicalOfferModelResolution,
} from "@/lib/offers/model";
import { getCategoryAttributeConfigurationFromDb } from "@/lib/catalog/category-attribute-read-model-core";
import type { Locale } from "@/lib/i18n/config";
import { isCanonicalPositiveInteger } from "@/lib/admin/offers-query";
import { projectAttributeValues } from "@/lib/catalog/offer-attributes-read-model";
import { requirePartnerMembership } from "@/lib/auth/partner-membership";
import { resolvePublicOfferImage } from "@/lib/offers/public-media-resolver";
import {
  parsePartnerOfferPublicationStatus,
  type PartnerOfferPublicationStatus,
} from "@/lib/partner-offers/model-core";

export interface PartnerOfferDetailRelationalAttribute {
  attributeId: number;
  stableKey: string;
  dataType: string;
  name: string;
  unitCode: string | null;
  values: string[];
}

export interface PartnerOfferDetailMedia {
  mediaId: number;
  publicUrl: string | null;
  isPrimary: boolean;
  sortOrder: number;
  altText: string | null;
}

export interface PartnerOfferDetailDto {
  offerId: number;
  title: string;
  description: string | null;

  categoryId: number;
  categoryName: string;
  categorySlug: string;

  priceBrutto: string | null;
  priceOnRequest: boolean;

  canonicalModel: CanonicalOfferModelResolution;

  isActive: boolean;
  publicationStatus: PartnerOfferPublicationStatus;
  
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;

  relationalAttributes: PartnerOfferDetailRelationalAttribute[];
  media: PartnerOfferDetailMedia[];

  publicPreviewAllowed: boolean;
}

export type PartnerOfferDetailResult =
  | { ok: true; data: PartnerOfferDetailDto }
  | { ok: false; code: "INVALID_ID" | "NOT_FOUND" | "UNAUTHORIZED" | "SYSTEM_ERROR" };

export async function getPartnerOfferDetailReadModel(
  db: NodePgDatabase<typeof schema>,
  partnerId: number,
  rawOfferId: string,
  locale: Locale,
): Promise<PartnerOfferDetailResult> {
  if (!isCanonicalPositiveInteger(rawOfferId)) {
    return { ok: false, code: "INVALID_ID" };
  }
  const offerId = parseInt(rawOfferId, 10);

  try {
    await requirePartnerMembership(partnerId);
  } catch {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const offerRows = await db
    .select({
      offer: schema.offers,
      category: schema.categories,
    })
    .from(schema.offers)
    .leftJoin(
      schema.categories,
      eq(schema.offers.categoryId, schema.categories.id),
    )
    .where(
      and(
        eq(schema.offers.id, offerId),
        eq(schema.offers.partnerId, partnerId),
        ne(schema.offers.publicationStatus, "deleted")
      )
    )
    .limit(1);

  if (offerRows.length === 0) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const { offer, category } = offerRows[0];

  if (!category) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const publicationStatus = parsePartnerOfferPublicationStatus(
    offer.publicationStatus,
  );
  if (!publicationStatus) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const categoryConfig = await getCategoryAttributeConfigurationFromDb(
    db,
    offer.categoryId,
    locale,
    false,
    false,
  );
  const configByAttrId = new Map(categoryConfig.map((c) => [c.attributeId, c]));

  const oavRows = await db
    .select()
    .from(schema.offerAttributeValues)
    .where(eq(schema.offerAttributeValues.offerId, offerId));

  const oaovRows = await db
    .select()
    .from(schema.offerAttributeOptionValues)
    .where(eq(schema.offerAttributeOptionValues.offerId, offerId));

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

  const relationalAttributes: PartnerOfferDetailRelationalAttribute[] = [];

  for (const attrId of attrIds) {
    const config = configByAttrId.get(attrId);
    if (!config) continue; // Only expose assigned/configured attributes to Partner

    const def = defByAttrId.get(attrId);
    const stableKey = def?.stableKey ?? `unknown_${attrId}`;
    const dataType = def?.dataType ?? "unknown";
    const name = config.name;
    const unitCode = config.unitCode ?? null;

    const configOptions = config.options.map((o) => ({
      optionId: o.optionId,
      stableKey: o.stableKey,
      label: o.label,
    }));
    const values = projectAttributeValues(
      attrId,
      dataType,
      configOptions,
      oavRows,
      oaovRows,
      false // do not fallback to raw stableKeys
    );

    if (values.length > 0) {
      relationalAttributes.push({
        attributeId: attrId,
        stableKey,
        dataType,
        name,
        unitCode,
        values,
      });
    }
  }

  relationalAttributes.sort((a, b) => {
    const configA = configByAttrId.get(a.attributeId);
    const configB = configByAttrId.get(b.attributeId);
    if (configA && configB) {
      return configA.sortOrder - configB.sortOrder;
    }
    return a.stableKey.localeCompare(b.stableKey);
  });

  const mediaRows = await db
    .select()
    .from(schema.offerMedia)
    .where(eq(schema.offerMedia.offerId, offerId))
    .orderBy(schema.offerMedia.sortOrder, schema.offerMedia.id);

  const media: PartnerOfferDetailMedia[] = [];
  for (const m of mediaRows) {
    const publicUrl = resolvePublicOfferImage(null, m.storageBucket, m.objectPath);
    if (publicUrl) {
      media.push({
        mediaId: m.id,
        publicUrl,
        isPrimary: m.isPrimary,
        sortOrder: m.sortOrder,
        altText: m.altText,
      });
    }
  }

  const canonicalModel = resolveCanonicalOfferModel(
    offer.offerModel,
    offer.conversionType,
  );

  return {
    ok: true,
    data: {
      offerId: Number(offer.id),
      title: offer.title,
      description: offer.description,

      categoryId: Number(offer.categoryId),
      categoryName: category.name,
      categorySlug: category.slug,

      priceBrutto: offer.priceBrutto,
      priceOnRequest: offer.priceOnRequest,

      canonicalModel,

      isActive: offer.isActive,
      publicationStatus,
      
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt?.toISOString() ?? null,
      publishedAt: offer.publishedAt?.toISOString() ?? null,

      relationalAttributes,
      media,

      publicPreviewAllowed: offer.publicationStatus === "published" && offer.isActive && canonicalModel !== "unknown",
    },
  };
}
