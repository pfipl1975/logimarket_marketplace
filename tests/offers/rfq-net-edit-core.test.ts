import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAdminOfferEditInput } from "../../src/lib/admin/offer-edit-core";
import { parsePartnerOfferEditInput, evaluatePartnerOfferEditCore } from "../../src/lib/partner-offers/edit-core";

const admin = {
  offerId: "7", expectedUpdatedAt: null, title: "Equipment",
  description: null, imageUrl: null, priceBrutto: "1200.00",
  priceOnRequest: true, adminOfferType: "rfq",
  outboundUrl: null, isFeatured: false,
};

const partner = {
  partnerId: 2, offerId: 7, expectedUpdatedAt: null, title: "Equipment",
  description: null, partnerOfferType: "rfq",
  priceBrutto: "1200.00", priceOnRequest: true,
  outboundUrl: null,
};

test("Admin RFQ edit accepts net amount and leaves existing gross independent", () => {
  const result = parseAdminOfferEditInput({ ...admin, priceNetto: "18000", rfqNetPriceVisible: true });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.priceBrutto, "1200.00");
  assert.equal(result.data.priceNetto, "18000.00");
  assert.equal(result.data.rfqNetPriceVisible, true);
  assert.equal(parseAdminOfferEditInput({ ...admin, priceNetto: null, rfqNetPriceVisible: true }).ok, false);
  assert.equal(parseAdminOfferEditInput({ ...admin, priceNetto: "18000.123", rfqNetPriceVisible: true }).ok, false);
});

test("Partner RFQ net edit validates precision and visibility", () => {
  const result = parsePartnerOfferEditInput({ ...partner, priceNetto: "9999.99", rfqNetPriceVisible: true });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.priceNetto, "9999.99");
  assert.equal(result.data.priceBrutto, "1200.00");
  assert.equal(parsePartnerOfferEditInput({ ...partner, priceNetto: "", rfqNetPriceVisible: true }).ok, false);
  assert.equal(parsePartnerOfferEditInput({ ...partner, priceNetto: "-1", rfqNetPriceVisible: true }).ok, false);
});

test("Partner draft edit changes RFQ net field without modifying gross, forbids misuse on ecommerce", () => {
  const input = parsePartnerOfferEditInput({ ...partner, priceNetto: "18000", rfqNetPriceVisible: true });
  assert.equal(input.ok, true);
  if (!input.ok) return;
  const current = {
    publicationStatus: "draft", updatedAt: null, offerModel: "rfq", conversionType: "inbound",
    title: "Equipment", description: null, priceBrutto: "1200.00",
    priceNetto: null, rfqNetPriceVisible: false, priceOnRequest: true, outboundUrl: null,
  };
  const result = evaluatePartnerOfferEditCore(input.data, current);
  assert.equal(result.code, "EXECUTE_UPDATE");
  if (result.code !== "EXECUTE_UPDATE") return;
  assert.equal(result.payload.priceBrutto, "1200.00");
  assert.equal(result.payload.priceNetto, "18000.00");
  assert.equal(result.payload.rfqNetPriceVisible, true);

  const misuse = evaluatePartnerOfferEditCore({...input.data, partnerOfferType:"marketplace"}, current);
  assert.equal(misuse.code, "OFFER_TARGET_INVALID");

  const blocked = evaluatePartnerOfferEditCore(input.data, {...current, publicationStatus:"published"});
  assert.equal(blocked.code, "OFFER_NOT_EDITABLE_STATUS");
});
