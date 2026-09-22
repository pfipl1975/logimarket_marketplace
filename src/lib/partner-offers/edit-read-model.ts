import "server-only";
import { eq, and, ne } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { isCanonicalPositiveInteger } from "@/lib/admin/offers-query";
import { requirePartnerMembership } from "@/lib/auth/partner-membership";
import { resolveTechnicalModelToPartnerOfferTypeCore, type PartnerFacingOfferType } from "@/lib/offers/offer-type-mapping";

export interface PartnerOfferEditDto {
  offerId: number;
  expectedUpdatedAt: string | null; // ISO string

  title: string;
  description: string | null;

  categoryId: number;
  categoryName: string;
  categorySlug: string;

  priceBrutto: string | null;
  priceOnRequest: boolean;

  partnerOfferType: PartnerFacingOfferType;
  outboundUrl: string | null;

  publicationStatus: string;
}

export type PartnerOfferEditReadResult =
  | { ok: true; data: PartnerOfferEditDto }
  | { ok: false; code: "INVALID_ID" | "NOT_FOUND" | "UNAUTHORIZED" | "SYSTEM_ERROR" | "NOT_EDITABLE" };

export async function getPartnerOfferEditReadModel(
  db: NodePgDatabase<typeof schema>,
  partnerId: number,
  rawOfferId: string,
): Promise<PartnerOfferEditReadResult> {
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
      eq(schema.offers.categoryId, schema.categories.id)
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

  if (offer.publicationStatus !== "draft") {
    return { ok: false, code: "NOT_EDITABLE" };
  }

  const partnerOfferType = resolveTechnicalModelToPartnerOfferTypeCore(
    offer.offerModel,
    offer.conversionType
  );

  if (partnerOfferType === null) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const expectedUpdatedAt = offer.updatedAt
    ? offer.updatedAt.toISOString()
    : null;

  return {
    ok: true,
    data: {
      offerId,
      expectedUpdatedAt,
      title: offer.title,
      description: offer.description,
      categoryId: offer.categoryId,
      categoryName: category.name,
      categorySlug: category.slug,
      priceBrutto: offer.priceBrutto,
      priceOnRequest: offer.priceOnRequest,
      partnerOfferType,
      outboundUrl: offer.outboundUrl,
      publicationStatus: offer.publicationStatus,
    },
  };
}
