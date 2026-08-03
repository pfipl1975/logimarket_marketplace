import "server-only";
import type { Locale } from "@/lib/i18n/config";
import type { AuthenticatedIdentity } from "./session";
import { UnauthorizedError, ForbiddenError } from "./authorization-errors";

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

export async function requireAdminPageAccess(
  locale: Locale,
  requireAdminFn: () => Promise<AuthenticatedIdentity> = async () => {
    // Lazy import to avoid circular dependencies and ensure requireAdmin can be passed
    const { requireAdmin } = await import("./guards");
    return await requireAdmin();
  }
): Promise<AuthenticatedIdentity> {
  try {
    return await requireAdminPageAccessCore(requireAdminFn);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const { redirect } = await import("next/navigation");
      redirect(getAdminLoginRedirectPath(locale));
    }
    if (error instanceof ForbiddenError) {
      const { notFound } = await import("next/navigation");
      notFound();
    }
    throw error;
  }
}
