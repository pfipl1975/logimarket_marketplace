import { test, describe } from "node:test";
import assert from "node:assert";
import {
  deriveOfferStorageForCreate,
  resolveTechnicalModelToAdminOfferType,
  resolveAdminEditTargetStorage,
} from "../../src/lib/admin/offer-type";

describe("Admin Offer Type - CREATE", () => {
  test("OFFER_TYPE_01_CREATE_RFQ", () => {
    const res = deriveOfferStorageForCreate("rfq");
    assert.deepStrictEqual(res, { offerModel: "rfq", conversionType: "inbound" });
  });

  test("OFFER_TYPE_02_CREATE_MARKETPLACE", () => {
    const res = deriveOfferStorageForCreate("marketplace");
    assert.deepStrictEqual(res, { offerModel: "marketplace", conversionType: "inbound" });
  });

  test("OFFER_TYPE_03_CREATE_EXTERNAL", () => {
    const res = deriveOfferStorageForCreate("external_partner");
    assert.deepStrictEqual(res, { offerModel: "marketplace", conversionType: "outbound" });
  });
});

describe("Admin Offer Type - READ", () => {
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
    assert.strictEqual(resolveTechnicalModelToAdminOfferType(null, null), null);
    assert.strictEqual(resolveTechnicalModelToAdminOfferType(undefined, undefined), null);
  });
});

describe("Admin Offer Type - EDIT MAPPING", () => {
  test("EDIT_MAPPING_01: rfq+inbound unchanged rfq -> rfq+inbound", () => {
    assert.deepStrictEqual(
      resolveAdminEditTargetStorage("rfq", "inbound", "rfq"),
      { offerModel: "rfq", conversionType: "inbound" }
    );
  });

  test("EDIT_MAPPING_02: marketplace+inbound unchanged marketplace -> marketplace+inbound", () => {
    assert.deepStrictEqual(
      resolveAdminEditTargetStorage("marketplace", "inbound", "marketplace"),
      { offerModel: "marketplace", conversionType: "inbound" }
    );
  });

  test("EDIT_MAPPING_03: rfq+outbound unchanged external_partner -> rfq+outbound", () => {
    assert.deepStrictEqual(
      resolveAdminEditTargetStorage("rfq", "outbound", "external_partner"),
      { offerModel: "rfq", conversionType: "outbound" }
    );
  });

  test("EDIT_MAPPING_04: marketplace+outbound unchanged external_partner -> marketplace+outbound", () => {
    assert.deepStrictEqual(
      resolveAdminEditTargetStorage("marketplace", "outbound", "external_partner"),
      { offerModel: "marketplace", conversionType: "outbound" }
    );
  });

  test("EDIT_MAPPING_05: rfq+inbound changed external -> marketplace+outbound", () => {
    assert.deepStrictEqual(
      resolveAdminEditTargetStorage("rfq", "inbound", "external_partner"),
      { offerModel: "marketplace", conversionType: "outbound" }
    );
  });

  test("EDIT_MAPPING_06: marketplace+inbound changed external -> marketplace+outbound", () => {
    assert.deepStrictEqual(
      resolveAdminEditTargetStorage("marketplace", "inbound", "external_partner"),
      { offerModel: "marketplace", conversionType: "outbound" }
    );
  });

  test("EDIT_MAPPING_07: rfq+outbound changed rfq -> rfq+inbound", () => {
    assert.deepStrictEqual(
      resolveAdminEditTargetStorage("rfq", "outbound", "rfq"),
      { offerModel: "rfq", conversionType: "inbound" }
    );
  });

  test("EDIT_MAPPING_08: rfq+outbound changed marketplace -> marketplace+inbound", () => {
    assert.deepStrictEqual(
      resolveAdminEditTargetStorage("rfq", "outbound", "marketplace"),
      { offerModel: "marketplace", conversionType: "inbound" }
    );
  });

  test("EDIT_MAPPING_09: invalid current pair + valid submitted type -> approved derived pair", () => {
    assert.deepStrictEqual(
      resolveAdminEditTargetStorage("invalid", "invalid", "external_partner"),
      { offerModel: "marketplace", conversionType: "outbound" }
    );
  });
});
