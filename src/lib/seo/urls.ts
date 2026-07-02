import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { getHomePath, getOfferPath } from "@/lib/i18n/paths";

export const siteOrigin = "https://logimarket.eu";

export function absoluteUrl(path: string): string {
  // path can have leading slash or not, URL constructor resolves relative to origin
  const relativePath = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin}${relativePath}`;
}

export function getHomeCanonical(locale: Locale): string {
  return absoluteUrl(getHomePath(locale));
}

export function getOfferCanonical(locale: Locale, offerId: string): string {
  return absoluteUrl(getOfferPath(locale, offerId));
}

export function getHomeLanguageAlternates(): Record<string, string> {
  const alternates = Object.fromEntries(
    locales.map((locale) => [locale, getHomeCanonical(locale)]),
  );

  return {
    ...alternates,
    "x-default": getHomeCanonical(defaultLocale),
  };
}

export function getOfferLanguageAlternates(
  offerId: string,
): Record<string, string> {
  const alternates = Object.fromEntries(
    locales.map((locale) => [locale, getOfferCanonical(locale, offerId)]),
  );

  return {
    ...alternates,
    "x-default": getOfferCanonical(defaultLocale, offerId),
  };
}
