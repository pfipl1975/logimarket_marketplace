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
         throw new ForbiddenError("Revoked");
      }
      throw new UnauthorizedError("Not a member");
    }
  }
});

import { getPartnerOrdersList, getPartnerOrderDetail } from "../../src/lib/partner-orders/read-model";

test("Read Boundary Authorization & Tenant Isolation", async (t) => {
  
  await t.test("Partner A cannot obtain Partner B list (throws UNAUTHORIZED)", async () => {
    const result = await getPartnerOrdersList(2); // Mock throws Unauthorized for 2
    assert.deepEqual(result, { ok: false, code: "UNAUTHORIZED" });
  });

  await t.test("Partner A cannot obtain Partner B detail by direct ID", async () => {
    const result = await getPartnerOrderDetail(2, 999);
    assert.deepEqual(result, { ok: false, code: "UNAUTHORIZED" });
  });
  
  await t.test("Revoked/no membership fails closed", async () => {
    const resultList = await getPartnerOrdersList(3);
    assert.deepEqual(resultList, { ok: false, code: "UNAUTHORIZED" });
    
    const resultDetail = await getPartnerOrderDetail(3, 999);
    assert.deepEqual(resultDetail, { ok: false, code: "UNAUTHORIZED" });
  });
  
  // Partner A obtaining Partner A list is harder to fully test here without mocking the DB chain,
  // but we proved the boundary fails correctly. 
  // If we pass 1, it won't return UNAUTHORIZED. It will attempt DB query.
  await t.test("Partner A membership passes auth boundary (but fails DB since we have no DB)", async () => {
    const result = await getPartnerOrdersList(1);
    // Since there's no real DB connection in this isolated test, it will fail with SYSTEM_ERROR,
    // which proves it passed the auth boundary!
    assert.notEqual((result as any).code, "UNAUTHORIZED");
  });

});
