import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("LM-ADMIN-MVP-02: Admin IA and 56B2 Boundary Cleanup Contract", async (t) => {
  const root = path.join(__dirname, "../..");
  const navPath = path.join(root, "src/components/admin/AdminNavigation.tsx");
  const shellPath = path.join(root, "src/components/admin/AdminShell.tsx");
  const entryPath = path.join(root, "src/app/_shared/AdminEntryPage.tsx");
  const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"];

  await t.test("AdminNavigation: Orders removed, primary MVP modules intact", async () => {
    const navContent = await fs.readFile(navPath, "utf-8");

    // Negative assertions for orders
    assert.doesNotMatch(navContent, /ordersPath/i, "AdminNavigation must not define or use ordersPath");
    assert.doesNotMatch(navContent, /isOrdersActive/, "AdminNavigation must not check isOrdersActive");
    assert.doesNotMatch(navContent, /ordersNav/, "AdminNavigation labels contract must not contain ordersNav");

    // Positive assertions for MVP modules
    assert.match(navContent, /dashboardPath:\s*string/);
    assert.match(navContent, /offersPath:\s*string/);
    assert.match(navContent, /partnersPath:\s*string/);
    assert.match(navContent, /rfqPath:\s*string/);
    assert.match(navContent, /taxonomyNav:\s*string/);
    assert.match(navContent, /plannedLabel:\s*string/);

    // Links rendered
    assert.match(navContent, /<Link[^>]*href=\{dashboardPath\}/);
    assert.match(navContent, /<Link[^>]*href=\{offersPath\}/);
    assert.match(navContent, /<Link[^>]*href=\{partnersPath\}/);
    assert.match(navContent, /<Link[^>]*href=\{rfqPath\}/);
    assert.match(navContent, /<span[^>]*aria-disabled="true"/);
  });

  await t.test("AdminShell: Does not construct or pass ordersPath to AdminNavigation", async () => {
    const shellContent = await fs.readFile(shellPath, "utf-8");

    assert.doesNotMatch(shellContent, /const ordersPath/);
    assert.doesNotMatch(shellContent, /ordersPath=\{/);
    assert.doesNotMatch(shellContent, /ordersNav:/);

    // Passes expected paths
    assert.match(shellContent, /dashboardPath=\{dashboardPath\}/);
    assert.match(shellContent, /offersPath=\{offersPath\}/);
    assert.match(shellContent, /partnersPath=\{partnersPath\}/);
    assert.match(shellContent, /rfqPath=\{rfqPath\}/);

    // Logout form present and safe
    assert.match(shellContent, /<AdminLogoutForm/);
  });

  await t.test("AdminEntryPage: Orders removed from module availability list", async () => {
    const entryContent = await fs.readFile(entryPath, "utf-8");

    assert.doesNotMatch(entryContent, /dictionary\.ordersNav/);
    assert.match(entryContent, /dictionary\.dashboardNav/);
    assert.match(entryContent, /dictionary\.offersNav/);
    assert.match(entryContent, /dictionary\.partnersNav/);
    assert.match(entryContent, /dictionary\.rfqNav/);
    assert.match(entryContent, /dictionary\.taxonomyNav/);
  });

  await t.test("i18n: All 7 locales contain accurate, non-misleading admin labels", async () => {
    for (const locale of locales) {
      const filePath = path.join(root, `src/messages/${locale}.json`);
      const messages = JSON.parse(await fs.readFile(filePath, "utf-8"));

      assert.ok(messages.admin, `${locale}.json missing admin section`);
      assert.ok(messages.admin.readOnlyLabel, `${locale}.json missing admin.readOnlyLabel`);
      assert.ok(messages.admin.moduleReadOnlyStatus, `${locale}.json missing admin.moduleReadOnlyStatus`);

      // False global read-only label removed from header badge label
      if (locale === "pl") {
        assert.equal(messages.admin.readOnlyLabel, "Administracja centralna");
        assert.equal(messages.admin.moduleReadOnlyStatus, "Dostępny");
        assert.equal(messages.adminOffers.metaDescription, "Panel ofert LogiMarket");
      } else if (locale === "en") {
        assert.equal(messages.admin.readOnlyLabel, "Central administration");
        assert.equal(messages.admin.moduleReadOnlyStatus, "Available");
        assert.equal(messages.adminOffers.metaDescription, "LogiMarket offers panel");
      }
    }
  });

  await t.test("Preservation: Legacy Orders routes and models remain completely intact", async () => {
    const plOrdersRoute = path.join(root, "src/app/(pl)/admin/zamowienia/page.tsx");
    const locOrdersRoute = path.join(root, "src/app/(localized)/[locale]/admin/orders/page.tsx");
    const sharedOrdersPage = path.join(root, "src/app/_shared/AdminOrdersPage.tsx");
    const ordersTable = path.join(root, "src/components/admin/AdminOrdersTable.tsx");
    const ordersCore = path.join(root, "src/lib/admin/orders-read-model-core.ts");

    await assert.doesNotReject(() => fs.access(plOrdersRoute));
    await assert.doesNotReject(() => fs.access(locOrdersRoute));
    await assert.doesNotReject(() => fs.access(sharedOrdersPage));
    await assert.doesNotReject(() => fs.access(ordersTable));
    await assert.doesNotReject(() => fs.access(ordersCore));
  });
});
