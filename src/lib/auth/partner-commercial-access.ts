import "server-only";
import { ForbiddenError } from "@/lib/auth/authorization-errors";
import { requirePartnerMembership } from "@/lib/auth/partner-membership";
import { querySellerReadiness } from "@/lib/admin/seller-readiness-query";
import { db } from "@/lib/db";

/** Always prove tenant membership before checking commercial readiness. */
export async function requirePartnerCommercialAccessCore(
  partnerId: number,
  authorize: (id: number) => Promise<unknown>,
  readReadiness: (id: number) => Promise<{ status: string }>,
): Promise<void> {
  await authorize(partnerId);
  const readiness = await readReadiness(partnerId);
  if (readiness.status !== "ready") throw new ForbiddenError();
}

export async function requirePartnerCommercialAccess(partnerId: number): Promise<void> {
  return requirePartnerCommercialAccessCore(partnerId, requirePartnerMembership, id => querySellerReadiness(db, id));
}
