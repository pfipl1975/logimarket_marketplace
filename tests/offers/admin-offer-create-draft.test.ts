import { test, describe } from "node:test";
import assert from "node:assert";
import { parseOfferDraftCreateInput } from "../../src/lib/offers/draft-core";

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
    test("5. invalid offerModel field ignored, invalid adminOfferType rejected", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "invalid", offerModel: "rfq", conversionType: "inbound" });
      assert.strictEqual(res.ok, false);
    });
    test("6. invalid adminOfferType directly", () => {
      const res = parseOfferDraftCreateInput({ partnerId: 1, categoryId: 1, title: "T", adminOfferType: "nonexistent" });
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

  describe("SERVER AUTHORITY", () => {
    test("16b. client technical fields are completely ignored", () => {
      const res = parseOfferDraftCreateInput({
        partnerId: 1,
        categoryId: 1,
        title: "T",
        adminOfferType: "external_partner",
        offerModel: "rfq",
        conversionType: "inbound"
      });
      assert.strictEqual(res.ok, true);
      if (!res.ok) return;
      assert.strictEqual(res.data.adminOfferType, "external_partner");
      assert.strictEqual("offerModel" in res.data, false);
      assert.strictEqual("conversionType" in res.data, false);
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

  
});
