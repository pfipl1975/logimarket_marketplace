import type { Locale } from "@/lib/i18n/config";

export function checkoutPath(locale: Locale): string {
  return locale === "pl" ? "/zamowienie" : `/${locale}/checkout`;
}
