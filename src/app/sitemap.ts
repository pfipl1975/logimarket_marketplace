import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { getHomeCanonical, getHomeLanguageAlternates, getOfferCanonical } from "@/lib/seo/urls";
import { getSitemapOfferEntries } from "@/lib/seo/repository";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const homepageEntries = locales.map((locale) => {
    const isDefault = locale === defaultLocale;

    return {
      url: getHomeCanonical(locale),
      changeFrequency: "daily" as const,
      priority: isDefault ? 1.0 : 0.9,
      alternates: {
        languages: getHomeLanguageAlternates(),
      },
    };
  });

  const offers = await getSitemapOfferEntries();

  const offerEntries = offers.flatMap((offer) =>
    locales.map((locale) => ({
      url: getOfferCanonical(locale, String(offer.id)),
      lastModified: offer.createdAt,
    }))
  );

  return [...homepageEntries, ...offerEntries];
}
