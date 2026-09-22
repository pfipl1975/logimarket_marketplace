import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function read(relativePath: string) {
  return fs.readFile(path.join(__dirname, "../..", relativePath), "utf-8");
}

test("Partner workspace shell exposes only real modules and reuses public logout", async () => {
  const shell = await read("src/app/_shared/partner/PartnerWorkspaceShell.tsx");
  const navigation = await read("src/app/_shared/partner/PartnerWorkspaceNavigation.tsx");

  assert.match(shell, /<PartnerWorkspaceNavigation/);
  assert.match(shell, /<PublicLogoutForm locale=\{locale\} label=\{dict\.logout\}/);
  assert.match(shell, /dict\.partnerContext/);
  assert.match(shell, /const marketplaceHref = getHomePath\(locale\)/);
  assert.match(shell, /href=\{marketplaceHref\}/);
  assert.match(shell, /dict\.backToMarketplace/);
  assert.doesNotMatch(shell, /aria-current=.*marketplace/i);
  assert.doesNotMatch(shell, /PARTNER_LOGOUT_REQUIRED_BEFORE_LAUNCH/);

  assert.match(navigation, /^"use client";/);
  assert.match(navigation, /usePathname\(\)/);
  assert.match(navigation, /aria-current=\{isDashboardActive \? "page" : undefined\}/);
  assert.match(navigation, /aria-current=\{isOrdersActive \? "page" : undefined\}/);
  assert.match(navigation, /aria-current=\{isOffersActive \? "page" : undefined\}/);
  assert.match(navigation, /pathname\.startsWith\(`\$\{normalizedOrdersHref\}\//);
  assert.match(navigation, /\{labels\.dashboard\}/);
  assert.match(navigation, /\{labels\.orders\}/);
  assert.match(navigation, /\{labels\.offers\}/);
  assert.doesNotMatch(navigation, /backToMarketplace|marketplaceHref|getHomePath/);
  assert.match(navigation, /offersHref/);
  assert.doesNotMatch(navigation, /(productsHref|analyticsHref|settingsHref|messagesHref)/);
});

test("Partner workspace marketplace exit follows canonical locale home paths", async () => {
  const paths = await read("src/lib/i18n/paths.ts");

  assert.match(paths, /return locale === defaultLocale \? "\/" : `\/\$\{locale\}`/);
});

test("Partner dashboard routes preserve PL and localized route contracts", async () => {
  const plPage = await read("src/app/(pl)/partner/[partnerId]/page.tsx");
  const localizedPage = await read("src/app/(localized)/[locale]/partner/[partnerId]/page.tsx");
  const plEntry = await read("src/app/(pl)/partner/page.tsx");
  const localizedEntry = await read("src/app/(localized)/[locale]/partner/page.tsx");

  assert.match(plPage, /parseStrictIdOrNotFound\(partnerId\)/);
  assert.match(plPage, /`\/partner\/\$\{parsedPartnerId\}\/zamowienia`/);
  assert.match(localizedPage, /!isLocale\(locale\) \|\| locale === "pl"/);
  assert.match(localizedPage, /`\/\$\{locale\}\/partner\/\$\{parsedPartnerId\}\/orders`/);

  assert.match(plEntry, /redirect\(`\/partner\/\$\{memberships\[0\]\.partnerId\}`\)/);
  assert.match(localizedEntry, /redirect\(`\/\$\{locale\}\/partner\/\$\{memberships\[0\]\.partnerId\}`\)/);
  assert.doesNotMatch(plEntry, /memberships\[0\]\.partnerId\}\/zamowienia/);
  assert.doesNotMatch(localizedEntry, /memberships\[0\]\.partnerId\}\/orders/);
});

test("Partner layouts retain server membership authorization before partner data lookup", async () => {
  for (const relativePath of [
    "src/app/(pl)/partner/[partnerId]/layout.tsx",
    "src/app/(localized)/[locale]/partner/[partnerId]/layout.tsx",
  ]) {
    const layout = await read(relativePath);
    const authorizationIndex = layout.indexOf("await requirePartnerMembership(parsedPartnerId)");
    const partnerLookupIndex = layout.indexOf("db.select({ companyName: partners.companyName })");

    assert.ok(authorizationIndex >= 0, `${relativePath} must require Partner membership`);
    assert.ok(partnerLookupIndex > authorizationIndex, `${relativePath} must authorize before loading company context`);
    assert.match(layout, /err instanceof UnauthorizedError \|\| err instanceof ForbiddenError/);
    assert.match(layout, /notFound\(\)/);
    assert.match(layout, /dashboardHref=\{dashboardHref\}/);
    assert.match(layout, /ordersHref=\{ordersHref\}/);
    assert.match(layout, /offersHref=\{offersHref\}/);
  }
});

test("Orders empty state is compact and keeps the existing list behavior", async () => {
  const ordersPage = await read("src/app/(pl)/partner/[partnerId]/zamowienia/page.tsx");

  assert.doesNotMatch(ordersPage, /min-h-\[400px\]/);
  assert.match(ordersPage, /dict\.emptyListTitle/);
  assert.match(ordersPage, /dict\.emptyPendingOrders/);
  assert.match(ordersPage, /dict\.viewAllOrders/);
  assert.match(ordersPage, /filteredItems\.length === 0/);
  assert.match(ordersPage, /getPartnerOrdersList\(parsedPartnerId\)/);
  assert.match(ordersPage, /href=\{`\$\{basePath\}\/\$\{item\.sellerOrderId\}`\}/);
});

test("all seven locales provide the Partner workspace foundation strings", async (t) => {
  const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"];
  const requiredKeys = [
    "dashboard",
    "offers",
    "backToMarketplace",
    "navigationLabel",
    "partnerContext",
    "workspaceLabel",
    "dashboardTitle",
    "dashboardIntro",
    "dashboardOrdersTitle",
    "dashboardOrdersDescription",
    "dashboardOrdersCta",
    "emptyListTitle",
  ];

  for (const locale of locales) {
    await t.test(locale, async () => {
      const dictionary = JSON.parse(await read(`src/messages/${locale}.json`));
      for (const key of requiredKeys) {
        const value = dictionary.PartnerWorkspace?.[key];
        assert.ok(typeof value === "string" && value.trim().length > 0, `${locale}.${key} must be translated`);
      }
    });
  }
});
