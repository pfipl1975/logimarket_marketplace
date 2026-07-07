import type { LandingLocale } from "./types";

export function getCategoryLink(locale: LandingLocale, categorySlug: string): string {
  return locale === "pl" ? `/katalog/${categorySlug}` : `/${locale}/katalog/${categorySlug}`;
}

export function getGlossaryLink(locale: LandingLocale, glossarySlug: string): string {
  if (locale === "pl") {
    return `/slownik-branzowy/${glossarySlug}`;
  } else if (locale === "de") {
    return `/de/logistik-lexikon/${glossarySlug}`;
  } else {
    return `/en/logistics-glossary/${glossarySlug}`;
  }
}
