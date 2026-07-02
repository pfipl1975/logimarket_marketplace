import type { Locale } from "@/lib/i18n/config";
import { absoluteUrl, siteOrigin } from "@/lib/seo/urls";

export const siteBrand = {
  name: "LogiMarket.pl",
  alternateName: "LogiMarket.eu",
  url: siteOrigin,
  logoUrl: absoluteUrl("/images/brand/baner_marketplace.png"),
  supportedLocales: ["pl", "en", "de", "fr", "es", "uk", "zh"] satisfies Locale[],
} as const;

export const localeLanguageTags: Record<Locale, string> = {
  pl: "pl-PL",
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  uk: "uk",
  zh: "zh-CN",
};
