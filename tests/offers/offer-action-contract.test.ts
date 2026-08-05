import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const offerActionSource = readFileSync(
  new URL("../../src/components/OfferAction.tsx", import.meta.url),
  "utf8"
);

function extractSection(source: string, startMarker: string, endMarker?: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `section marker not found: ${startMarker}`);
  const end = endMarker ? source.indexOf(endMarker, start) : source.length;
  assert.notEqual(end, -1, `section end marker not found: ${endMarker}`);
  return source.slice(start, end);
}

const ecommerceSection = extractSection(offerActionSource, "// 1. E-Commerce", "// 2. RFQ");
const rfqSection = extractSection(offerActionSource, "// 2. RFQ", "// 3. Outbound");
const outboundSection = extractSection(offerActionSource, "// 3. Outbound", "// 4.");
const fallbackSection = extractSection(offerActionSource, "// 4.");

describe("OfferAction canonical CTA contract", () => {
  test("decision is based only on canonical offerModel comparisons", () => {
    assert.match(offerActionSource, /offer\.offerModel === "ecommerce"/);
    assert.match(offerActionSource, /offer\.offerModel === "rfq"/);
    assert.match(offerActionSource, /offer\.offerModel === "outbound"/);
  });

  test("no legacy conversionType discriminator remains", () => {
    assert.doesNotMatch(offerActionSource, /conversionType === "rfq"/);
    assert.doesNotMatch(offerActionSource, /conversionType === "outbound"/);
    assert.doesNotMatch(offerActionSource, /offerModel !== "ecommerce"[^)]*conversionType/);
    assert.doesNotMatch(offerActionSource, /conversionType/);
  });

  test("rfq branch renders RfqDialog and no cart or outbound link", () => {
    assert.match(rfqSection, /RfqDialog/);
    assert.doesNotMatch(rfqSection, /addToCart|AddToCartButton/);
    assert.doesNotMatch(rfqSection, /\/go\//);
  });

  test("ecommerce branch renders cart and no RFQ or outbound link", () => {
    assert.match(ecommerceSection, /addToCart|AddToCartButton/);
    assert.doesNotMatch(ecommerceSection, /RfqDialog/);
    assert.doesNotMatch(ecommerceSection, /\/go\//);
  });

  test("outbound branch renders /go/[id] link and no RFQ or cart", () => {
    assert.match(outboundSection, /\/go\//);
    assert.doesNotMatch(outboundSection, /RfqDialog/);
    assert.doesNotMatch(outboundSection, /addToCart|AddToCartButton/);
  });

  test("public outbound CTA href always uses the /go/[id] format", () => {
    const hrefs = [...outboundSection.matchAll(/href=\{`([^`]+)`\}/g)].map((m) => m[1]);
    assert.ok(hrefs.length > 0, "outbound branch must render a link");
    for (const href of hrefs) {
      assert.match(href, /^\/go\/\$\{offer\.id\}$/);
    }
  });

  test("CTA never links directly to outboundUrl", () => {
    assert.doesNotMatch(offerActionSource, /href=\{[^}]*outboundUrl/);
    assert.doesNotMatch(offerActionSource, /outboundUrl/);
  });

  test("unknown state renders a disabled fail-safe fallback", () => {
    assert.match(fallbackSection, /disabled/);
    assert.match(fallbackSection, /Oferta wymaga weryfikacji/);
    assert.doesNotMatch(fallbackSection, /RfqDialog|addToCart|AddToCartButton|\/go\//);
  });
});
