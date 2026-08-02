import { AuthConfigurationError } from "./authorization-errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parses the ADMIN_USER_IDS env value (comma-separated Supabase user UUIDs).
 *
 * Fail closed: a missing or empty value yields zero administrators, while any
 * non-empty element that is not a valid UUID throws AuthConfigurationError.
 * Valid UUIDs are canonicalized to lowercase so case variants in the env
 * value still match the lowercase `user.id` returned by Supabase.
 * Never falls back to e-mails and never logs the raw env value.
 */
export function parseAdminUserIds(raw: string | undefined): ReadonlySet<string> {
  if (!raw) {
    return new Set();
  }

  const ids = new Set<string>();
  for (const element of raw.split(",")) {
    const trimmed = element.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (!UUID_PATTERN.test(trimmed)) {
      throw new AuthConfigurationError();
    }
    ids.add(trimmed.toLowerCase());
  }
  return ids;
}

export function isAdminUserId(
  userId: string,
  adminUserIds: ReadonlySet<string>
): boolean {
  return adminUserIds.has(userId.toLowerCase());
}
