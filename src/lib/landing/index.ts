import { getHomePath } from "@/lib/i18n/paths";
import { locales, type Locale } from "@/lib/i18n/config";
import { landingPages } from "./content";
import type { LandingIntent, LandingLocale, LandingPageContent } from "./types";

export type {
  LandingDecisionFactor,
  LandingFaqItem,
  LandingIntent,
  LandingCategoryLink,
  LandingGlossaryLink,
  LandingLocale,
  LandingPageContent,
} from "./types";

export { getCategoryLink, getGlossaryLink } from "./links";

export const landingLocales = [
  "pl",
  "en",
  "de",
  "fr",
  "uk",
  "es",
  "zh",
] as const satisfies LandingLocale[];

export type LandingLanguageLinks = Partial<Record<LandingLocale, string>> & {
  "x-default"?: string;
};

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

export function getLandingLanguageLinks(intent: LandingIntent): LandingLanguageLinks {
  const links: LandingLanguageLinks = {};

  for (const page of landingPages) {
    if (page.intent === intent) {
      links[page.locale] = page.path;
    }
  }

  const plPage = landingPages.find(
    (page) => page.intent === intent && page.locale === "pl",
  );

  if (plPage) {
    links["x-default"] = plPage.path;
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
