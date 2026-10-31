import "server-only";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import {
  grantPartnerAccessCore, grantPartnerAccessSchema, matchesConfirmedAuthAccount,
  revokePartnerAccessCore, revokePartnerAccessSchema,
  type PartnerAccessResult,
} from "@/lib/admin/partner-access-core";

/** Require ADMIN at the Server Action boundary before invoking either service. */
export async function grantVerifiedPartnerAccess(raw: unknown): Promise<PartnerAccessResult> {
  const parsed = grantPartnerAccessSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return { ok: false, code: "ACCOUNT_UNAVAILABLE" };

  try {
    const client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.admin.getUserById(parsed.data.authUserId);
    if (error) return { ok: false, code: "ACCOUNT_UNAVAILABLE" };
    if (!matchesConfirmedAuthAccount(data.user, parsed.data)) {
      return { ok: false, code: "IDENTITY_NOT_VERIFIED" };
    }
    return await grantPartnerAccessCore(db, parsed.data);
  } catch {
    return { ok: false, code: "ACCOUNT_UNAVAILABLE" };
  }
}

export async function revokeVerifiedPartnerAccess(raw: unknown): Promise<PartnerAccessResult> {
  const parsed = revokePartnerAccessSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  return revokePartnerAccessCore(db, parsed.data);
}
