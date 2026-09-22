import "server-only";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "./guards";
import type { Locale } from "@/lib/i18n/config";
import type { AuthenticatedIdentity } from "./session";
import {
  UnauthorizedError,
  ForbiddenError,
} from "./authorization-errors";
import {
  getAdminLoginRedirectPath,
  requireAdminPageAccessCore,
} from "./admin-page-access-core";

export async function requireAdminPageAccess(
  locale: Locale
): Promise<AuthenticatedIdentity> {
  try {
    return await requireAdminPageAccessCore(requireAdmin);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect(getAdminLoginRedirectPath(locale));
    }

    if (error instanceof ForbiddenError) {
      notFound();
    }

    throw error;
  }
}

export {
  getAdminPath,
  getAdminLoginRedirectPath,
  requireAdminPageAccessCore,
} from "./admin-page-access-core";
