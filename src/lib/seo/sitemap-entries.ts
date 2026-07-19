import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/lib/i18n/config";
import {
  getHomeCanonical,
  getHomeLanguageAlternates,
  getOfferCanonical,
  getOfferLanguageAlternates,
  absoluteUrl,
} from "@/lib/seo/urls";
import { getGlossaryTerms } from "@/lib/glossary";
import {
  getLandingSitemapEntries,
  getLandingLanguageLinks,
  solutionsIndexPaths,
} from "@/lib/landing";
import type { SitemapCategoryEntry, SitemapOfferEntry } from "@/lib/seo/repository";

export type SitemapDynamicData = {
  offers: SitemapOfferEntry[];
  categories: SitemapCategoryEntry[];
};

type DynamicDataLoader = () => Promise<SitemapDynamicData>;
type WarningLogger = (message: string) => void;

const databaseUnavailableCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
]);

function deduplicateAndSort(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seenUrls = new Set<string>();
  const uniqueEntries: MetadataRoute.Sitemap = [];

  for (const entry of entries) {
    if (!seenUrls.has(entry.url)) {
      seenUrls.add(entry.url);
      uniqueEntries.push(entry);
    }
  }

  return uniqueEntries.sort((a, b) => a.url.localeCompare(b.url));
}

export function isDatabaseUnavailableError(error: unknown, depth = 0): boolean {
  if (!(error instanceof Error)) return false;

  const code = (error as NodeJS.ErrnoException).code;
  if (code && databaseUnavailableCodes.has(code)) return true;

  const message = error.message.toLowerCase();
  const hasUnavailableMessage = [
    "connection terminated due to connection timeout",
    "connection terminated unexpectedly",
    "connection timeout",
    "timeout expired",
    "database system is starting up",
    "database system is shutting down",
  ].some((needle) => message.includes(needle));

  if (hasUnavailableMessage) return true;

  const cause = (error as Error & { cause?: unknown }).cause;
  return depth < 2 && isDatabaseUnavailableError(cause, depth + 1);
}

export function getCoreSitemapEntries(): MetadataRoute.Sitemap {
  const homepageEntries = locales.map((locale) => ({
    url: getHomeCanonical(locale),
    changeFrequency: "weekly" as const,
    priority: 1.0,
    alternates: {
      languages: getHomeLanguageAlternates(),
    },
  }));

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

  const solutionsIndexAlternates = Object.fromEntries(
    Object.entries(solutionsIndexPaths).map(([locale, path]) => [locale, absoluteUrl(path)]),
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
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: glossaryHubAlternates },
    },
    ...plTerms.map((term) => ({ url: absoluteUrl(`/slownik-branzowy/${term.slug}`), changeFrequency: "monthly" as const, priority: 0.6 })),
    {
      url: absoluteUrl("/en/logistics-glossary"),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: glossaryHubAlternates },
    },
    ...enTerms.map((term) => ({ url: absoluteUrl(`/en/logistics-glossary/${term.slug}`), changeFrequency: "monthly" as const, priority: 0.6 })),
    {
      url: absoluteUrl("/de/logistik-lexikon"),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: glossaryHubAlternates },
    },
    ...deTerms.map((term) => ({ url: absoluteUrl(`/de/logistik-lexikon/${term.slug}`), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];

  return deduplicateAndSort([
    ...homepageEntries,
    ...catalogRootEntries,
    ...solutionsIndexEntries,
    ...landingEntries,
    ...glossaryEntries,
  ]);
}

export function getDynamicSitemapEntries({ offers, categories }: SitemapDynamicData): MetadataRoute.Sitemap {
  const offerEntries = offers.flatMap((offer) =>
    locales.map((locale) => ({
      url: getOfferCanonical(locale, String(offer.id)),
      lastModified: offer.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: getOfferLanguageAlternates(String(offer.id)),
      },
    })),
  );

  const categoryEntries = categories.flatMap((category) =>
    locales.map((locale) => ({
      url: absoluteUrl(locale === defaultLocale ? `/katalog/c-${category.slug}` : `/${locale}/katalog/c-${category.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );

  return deduplicateAndSort([...offerEntries, ...categoryEntries]);
}

export async function getResilientSitemapEntries(
  loadDynamicData: DynamicDataLoader,
  warn: WarningLogger = console.warn,
): Promise<MetadataRoute.Sitemap> {
  const coreEntries = getCoreSitemapEntries();

  try {
    return deduplicateAndSort([...coreEntries, ...getDynamicSitemapEntries(await loadDynamicData())]);
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error;

    warn("Sitemap database entries are temporarily unavailable; serving core URLs only.");
    return coreEntries;
  }
}
