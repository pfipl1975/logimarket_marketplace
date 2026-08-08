import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { createOfferJsonLd, type OfferJsonLdSource } from "../../src/lib/seo/json-ld";
import type { CanonicalOfferModelResolution } from "../../src/lib/offers/model";
import type { Dictionary } from "../../src/lib/i18n/types";

// Minimal dictionary stub — createOfferJsonLd only reads categories.bySlug
// and meta.description. No production offer or partner data is used.
const dictStub = {
  categories: { bySlug: {} },
  meta: { description: "Test fallback description" },
} as unknown as Dictionary;

function makeOffer(overrides: Partial<OfferJsonLdSource> = {}): OfferJsonLdSource {
  return {
    id: 900001,
    title: "Test offer",
    description: "Test description",
    imageUrl: null,
    priceBrutto: "199.99",
    priceOnRequest: false,
    categorySlug: "test-category",
    categoryName: "Test category",
    partnerName: "Test partner",
    offerModel: "ecommerce",
    conversionType: "inbound",
    publicationStatus: "published",
    isActive: true,
    ...overrides,
  };
}

function hasSchemaOffer(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    "offers" in result
  );
}

describe("createOfferJsonLd price offer eligibility", () => {
  test("canonical ecommerce + published + valid price emits offers", () => {
    const result = createOfferJsonLd("pl", makeOffer({ offerModel: "ecommerce" }), dictStub);
    assert.ok(hasSchemaOffer(result));
  });

  test("canonical outbound + published + valid price emits offers", () => {
    const result = createOfferJsonLd("pl", makeOffer({ offerModel: "outbound" }), dictStub);
    assert.ok(hasSchemaOffer(result));
  });

  test("canonical rfq + published + valid price emits no offers", () => {
    const result = createOfferJsonLd("pl", makeOffer({ offerModel: "rfq" }), dictStub);
    assert.ok(!hasSchemaOffer(result));
  });

  test("canonical unknown + published + valid price emits no offers", () => {
    const unknownModel: CanonicalOfferModelResolution = "unknown";
    const result = createOfferJsonLd("pl", makeOffer({ offerModel: unknownModel }), dictStub);
    assert.ok(!hasSchemaOffer(result));
  });

  test("archived ecommerce emits no offers", () => {
    const result = createOfferJsonLd(
      "pl",
      makeOffer({ offerModel: "ecommerce", publicationStatus: "archived" }),
      dictStub
    );
    assert.ok(!hasSchemaOffer(result));
  });

  test("inactive ecommerce emits no offers", () => {
    const result = createOfferJsonLd(
      "pl",
      makeOffer({ offerModel: "ecommerce", publicationStatus: "published", isActive: false }),
      dictStub
    );
    assert.ok(!hasSchemaOffer(result));
  });

  test("priceOnRequest ecommerce emits no offers", () => {
    const result = createOfferJsonLd(
      "pl",
      makeOffer({ offerModel: "ecommerce", priceOnRequest: true }),
      dictStub
    );
    assert.ok(!hasSchemaOffer(result));
  });

  test("missing or invalid price emits no offers", () => {
    assert.ok(!hasSchemaOffer(createOfferJsonLd("pl", makeOffer({ priceBrutto: null }), dictStub)));
    assert.ok(!hasSchemaOffer(createOfferJsonLd("pl", makeOffer({ priceBrutto: "0" }), dictStub)));
    assert.ok(!hasSchemaOffer(createOfferJsonLd("pl", makeOffer({ priceBrutto: "abc" }), dictStub)));
  });

  test("emitted offer keeps price, currency and seller contract", () => {
    const result = createOfferJsonLd("pl", makeOffer({ offerModel: "ecommerce" }), dictStub);
    assert.ok(hasSchemaOffer(result));
    const offers = (result as Record<string, unknown>)["offers"] as Record<string, unknown>;
    assert.equal(offers["@type"], "Offer");
    assert.equal(offers["price"], 199.99);
    assert.equal(offers["priceCurrency"], "PLN");
    assert.deepEqual(offers["seller"], { "@type": "Organization", name: "Test partner" });
  });
});
