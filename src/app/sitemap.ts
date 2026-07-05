import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { getHomeCanonical, getHomeLanguageAlternates, getOfferCanonical, absoluteUrl } from "@/lib/seo/urls";
import { getSitemapOfferEntries, getSitemapCategoryEntries } from "@/lib/seo/repository";
import { getGlossaryTerms } from "@/lib/glossary";

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

  const catalogRootEntries = locales.map((locale) => {
    const path = locale === defaultLocale ? "/katalog" : `/${locale}/katalog`;
    return {
      url: absoluteUrl(path),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  const [offers, cats] = await Promise.all([
    getSitemapOfferEntries(),
    getSitemapCategoryEntries(),
  ]);

  const offerEntries = offers.flatMap((offer) =>
    locales.map((locale) => ({
      url: getOfferCanonical(locale, String(offer.id)),
      lastModified: offer.createdAt,
    }))
  );

  const categoryEntries = cats.flatMap((cat) =>
    locales.map((locale) => {
      const path = locale === defaultLocale ? `/katalog/c-${cat.slug}` : `/${locale}/katalog/c-${cat.slug}`;
      return {
        url: absoluteUrl(path),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    })
  );

  const plTerms = getGlossaryTerms("pl");
  const enTerms = getGlossaryTerms("en");
  const deTerms = getGlossaryTerms("de");

  const glossaryEntries = [
    {
      url: absoluteUrl("/slownik-branzowy"),
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    ...plTerms.map((term) => ({
      url: absoluteUrl(`/slownik-branzowy/${term.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    {
      url: absoluteUrl("/en/logistics-glossary"),
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    ...enTerms.map((term) => ({
      url: absoluteUrl(`/en/logistics-glossary/${term.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    {
      url: absoluteUrl("/de/logistik-lexikon"),
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    ...deTerms.map((term) => ({
      url: absoluteUrl(`/de/logistik-lexikon/${term.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  return [...homepageEntries, ...catalogRootEntries, ...offerEntries, ...categoryEntries, ...glossaryEntries];
}
