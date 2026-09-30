import "server-only";
import { getCurrentUser, type AuthenticatedIdentity, type CurrentUserResult } from "./session";
import { ForbiddenError, AuthInfrastructureError, UnauthorizedError } from "./authorization-errors";
import { db } from "../db";
import { partnerUserMemberships } from "../schema";
import { eq, and } from "drizzle-orm";

type GetCurrentUserFn = () => Promise<CurrentUserResult>;
type GetMembershipFn = (userId: string, partnerId: number) => Promise<{ membershipStatus: "active" | "revoked", canAcceptOrders: boolean } | undefined>;
type MembershipDatabase = Pick<typeof db, "select">;
type MembershipTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function readDbMembership(database: MembershipDatabase, userId: string, partnerId: number, lockMembership: boolean): Promise<Awaited<ReturnType<GetMembershipFn>>> {
  try {
    const query = database
      .select({ membershipStatus: partnerUserMemberships.membershipStatus, canAcceptOrders: partnerUserMemberships.canAcceptOrders })
      .from(partnerUserMemberships)
      .where(
        and(
          eq(partnerUserMemberships.authUserId, userId),
          eq(partnerUserMemberships.partnerId, partnerId),
          eq(partnerUserMemberships.membershipStatus, "active")
        )
      )
      .limit(1);
    // Keep the authoritative capability stable until the Seller Order transaction commits.
    const rows = lockMembership ? await query.for("share") : await query;
    const membership = rows[0];
    if (!membership) return undefined;
    if (membership.membershipStatus !== "active" && membership.membershipStatus !== "revoked") throw new AuthInfrastructureError();
    return { membershipStatus: membership.membershipStatus, canAcceptOrders: membership.canAcceptOrders };
  } catch {
    throw new AuthInfrastructureError();
  }
}

export async function getDbMembership(userId: string, partnerId: number) {
  return readDbMembership(db, userId, partnerId, false);
}

export async function getDbMembershipInTransaction(tx: MembershipTransaction, userId: string, partnerId: number) {
  return readDbMembership(tx, userId, partnerId, true);
}

export async function requirePartnerSessionIdentityCore(getUser: GetCurrentUserFn): Promise<AuthenticatedIdentity> {
  let result;
  try {
    result = await getUser();
  } catch {
    throw new AuthInfrastructureError();
  }
  if (result.status === "unavailable") throw new AuthInfrastructureError();
  if (result.status !== "authenticated") throw new UnauthorizedError();
  return result.user;
}

export async function requirePartnerMembershipCore(
  getUser: GetCurrentUserFn,
  getMembership: GetMembershipFn,
  partnerId: number
): Promise<AuthenticatedIdentity> {
  let result;
  try {
    result = await getUser();
  } catch {
    throw new AuthInfrastructureError();
  }

  if (result.status === "unavailable") {
    throw new AuthInfrastructureError();
  }
  if (result.status !== "authenticated") {
    throw new UnauthorizedError();
  }

  let membership;
  try {
    membership = await getMembership(result.user.id, partnerId);
  } catch {
    throw new AuthInfrastructureError();
  }

  if (!membership || membership.membershipStatus !== "active") {
    throw new ForbiddenError();
  }

  return result.user;
}

export async function requirePartnerMembership(partnerId: number): Promise<AuthenticatedIdentity> {
  return requirePartnerMembershipCore(getCurrentUser, getDbMembership, partnerId);
}

export async function requirePartnerOrderDecisionAuthorityCore(
  getUser: GetCurrentUserFn,
  getMembership: GetMembershipFn,
  partnerId: number
): Promise<AuthenticatedIdentity> {
  const identity = await requirePartnerSessionIdentityCore(getUser);
  return requirePartnerOrderDecisionAuthorityForIdentityCore(identity, getMembership, partnerId);
}

export async function requirePartnerOrderDecisionAuthorityForIdentityCore(
  identity: AuthenticatedIdentity,
  getMembership: GetMembershipFn,
  partnerId: number
): Promise<AuthenticatedIdentity> {
  let membership;
  try {
    membership = await getMembership(identity.id, partnerId);
  } catch {
    throw new AuthInfrastructureError();
  }

  if (!membership || membership.membershipStatus !== "active" || !membership.canAcceptOrders) {
    throw new ForbiddenError();
  }

  return identity;
}

/** Resolve only session identity now; authorize the locked order's Partner later on its tx. */
export async function resolvePartnerOrderDecisionAuthority(getUser: GetCurrentUserFn = getCurrentUser) {
  const identity = await requirePartnerSessionIdentityCore(getUser);
  return (partnerId: number, tx: MembershipTransaction) => requirePartnerOrderDecisionAuthorityForIdentityCore(
    identity,
    (userId, id) => getDbMembershipInTransaction(tx, userId, id),
    partnerId
  );
}

export async function requirePartnerOrderDecisionAuthority(partnerId: number): Promise<AuthenticatedIdentity> {
  return requirePartnerOrderDecisionAuthorityCore(getCurrentUser, getDbMembership, partnerId);
}


export async function hasAnyActivePartnerMembership(userId: string): Promise<boolean> {
  try {
    const result = await db.select({ id: partnerUserMemberships.id }).from(partnerUserMemberships).where(and(eq(partnerUserMemberships.authUserId, userId), eq(partnerUserMemberships.membershipStatus, 'active'))).limit(1);
    return result.length > 0;
  } catch {
    return false;
  }
}
