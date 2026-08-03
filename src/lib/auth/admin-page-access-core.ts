import "server-only";

import type { Locale } from "@/lib/i18n/config";
import type { AuthenticatedIdentity } from "./session";

export function getAdminPath(locale: Locale): string {
  if (locale === "pl") {
    return "/admin";
  }
  return `/${locale}/admin`;
}

export function getAdminLoginRedirectPath(locale: Locale): string {
  const adminPath = getAdminPath(locale);
  const searchParams = new URLSearchParams();
  searchParams.set("next", adminPath);

  const loginPath = locale === "pl" ? "/login" : `/${locale}/login`;
  return `${loginPath}?${searchParams.toString()}`;
}

export async function requireAdminPageAccessCore(
  requireAdminFn: () => Promise<AuthenticatedIdentity>
): Promise<AuthenticatedIdentity> {
  return await requireAdminFn();
}
