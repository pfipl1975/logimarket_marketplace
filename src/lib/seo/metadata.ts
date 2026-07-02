import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import {
  getHomeCanonical,
  getHomeLanguageAlternates,
  getOfferCanonical,
  getOfferLanguageAlternates,
} from "./urls";

export async function generateHomeMetadata(locale: Locale): Promise<Metadata> {
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: getHomeCanonical(locale),
      languages: getHomeLanguageAlternates(),
    },
  };
}

export async function generateOfferMetadata(
  locale: Locale,
  offerId: string,
): Promise<Metadata> {
  const dict = await getDictionary(locale);

  // Per sprint instructions, dynamic DB queries are not used in this sprint's sitemap/metadata.
  // We use the localized generic dictionary metadata, but output specific canonical and alternates paths.
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: getOfferCanonical(locale, offerId),
      languages: getOfferLanguageAlternates(offerId),
    },
  };
}
