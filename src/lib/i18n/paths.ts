import { defaultLocale, type Locale } from "@/lib/i18n/config";

export function getHomePath(locale: Locale): string {
  return locale === defaultLocale ? "/" : `/${locale}`;
}

export function getOfferPath(locale: Locale, offerId: string): string {
  return locale === defaultLocale
    ? `/oferta/${offerId}`
    : `/${locale}/oferta/${offerId}`;
}

export function getCategoryFilterPath(
  locale: Locale,
  categorySlug: string,
): string {
  const query = new URLSearchParams({ kategoria: categorySlug }).toString();

  return `${getHomePath(locale)}?${query}`;
}

export function getHomeLocaleLinks(): Record<Locale, string> {
  return {
    pl: getHomePath("pl"),
    en: getHomePath("en"),
    de: getHomePath("de"),
    fr: getHomePath("fr"),
    uk: getHomePath("uk"),
    es: getHomePath("es"),
    zh: getHomePath("zh"),
  } satisfies Record<Locale, string>;
}

export function getOfferLocaleLinks(offerId: string): Record<Locale, string> {
  return {
    pl: getOfferPath("pl", offerId),
    en: getOfferPath("en", offerId),
    de: getOfferPath("de", offerId),
    fr: getOfferPath("fr", offerId),
    uk: getOfferPath("uk", offerId),
    es: getOfferPath("es", offerId),
    zh: getOfferPath("zh", offerId),
  } satisfies Record<Locale, string>;
}

export function getGlossaryPath(locale: Locale): string | null {
  if (locale === "pl") {
    return "/slownik-branzowy";
  }
  if (locale === "en") {
    return "/en/logistics-glossary";
  }
  if (locale === "de") {
    return "/de/logistik-lexikon";
  }
  return null;
}
