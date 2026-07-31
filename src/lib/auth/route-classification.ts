import { isLocale } from "@/lib/i18n/config";

export function isProtectedRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return false;
  
  if (isLocale(parts[0])) {
    if (parts.length > 1 && (parts[1] === "admin" || parts[1] === "partner")) {
      return true;
    }
  } else {
    if (parts[0] === "admin" || parts[0] === "partner") {
      return true;
    }
  }
  
  return false;
}

export function getLocaleFromPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && isLocale(parts[0])) {
    return parts[0];
  }
  return "pl"; // default locale
}
