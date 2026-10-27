import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["pl", "en", "de", "fr", "uk", "es", "zh"] as const;

// These fields are rendered in catalog filters, offer badges, Admin workflows,
// and the Partner workspace. Their values should agree with the already
// approved user-facing offer type label, not with the technical code "outbound".
const CONSISTENT_LABEL_PATHS = [
  ["catalog", "filtersModelOutbound"],
  ["offers", "outboundModel"],
  ["adminOffers", "modelOutbound"],
  ["adminOffers", "createConversionOutbound"],
  ["adminOfferDetail", "modelOutbound"],
  ["PartnerWorkspace", "offersModelOutbound"],
] as const;

function loadMessages(locale: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), "src", "messages", `${locale}.json`), "utf8"));
}

function valueAt(messages: Record<string, unknown>, ...segments: string[]): string {
  let current: unknown = messages;
  for (const segment of segments) {
    assert.ok(current && typeof current === "object" && !Array.isArray(current), segments.join("."));
    current = (current as Record<string, unknown>)[segment];
  }
  assert.equal(typeof current, "string", segments.join("."));
  return current as string;
}

describe("LM-OFFER-OUTBOUND-LABEL-01 — presentation-only locale contract", () => {
  for (const locale of LOCALES) {
    test(`${locale}: every user-facing offer type label matches the approved Partner offer type`, () => {
      const messages = loadMessages(locale);
      const label = valueAt(messages, "adminOffers", "offerTypeExternal");
      assert.ok(label.trim().length > 3);
      assert.equal(valueAt(messages, "adminOfferEdit", "offerTypeExternal"), label);
      for (const key of CONSISTENT_LABEL_PATHS) {
        assert.equal(valueAt(messages, ...key), label, `${locale}:${key.join(".")}`);
      }
    });

    test(`${locale}: headings, SEO copy, help and errors avoid internal outbound jargon`, () => {
      const messages = loadMessages(locale);
      const fields = [
        ["catalogHome", "outboundHeading"],
        ["catalogHome", "metaDescription"],
        ["catalogHome", "modelNote"],
        ["adminOfferDetail", "fieldOutboundUrl"],
        ["adminOfferEdit", "fieldOutboundUrl"],
        ["adminOfferDetail", "eligibilityOutboundInvalid"],
        ["adminOfferEdit", "errors", "OUTBOUND_URL_INVALID"],
      ];
      for (const path of fields) {
        const text = valueAt(messages, ...path);
        assert.ok(text.trim().length > 3, `${locale}:${path.join(".")}`);
        assert.doesNotMatch(text, /outbound/i, `${locale}:${path.join(".")}`);
        if (locale === "zh") {
          assert.doesNotMatch(text, /外联|外呼|出站|外链/, `${locale}:${path.join(".")}`);
        }
      }
    });
  }
});
