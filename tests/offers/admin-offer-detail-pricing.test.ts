import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getAdminOfferDetailPricing } from "../../src/lib/admin/offer-detail-pricing";

const rfq = {
  canonicalModel: "rfq" as const,
  priceBrutto: "149.99",
  priceNetto: "500.00",
  rfqNetPriceVisible: true,
  priceOnRequest: true,
};

test("RFQ detail displays stored net price and public visibility, never a legacy gross price", () => {
  assert.deepEqual(getAdminOfferDetailPricing(rfq, "pl"), {
    kind: "rfq",
    priceNetto: "500.00",
    formattedNetto: "500,00 PLN",
    rfqNetPriceVisible: true,
  });
  assert.deepEqual(getAdminOfferDetailPricing({ ...rfq, priceNetto: null, rfqNetPriceVisible: false }, "pl"), {
    kind: "rfq",
    priceNetto: null,
    formattedNetto: null,
    rfqNetPriceVisible: false,
  });
});

test("RFQ detail preserves exact large numeric and tolerates anomalous stored data", () => {
  const exact = getAdminOfferDetailPricing({ ...rfq, priceNetto: "9999999999999999.99" }, "en-US");
  assert.equal(exact.kind, "rfq");
  if (exact.kind === "rfq") assert.equal(exact.formattedNetto, "9,999,999,999,999,999.99 PLN");
  const invalid = getAdminOfferDetailPricing({ ...rfq, priceNetto: "0.00" }, "pl");
  assert.equal(invalid.kind, "rfq");
  if (invalid.kind === "rfq") {
    assert.equal(invalid.priceNetto, "0.00");
    assert.equal(invalid.formattedNetto, null);
  }
});

test("Ecommerce, outbound and unknown retain the existing gross readout", () => {
  for (const canonicalModel of ["ecommerce", "outbound", "unknown"] as const) {
    assert.deepEqual(getAdminOfferDetailPricing({ ...rfq, canonicalModel }, "pl"), {
      kind: "other",
      priceBrutto: "149.99",
      priceOnRequest: true,
    });
  }
});

test("Admin detail wires the discriminated pricing mode and existing translated labels", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/app/_shared/AdminOfferDetailPage.tsx"), "utf8");
  assert.match(source, /pricing\.kind === "rfq"/);
  assert.match(source, /dictionary\.adminOfferEdit\.fieldNetPrice/);
  assert.match(source, /dictionary\.adminOfferEdit\.fieldNetPriceVisible/);
  assert.match(source, /\{pricing\.priceBrutto\}/);
  assert.match(source, /\{pricing\.priceNetto\}/);
});
