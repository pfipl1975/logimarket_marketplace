import "server-only";
import { getCurrentUser, type AuthenticatedIdentity, type CurrentUserResult } from "./session";
import { ForbiddenError, AuthInfrastructureError, UnauthorizedError } from "./authorization-errors";
import { db } from "../db";
import { partnerUserMemberships } from "../schema";
import { eq, and } from "drizzle-orm";

type GetCurrentUserFn = () => Promise<CurrentUserResult>;
type GetMembershipFn = (userId: string, partnerId: number) => Promise<{ membershipStatus: "active" | "revoked", canAcceptOrders: boolean } | undefined>;

export async function getDbMembership(userId: string, partnerId: number): Promise<{ membershipStatus: "active" | "revoked", canAcceptOrders: boolean } | undefined> {
  try {
    return await db
      .select({ membershipStatus: partnerUserMemberships.membershipStatus, canAcceptOrders: partnerUserMemberships.canAcceptOrders })
      .from(partnerUserMemberships)
      .where(
        and(
          eq(partnerUserMemberships.authUserId, userId),
          eq(partnerUserMemberships.partnerId, partnerId),
          eq(partnerUserMemberships.membershipStatus, "active")
        )
      )
      .limit(1)
      .then(res => res[0] as { membershipStatus: "active" | "revoked", canAcceptOrders: boolean } | undefined);
  } catch {
    throw new AuthInfrastructureError();
  }
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

  if (!membership || membership.membershipStatus !== "active" || !membership.canAcceptOrders) {
    throw new ForbiddenError();
  }

  return result.user;
}

export async function requirePartnerOrderDecisionAuthority(partnerId: number): Promise<AuthenticatedIdentity> {
  return requirePartnerOrderDecisionAuthorityCore(getCurrentUser, getDbMembership, partnerId);
}
