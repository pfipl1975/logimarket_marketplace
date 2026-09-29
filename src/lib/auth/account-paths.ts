import { isLocale, type Locale } from "@/lib/i18n/config";
import { getSafeRedirectUrl } from "./safe-redirect";

export type AccountRoute = "login" | "register" | "forgot-password" | "reset-password";

export function accountPath(locale: Locale, route: AccountRoute): string {
  return `${locale === "pl" ? "" : `/${locale}`}/${route}`;
}

export function accountLocale(value: string | null | undefined): Locale {
  return value && isLocale(value) ? value : "pl";
}

export function safeAccountNext(value: string | null | undefined, locale: Locale): string {
  const path = getSafeRedirectUrl(value, locale);
  if (path.startsWith("/auth/") || /^(\/(?:en|de|fr|uk|es|zh))?\/(?:login|register|forgot-password|reset-password)(?:[/?#]|$)/.test(path)) {
    return locale === "pl" ? "/" : `/${locale}`;
  }
  return path;
}

export function accountLinkWithNext(locale: Locale, route: AccountRoute, next: string | null): string {
  const path = accountPath(locale, route);
  const safe = safeAccountNext(next, locale);
  const home = locale === "pl" ? "/" : `/${locale}`;
  return safe === home ? path : `${path}?${new URLSearchParams({ next: safe })}`;
}
