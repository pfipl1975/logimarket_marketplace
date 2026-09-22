import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { resolveCanonicalOfferModel } from "../../src/lib/offers/model";

const actionsSource = readFileSync(
  new URL("../../src/app/actions.ts", import.meta.url),
  "utf8"
);

const badgeSource = readFileSync(
  new URL("../../src/components/offers/OfferModelBadge.tsx", import.meta.url),
  "utf8"
);

describe("rowToOffer projection contract", () => {
  test("projection maps the legacy pair through resolveCanonicalOfferModel", () => {
    assert.match(
      actionsSource,
      /offerModel:\s*resolveCanonicalOfferModel\([\s\S]*?row\.offer\.conversionType[\s\S]*?\)/
    );
  });

  test("projection never passes the raw offer_model through", () => {
    assert.doesNotMatch(actionsSource, /offerModel:\s*row\.offer\.offerModel(?!\w)/);
  });

  test("public CatalogOffer offerModel is typed as the canonical resolution", () => {
    assert.match(actionsSource, /offerModel:\s*CanonicalOfferModelResolution/);
  });

  test("raw marketplace + inbound projects to ecommerce", () => {
    assert.equal(resolveCanonicalOfferModel("marketplace", "inbound"), "ecommerce");
  });

  test("canonical resolution can never be marketplace", () => {
    const inputs: Array<[string, string]> = [
      ["marketplace", "inbound"],
      ["marketplace", "outbound"],
    ];
    for (const [model, conversion] of inputs) {
      assert.notEqual(resolveCanonicalOfferModel(model, conversion), "marketplace");
    }
  });

  test("public projection does not use conversionType=rfq as a discriminator", () => {
    assert.doesNotMatch(actionsSource, /conversionType === "rfq"/);
  });
});

describe("OfferModelBadge canonical contract", () => {
  test("badge accepts the canonical resolution type", () => {
    assert.match(badgeSource, /offerModel:\s*CanonicalOfferModelResolution/);
  });

  test("badge never exposes marketplace as a business label", () => {
    assert.doesNotMatch(badgeSource, /marketplace/);
  });

  test("unknown state renders no badge instead of a wrong label", () => {
    assert.match(badgeSource, /default:\s*return null;/);
  });
});
