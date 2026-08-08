import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import {
  parseAdminOfferPublicationInput,
  evaluateOfferPublicationTransition,
  evaluateOfferPublishEligibility,
} from "@/lib/admin/offer-publication-core";

describe("Offer Publication Parser", () => {
  test("accepts valid raw unknown input", () => {
    const input = {
      offerId: "123",
      expectedStatus: "draft",
      targetStatus: "published",
    };
    const result = parseAdminOfferPublicationInput(input);
    assert.deepEqual(result, {
      offerId: 123,
      expectedStatus: "draft",
      targetStatus: "published",
    });
  });

  test("accepts valid archive form", () => {
    const input = {
      offerId: "456",
      expectedStatus: "published",
      targetStatus: "archived",
    };
    const result = parseAdminOfferPublicationInput(input);
    assert.deepEqual(result, {
      offerId: 456,
      expectedStatus: "published",
      targetStatus: "archived",
    });
  });

  test("rejects offerId not being a string", () => {
    assert.equal(parseAdminOfferPublicationInput({ offerId: 123, expectedStatus: "draft", targetStatus: "published" }), null);
    assert.equal(parseAdminOfferPublicationInput({ offerId: null, expectedStatus: "draft", targetStatus: "published" }), null);
    assert.equal(parseAdminOfferPublicationInput({ offerId: undefined, expectedStatus: "draft", targetStatus: "published" }), null);
  });

  test("rejects improperly formatted offerId strings", () => {
    const badIds = ["0", "-1", "+1", "01", "1.0", "1e2", " 123 ", "9007199254740992"]; // unsafe integer
    for (const badId of badIds) {
      assert.equal(parseAdminOfferPublicationInput({ offerId: badId, expectedStatus: "draft", targetStatus: "published" }), null, `Failed on ${badId}`);
    }
  });

  test("rejects non-object, null, array payloads", () => {
    assert.equal(parseAdminOfferPublicationInput(null), null);
    assert.equal(parseAdminOfferPublicationInput([]), null);
    assert.equal(parseAdminOfferPublicationInput("payload"), null);
    assert.equal(parseAdminOfferPublicationInput(123), null);
  });

  test("rejects missing fields", () => {
    assert.equal(parseAdminOfferPublicationInput({ offerId: "123", expectedStatus: "draft" }), null);
    assert.equal(parseAdminOfferPublicationInput({ offerId: "123", targetStatus: "published" }), null);
  });

  test("rejects invalid targetStatus constraints", () => {
    assert.equal(parseAdminOfferPublicationInput({ offerId: "123", expectedStatus: "draft", targetStatus: "draft" }), null);
    assert.equal(parseAdminOfferPublicationInput({ offerId: "123", expectedStatus: "draft", targetStatus: "hidden" }), null);
    assert.equal(parseAdminOfferPublicationInput({ offerId: "123", expectedStatus: "draft", targetStatus: "deleted" }), null);
  });

  test("rejects invalid expectedStatus constraints", () => {
    assert.equal(parseAdminOfferPublicationInput({ offerId: "123", expectedStatus: "hidden", targetStatus: "published" }), null);
    assert.equal(parseAdminOfferPublicationInput({ offerId: "123", expectedStatus: "deleted", targetStatus: "published" }), null);
  });
});

describe("Offer Publication State Machine", () => {
  test("PROCEED: draft -> published", () => {
    assert.deepEqual(evaluateOfferPublicationTransition("draft", "draft", "published"), { kind: "PROCEED_PUBLISH" });
  });

  test("PROCEED: published -> archived", () => {
    assert.deepEqual(evaluateOfferPublicationTransition("published", "published", "archived"), { kind: "PROCEED_ARCHIVE" });
  });

  test("REJECT: draft -> archived", () => {
    assert.deepEqual(evaluateOfferPublicationTransition("draft", "draft", "archived"), { kind: "INVALID_TRANSITION" });
  });

  test("REJECT: archived -> published", () => {
    assert.deepEqual(evaluateOfferPublicationTransition("archived", "archived", "published"), { kind: "INVALID_TRANSITION" });
  });

  test("IDEMPOTENT: published current + publish command", () => {
    assert.deepEqual(evaluateOfferPublicationTransition("published", "draft", "published"), { kind: "IDEMPOTENT_PUBLISHED" });
  });

  test("IDEMPOTENT: archived current + archive command", () => {
    assert.deepEqual(evaluateOfferPublicationTransition("archived", "published", "archived"), { kind: "IDEMPOTENT_ARCHIVED" });
  });

  test("CONFLICT: stale expected draft, current archived, target published", () => {
    assert.deepEqual(evaluateOfferPublicationTransition("archived", "draft", "published"), { kind: "CONFLICT" });
  });

  test("CONFLICT: stale expected published, current draft, target archived", () => {
    assert.deepEqual(evaluateOfferPublicationTransition("draft", "published", "archived"), { kind: "CONFLICT" });
  });
});

describe("Offer Publish Eligibility", () => {
  test("Ecommerce: valid marketplace + inbound, active, nonblank title, priceOnRequest=false, normalizedPrice=1.00 -> eligible", () => {
    const res = evaluateOfferPublishEligibility({
      isActive: true,
      title: "Test Offer",
      offerModel: "marketplace",
      conversionType: "inbound",
      priceOnRequest: false,
      normalizedPrice: "1.00",
      outboundUrl: null,
    });
    assert.deepEqual(res, { eligible: true });
  });

  test("Ecommerce: normalizedPrice=null -> ECOMMERCE_PRICE_INVALID", () => {
    const res = evaluateOfferPublishEligibility({
      isActive: true,
      title: "Test Offer",
      offerModel: "marketplace",
      conversionType: "inbound",
      priceOnRequest: false,
      normalizedPrice: null,
      outboundUrl: null,
    });
    assert.deepEqual(res, { eligible: false, reason: "ECOMMERCE_PRICE_INVALID" });
  });

  test("Ecommerce: price variants", () => {
    const cases = ["0", "-1", "abc"];
    for (const val of cases) {
      const res = evaluateOfferPublishEligibility({
        isActive: true,
        title: "Test Offer",
        offerModel: "marketplace",
        conversionType: "inbound",
        priceOnRequest: false,
        normalizedPrice: val,
        outboundUrl: null,
      });
      assert.deepEqual(res, { eligible: false, reason: "ECOMMERCE_PRICE_INVALID" }, `Failed on ${val}`);
    }
  });

  test("Ecommerce: priceOnRequest=true -> ECOMMERCE_PRICE_INVALID", () => {
    const res = evaluateOfferPublishEligibility({
      isActive: true,
      title: "Test Offer",
      offerModel: "marketplace",
      conversionType: "inbound",
      priceOnRequest: true,
      normalizedPrice: "10.00",
      outboundUrl: null,
    });
    assert.deepEqual(res, { eligible: false, reason: "ECOMMERCE_PRICE_INVALID" });
  });

  test("inactive -> OFFER_INACTIVE", () => {
    const res = evaluateOfferPublishEligibility({
      isActive: false,
      title: "Test Offer",
      offerModel: "marketplace",
      conversionType: "inbound",
      priceOnRequest: false,
      normalizedPrice: "1.00",
      outboundUrl: null,
    });
    assert.deepEqual(res, { eligible: false, reason: "OFFER_INACTIVE" });
  });

  test("blank title -> TITLE_INVALID", () => {
    const res = evaluateOfferPublishEligibility({
      isActive: true,
      title: "   ",
      offerModel: "marketplace",
      conversionType: "inbound",
      priceOnRequest: false,
      normalizedPrice: "1.00",
      outboundUrl: null,
    });
    assert.deepEqual(res, { eligible: false, reason: "TITLE_INVALID" });
  });

  test("RFQ canonical resolves and permits publishing without price/outbound", () => {
    const res = evaluateOfferPublishEligibility({
      isActive: true,
      title: "RFQ Offer",
      offerModel: "rfq",
      conversionType: "inbound",
      priceOnRequest: true,
      normalizedPrice: null,
      outboundUrl: null,
    });
    assert.deepEqual(res, { eligible: true });
  });

  test("RFQ canonical rejects inactive/blank title", () => {
    assert.deepEqual(evaluateOfferPublishEligibility({
      isActive: false,
      title: "RFQ Offer",
      offerModel: "rfq",
      conversionType: "inbound",
      priceOnRequest: true,
      normalizedPrice: null,
      outboundUrl: null,
    }), { eligible: false, reason: "OFFER_INACTIVE" });

    assert.deepEqual(evaluateOfferPublishEligibility({
      isActive: true,
      title: "",
      offerModel: "rfq",
      conversionType: "inbound",
      priceOnRequest: true,
      normalizedPrice: null,
      outboundUrl: null,
    }), { eligible: false, reason: "TITLE_INVALID" });
  });

  test("Outbound valid cases", () => {
    const res1 = evaluateOfferPublishEligibility({
      isActive: true,
      title: "Outbound",
      offerModel: "marketplace",
      conversionType: "outbound",
      priceOnRequest: false,
      normalizedPrice: "10.00",
      outboundUrl: "https://example.com",
    });
    assert.deepEqual(res1, { eligible: true });

    const res2 = evaluateOfferPublishEligibility({
      isActive: true,
      title: "Outbound",
      offerModel: "marketplace",
      conversionType: "outbound",
      priceOnRequest: false,
      normalizedPrice: "10.00",
      outboundUrl: "http://example.com",
    });
    assert.deepEqual(res2, { eligible: true });
  });

  test("Outbound invalid urls", () => {
    const badUrls = [null, "/relative", "javascript:alert(1)", "data:text/plain,test", "file:///etc/passwd", "https://user:pass@example.com"];
    for (const url of badUrls) {
      assert.deepEqual(evaluateOfferPublishEligibility({
        isActive: true,
        title: "Outbound",
        offerModel: "marketplace",
        conversionType: "outbound",
        priceOnRequest: false,
        normalizedPrice: "10.00",
        outboundUrl: url,
      }), { eligible: false, reason: "OUTBOUND_URL_INVALID" });
    }
  });

  test("Unknown model -> MODEL_UNKNOWN", () => {
    const res = evaluateOfferPublishEligibility({
      isActive: true,
      title: "Unknown",
      offerModel: "unknown_model",
      conversionType: "outbound",
      priceOnRequest: false,
      normalizedPrice: "10.00",
      outboundUrl: "https://example.com",
    });
    assert.deepEqual(res, { eligible: false, reason: "MODEL_UNKNOWN" });
  });
});

describe("DB Architecture Contract", () => {
  test("REAL_DB_ROW_LOCK_INTEGRATION_TEST: NOT AVAILABLE IN CURRENT SAFE HARNESS", () => {
    const sourceCode = fs.readFileSync("src/lib/admin/offer-publication-core.ts", "utf8");
    assert.equal(sourceCode.includes(".for(\"update\")"), true, "Missing row lock");
    assert.equal(sourceCode.includes("CURRENT_TIMESTAMP"), true, "Missing current timestamp usage");
    assert.equal(sourceCode.includes("publishedAt:"), true, "Missing publishedAt mutation");
    assert.equal(sourceCode.includes("archivedAt:"), true, "Missing archivedAt mutation");
    assert.equal(sourceCode.includes("updatedAt:"), true, "Missing updatedAt mutation");

    // Must NOT mutate the following core properties
    const setBlockMatches = sourceCode.match(/\.set\(\{([\s\S]*?)\}\)/g);
    assert.equal(setBlockMatches !== null, true, "Missing .set() block");
    const setBlocks = setBlockMatches!.join("\n");

    assert.equal(setBlocks.includes("isActive:"), false, "Should not mutate isActive");
    assert.equal(setBlocks.includes("offerModel:"), false, "Should not mutate offerModel");
    assert.equal(setBlocks.includes("conversionType:"), false, "Should not mutate conversionType");
    assert.equal(setBlocks.includes("priceBrutto:"), false, "Should not mutate priceBrutto");
    assert.equal(setBlocks.includes("priceOnRequest:"), false, "Should not mutate priceOnRequest");
    assert.equal(setBlocks.includes("outboundUrl:"), false, "Should not mutate outboundUrl");
    assert.equal(setBlocks.includes("partnerId:"), false, "Should not mutate partnerId");
    assert.equal(setBlocks.includes("categoryId:"), false, "Should not mutate categoryId");
  });
});
