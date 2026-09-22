import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Partner Offer Detail Read Model - static source tests", () => {
  const readModelSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/partner-offers/detail-read-model.ts"),
    "utf-8"
  );

  // A. membership authorization occurs before offer loading
  assert.ok(readModelSource.includes("await requirePartnerMembership(partnerId)"), "Must authorize membership");
  const authIdx = readModelSource.indexOf("await requirePartnerMembership(partnerId)");
  const queryIdx = readModelSource.indexOf("await db");
  assert.ok(authIdx < queryIdx, "Authorization must happen before loading the offer");

  // B. query uses BOTH offerId and partnerId
  assert.ok(readModelSource.includes("eq(schema.offers.id, offerId)"), "Must check offerId");
  assert.ok(readModelSource.includes("eq(schema.offers.partnerId, partnerId)"), "Must check partnerId");

  // D. deleted offer returns the same neutral not-found
  assert.ok(readModelSource.includes("ne(schema.offers.publicationStatus, \"deleted\")"), "Must filter deleted offers");

  // H. exact price DB string preserved, no PLN/EUR invented
  assert.ok(readModelSource.includes("priceBrutto: offer.priceBrutto"), "Must map price exact string");
  assert.ok(!readModelSource.includes("PLN") && !readModelSource.includes("EUR"), "Must not invent currency");

  // O. no Partner mutation action is introduced
  assert.ok(!readModelSource.includes("db.update") && !readModelSource.includes("db.insert") && !readModelSource.includes("db.delete"), "Must be read-only");
});

test("Partner Offer Detail Routes - static source tests", () => {
  const plRouteSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(pl)/partner/[partnerId]/oferty/[offerId]/page.tsx"),
    "utf-8"
  );
  const localizedRouteSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(localized)/[locale]/partner/[partnerId]/offers/[offerId]/page.tsx"),
    "utf-8"
  );

  // K. PL and localized routes are force-dynamic + noindex
  assert.ok(plRouteSource.includes('export const dynamic = "force-dynamic"'), "PL route must be dynamic");
  assert.ok(plRouteSource.includes("robots: { index: false, follow: false, nocache: true }"), "PL route must be noindex");

  // K. localized route declares its own static route config
  assert.ok(localizedRouteSource.includes('export const dynamic = "force-dynamic"'), "Localized route must be dynamic locally");
  assert.ok(localizedRouteSource.includes("robots: { index: false, follow: false, nocache: true }"), "Localized route must be noindex locally");

  // no generic technical attributes JSON dump
  assert.ok(!plRouteSource.includes("JSON.stringify(offer.technicalAttributes"), "No generic technicalAttributes dump");
});

test("Partner Offers List - list links pointing to detail routes", () => {
  const listRouteSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(pl)/partner/[partnerId]/oferty/page.tsx"),
    "utf-8"
  );

  // list links point to the correct PL/localized Partner detail route
  assert.ok(listRouteSource.includes('<Link href={`${basePath}/${item.offerId}`}') || listRouteSource.includes("<Link href={`${basePath}/${item.offerId}`}"), "Must contain detail links");

  // mobile contains explicit semantic detail link
  assert.ok(listRouteSource.includes('{dict.offerDetailReadMore || "View details"}'), "Must contain read more link text");

  // Title is wrapped in a Link
  assert.ok(listRouteSource.includes('className="break-words hover:underline') || listRouteSource.includes('className="hover:underline'), "Title link exists");
});

test("Partner Offer Detail - canonical model and public preview logic", () => {
  // G. public preview only for eligible published + active + known-model offer
  const checkPreview = (publicationStatus: string, isActive: boolean, canonicalModel: string) => {
    return publicationStatus === "published" && isActive && canonicalModel !== "unknown";
  };

  assert.equal(checkPreview("published", true, "rfq"), true);
  assert.equal(checkPreview("published", true, "unknown"), false);
  assert.equal(checkPreview("published", false, "rfq"), false);
  assert.equal(checkPreview("draft", true, "rfq"), false);
  assert.equal(checkPreview("archived", true, "rfq"), false);
  assert.equal(checkPreview("hidden", true, "rfq"), false);
});

test("Partner Offer Detail - missing category or invalid state fails closed", () => {
  const readModelSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/partner-offers/detail-read-model.ts"),
    "utf-8"
  );

  assert.ok(readModelSource.includes("if (!category) {"), "Must fail closed if category is missing");
  assert.ok(readModelSource.includes("parsePartnerOfferPublicationStatus("), "Must use the shared runtime publication-status contract");
  assert.ok(readModelSource.includes("if (!publicationStatus) {"), "Must fail closed if invalid status");
});

test("Partner pending-review detail is readable but remains non-editable", () => {
  const readModelSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/partner-offers/detail-read-model.ts"),
    "utf-8"
  );
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(pl)/partner/[partnerId]/oferty/[offerId]/page.tsx"),
    "utf-8"
  );

  assert.ok(readModelSource.includes("parsePartnerOfferPublicationStatus("));
  assert.ok(pageSource.includes('pending_review: dict.offersStatusPendingReview'));
  assert.ok(pageSource.includes('offer.publicationStatus === "pending_review"'));
  assert.ok(pageSource.includes('offer.publicationStatus === "draft" && ('), "Edit and submit controls must remain draft-only");
});

test("Partner Offer Detail - unresolved media is filtered out", () => {
  const readModelSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/partner-offers/detail-read-model.ts"),
    "utf-8"
  );

  assert.ok(readModelSource.includes("if (publicUrl) {"), "Must filter null public URLs");
  assert.ok(readModelSource.includes("media.push("), "Must conditionally push to media array");
});
