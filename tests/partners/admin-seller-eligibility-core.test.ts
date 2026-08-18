/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAdminSellerEligibilityInput } from "@/lib/admin/seller-eligibility-core";

test("Admin Seller Eligibility Core", async (t) => {
  await t.test("Input Parser", async (st) => {
    await st.test("partnerId must be canonical positive integer string", () => {
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: 1, expectedStatus: "none", targetStatus: "pending" }).ok, false);
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "0", expectedStatus: "none", targetStatus: "pending" }).ok, false);
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "-1", expectedStatus: "none", targetStatus: "pending" }).ok, false);
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "1.5", expectedStatus: "none", targetStatus: "pending" }).ok, false);
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "abc", expectedStatus: "none", targetStatus: "pending" }).ok, false);
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: " 1 ", expectedStatus: "none", targetStatus: "pending" }).ok, false);
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "01", expectedStatus: "none", targetStatus: "pending" }).ok, false);
      const res = parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "pending" });
      assert.ok(res.ok);
      if (res.ok) {
        assert.equal(res.data.partnerId, 1);
      }
    });

    await st.test("expectedStatus validation", () => {
      const validStatuses = ["none", "pending", "eligible", "ineligible", "suspended"];
      validStatuses.forEach((status) => {
        assert.ok(parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: status, targetStatus: "pending" }).ok);
      });
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "unknown", targetStatus: "pending" }).ok, false);
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "1", targetStatus: "pending" }).ok, false);
    });

    await st.test("targetStatus validation", () => {
      const validStatuses = ["pending", "eligible", "ineligible", "suspended"];
      validStatuses.forEach((status) => {
        const payload = { partnerId: "1", expectedStatus: "none", targetStatus: status, reason: status === "suspended" ? "reason" : null };
        assert.ok(parseAdminSellerEligibilityInput(payload).ok);
      });
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "none" }).ok, false);
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "unknown" }).ok, false);
    });

    await st.test("reason normalization: suspended requires reason", () => {
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "suspended", reason: null }).ok, false);
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "suspended", reason: "   " }).ok, false);
      
      const res = parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "suspended", reason: " valid reason " });
      assert.ok(res.ok);
      if (res.ok) {
        assert.equal(res.data.reason, "valid reason");
      }
      
      const longReason = "a".repeat(2001);
      assert.equal(parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "suspended", reason: longReason }).ok, false);
    });

    await st.test("reason normalization: ineligible reason optional", () => {
      let res = parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "ineligible", reason: "   " });
      assert.ok(res.ok);
      if (res.ok) {
        assert.equal(res.data.reason, null);
      }
      
      res = parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "ineligible", reason: "reason" });
      assert.ok(res.ok);
      if (res.ok) {
        assert.equal(res.data.reason, "reason");
      }
    });

    await st.test("reason normalization: pending and eligible reasons are cleared", () => {
      let res = parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "pending", reason: "some reason" });
      assert.ok(res.ok);
      if (res.ok) {
        assert.equal(res.data.reason, null);
      }
      
      res = parseAdminSellerEligibilityInput({ partnerId: "1", expectedStatus: "none", targetStatus: "eligible", reason: "some reason" });
      assert.ok(res.ok);
      if (res.ok) {
        assert.equal(res.data.reason, null);
      }
    });
  });

  await t.test("executeSellerEligibilityChange Behavior", async (st) => {
    // Simple Mock DB builder for transactions
    const createMockDb = (mockData: { partnerExists: boolean, eligibilityRows: unknown[] }) => {
      let inserted: unknown = null;
      let updated: unknown = null;
      let transactionRun = false;

      const chain: any = {
        select: () => chain,
        from: () => chain,
        where: () => chain,
        for: () => chain,
        limit: () => chain,
        then: (resolve: (val: unknown) => void) => {
          if (chain._queryIndex === undefined) chain._queryIndex = 0;
          const idx = chain._queryIndex++;
          if (idx === 0) resolve(mockData.partnerExists ? [{ id: 1 }] : []);
          else resolve(mockData.eligibilityRows);
        },
        insert: () => chain,
        values: (vals: unknown) => { inserted = vals; return Promise.resolve(); },
        update: () => chain,
        set: (vals: unknown) => { updated = vals; return chain; }
      };

      const db = {
        transaction: async (cb: (tx: any) => Promise<any>) => {
          transactionRun = true;
          return cb(chain);
        },
        _getInserted: () => inserted,
        _getUpdated: () => updated,
        _getTransactionRun: () => transactionRun
      };

      return db as any;
    };

    await st.test("partner not found", async () => {
      const db = createMockDb({ partnerExists: false, eligibilityRows: [] });
      const { executeSellerEligibilityChange } = await import("@/lib/admin/seller-eligibility-core");
      const res = await executeSellerEligibilityChange(db, { partnerId: 1, expectedStatus: "none", targetStatus: "eligible", reason: null });
      assert.equal(res.ok, false);
      if (!res.ok) assert.equal(res.code, "PARTNER_NOT_FOUND");
    });

    await st.test("none -> INSERT", async () => {
      const db = createMockDb({ partnerExists: true, eligibilityRows: [] });
      const { executeSellerEligibilityChange } = await import("@/lib/admin/seller-eligibility-core");
      const res = await executeSellerEligibilityChange(db, { partnerId: 1, expectedStatus: "none", targetStatus: "eligible", reason: null });
      assert.equal(res.ok, true);
      if (res.ok) assert.equal(res.code, "ELIGIBILITY_CREATED");
      assert.ok(db._getInserted());
      assert.equal((db._getInserted() as any).eligibilityStatus, "eligible");
    });

    await st.test("existing -> UPDATE", async () => {
      const db = createMockDb({ partnerExists: true, eligibilityRows: [{ eligibilityStatus: "pending", reason: null }] });
      const { executeSellerEligibilityChange } = await import("@/lib/admin/seller-eligibility-core");
      const res = await executeSellerEligibilityChange(db, { partnerId: 1, expectedStatus: "pending", targetStatus: "suspended", reason: "bad" });
      assert.equal(res.ok, true);
      if (res.ok) assert.equal(res.code, "ELIGIBILITY_UPDATED");
      assert.ok(db._getUpdated());
      assert.equal((db._getUpdated() as any).eligibilityStatus, "suspended");
      assert.equal((db._getUpdated() as any).reason, "bad");
    });

    await st.test("conflict (expected != current)", async () => {
      const db = createMockDb({ partnerExists: true, eligibilityRows: [{ eligibilityStatus: "suspended", reason: "bad" }] });
      const { executeSellerEligibilityChange } = await import("@/lib/admin/seller-eligibility-core");
      const res = await executeSellerEligibilityChange(db, { partnerId: 1, expectedStatus: "pending", targetStatus: "eligible", reason: null });
      assert.equal(res.ok, false);
      if (!res.ok) assert.equal(res.code, "ELIGIBILITY_CONFLICT");
      assert.equal(db._getUpdated(), null);
    });

    await st.test("idempotent unchanged", async () => {
      const db = createMockDb({ partnerExists: true, eligibilityRows: [{ eligibilityStatus: "suspended", reason: "bad" }] });
      const { executeSellerEligibilityChange } = await import("@/lib/admin/seller-eligibility-core");
      const res = await executeSellerEligibilityChange(db, { partnerId: 1, expectedStatus: "suspended", targetStatus: "suspended", reason: "bad" });
      assert.equal(res.ok, true);
      if (res.ok) {
        assert.equal(res.code, "ELIGIBILITY_UNCHANGED");
        assert.equal(res.changed, false);
      }
      assert.equal(db._getUpdated(), null);
    });
  });
});
