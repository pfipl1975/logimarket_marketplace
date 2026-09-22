import test from "node:test";
import assert from "node:assert/strict";
import { validateCheckoutLine } from "../../src/lib/checkout/eligibility";
import type { CheckoutOfferRow, CheckoutCartRow } from "../../src/lib/checkout/eligibility";

function createValidOffer(): CheckoutOfferRow {
  return {
    id: 1,
    title: "Test Offer",
    isActive: true,
    publicationStatus: "published",
    offerModel: "marketplace",
    conversionType: "inbound",
    priceOnRequest: false,
    normalizedPrice: "149.99",
  };
}

function createValidCartRow(): CheckoutCartRow {
  return {
    id: 100,
    offerId: 1,
    quantity: 3,
  };
}

test("Checkout Line Eligibility Validation", async (t) => {
  await t.test("Valid line passes", () => {
    const offerMap = new Map<number, CheckoutOfferRow>();
    offerMap.set(1, createValidOffer());

    const result = validateCheckoutLine(createValidCartRow(), offerMap);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.offerId, 1);
      assert.equal(result.quantity, 3);
      assert.equal(result.unitPriceMinor, BigInt(14999));
    }
  });

  await t.test("Missing offer fails", () => {
    const offerMap = new Map<number, CheckoutOfferRow>(); // empty map
    const result = validateCheckoutLine(createValidCartRow(), offerMap);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "OFFER_MISSING");
  });

  await t.test("Inactive offer fails", () => {
    const offerMap = new Map<number, CheckoutOfferRow>();
    offerMap.set(1, { ...createValidOffer(), isActive: false });
    const result = validateCheckoutLine(createValidCartRow(), offerMap);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "OFFER_INACTIVE");
  });

  await t.test("Unpublished offer fails", () => {
    const offerMap = new Map<number, CheckoutOfferRow>();
    
    offerMap.set(1, { ...createValidOffer(), publicationStatus: "draft" });
    const r1 = validateCheckoutLine(createValidCartRow(), offerMap);
    assert.equal(r1.ok, false);
    if (!r1.ok) assert.equal(r1.reason, "OFFER_NOT_CONVERSION_ALLOWED");

    offerMap.set(1, { ...createValidOffer(), publicationStatus: "archived" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);

    offerMap.set(1, { ...createValidOffer(), publicationStatus: "hidden" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);

    offerMap.set(1, { ...createValidOffer(), publicationStatus: "deleted" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);
  });

  await t.test("Non-ecommerce model fails", () => {
    const offerMap = new Map<number, CheckoutOfferRow>();

    offerMap.set(1, { ...createValidOffer(), offerModel: "rfq", conversionType: "inbound" });
    const r1 = validateCheckoutLine(createValidCartRow(), offerMap);
    assert.equal(r1.ok, false);
    if (!r1.ok) assert.equal(r1.reason, "OFFER_NOT_ECOMMERCE");

    offerMap.set(1, { ...createValidOffer(), offerModel: "rfq", conversionType: "outbound" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);

    offerMap.set(1, { ...createValidOffer(), offerModel: "marketplace", conversionType: "outbound" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);

    offerMap.set(1, { ...createValidOffer(), offerModel: "unknown", conversionType: "inbound" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);
  });

  await t.test("Invalid price conditions fail", () => {
    const offerMap = new Map<number, CheckoutOfferRow>();

    offerMap.set(1, { ...createValidOffer(), priceOnRequest: true });
    const r1 = validateCheckoutLine(createValidCartRow(), offerMap);
    assert.equal(r1.ok, false);
    if (!r1.ok) assert.equal(r1.reason, "PRICE_ON_REQUEST");

    offerMap.set(1, { ...createValidOffer(), normalizedPrice: null });
    const r2 = validateCheckoutLine(createValidCartRow(), offerMap);
    assert.equal(r2.ok, false);
    if (!r2.ok) assert.equal(r2.reason, "PRICE_MISSING");

    offerMap.set(1, { ...createValidOffer(), normalizedPrice: "0" });
    const r3 = validateCheckoutLine(createValidCartRow(), offerMap);
    assert.equal(r3.ok, false);
    if (!r3.ok) assert.equal(r3.reason, "PRICE_INVALID");

    offerMap.set(1, { ...createValidOffer(), normalizedPrice: "-10.00" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);
    
    offerMap.set(1, { ...createValidOffer(), normalizedPrice: "abc" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);
  });

  await t.test("Invalid cart quantity fails", () => {
    const offerMap = new Map<number, CheckoutOfferRow>();
    offerMap.set(1, createValidOffer());

    const r1 = validateCheckoutLine({ ...createValidCartRow(), quantity: 0 }, offerMap);
    assert.equal(r1.ok, false);
    if (!r1.ok) assert.equal(r1.reason, "QUANTITY_INVALID");
    assert.equal(validateCheckoutLine({ ...createValidCartRow(), quantity: 1000 }, offerMap).ok, false);
    assert.equal(validateCheckoutLine({ ...createValidCartRow(), quantity: 1.5 }, offerMap).ok, false);
  });
});
