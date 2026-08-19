import test from "node:test";
import assert from "node:assert";
import { parseAdminOfferEditInput, validateOfferEditBusinessRules } from "../../src/lib/admin/offer-edit-core";

test("parseAdminOfferEditInput - valid input", () => {
  const result = parseAdminOfferEditInput({
    offerId: "123",
    expectedUpdatedAt: "2024-01-01T10:00:00.000Z",
    title: " Test Title ",
    description: "  ",
    imageUrl: "https://example.com/img.png",
    priceBrutto: "149.99",
    priceOnRequest: false,
    offerModel: "marketplace",
    conversionType: "inbound",
    outboundUrl: "",
    isFeatured: true,
  });

  assert.strictEqual(result.ok, true);
  if (result.ok) {
    assert.strictEqual(result.data.offerId, 123);
    assert.strictEqual(result.data.title, "Test Title");
    assert.strictEqual(result.data.description, null); // blank -> null
    assert.strictEqual(result.data.priceBrutto, "149.99");
    assert.strictEqual(result.data.outboundUrl, null);
    assert.strictEqual(result.data.isFeatured, true);
  }
});

test("parseAdminOfferEditInput - null expectedUpdatedAt", () => {
  const result = parseAdminOfferEditInput({
    offerId: "1",
    expectedUpdatedAt: null,
    title: "t",
    priceOnRequest: true,
    offerModel: "rfq",
    conversionType: "outbound",
    isFeatured: false,
  });
  assert.strictEqual(result.ok, true);
});

test("validateOfferEditBusinessRules - published ecommerce requires price", () => {
  const input = {
    offerId: 1,
    expectedUpdatedAt: null,
    title: "t",
    description: null,
    imageUrl: null,
    priceBrutto: null,
    priceOnRequest: false,
    offerModel: "marketplace" as const,
    conversionType: "inbound" as const, // marketplace + inbound = ecommerce
    outboundUrl: null,
    isFeatured: false,
  };

  const result = validateOfferEditBusinessRules(input, "published");
  assert.strictEqual(result.valid, false);
  if (!result.valid) {
    assert.strictEqual(result.reason, "ECOMMERCE_PRICE_INVALID");
  }

  input.priceBrutto = "10.00";
  input.priceOnRequest = true;
  const result2 = validateOfferEditBusinessRules(input, "published");
  assert.strictEqual(result2.valid, false);

  input.priceOnRequest = false;
  const result3 = validateOfferEditBusinessRules(input, "published");
  assert.strictEqual(result3.valid, true);
});

test("validateOfferEditBusinessRules - draft ecommerce allows missing price", () => {
  const input = {
    offerId: 1,
    expectedUpdatedAt: null,
    title: "t",
    description: null,
    imageUrl: null,
    priceBrutto: null,
    priceOnRequest: false,
    offerModel: "marketplace" as const,
    conversionType: "inbound" as const,
    outboundUrl: null,
    isFeatured: false,
  };

  const result = validateOfferEditBusinessRules(input, "draft");
  assert.strictEqual(result.valid, true);
});

test("validateOfferEditBusinessRules - published outbound requires url", () => {
  const input = {
    offerId: 1,
    expectedUpdatedAt: null,
    title: "t",
    description: null,
    imageUrl: null,
    priceBrutto: null,
    priceOnRequest: false,
    offerModel: "marketplace" as const,
    conversionType: "outbound" as const,
    outboundUrl: null,
    isFeatured: false,
  };

  const result = validateOfferEditBusinessRules(input, "published");
  assert.strictEqual(result.valid, false);

  input.outboundUrl = "https://example.com";
  const result2 = validateOfferEditBusinessRules(input, "published");
  assert.strictEqual(result2.valid, true);
});

test("parseAdminOfferEditInput - validation edge cases", () => {
  const base = {
    offerId: "123", expectedUpdatedAt: "2024-01-01T10:00:00.000Z", title: "T", priceOnRequest: false, offerModel: "marketplace", conversionType: "inbound", isFeatured: false
  };

  const t1 = parseAdminOfferEditInput({ ...base, title: "  " });
  assert.strictEqual(!t1.ok && t1.code === "OFFER_TARGET_INVALID" && t1.reason === "TITLE_INVALID", true);

  const p1 = parseAdminOfferEditInput({ ...base, priceBrutto: "invalid" });
  assert.strictEqual(!p1.ok && p1.code === "OFFER_TARGET_INVALID" && p1.reason === "PRICE_INVALID", true);

  const d1 = parseAdminOfferEditInput({ ...base, expectedUpdatedAt: "2024-01-01" });
  assert.strictEqual(!d1.ok && d1.code === "OFFER_INVALID_INPUT", true);

  const o1 = parseAdminOfferEditInput({ ...base, outboundUrl: "invalid" });
  assert.strictEqual(!o1.ok && o1.code === "OFFER_TARGET_INVALID" && o1.reason === "OUTBOUND_URL_INVALID", true);
});
