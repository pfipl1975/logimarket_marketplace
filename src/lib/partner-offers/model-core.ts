import {
  resolveCanonicalOfferModel,
  type CanonicalOfferModelResolution,
} from "@/lib/offers/model";

export const PARTNER_OFFER_FILTERS = [
  "all",
  "draft",
  "pending_review",
  "published",
  "hidden",
  "archived",
] as const;

export type PartnerOfferFilter = (typeof PARTNER_OFFER_FILTERS)[number];
export type PartnerOfferPublicationStatus = Exclude<PartnerOfferFilter, "all">;

export type PartnerOfferSourceRow = {
  offerId: number;
  title: string;
  categoryId: number;
  categorySlug: string | null;
  categoryName: string | null;
  offerModel: string | null;
  conversionType: string | null;
  priceBrutto: string | null;
  priceOnRequest: boolean;
  publicationStatus: string;
  isActive: boolean;
  publishedAt: Date | null;
  updatedAt: Date | null;
  createdAt: Date;
};

export type PartnerOfferListItem = {
  offerId: number;
  title: string;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  publicationStatus: PartnerOfferPublicationStatus;
  canonicalModel: CanonicalOfferModelResolution;
  priceBrutto: string | null;
  priceOnRequest: boolean;
  isActive: boolean;
  publishedAt: Date | null;
  updatedAt: Date | null;
  createdAt: Date;
  publicPreviewAllowed: boolean;
};

export type PartnerOfferCounts = Record<PartnerOfferFilter, number>;

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isValidDate(value: Date | null): boolean {
  return value === null || (value instanceof Date && !Number.isNaN(value.getTime()));
}

export function parsePartnerOfferPublicationStatus(
  value: string,
): PartnerOfferPublicationStatus | null {
  switch (value) {
    case "draft":
    case "pending_review":
    case "published":
    case "hidden":
    case "archived":
      return value;
    default:
      return null;
  }
}

export function buildPartnerOfferListItem(
  row: PartnerOfferSourceRow,
): { ok: true; item: PartnerOfferListItem } | { ok: false } {
  const publicationStatus = parsePartnerOfferPublicationStatus(
    row.publicationStatus,
  );
  if (
    !publicationStatus ||
    !isPositiveSafeInteger(row.offerId) ||
    !isPositiveSafeInteger(row.categoryId) ||
    row.title.trim().length === 0 ||
    !row.categorySlug ||
    !row.categoryName ||
    !isValidDate(row.createdAt) ||
    !isValidDate(row.updatedAt) ||
    !isValidDate(row.publishedAt)
  ) {
    return { ok: false };
  }

  const canonicalModel = resolveCanonicalOfferModel(
    row.offerModel,
    row.conversionType,
  );

  return {
    ok: true,
    item: {
      offerId: row.offerId,
      title: row.title,
      categoryId: row.categoryId,
      categorySlug: row.categorySlug,
      categoryName: row.categoryName,
      publicationStatus,
      canonicalModel,
      priceBrutto: row.priceBrutto,
      priceOnRequest: row.priceOnRequest,
      isActive: row.isActive,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
      publicPreviewAllowed:
        publicationStatus === "published" &&
        row.isActive &&
        canonicalModel !== "unknown",
    },
  };
}

export function parsePartnerOfferFilter(value: unknown): PartnerOfferFilter {
  return typeof value === "string" &&
    (PARTNER_OFFER_FILTERS as readonly string[]).includes(value)
    ? (value as PartnerOfferFilter)
    : "all";
}

export function buildPartnerOffersListModel(
  items: readonly PartnerOfferListItem[],
  requestedFilter: unknown,
) {
  const activeFilter = parsePartnerOfferFilter(requestedFilter);
  const counts: PartnerOfferCounts = {
    all: items.length,
    draft: 0,
    pending_review: 0,
    published: 0,
    hidden: 0,
    archived: 0,
  };

  for (const item of items) {
    counts[item.publicationStatus] += 1;
  }

  return {
    activeFilter,
    counts,
    filteredItems:
      activeFilter === "all"
        ? [...items]
        : items.filter((item) => item.publicationStatus === activeFilter),
  };
}
