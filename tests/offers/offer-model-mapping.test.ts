import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { resolveCanonicalOfferModel } from "../../src/lib/offers/model";

describe("resolveCanonicalOfferModel mapping matrix", () => {
  test("rfq + inbound resolves to rfq", () => {
    assert.equal(resolveCanonicalOfferModel("rfq", "inbound"), "rfq");
  });

  test("rfq + outbound resolves to outbound", () => {
    assert.equal(resolveCanonicalOfferModel("rfq", "outbound"), "outbound");
  });

  test("marketplace + inbound resolves to ecommerce", () => {
    assert.equal(resolveCanonicalOfferModel("marketplace", "inbound"), "ecommerce");
  });

  test("marketplace + outbound resolves to outbound", () => {
    assert.equal(resolveCanonicalOfferModel("marketplace", "outbound"), "outbound");
  });

  test("outbound takes precedence over the offer model", () => {
    assert.equal(resolveCanonicalOfferModel("rfq", "outbound"), "outbound");
    assert.equal(resolveCanonicalOfferModel("marketplace", "outbound"), "outbound");
  });
});

describe("resolveCanonicalOfferModel controlled unknown state", () => {
  test("unknown offer model with inbound resolves to unknown", () => {
    assert.equal(resolveCanonicalOfferModel("auction", "inbound"), "unknown");
  });

  test("unknown or missing offer model fails closed even with outbound", () => {
    assert.equal(resolveCanonicalOfferModel(null, "outbound"), "unknown");
    assert.equal(resolveCanonicalOfferModel(undefined, "outbound"), "unknown");
    assert.equal(resolveCanonicalOfferModel("", "outbound"), "unknown");
    assert.equal(resolveCanonicalOfferModel("auction", "outbound"), "unknown");
  });

  test("known offer models still resolve outbound", () => {
    assert.equal(resolveCanonicalOfferModel("rfq", "outbound"), "outbound");
    assert.equal(resolveCanonicalOfferModel("marketplace", "outbound"), "outbound");
  });

  test("unknown conversion type resolves to unknown", () => {
    assert.equal(resolveCanonicalOfferModel("rfq", "import"), "unknown");
    assert.equal(resolveCanonicalOfferModel("marketplace", "rfq"), "unknown");
  });

  test("missing values resolve to unknown", () => {
    assert.equal(resolveCanonicalOfferModel(null, "inbound"), "unknown");
    assert.equal(resolveCanonicalOfferModel(undefined, "inbound"), "unknown");
    assert.equal(resolveCanonicalOfferModel(null, "outbound"), "unknown");
    assert.equal(resolveCanonicalOfferModel(undefined, "outbound"), "unknown");
    assert.equal(resolveCanonicalOfferModel("rfq", null), "unknown");
    assert.equal(resolveCanonicalOfferModel("marketplace", undefined), "unknown");
    assert.equal(resolveCanonicalOfferModel(null, null), "unknown");
    assert.equal(resolveCanonicalOfferModel("", ""), "unknown");
  });

  test("unknown values never throw", () => {
    assert.doesNotThrow(() => resolveCanonicalOfferModel("garbage", "garbage"));
    assert.doesNotThrow(() => resolveCanonicalOfferModel(null, undefined));
  });

  test("result is always a controlled canonical value", () => {
    const allowed = new Set(["rfq", "ecommerce", "outbound", "unknown"]);
    const cases: Array<[string | null, string | null]> = [
      ["rfq", "inbound"],
      ["rfq", "outbound"],
      ["marketplace", "inbound"],
      ["marketplace", "outbound"],
      ["auction", "inbound"],
      ["rfq", "import"],
      [null, null],
    ];
    for (const [model, conversion] of cases) {
      assert.ok(allowed.has(resolveCanonicalOfferModel(model, conversion)));
    }
  });
});
