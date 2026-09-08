import type { CatalogOfferSearchResult, NormalizedCatalogSearchQuery } from "./types";
import { resolveCategoryName } from "@/lib/i18n/category-labels";
import { getOfferPath } from "@/lib/i18n/paths";
import { resolvePublicOfferImage } from "@/lib/offers/public-media-resolver";

type DbOfferResult = {
  id: number;
  title: string;
  imageUrl: string | null;
  offerModel: string;
  isFeatured: boolean;
  publishedAt: Date | null;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  partnerName: string;
  score: number;
  primaryMediaStorageBucket: string | null;
  primaryMediaObjectPath: string | null;
};

export function projectCatalogOfferSearchResults(
  dbOffers: DbOfferResult[],
  query: NormalizedCatalogSearchQuery,
  localeBySlug?: Record<string, string>,
  fallbackBySlug?: Record<string, string>
): CatalogOfferSearchResult[] {
  return dbOffers.map((offer) => {
    const resolvedImageUrl = resolvePublicOfferImage(
      offer.imageUrl,
      offer.primaryMediaStorageBucket,
      offer.primaryMediaObjectPath
    );

    return {
      type: "offer",
      id: offer.id,
      title: offer.title,
      categoryLabel: resolveCategoryName({
        slug: offer.categorySlug,
        dbName: offer.categoryName,
        localeBySlug,
        fallbackBySlug,
      }),
      partnerName: offer.partnerName,
      imageUrl: resolvedImageUrl,
      offerModel: offer.offerModel,
      href: getOfferPath(query.locale, String(offer.id)),
      score: offer.score,
    };
  });
}
