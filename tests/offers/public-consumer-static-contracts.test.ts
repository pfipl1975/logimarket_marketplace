import { test, describe } from "node:test";
import * as assert from "node:assert/strict";
import fs from "fs";

describe("Public Consumer Relational Contracts", () => {
  test("OfferCard.tsx consumes offer.attributes and not technicalAttributes", () => {
    const code = fs.readFileSync("src/components/OfferCard.tsx", "utf8");
    assert.match(code, /offer\.attributes/);
    assert.doesNotMatch(code, /offer\.technicalAttributes/);
  });

  test("OfferProcurementListRow.tsx consumes offer.attributes", () => {
    const code = fs.readFileSync("src/components/offers/OfferProcurementListRow.tsx", "utf8");
    assert.match(code, /offer\.attributes/);
    assert.doesNotMatch(code, /offer\.technicalAttributes/);
  });

  test("OfferPage.tsx passes locale to getOfferById", () => {
    const code = fs.readFileSync("src/app/_shared/OfferPage.tsx", "utf8");
    assert.match(code, /getOfferById\([^,]+,\s*locale\)/);
  });

  test("CategoryPage.tsx passes locale to getFilteredCategoryOffers", () => {
    const code = fs.readFileSync("src/app/_shared/CategoryPage.tsx", "utf8");
    assert.match(code, /getFilteredCategoryOffers\([\s\S]*?locale/);
  });

  test("HomePage.tsx passes locale to getOffers", () => {
    const code = fs.readFileSync("src/app/_shared/HomePage.tsx", "utf8");
    assert.match(code, /getOffers\([\s\S]*?locale\)/);
  });
});
