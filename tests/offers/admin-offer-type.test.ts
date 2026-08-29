import test from "node:test";
import assert from "node:assert";
import {
  deriveOfferStorageForCreate,
  resolveTechnicalModelToAdminOfferType,
} from "@/lib/admin/offer-type";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";

test("OFFER_TYPE_01_CREATE_RFQ", () => {
  const derived = deriveOfferStorageForCreate("rfq");
  assert.strictEqual(derived.offerModel, "rfq");
  assert.strictEqual(derived.conversionType, "inbound");
});

test("OFFER_TYPE_02_CREATE_MARKETPLACE", () => {
  const derived = deriveOfferStorageForCreate("marketplace");
  assert.strictEqual(derived.offerModel, "marketplace");
  assert.strictEqual(derived.conversionType, "inbound");
});

test("OFFER_TYPE_03_CREATE_EXTERNAL", () => {
  const derived = deriveOfferStorageForCreate("external_partner");
  assert.strictEqual(derived.offerModel, "marketplace");
  assert.strictEqual(derived.conversionType, "outbound");
});

test("OFFER_TYPE_04_READ_RFQ", () => {
  assert.strictEqual(resolveTechnicalModelToAdminOfferType("rfq", "inbound"), "rfq");
});

test("OFFER_TYPE_05_READ_MARKETPLACE", () => {
  assert.strictEqual(resolveTechnicalModelToAdminOfferType("marketplace", "inbound"), "marketplace");
});

test("OFFER_TYPE_06_READ_LEGACY_EXTERNAL", () => {
  assert.strictEqual(resolveTechnicalModelToAdminOfferType("rfq", "outbound"), "external_partner");
});

test("OFFER_TYPE_07_READ_CANONICAL_EXTERNAL", () => {
  assert.strictEqual(resolveTechnicalModelToAdminOfferType("marketplace", "outbound"), "external_partner");
});

test("OFFER_TYPE_08_READ_INVALID", () => {
  assert.strictEqual(resolveTechnicalModelToAdminOfferType("invalid", "inbound"), null);
  assert.strictEqual(resolveTechnicalModelToAdminOfferType("rfq", "invalid"), null);
});

test("OFFER_TYPE_09_CREATE_CANONICAL_RFQ", () => {
  const derived = deriveOfferStorageForCreate("rfq");
  assert.strictEqual(resolveCanonicalOfferModel(derived.offerModel, derived.conversionType), "rfq");
});

test("OFFER_TYPE_10_CREATE_CANONICAL_MARKETPLACE", () => {
  const derived = deriveOfferStorageForCreate("marketplace");
  assert.strictEqual(resolveCanonicalOfferModel(derived.offerModel, derived.conversionType), "ecommerce");
});

test("OFFER_TYPE_11_CREATE_CANONICAL_EXTERNAL", () => {
  const derived = deriveOfferStorageForCreate("external_partner");
  assert.strictEqual(resolveCanonicalOfferModel(derived.offerModel, derived.conversionType), "outbound");
});
