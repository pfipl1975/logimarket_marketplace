import { test, describe } from "node:test";
import assert from "node:assert";
import { parseOfferDraftCreateInput, createOfferDraftCore } from "../../src/lib/offers/draft-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../src/lib/schema";

describe("Admin Offer Create Draft - Unit Tests", () => {
  describe("VALID combinations", () => {
    test("1. rfq + inbound", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, true);
    });
    test("2. rfq + outbound", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "external_partner" });
      assert.strictEqual(res.ok, true);
    });
    test("3. marketplace + inbound", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "marketplace" });
      assert.strictEqual(res.ok, true);
    });
    test("4. marketplace + outbound", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "external_partner" });
      assert.strictEqual(res.ok, true);
    });
  });

  describe("INVALID inputs", () => {
    test("5. invalid offerModel", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "invalid" });
      assert.strictEqual(res.ok, false);
    });
    test("6. invalid conversionType", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "invalid" });
      assert.strictEqual(res.ok, false);
    });
    test("7. missing partnerId", () => {
      const res = parseOfferDraftCreateInput({ categoryId: 1, title: "T", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, false);
    });
    test("8. partnerId=0", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 0, categoryId: 1, title: "T", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, false);
    });
    test("9. partnerId negative", () => {
      const res = parseOfferDraftCreateInput({ partnerId: -5, categoryId: 1, title: "T", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, false);
    });
    test("10. unsafe/noncanonical partnerId", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1.5, categoryId: 1, title: "T", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, false);
    });
    test("11. missing categoryId", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, title: "T", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, false);
    });
    test("12. categoryId=0", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 0, title: "T", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, false);
    });
    test("13. categoryId negative", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: -1, title: "T", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, false);
    });
    test("14. empty title", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, false);
    });
    test("15. whitespace-only title", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "   ", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, false);
    });
    test("16. title length 256", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "A".repeat(256), adminOfferType: "rfq" });
      assert.strictEqual(res.ok, false);
    });
  });

  describe("NORMALIZATION", () => {
    test("17. title is trimmed", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "  Trim Me  ", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, true);
      if (res.ok) assert.strictEqual(res.data.title, "Trim Me");
    });
    test("18. positive numeric-string IDs normalize safely", () => {
      const res = parseOfferDraftCreateInput({ partnerId: "123", categoryId: "456", title: "T", adminOfferType: "rfq" });
      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.data.partnerId, 123);
        assert.strictEqual(res.data.categoryId, 456);
      }
    });
  });

  describe("CLIENT AUTHORITY", () => {
    test("19. extra client publicationStatus field cannot enter normalized input", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "rfq", publicationStatus: "published" });
      assert.strictEqual(res.ok, true);
      if (res.ok) assert.strictEqual((res.data as Record<string, unknown>).publicationStatus, undefined);
    });
    test("20. extra client contractModel field cannot enter normalized input", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "rfq", contractModel: "logimarket_reseller" });
      assert.strictEqual(res.ok, true);
      if (res.ok) assert.strictEqual((res.data as Record<string, unknown>).contractModel, undefined);
    });
    test("21. extra client isActive field cannot enter normalized input", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "rfq", isActive: true });
      assert.strictEqual(res.ok, true);
      if (res.ok) assert.strictEqual((res.data as Record<string, unknown>).isActive, undefined);
    });
  });

  describe("UNKNOWN FAIL-SAFE", () => {
    test("22. create core rejects canonical unknown before DB interaction", async () => {
      let dbReached = false;
      const mockDb = {
        transaction: async () => { 
          dbReached = true; 
          throw new Error("DB SHOULD NOT BE REACHED"); 
        }
      } as unknown as NodePgDatabase<typeof schema>;

      const malformedInput = {
        partnerId: 1,
        categoryId: 1,
        title: "T",
        adminOfferType: "invalid_model" as any
      };

      const result = await createOfferDraftCore(mockDb, malformedInput);
      
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.code, "MODEL_UNKNOWN");
      }
      assert.strictEqual(dbReached, false);
    });
  });
});
