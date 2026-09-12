import test from "node:test";
import assert from "node:assert/strict";
import { requirePartnerMembershipCore, requirePartnerOrderDecisionAuthorityCore } from "../../src/lib/auth/partner-membership";
import { ForbiddenError, UnauthorizedError, AuthInfrastructureError } from "../../src/lib/auth/authorization-errors";

test("Partner Membership Authorization Foundation", async (t) => {
  const fakeUserId = "00000000-0000-0000-0000-000000000001";
  const fakeAdminId = "00000000-0000-0000-0000-000000000002";
  const partnerA = 100;
  const partnerB = 200;

  const mockGetMembership = async (userId: string, partnerId: number) => {
    if (userId === fakeUserId && partnerId === partnerA) return { membershipStatus: "active", canAcceptOrders: false };
    if (userId === fakeUserId && partnerId === partnerB) return { membershipStatus: "active", canAcceptOrders: true };
    if (userId === fakeAdminId && partnerId === partnerA) return undefined; // revoked is filtered out in getDbMembership, but here we can just return undefined to simulate it
    return undefined;
  };

  await t.test("unauthenticated user denied", async () => {
    await assert.rejects(
      requirePartnerMembershipCore(async () => ({ status: "unauthenticated", user: null }), mockGetMembership, partnerA),
      UnauthorizedError
    );
  });

  await t.test("authenticated user with no membership denied", async () => {
    await assert.rejects(
      requirePartnerMembershipCore(async () => ({ status: "authenticated", user: { id: "unknown", email: "test@test.com" } }), mockGetMembership, partnerA),
      ForbiddenError
    );
  });

  await t.test("active membership for Partner A cannot authorize unknown Partner", async () => {
    await assert.rejects(
      requirePartnerMembershipCore(async () => ({ status: "authenticated", user: { id: fakeUserId, email: "test@test.com" } }), mockGetMembership, 999999),
      ForbiddenError
    );
  });

  await t.test("active membership with can_accept_orders=false denied for decision authority", async () => {
    await assert.rejects(
      requirePartnerOrderDecisionAuthorityCore(async () => ({ status: "authenticated", user: { id: fakeUserId, email: "test@test.com" } }), mockGetMembership, partnerA),
      ForbiddenError
    );
  });

  await t.test("active membership with can_accept_orders=true allowed for matching Partner", async () => {
    const user = await requirePartnerOrderDecisionAuthorityCore(async () => ({ status: "authenticated", user: { id: fakeUserId, email: "test@test.com" } }), mockGetMembership, partnerB);
    assert.strictEqual(user.id, fakeUserId);
  });

  await t.test("revoked membership denied", async () => {
    await assert.rejects(
      requirePartnerMembershipCore(async () => ({ status: "authenticated", user: { id: fakeAdminId, email: "admin@test.com" } }), mockGetMembership, partnerA),
      ForbiddenError
    );
  });

  await t.test("admin identity alone does NOT imply Seller decision authority", async () => {
    await assert.rejects(
      requirePartnerOrderDecisionAuthorityCore(async () => ({ status: "authenticated", user: { id: "admin-no-membership", email: "admin@test.com" } }), mockGetMembership, partnerA),
      ForbiddenError
    );
  });

  await t.test("membership query fails closed on auth/session infrastructure failure", async () => {
    await assert.rejects(
      requirePartnerMembershipCore(async () => ({ status: "unavailable", user: null }), mockGetMembership, partnerA),
      AuthInfrastructureError
    );
    await assert.rejects(
      requirePartnerMembershipCore(async () => { throw new Error("DB down"); }, mockGetMembership, partnerA),
      AuthInfrastructureError
    );
    await assert.rejects(
      requirePartnerMembershipCore(async () => ({ status: "authenticated", user: { id: fakeUserId, email: "test@test.com" } }), async () => { throw new Error("DB down"); }, partnerA),
      AuthInfrastructureError
    );
  });
});
