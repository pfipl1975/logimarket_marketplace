import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/authorization-errors";
import { requirePartnerMembership } from "@/lib/auth/partner-membership";
import { db } from "@/lib/db";
import {
  buildPartnerOfferListItem,
  type PartnerOfferListItem,
  type PartnerOfferSourceRow,
} from "@/lib/partner-offers/model-core";
import { categories, offers } from "@/lib/schema";

type PartnerOffersDependencies = {
  authorize: (partnerId: number) => Promise<unknown>;
  loadRows: (partnerId: number) => Promise<PartnerOfferSourceRow[]>;
};

export type PartnerOffersReadResult =
  | { ok: true; items: PartnerOfferListItem[] }
  | { ok: false; code: "UNAUTHORIZED" | "INVALID_OFFER_STATE" | "SYSTEM_ERROR" };

async function loadPartnerOfferRows(partnerId: number): Promise<PartnerOfferSourceRow[]> {
  return db
    .select({
      offerId: offers.id,
      title: offers.title,
      categoryId: offers.categoryId,
      categorySlug: categories.slug,
      categoryName: categories.name,
      offerModel: offers.offerModel,
      conversionType: offers.conversionType,
      priceBrutto: offers.priceBrutto,
      priceOnRequest: offers.priceOnRequest,
      publicationStatus: offers.publicationStatus,
      isActive: offers.isActive,
      publishedAt: offers.publishedAt,
      updatedAt: offers.updatedAt,
      createdAt: offers.createdAt,
    })
    .from(offers)
    .leftJoin(categories, eq(offers.categoryId, categories.id))
    .where(
      and(
        eq(offers.partnerId, partnerId),
        ne(offers.publicationStatus, "deleted"),
      ),
    )
    .orderBy(desc(offers.updatedAt), desc(offers.createdAt), desc(offers.id));
}

export async function getPartnerOffersListWithDependencies(
  partnerId: number,
  dependencies: PartnerOffersDependencies,
): Promise<PartnerOffersReadResult> {
  try {
    await dependencies.authorize(partnerId);
    const rows = await dependencies.loadRows(partnerId);
    const items: PartnerOfferListItem[] = [];

    for (const row of rows) {
      const built = buildPartnerOfferListItem(row);
      if (!built.ok) return { ok: false, code: "INVALID_OFFER_STATE" };
      items.push(built.item);
    }

    return { ok: true, items };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return { ok: false, code: "UNAUTHORIZED" };
    }
    console.error("getPartnerOffersList error", error);
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function getPartnerOffersList(
  partnerId: number,
): Promise<PartnerOffersReadResult> {
  return getPartnerOffersListWithDependencies(partnerId, {
    authorize: requirePartnerMembership,
    loadRows: loadPartnerOfferRows,
  });
}
