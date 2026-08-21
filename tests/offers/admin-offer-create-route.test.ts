import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

test("ROUTE_CONTRACT_TEST: PL route exists", () => {
  const plRoutePath = path.join(__dirname, "../../src/app/(pl)/admin/oferty/nowa/page.tsx");
  assert.ok(fs.existsSync(plRoutePath), "PL create route must exist");
});

test("ROUTE_CONTRACT_TEST: Localized route excludes PL and validates locale", () => {
  const locRoutePath = path.join(__dirname, "../../src/app/(localized)/[locale]/admin/offers/new/page.tsx");
  assert.ok(fs.existsSync(locRoutePath), "Localized create route must exist");

  const locCode = fs.readFileSync(locRoutePath, "utf-8");

  assert.ok(locCode.includes("!isLocale(locale)"), "Localized route must validate isLocale");
  assert.ok(locCode.includes("locale === defaultLocale"), "Localized route must explicitly reject defaultLocale (PL)");
  assert.ok(locCode.includes("notFound()"), "Localized route must call notFound on invalid locale");
});

test("ROUTE_CONTRACT_TEST: Success destination is Edit Route", () => {
  const formPath = path.join(__dirname, "../../src/components/admin/AdminOfferCreateForm.tsx");
  const formCode = fs.readFileSync(formPath, "utf-8");

  assert.ok(
    formCode.includes("`/admin/oferty/${result.offerId}/edytuj`"),
    "PL destination must be exact edit route"
  );
  assert.ok(
    formCode.includes("`/${locale}/admin/offers/${result.offerId}/edit`"),
    "Localized destination must be exact edit route"
  );
});
