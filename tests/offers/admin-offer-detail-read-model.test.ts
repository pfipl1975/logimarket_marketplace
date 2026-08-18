import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAdminOfferDetailReadModel } from "../../src/lib/admin/offer-detail-read-model-core";

// ─── VALIDATION TESTS (no DB required) ─────────────────────────────────────

const emptyDb = {} as any;

describe("getAdminOfferDetailReadModel – input validation", () => {
  it("returns INVALID_ID for empty string", async () => {
    const result = await getAdminOfferDetailReadModel(emptyDb, "", "pl");
    assert.deepStrictEqual(result, { ok: false, code: "INVALID_ID" });
  });

  it("returns INVALID_ID for zero", async () => {
    const result = await getAdminOfferDetailReadModel(emptyDb, "0", "pl");
    assert.deepStrictEqual(result, { ok: false, code: "INVALID_ID" });
  });

  it("returns INVALID_ID for negative number", async () => {
    const result = await getAdminOfferDetailReadModel(emptyDb, "-5", "pl");
    assert.deepStrictEqual(result, { ok: false, code: "INVALID_ID" });
  });

  it("returns INVALID_ID for decimal", async () => {
    const result = await getAdminOfferDetailReadModel(emptyDb, "1.5", "pl");
    assert.deepStrictEqual(result, { ok: false, code: "INVALID_ID" });
  });

  it("returns INVALID_ID for non-numeric string", async () => {
    const result = await getAdminOfferDetailReadModel(emptyDb, "abc", "pl");
    assert.deepStrictEqual(result, { ok: false, code: "INVALID_ID" });
  });

  it("returns INVALID_ID for leading zero string", async () => {
    const result = await getAdminOfferDetailReadModel(emptyDb, "01", "pl");
    assert.deepStrictEqual(result, { ok: false, code: "INVALID_ID" });
  });
});

// ─── CANONICAL MODEL RESOLUTION TEST (pure, no DB) ──────────────────────────

import { resolveCanonicalOfferModel } from "../../src/lib/offers/model";

describe("resolveCanonicalOfferModel", () => {
  it("rfq + inbound => rfq", () => {
    assert.strictEqual(resolveCanonicalOfferModel("rfq", "inbound"), "rfq");
  });

  it("marketplace + inbound => ecommerce", () => {
    assert.strictEqual(resolveCanonicalOfferModel("marketplace", "inbound"), "ecommerce");
  });

  it("rfq + outbound => outbound", () => {
    assert.strictEqual(resolveCanonicalOfferModel("rfq", "outbound"), "outbound");
  });

  it("marketplace + outbound => outbound", () => {
    assert.strictEqual(resolveCanonicalOfferModel("marketplace", "outbound"), "outbound");
  });

  it("unknown combination => unknown", () => {
    assert.strictEqual(resolveCanonicalOfferModel("unknown_model", "unknown_conversion"), "unknown");
  });
});

// ─── DTO SHAPE TESTS (pure, no DB) ──────────────────────────────────────────

import type { AdminOfferDetailDto } from "../../src/lib/admin/offer-detail-read-model-core";

describe("AdminOfferDetailDto type shape", () => {
  it("all required top-level fields are present in the type", () => {
    const requiredFields: (keyof AdminOfferDetailDto)[] = [
      "id", "title", "description", "imageUrl",
      "partnerId", "partnerName",
      "categoryId", "categoryName", "categorySlug",
      "priceBrutto", "priceOnRequest",
      "rawOfferModel", "rawConversionType", "canonicalModel", "contractModel",
      "outboundUrl",
      "isActive", "isFeatured",
      "publicationStatus",
      "createdAt", "updatedAt", "publishedAt", "archivedAt", "deletedAt",
      "technicalAttributes",
      "relationalAttributes",
      "publicPreviewAllowed",
    ];
    // If this compiles, all fields exist in the interface
    assert.ok(requiredFields.length === 27);
  });
});

// ─── RELATIONAL ATTRIBUTE SORT TEST (pure) ──────────────────────────────────

import type { AdminOfferDetailRelationalAttribute } from "../../src/lib/admin/offer-detail-read-model-core";

describe("AdminOfferDetailRelationalAttribute", () => {
  it("isAssignedToCategory=false means not in category config", () => {
    const unassigned: AdminOfferDetailRelationalAttribute = {
      attributeId: 999,
      stableKey: "orphan_attr",
      dataType: "text",
      name: "orphan_attr",
      unitCode: null,
      values: ["some-value"],
      isAssignedToCategory: false,
    };
    assert.strictEqual(unassigned.isAssignedToCategory, false);
    assert.strictEqual(unassigned.stableKey, "orphan_attr");
  });
});
