import test from "node:test";
import assert from "node:assert";
import { parseAdminOfferEditInput, validateOfferEditBusinessRules, isAdminOfferEditableStatus } from "../../src/lib/admin/offer-edit-core";

test("parseAdminOfferEditInput - valid input", () => {
  const result = parseAdminOfferEditInput({
    offerId: "123",
    expectedUpdatedAt: "2024-01-01T10:00:00.000Z",
    title: " Test Title ",
    description: "  ",
    imageUrl: "https://example.com/img.png",
    priceBrutto: "149.99",
    priceOnRequest: false,
    adminOfferType: "marketplace",
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
    adminOfferType: "external_partner",
    isFeatured: false,
  });
  assert.strictEqual(result.ok, true);
});

test("validateOfferEditBusinessRules - published ecommerce requires price", () => {
  const input = {
    offerId: "1",
    expectedUpdatedAt: null,
    title: "t",
    description: null,
    imageUrl: null,
    priceBrutto: null,
    priceOnRequest: false,
    adminOfferType: "marketplace" as const, // marketplace + inbound = ecommerce
    outboundUrl: null,
    isFeatured: false,
  };

  const result = validateOfferEditBusinessRules(input.adminOfferType === "marketplace" ? "marketplace" : "rfq", input.adminOfferType === "external_partner" ? "outbound" : "inbound", input, "published");
  assert.strictEqual(result.valid, false);
  if (!result.valid) {
    assert.strictEqual(result.reason, "ECOMMERCE_PRICE_INVALID");
  }

  input.priceBrutto = "10.00";
  input.priceOnRequest = true;
  const result2 = validateOfferEditBusinessRules(input.adminOfferType === "marketplace" ? "marketplace" : "rfq", input.adminOfferType === "external_partner" ? "outbound" : "inbound", input, "published");
  assert.strictEqual(result2.valid, false);

  input.priceOnRequest = false;
  const result3 = validateOfferEditBusinessRules(input.adminOfferType === "marketplace" ? "marketplace" : "rfq", input.adminOfferType === "external_partner" ? "outbound" : "inbound", input, "published");
  assert.strictEqual(result3.valid, true);
});

test("validateOfferEditBusinessRules - draft ecommerce allows missing price", () => {
  const input = {
    offerId: "1",
    expectedUpdatedAt: null,
    title: "t",
    description: null,
    imageUrl: null,
    priceBrutto: null,
    priceOnRequest: false,
    adminOfferType: "marketplace" as const,
    outboundUrl: null,
    isFeatured: false,
  };

  const result = validateOfferEditBusinessRules(input.adminOfferType === "marketplace" ? "marketplace" : "rfq", input.adminOfferType === "external_partner" ? "outbound" : "inbound", input, "draft");
  assert.strictEqual(result.valid, true);
});

test("validateOfferEditBusinessRules - incomplete draft/archived allowed", () => {
  const input = {
    offerId: 1, expectedUpdatedAt: null, title: "t", description: null, imageUrl: null,
    priceBrutto: null, priceOnRequest: false, adminOfferType: "external_partner" as const, outboundUrl: null, isFeatured: false,
  };

  // draft outbound with outboundUrl=null
  assert.strictEqual(validateOfferEditBusinessRules(input.adminOfferType === "marketplace" ? "marketplace" : "rfq", input.adminOfferType === "external_partner" ? "outbound" : "inbound", input, "draft").valid, true);

  // archived ecommerce with priceBrutto=null, priceOnRequest=true
  const ecommerceInput = { ...input, adminOfferType: "marketplace" as const, priceBrutto: null, priceOnRequest: true };
  assert.strictEqual(validateOfferEditBusinessRules("marketplace", "inbound", ecommerceInput, "archived").valid, true);

  // archived outbound with outboundUrl=null
  assert.strictEqual(validateOfferEditBusinessRules("marketplace", "outbound", input, "archived").valid, true);
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
    adminOfferType: "external_partner" as const,
    outboundUrl: null,
    isFeatured: false,
  };

  const result = validateOfferEditBusinessRules(input.adminOfferType === "marketplace" ? "marketplace" : "rfq", input.adminOfferType === "external_partner" ? "outbound" : "inbound", input, "published");
  assert.strictEqual(result.valid, false);

  input.outboundUrl = "https://example.com";
  const result2 = validateOfferEditBusinessRules(input.adminOfferType === "marketplace" ? "marketplace" : "rfq", input.adminOfferType === "external_partner" ? "outbound" : "inbound", input, "published");
  assert.strictEqual(result2.valid, true);
});

test("parseAdminOfferEditInput - validation edge cases", () => {
  const base = {
    offerId: "123", expectedUpdatedAt: "2024-01-01T10:00:00.000Z", title: "T", priceOnRequest: false, adminOfferType: "marketplace", isFeatured: false
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
function validBase() {
  return {
    offerId: "123",
    expectedUpdatedAt: "2024-01-01T10:00:00.000Z",
    title: "Test Title",
    description: null,
    imageUrl: null,
    priceBrutto: "10.00",
    priceOnRequest: false,
    adminOfferType: "marketplace",
    outboundUrl: null,
    isFeatured: false,
  };
}

test("parseAdminOfferEditInput - offerId matrix", () => {
  const p = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), offerId: v });
  assert.strictEqual(p("1").ok, true);
  assert.strictEqual(p("123").ok, true);
  assert.strictEqual(p("0").ok, false);
  assert.strictEqual(p("-1").ok, false);
  assert.strictEqual(p("01").ok, false);
  assert.strictEqual(p("1.5").ok, false);
  assert.strictEqual(p("abc").ok, false);
});

test("parseAdminOfferEditInput - expectedUpdatedAt matrix", () => {
  const p = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), expectedUpdatedAt: v });
  assert.strictEqual(p(null).ok, true);
  assert.strictEqual(p("2024-01-01T10:00:00.000Z").ok, true);
  assert.strictEqual(p("2024-01-01").ok, false);
  assert.strictEqual(p("Mon, 01 Jan 2024 10:00:00 GMT").ok, false);
  assert.strictEqual(p("invalid").ok, false);
});

test("parseAdminOfferEditInput - title matrix", () => {
  const p = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), title: v });
  let res = p("   ");
  assert.ok(!res.ok && res.code === "OFFER_TARGET_INVALID" && res.reason === "TITLE_INVALID");
  assert.strictEqual(p("a".repeat(255)).ok, true);
  res = p("a".repeat(256));
  assert.ok(!res.ok && res.code === "OFFER_TARGET_INVALID" && res.reason === "TITLE_INVALID");
});

test("parseAdminOfferEditInput - description matrix", () => {
  const p = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), description: v });
  assert.strictEqual(p(undefined).ok, true);
  assert.strictEqual(p(null).ok, true);
  let res = p("   ");
  if (res.ok) assert.strictEqual(res.data.description, null);
  res = p(" test ");
  if (res.ok) assert.strictEqual(res.data.description, "test");
});

test("parseAdminOfferEditInput - imageUrl matrix", () => {
  const p = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), imageUrl: v });
  const res = p("   ");
  if (res.ok) assert.strictEqual(res.data.imageUrl, null);
  assert.strictEqual(p("https://" + "a".repeat(504)).ok, true);
  assert.strictEqual(p("https://" + "a".repeat(505)).ok, false);
});

test("parseAdminOfferEditInput - boolean fields matrix", () => {
  const p1 = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), priceOnRequest: v });
  assert.strictEqual(p1(true).ok, true);
  assert.strictEqual(p1(false).ok, true);
  assert.strictEqual(p1("true").ok, false);
  assert.strictEqual(p1(1).ok, false);
  assert.strictEqual(p1(null).ok, false);

  const p2 = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), isFeatured: v });
  assert.strictEqual(p2(true).ok, true);
  assert.strictEqual(p2(false).ok, true);
  assert.strictEqual(p2("true").ok, false);
  assert.strictEqual(p2(1).ok, false);
  assert.strictEqual(p2(null).ok, false);
});

test("parseAdminOfferEditInput - model and conversionType matrix", () => {
  const p1 = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), adminOfferType: v });
  assert.strictEqual(p1("rfq").ok, true);
  assert.strictEqual(p1("marketplace").ok, true);
  assert.strictEqual(p1("external_partner").ok, true);
  assert.strictEqual(p1("invalid").ok, false);
});

test("parseAdminOfferEditInput - price matrix", () => {
  const p = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), priceBrutto: v });
  
  let res = p(null);
  if(!res.ok) throw new Error("FAIL: " + JSON.stringify(res));
  
  res = p("   ");
  assert.strictEqual(res.ok, true);
  if (res.ok) assert.strictEqual(res.data.priceBrutto, null);

  res = p("1");
  assert.strictEqual(res.ok, true);
  if (res.ok) assert.strictEqual(res.data.priceBrutto, "1.00");

  res = p("1.0");
  assert.strictEqual(res.ok, true);
  if (res.ok) assert.strictEqual(res.data.priceBrutto, "1.00");

  res = p("1.00");
  assert.strictEqual(res.ok, true);
  if (res.ok) assert.strictEqual(res.data.priceBrutto, "1.00");

  assert.strictEqual(p("149.99").ok, true);

  const invalid = ["0", "0.00", "-1", "1.001", "abc"];
  for (const inv of invalid) {
    const r = p(inv);
    assert.ok(!r.ok && r.code === "OFFER_TARGET_INVALID" && r.reason === "PRICE_INVALID");
  }
});

test("parseAdminOfferEditInput - outbound matrix", () => {
  const p = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), outboundUrl: v });
  
  const res = p("   ");
  assert.strictEqual(res.ok, true);
  if (res.ok) assert.strictEqual(res.data.outboundUrl, null);

  assert.strictEqual(p("http://example.com").ok, true);
  assert.strictEqual(p("https://example.com").ok, true);

  const invalid = ["https://user:pass@example.com", "invalid"];
  for (const inv of invalid) {
    const r = p(inv);
    assert.ok(!r.ok && r.code === "OFFER_TARGET_INVALID" && r.reason === "OUTBOUND_URL_INVALID");
  }
});

test("isAdminOfferEditableStatus helper", () => {
  assert.strictEqual(isAdminOfferEditableStatus("draft"), true);
  assert.strictEqual(isAdminOfferEditableStatus("published"), true);
  assert.strictEqual(isAdminOfferEditableStatus("archived"), true);
  assert.strictEqual(isAdminOfferEditableStatus("hidden"), false);
  assert.strictEqual(isAdminOfferEditableStatus("deleted"), false);
  assert.strictEqual(isAdminOfferEditableStatus("unexpected"), false);
  assert.strictEqual(isAdminOfferEditableStatus(""), false);
});


test("SERVER AUTHORITY: raw technical fields are ignored from edit payload", () => {
  const res = parseAdminOfferEditInput({
    offerId: "1",
    expectedUpdatedAt: null,
    title: "t",
    priceOnRequest: false,
    adminOfferType: "external_partner",
    isFeatured: false,
    offerModel: "rfq",
    conversionType: "inbound"
  });
  
  if (!res.ok) throw new Error("FAIL: " + JSON.stringify(res));
  assert.strictEqual(res.data.adminOfferType, "external_partner");
  assert.strictEqual("offerModel" in res.data, false);
  assert.strictEqual("conversionType" in res.data, false);
});
