import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { getHomePath } from "@/lib/i18n/paths";

export function getSafeRedirectUrl(url: string | null | undefined, locale?: string): string {
  const safeLocale = isLocale(locale || "") ? (locale as Locale) : defaultLocale;
  const fallback = getHomePath(safeLocale);

  if (!url || typeof url !== "string") {
    return fallback;
  }

  // Reject basic unsafe characters and encoded payloads
  if (url.includes("\\") || url.includes("%5C") || url.includes("%5c")) {
    return fallback;
  }

  // Block encoded protocol-relative URLs
  if (url.toLowerCase().includes("%2f%2f") || url.toLowerCase().includes("%2f/")) {
    return fallback;
  }

  // Allow only paths that start with a single slash (not double)
  if (!url.startsWith("/") || url.startsWith("//")) {
    return fallback;
  }

  // Block control characters and common bypasses
  if (/[\x00-\x1F\x7F]/.test(url)) {
    return fallback;
  }

  // Block scheme definitions inside the path (e.g. /javascript:alert(1))
  if (url.includes(":") || url.includes("%3A") || url.includes("%3a")) {
    return fallback;
  }

  return url;
}
