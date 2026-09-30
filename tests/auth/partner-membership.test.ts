import test from "node:test";
import assert from "node:assert/strict";
import {
  requirePartnerMembershipCore, requirePartnerOrderDecisionAuthorityCore,
  requirePartnerOrderDecisionAuthorityForIdentityCore, resolvePartnerOrderDecisionAuthority,
} from "../../src/lib/auth/partner-membership";
import { ForbiddenError, UnauthorizedError, AuthInfrastructureError } from "../../src/lib/auth/authorization-errors";

test("Partner Membership Authorization Foundation", async (t) => {
  const fakeUserId = "00000000-0000-0000-0000-000000000001";
  const fakeAdminId = "00000000-0000-0000-0000-000000000002";
  const partnerA = 100;
  const partnerB = 200;

  const mockGetMembership = async (userId: string, partnerId: number): Promise<{ membershipStatus: "active" | "revoked", canAcceptOrders: boolean } | undefined> => {
    if (userId === fakeUserId && partnerId === partnerA) return { membershipStatus: "active", canAcceptOrders: false };
    if (userId === fakeUserId && partnerId === partnerB) return { membershipStatus: "active", canAcceptOrders: true };
    if (userId === fakeAdminId && partnerId === partnerA) return { membershipStatus: "revoked", canAcceptOrders: true };
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
      requirePartnerMembershipCore(async () => ({ status: "authenticated", user: { id: "00000000-0000-0000-0000-000000000009", email: "test@test.com" } }), mockGetMembership, partnerA),
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
      requirePartnerOrderDecisionAuthorityCore(async () => ({ status: "authenticated", user: { id: "00000000-0000-0000-0000-000000000003", email: "admin@test.com" } }), mockGetMembership, partnerA),
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

test("resolved identity uses only the supplied transaction for current decision authority", async () => {
  const identity = { id: "00000000-0000-0000-0000-000000000031", email: null };
  let transactionActive = false;
  let sessionCalls = 0;
  let membershipReads = 0;
  let rows = [{ membershipStatus: "active", canAcceptOrders: true }];
  const authorize = await resolvePartnerOrderDecisionAuthority(async () => {
    assert.equal(transactionActive, false, "session identity must resolve before the transaction");
    sessionCalls++;
    return { status: "authenticated", user: identity };
  });
  assert.equal(membershipReads, 0, "resolving identity must not pre-authorize membership");
  type Transaction = Parameters<typeof authorize>[1];
  const tx = {
    select() {
      assert.equal(transactionActive, true);
      membershipReads++;
      return { from: () => ({ where: () => ({ limit: () => ({
        for: async (lock: string) => { assert.equal(lock, "share"); return rows; },
      }) }) }) };
    },
  } as unknown as Transaction;
  transactionActive = true;
  assert.strictEqual(await authorize(100, tx), identity);
  rows = [{ membershipStatus: "revoked", canAcceptOrders: true }];
  await assert.rejects(authorize(100, tx), ForbiddenError);
  assert.equal(sessionCalls, 1);
  assert.equal(membershipReads, 2);
});

test("identity-based decision policy preserves capability, membership and infrastructure boundaries", async () => {
  const identity = { id: "00000000-0000-0000-0000-000000000031", email: null };
  for (const membership of [undefined, { membershipStatus: "active", canAcceptOrders: false },
    { membershipStatus: "revoked", canAcceptOrders: true }] as const) {
    await assert.rejects(requirePartnerOrderDecisionAuthorityForIdentityCore(identity, async (userId, partnerId) => {
      assert.equal(userId, identity.id);
      assert.equal(partnerId, 200);
      return membership;
    }, 200), ForbiddenError);
  }
  assert.strictEqual(await requirePartnerOrderDecisionAuthorityForIdentityCore(identity,
    async () => ({ membershipStatus: "active", canAcceptOrders: true }), 200), identity);
  await assert.rejects(requirePartnerOrderDecisionAuthorityForIdentityCore(identity,
    async () => { throw new Error("membership unavailable"); }, 200), AuthInfrastructureError);
  await assert.rejects(resolvePartnerOrderDecisionAuthority(async () => ({ status: "unauthenticated", user: null })), UnauthorizedError);
  await assert.rejects(resolvePartnerOrderDecisionAuthority(async () => ({ status: "unavailable", user: null })), AuthInfrastructureError);
});
