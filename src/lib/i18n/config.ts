export const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pl";

export const localeLabels: Record<Locale, string> = {
  pl: "PL",
  en: "EN",
  de: "DE",
  fr: "FR",
  uk: "UA",
  es: "ES",
  zh: "中文",
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
