import { getHomePath } from "@/lib/i18n/paths";
import { locales, type Locale } from "@/lib/i18n/config";
import { landingPages } from "./content";
import type { LandingIntent, LandingLocale, LandingPageContent } from "./types";

export type {
  LandingDecisionFactor,
  LandingFaqItem,
  LandingIntent,
  LandingLink,
  LandingLocale,
  LandingPageContent,
} from "./types";

export const landingLocales = ["pl", "en", "de"] as const satisfies LandingLocale[];

export function getLandingPage(
  locale: LandingLocale,
  slug: string,
): LandingPageContent | null {
  return landingPages.find((page) => page.locale === locale && page.slug === slug) ?? null;
}

export function getLandingPageByIntent(
  intent: LandingIntent,
  locale: LandingLocale,
): LandingPageContent {
  const landing = landingPages.find((page) => page.locale === locale && page.intent === intent);

  if (!landing) {
    throw new Error(`Missing landing page for ${locale}:${intent}`);
  }

  return landing;
}

export function getLandingPagesByLocale(locale: LandingLocale): LandingPageContent[] {
  return landingPages.filter((page) => page.locale === locale);
}

export function getLandingSlugsForLocale(locale: LandingLocale): string[] {
  return getLandingPagesByLocale(locale).map((page) => page.slug);
}

export function getLandingLanguageLinks(intent: LandingIntent): Record<Locale, string> {
  const links = Object.fromEntries(
    locales.map((locale) => [locale, getHomePath(locale)]),
  ) as Record<Locale, string>;

  for (const locale of landingLocales) {
    links[locale] = getLandingPageByIntent(intent, locale).path;
  }

  return links;
}

export function getLandingSitemapEntries(): Pick<LandingPageContent, "path" | "locale" | "intent" | "title">[] {
  return landingPages.map(({ path, locale, intent, title }) => ({
    path,
    locale,
    intent,
    title,
  }));
}
