import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { assignPurchaseAvailability, checkPurchaseEligibilityGuard } from "@/lib/catalog/purchase-availability";
import type { PurchaseAvailabilityOffer, QuerySellerReadinessFn } from "@/lib/catalog/purchase-availability";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";

const mockDb = {} as NodePgDatabase<typeof schema>;

describe("Purchase Availability Policy", () => {
  test("A. ecommerce + READY => available", async () => {
    const fakeQuery: QuerySellerReadinessFn = async () => ({ status: "ready", blockers: [] });
    const offers: PurchaseAvailabilityOffer[] = [{ offerModel: "ecommerce", partnerId: 1, purchaseAvailability: "not_applicable" }];
    const result = await assignPurchaseAvailability(mockDb, offers, fakeQuery);
    assert.equal(result[0].purchaseAvailability, "available");
  });

  test("B. ecommerce + NOT_READY => temporarily_unavailable", async () => {
    const fakeQuery: QuerySellerReadinessFn = async () => ({ status: "not_ready", blockers: [] });
    const offers: PurchaseAvailabilityOffer[] = [{ offerModel: "ecommerce", partnerId: 1, purchaseAvailability: "not_applicable" }];
    const result = await assignPurchaseAvailability(mockDb, offers, fakeQuery);
    assert.equal(result[0].purchaseAvailability, "temporarily_unavailable");
  });

  test("C. ecommerce + readiness error => fail closed / temporarily unavailable", async () => {
    const fakeQuery: QuerySellerReadinessFn = async () => { throw new Error("DB fail"); };
    const offers: PurchaseAvailabilityOffer[] = [{ offerModel: "ecommerce", partnerId: 1, purchaseAvailability: "not_applicable" }];
    const result = await assignPurchaseAvailability(mockDb, offers, fakeQuery);
    assert.equal(result[0].purchaseAvailability, "temporarily_unavailable");
  });

  test("D. RFQ => not_applicable", async () => {
    const fakeQuery: QuerySellerReadinessFn = async () => ({ status: "ready", blockers: [] });
    const offers: PurchaseAvailabilityOffer[] = [{ offerModel: "rfq", partnerId: 1, purchaseAvailability: "not_applicable" }];
    const result = await assignPurchaseAvailability(mockDb, offers, fakeQuery);
    assert.equal(result[0].purchaseAvailability, "not_applicable");
  });

  test("E. outbound => not_applicable", async () => {
    const fakeQuery: QuerySellerReadinessFn = async () => ({ status: "ready", blockers: [] });
    const offers: PurchaseAvailabilityOffer[] = [{ offerModel: "outbound", partnerId: 1, purchaseAvailability: "not_applicable" }];
    const result = await assignPurchaseAvailability(mockDb, offers, fakeQuery);
    assert.equal(result[0].purchaseAvailability, "not_applicable");
  });

  test("Server Action Guard: READY => true", async () => {
    const fakeQuery: QuerySellerReadinessFn = async () => ({ status: "ready", blockers: [] });
    const result = await checkPurchaseEligibilityGuard(mockDb, 1, fakeQuery);
    assert.equal(result, true);
  });

  test("Server Action Guard: NOT_READY => false", async () => {
    const fakeQuery: QuerySellerReadinessFn = async () => ({ status: "not_ready", blockers: [] });
    const result = await checkPurchaseEligibilityGuard(mockDb, 1, fakeQuery);
    assert.equal(result, false);
  });

  test("Server Action Guard: Error => false (fail closed)", async () => {
    const fakeQuery: QuerySellerReadinessFn = async () => { throw new Error("DB fail"); };
    const result = await checkPurchaseEligibilityGuard(mockDb, 1, fakeQuery);
    assert.equal(result, false);
  });

  test("F. published ecommerce NOT_READY remains in public read result", async () => {
    const fakeQuery: QuerySellerReadinessFn = async () => ({ status: "not_ready", blockers: [] });
    const offers: PurchaseAvailabilityOffer[] = [
      { offerModel: "ecommerce", partnerId: 1, purchaseAvailability: "not_applicable" },
      { offerModel: "rfq", partnerId: 2, purchaseAvailability: "not_applicable" }
    ];
    const result = await assignPurchaseAvailability(mockDb, offers, fakeQuery);
    assert.equal(result.length, 2);
    assert.equal(result[0].purchaseAvailability, "temporarily_unavailable");
    assert.equal(result[1].purchaseAvailability, "not_applicable");
  });

  test("Dedup: 2 ecommerce offers with same partnerId queries exactly 1 time", async () => {
    let callCount = 0;
    const fakeQuery: QuerySellerReadinessFn = async () => {
      callCount++;
      return { status: "ready", blockers: [] };
    };
    const offers: PurchaseAvailabilityOffer[] = [
      { offerModel: "ecommerce", partnerId: 100, purchaseAvailability: "not_applicable" },
      { offerModel: "ecommerce", partnerId: 100, purchaseAvailability: "not_applicable" }
    ];
    const result = await assignPurchaseAvailability(mockDb, offers, fakeQuery);
    assert.equal(callCount, 1);
    assert.equal(result[0].purchaseAvailability, "available");
    assert.equal(result[1].purchaseAvailability, "available");
  });
});
