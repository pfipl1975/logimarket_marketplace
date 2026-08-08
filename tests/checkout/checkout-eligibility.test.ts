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
    if (!result.ok) assert.match(result.reason, /offer_missing/);
  });

  await t.test("Inactive offer fails", () => {
    const offerMap = new Map<number, CheckoutOfferRow>();
    offerMap.set(1, { ...createValidOffer(), isActive: false });
    const result = validateCheckoutLine(createValidCartRow(), offerMap);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /offer_inactive/);
  });

  await t.test("Unpublished offer fails", () => {
    const offerMap = new Map<number, CheckoutOfferRow>();
    
    offerMap.set(1, { ...createValidOffer(), publicationStatus: "draft" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);

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
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);

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
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);

    offerMap.set(1, { ...createValidOffer(), normalizedPrice: null });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);

    offerMap.set(1, { ...createValidOffer(), normalizedPrice: "0" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);

    offerMap.set(1, { ...createValidOffer(), normalizedPrice: "-10.00" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);
    
    offerMap.set(1, { ...createValidOffer(), normalizedPrice: "abc" });
    assert.equal(validateCheckoutLine(createValidCartRow(), offerMap).ok, false);
  });

  await t.test("Invalid cart quantity fails", () => {
    const offerMap = new Map<number, CheckoutOfferRow>();
    offerMap.set(1, createValidOffer());

    assert.equal(validateCheckoutLine({ ...createValidCartRow(), quantity: 0 }, offerMap).ok, false);
    assert.equal(validateCheckoutLine({ ...createValidCartRow(), quantity: 1000 }, offerMap).ok, false);
    assert.equal(validateCheckoutLine({ ...createValidCartRow(), quantity: 1.5 }, offerMap).ok, false);
  });
});
