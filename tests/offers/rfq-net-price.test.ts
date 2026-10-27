import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRfqNetPrice,
  parseRfqNetPriceFields,
  getPublicRfqNetPrice,
  formatRfqNetPrice,
  projectPublicOfferPrices,
} from "../../src/lib/offers/rfq-net-price";

test("RFQ net prices retain exact cents and reject invalid or overflow input", () => {
  assert.equal(normalizeRfqNetPrice("18000"), "18000.00");
  assert.equal(normalizeRfqNetPrice("0.01"), "0.01");
  assert.equal(normalizeRfqNetPrice("9999999999999999.99"), "9999999999999999.99");
  for (const bad of ["0", "-1", "1.123", "1e5", "99999999999999999.00"]) {
    assert.throws(() => normalizeRfqNetPrice(bad));
  }
});

test("RFQ visibility requires a valid amount and preserves legacy edits", () => {
  assert.equal(parseRfqNetPriceFields(undefined, undefined), null);
  assert.deepEqual(parseRfqNetPriceFields(null, false), {priceNetto:null,rfqNetPriceVisible:false});
  assert.deepEqual(parseRfqNetPriceFields("18000", true), {priceNetto:"18000.00",rfqNetPriceVisible:true});
  assert.throws(() => parseRfqNetPriceFields(null, true));
  assert.throws(() => parseRfqNetPriceFields("18000", undefined));
});

test("Public amount is visible only for canonical RFQ and explicit consent", () => {
  const a={priceNetto:"18000.00",rfqNetPriceVisible:true};
  assert.equal(getPublicRfqNetPrice({...a,offerModel:"rfq"}),"18000.00");
  assert.equal(getPublicRfqNetPrice({...a,offerModel:"ecommerce"}),null);
  assert.equal(getPublicRfqNetPrice({...a,offerModel:"outbound"}),null);
  assert.equal(getPublicRfqNetPrice({...a,offerModel:"unknown"}),null);
  assert.equal(getPublicRfqNetPrice({...a,offerModel:"rfq",rfqNetPriceVisible:false}),null);
});

test("RFQ amounts format accurately in local currency without Number()", () => {
  assert.match(formatRfqNetPrice("18000.00","pl-PL"), /18.?000,00 PLN/);
  assert.match(formatRfqNetPrice("9999999999999999.99","en-US"), /9,999,999,999,999,999\.99 PLN/);
});

test("Public projection serializes neither hidden RFQ net nor legacy gross", () => {
  const rfq = {
    offerModel: "rfq" as const,
    publicationStatus: "published",
    isActive: true,
    priceBrutto: "987654321.55",
    priceNetto: "876543210.77",
    rfqNetPriceVisible: false,
  };
  const hidden = projectPublicOfferPrices(rfq);
  assert.deepEqual(hidden, { priceBrutto: null, priceNetto: null, rfqNetPriceVisible: false });
  const payload = JSON.stringify(hidden);
  assert.equal(payload.includes("987654321.55"), false);
  assert.equal(payload.includes("876543210.77"), false);

  const visible = projectPublicOfferPrices({ ...rfq, rfqNetPriceVisible: true });
  assert.deepEqual(visible, { priceBrutto: null, priceNetto: "876543210.77", rfqNetPriceVisible: true });
  assert.equal(JSON.stringify(visible).includes("987654321.55"), false);

  for (const change of [
    { publicationStatus: "archived" },
    { isActive: false },
    { priceNetto: "invalid" },
  ]) {
    assert.deepEqual(projectPublicOfferPrices({ ...rfq, rfqNetPriceVisible: true, ...change }), hidden);
  }

  for (const nonRfqModel of ["ecommerce", "outbound"] as const) {
    assert.deepEqual(
      projectPublicOfferPrices({ ...rfq, offerModel: nonRfqModel, rfqNetPriceVisible: true }),
      { priceBrutto: "987654321.55", priceNetto: null, rfqNetPriceVisible: false }
    );
  }
});
