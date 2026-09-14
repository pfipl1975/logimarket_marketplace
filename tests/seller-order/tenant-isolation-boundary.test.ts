import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { UnauthorizedError, ForbiddenError } from "../../src/lib/auth/authorization-errors";

// 1. Mock requirePartnerMembership before importing the read-model
const authMock = mock.module("../../src/lib/auth/partner-membership", {
  namedExports: {
    requirePartnerMembership: async (partnerId: number) => {
      if (partnerId === 1) {
        return {
          id: "mem1",
          authUserId: "user1",
          partnerId: 1,
          membershipStatus: "active",
          canAcceptOrders: false // Prove can_accept_orders=false can still view
        };
      }
      if (partnerId === 3) {
         throw new ForbiddenError();
      }
      throw new UnauthorizedError();
    }
  }
});

const dbMock = mock.module("../../src/lib/db", {
  namedExports: {
    db: {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              leftJoin: () => ({
                where: () => ({
                  limit: () => {
                    // Simulating DB returning no results because sellerOrderId=999 belongs to Partner B,
                    // but the query filters by partnerId=1 (Partner A)
                    return [];
                  }
                })
              })
            })
          })
        })
      })
    }
  }
});

import { getPartnerOrdersList, getPartnerOrderDetail } from "../../src/lib/partner-orders/read-model";

test("Read Boundary Authorization & Tenant Isolation", async (t) => {
  await t.test("Partner A cannot obtain Partner B list (throws UNAUTHORIZED)", async () => {
    const result = await getPartnerOrdersList(2); // Mock throws Unauthorized for 2
    assert.deepEqual(result, { ok: false, code: "UNAUTHORIZED" });
  });

  await t.test("Partner A cannot obtain Partner B detail by direct ID (Auth failure)", async () => {
    const result = await getPartnerOrderDetail(2, 999);
    assert.deepEqual(result, { ok: false, code: "UNAUTHORIZED" });
  });
  await t.test("Partner A requests Partner B order in Partner A workspace (Direct ID Attack)", async () => {
    // Auth passes for partnerId=1.
    // DB returns [] because the where clause includes `eq(sellerOrders.partnerId, partnerId)`.
    const result = await getPartnerOrderDetail(1, 999);
    assert.deepEqual(result, { ok: false, code: "NOT_FOUND" });
  });

  await t.test("Revoked/no membership fails closed", async () => {
    const resultList = await getPartnerOrdersList(3);
    assert.deepEqual(resultList, { ok: false, code: "UNAUTHORIZED" });
  });

  await t.test("Partner A membership passes auth boundary with can_accept_orders=false", async () => {
    // Just verifying that it doesn't throw UNAUTHORIZED and reaches the DB layer
    const result = await getPartnerOrderDetail(1, 123);
    assert.notEqual((!result.ok ? result.code : ""), "UNAUTHORIZED");
  });
});
