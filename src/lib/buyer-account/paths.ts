import type { Locale } from "@/lib/i18n/config";
import { getSafeRedirectUrl } from "@/lib/auth/safe-redirect";
import { safeAccountNext } from "@/lib/auth/account-paths";

export function buyerAccountPath(locale: Locale): string {
  return locale === "pl" ? "/konto" : `/${locale}/account`;
}

/** A contextual destination wins only when it passes the existing local redirect contract. */
export function accountLandingPath(next: string | null | undefined, locale: Locale): string {
  if (next && getSafeRedirectUrl(next, locale) === next && safeAccountNext(next, locale) === next) {
    return next;
  }
  return buyerAccountPath(locale);
}

export function buyerOrdersPath(locale: Locale): string {
  return locale === "pl" ? "/zamowienia" : `/${locale}/orders`;
}

export function accountLoginPath(locale: Locale): string {
  const next = buyerAccountPath(locale);
  return `${locale === "pl" ? "" : `/${locale}`}/login?${new URLSearchParams({ next })}`;
}
