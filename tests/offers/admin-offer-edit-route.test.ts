import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

test("ROUTE_CONTRACT_TEST: PL and Localized routes export correct metadata", () => {
  const plRoutePath = path.join(__dirname, "../../src/app/(pl)/admin/oferty/[id]/edytuj/page.tsx");
  const locRoutePath = path.join(__dirname, "../../src/app/(localized)/[locale]/admin/offers/[id]/edit/page.tsx");

  const plCode = fs.readFileSync(plRoutePath, "utf-8");
  const locCode = fs.readFileSync(locRoutePath, "utf-8");

  assert.ok(plCode.includes("index: false"), "PL route must have index: false");
  assert.ok(plCode.includes("follow: false"), "PL route must have follow: false");
  assert.ok(plCode.includes("nocache: true"), "PL route must have nocache: true");

  assert.ok(locCode.includes("index: false"), "Localized route must have index: false");
  assert.ok(locCode.includes("follow: false"), "Localized route must have follow: false");
  assert.ok(locCode.includes("nocache: true"), "Localized route must have nocache: true");

  assert.ok(locCode.includes("!isLocale(locale)"), "Localized route must validate locale");
  assert.ok(locCode.includes("notFound()"), "Localized route must call notFound on invalid locale");
});

test("ROUTE_CONTRACT_TEST: AdminOfferDetail Edit CTA conditional logic", () => {
  const detailPath = path.join(__dirname, "../../src/app/_shared/AdminOfferDetailPage.tsx");
  const detailCode = fs.readFileSync(detailPath, "utf-8");

  assert.ok(
    detailCode.includes('offer.publicationStatus === "draft" || offer.publicationStatus === "published" || offer.publicationStatus === "archived"'),
    "AdminOfferDetailPage must show Edit CTA only for draft, published, archived"
  );
});

test("ROUTE_CONTRACT_TEST: Async params check", () => {
  const plRoutePath = path.join(__dirname, "../../src/app/(pl)/admin/oferty/[id]/edytuj/page.tsx");
  const locRoutePath = path.join(__dirname, "../../src/app/(localized)/[locale]/admin/offers/[id]/edit/page.tsx");
  const plCode = fs.readFileSync(plRoutePath, "utf-8");
  const locCode = fs.readFileSync(locRoutePath, "utf-8");
  assert.ok(plCode.includes("Promise<{ id: string }>"), "PL route must use Promise for params type");
  assert.ok(plCode.includes("await params"), "PL route must await params");
  assert.ok(locCode.includes("Promise<{"), "Localized route must use Promise for params type");
  assert.ok(locCode.includes("await params"), "Localized route must await params");
});
