import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";

describe("Offer Presentation Contract", () => {
  test("proves OfferPage.tsx handles archived and operationally unavailable states correctly", () => {
    const sourceCode = fs.readFileSync("src/app/_shared/OfferPage.tsx", "utf8");

    // Must define the flags
    assert.equal(sourceCode.includes("const isArchived = offer.publicationStatus === \"archived\";"), true, "Missing isArchived definition");
    assert.equal(
      sourceCode.includes("const isOperationallyUnavailable = offer.publicationStatus === \"published\" && !offer.isActive;") || 
      sourceCode.includes("const isOperationallyUnavailable = !offer.isActive && offer.publicationStatus === \"published\";"),
      true,
      "Missing isOperationallyUnavailable definition"
    );

    // Must have the correct conditional structure
    const archivedCheckIndex = sourceCode.indexOf("{isArchived ? (");
    assert.equal(archivedCheckIndex !== -1, true, "Missing {isArchived ? ( branch");

    const unavailableCheckIndex = sourceCode.indexOf(") : isOperationallyUnavailable ? (", archivedCheckIndex);
    assert.equal(unavailableCheckIndex !== -1, true, "Missing ) : isOperationallyUnavailable ? ( branch");

    const offerActionCheckIndex = sourceCode.indexOf(") : (", unavailableCheckIndex);
    assert.equal(offerActionCheckIndex !== -1, true, "Missing ) : ( branch for OfferAction");

    const offerActionComponentIndex = sourceCode.indexOf("<OfferAction", offerActionCheckIndex);
    assert.equal(offerActionComponentIndex !== -1, true, "Missing <OfferAction component");
    assert.equal(offerActionComponentIndex > offerActionCheckIndex, true, "OfferAction must be inside the final else branch");
  });
});
