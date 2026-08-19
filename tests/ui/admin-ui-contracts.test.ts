import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

describe("UI Contract Tests", () => {
  test("AdminOffersTable has NO lifecycle action", () => {
    const tableSrc = fs.readFileSync("src/components/admin/AdminOffersTable.tsx", "utf8");
    assert.ok(!tableSrc.includes("AdminOfferLifecycleAction"), "Table must not import or render AdminOfferLifecycleAction");
    
    assert.ok(tableSrc.includes("draft"), "Table must include draft label");
    assert.ok(tableSrc.includes("published"), "Table must include published label");
    assert.ok(tableSrc.includes("hidden"), "Table must include hidden label");
    assert.ok(tableSrc.includes("archived"), "Table must include archived label");
    assert.ok(tableSrc.includes("deleted"), "Table must include deleted label");
  });

  test("AdminOfferDetailPage renders workspace and specific states", () => {
    const detailSrc = fs.readFileSync("src/app/_shared/AdminOfferDetailPage.tsx", "utf8");
    
    assert.ok(detailSrc.includes("sectionLifecycle"), "Must render lifecycle section");
    
    assert.ok(detailSrc.includes("import { evaluateOfferPublishEligibility }"), "Must import evaluateOfferPublishEligibility");
    assert.ok(detailSrc.includes("evaluateOfferPublishEligibility({"), "Must call evaluateOfferPublishEligibility");
    assert.ok(detailSrc.includes("isPublishEligible={eligibility.eligible}"), "Must pass eligibility.eligible to AdminOfferLifecycleAction");

    assert.ok(!detailSrc.includes("dict.statusUnknown || status;"), "Unknown status must NOT fall back to raw status");
    assert.ok(detailSrc.match(/default:\s*return\s+(dictionary\.adminOffers\.)?statusUnknown;/), "Unknown status must strictly use dictionary value without raw fallback");

    assert.ok(
      detailSrc.includes("offer.publicationStatus === \"draft\" || offer.publicationStatus === \"published\""),
      "AdminOfferLifecycleAction must only render for draft or published"
    );
    
    assert.ok(!detailSrc.includes(">Hide<"), "Must not contain Hide mutation");
    assert.ok(!detailSrc.includes(">Delete<"), "Must not contain Delete mutation");
    assert.ok(!detailSrc.includes(">Restore<"), "Must not contain Restore mutation");
    assert.ok(!detailSrc.includes(">Republish<"), "Must not contain Republish mutation");
    assert.ok(!detailSrc.includes(">Unarchive<"), "Must not contain Unarchive mutation");

    assert.ok(
      detailSrc.includes("offer.publicationStatus === \"draft\" || offer.publicationStatus === \"published\" || offer.publicationStatus === \"archived\""),
      "Edit CTA must only render for draft, published, or archived"
    );

    assert.ok(
      detailSrc.includes("offer.publicationStatus === \"hidden\" || offer.publicationStatus === \"deleted\""),
      "Must have specific read-only block for hidden/deleted"
    );
  });
});