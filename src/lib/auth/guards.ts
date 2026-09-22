import "server-only";
import {
  ForbiddenError,
  AuthInfrastructureError,
  UnauthorizedError,
} from "./authorization-errors";
import { parseAdminUserIds, isAdminUserId } from "./admin-allowlist";
import {
  getCurrentUser,
  type AuthenticatedIdentity,
  type CurrentUserResult,
} from "./session";

type GetCurrentUserFn = () => Promise<CurrentUserResult>;

/**
 * Core of requireAdmin with injectable dependencies so unit tests do not
 * need real Supabase cookies. Not part of the public API surface.
 */
export async function requireAdminCore(
  getUser: GetCurrentUserFn,
  rawAdminUserIds: string | undefined
): Promise<AuthenticatedIdentity> {
  const result = await getUser();

  if (result.status === "unavailable") {
    throw new AuthInfrastructureError();
  }
  if (result.status !== "authenticated") {
    throw new UnauthorizedError();
  }

  const adminUserIds = parseAdminUserIds(rawAdminUserIds);
  if (!isAdminUserId(result.user.id, adminUserIds)) {
    throw new ForbiddenError();
  }

  return result.user;
}

/**
 * Server-side admin guard for future admin Server Components, Server Actions
 * and Route Handlers. Throws typed authorization errors; callers own any
 * redirect or error mapping. Never redirects by itself.
 */
export async function requireAdmin(): Promise<AuthenticatedIdentity> {
  return requireAdminCore(getCurrentUser, process.env.ADMIN_USER_IDS);
}
