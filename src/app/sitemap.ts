import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { getHomeCanonical, getHomeLanguageAlternates } from "@/lib/seo/urls";

export default function sitemap(): MetadataRoute.Sitemap {
  const homepageEntries = locales.map((locale) => {
    const isDefault = locale === defaultLocale;

    return {
      url: getHomeCanonical(locale),
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: isDefault ? 1.0 : 0.9,
      alternates: {
        languages: getHomeLanguageAlternates(),
      },
    };
  });

  return homepageEntries;
}
