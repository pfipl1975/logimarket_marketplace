import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/lib/i18n/config";
import {
  getHomeCanonical,
  getHomeLanguageAlternates,
  getOfferCanonical,
  getOfferLanguageAlternates,
  absoluteUrl,
} from "@/lib/seo/urls";
import { getSitemapOfferEntries, getSitemapCategoryEntries } from "@/lib/seo/repository";
import { getGlossaryTerms } from "@/lib/glossary";
import {
  getLandingSitemapEntries,
  getLandingLanguageLinks,
  solutionsIndexPaths,
} from "@/lib/landing";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Homepage entries (stable root-level public hubs)
  const homepageEntries = locales.map((locale) => {
    const isDefault = locale === defaultLocale;

    return {
      url: getHomeCanonical(locale),
      changeFrequency: "weekly" as const,
      priority: 1.0,
      alternates: {
        languages: getHomeLanguageAlternates(),
      },
    };
  });

  // 2. Catalog Root entries (stable root-level public hubs)
  const catalogRootEntries = locales.map((locale) => {
    const path = locale === defaultLocale ? "/katalog" : `/${locale}/katalog`;
    return {
      url: absoluteUrl(path),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: {
          pl: absoluteUrl("/katalog"),
          en: absoluteUrl("/en/katalog"),
          de: absoluteUrl("/de/katalog"),
          fr: absoluteUrl("/fr/katalog"),
          uk: absoluteUrl("/uk/katalog"),
          es: absoluteUrl("/es/katalog"),
          zh: absoluteUrl("/zh/katalog"),
          "x-default": absoluteUrl("/katalog"),
        },
      },
    };
  });

  // 3. Purchase Intent Landing Pages
  // Dynamic locale mapping generated from the existing source of truth.
  const landingEntries = getLandingSitemapEntries().map((entry) => {
    const rawLinks = getLandingLanguageLinks(entry.intent);
    const languagesMap = Object.fromEntries(
      Object.entries(rawLinks).map(([locale, path]) => [locale, absoluteUrl(path)]),
    );

    return {
      url: absoluteUrl(entry.path),
      changeFrequency: "weekly" as const,
      priority: 0.75,
      alternates: {
        languages: languagesMap,
      },
    };
  });

  // 4. Solutions Index Pages — one per locale
  const solutionsIndexAlternates = Object.fromEntries(
    Object.entries(solutionsIndexPaths).map(([loc, path]) => [loc, absoluteUrl(path)]),
  );
  solutionsIndexAlternates["x-default"] = absoluteUrl(solutionsIndexPaths.pl);

  const solutionsIndexEntries = Object.entries(solutionsIndexPaths).map(([, path]) => ({
    url: absoluteUrl(path),
    changeFrequency: "weekly" as const,
    priority: 0.8,
    alternates: {
      languages: solutionsIndexAlternates,
    },
  }));

  // Fetch categories and offers using existing build-safe read-only repository helpers.
  const [offers, cats] = await Promise.all([
    getSitemapOfferEntries(),
    getSitemapCategoryEntries(),
  ]);

  // 4. Offer Detail Pages
  // Localized offer detail URLs are canonical equivalents of the same offer.
  const offerEntries = offers.flatMap((offer) =>
    locales.map((locale) => ({
      url: getOfferCanonical(locale, String(offer.id)),
      lastModified: offer.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: getOfferLanguageAlternates(String(offer.id)),
      },
    }))
  );

  // 5. Category Pages
  // Intentionally left without alternates because there is no explicit localized category mapping registry.
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

  // 6. Glossary Pages
  // Glossary hubs are stable root-level public hubs. Glossary terms are canonical-only.
  const plTerms = getGlossaryTerms("pl");
  const enTerms = getGlossaryTerms("en");
  const deTerms = getGlossaryTerms("de");

  const glossaryHubAlternates = {
    pl: absoluteUrl("/slownik-branzowy"),
    en: absoluteUrl("/en/logistics-glossary"),
    de: absoluteUrl("/de/logistik-lexikon"),
    "x-default": absoluteUrl("/slownik-branzowy"),
  };

  const glossaryEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/slownik-branzowy"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: glossaryHubAlternates,
      },
    },
    ...plTerms.map((term) => ({
      url: absoluteUrl(`/slownik-branzowy/${term.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: absoluteUrl("/en/logistics-glossary"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: glossaryHubAlternates,
      },
    },
    ...enTerms.map((term) => ({
      url: absoluteUrl(`/en/logistics-glossary/${term.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: absoluteUrl("/de/logistik-lexikon"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: glossaryHubAlternates,
      },
    },
    ...deTerms.map((term) => ({
      url: absoluteUrl(`/de/logistik-lexikon/${term.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  // Combine all entries
  const allEntries = [
    ...homepageEntries,
    ...catalogRootEntries,
    ...solutionsIndexEntries,
    ...landingEntries,
    ...offerEntries,
    ...categoryEntries,
    ...glossaryEntries,
  ];

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueEntries: MetadataRoute.Sitemap = [];

  for (const entry of allEntries) {
    if (!seenUrls.has(entry.url)) {
      seenUrls.add(entry.url);
      uniqueEntries.push(entry);
    }
  }

  // Sort alphabetically by URL for determinism
  uniqueEntries.sort((a, b) => a.url.localeCompare(b.url));

  return uniqueEntries;
}
