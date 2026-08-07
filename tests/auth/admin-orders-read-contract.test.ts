import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";

test("Admin Orders Read Contract", async (t) => {
  await t.test("Routes exist and are dynamic", async () => {
    const plRoute = await fs.readFile(path.join(process.cwd(), "src/app/(pl)/admin/zamowienia/page.tsx"), "utf-8");
    const locRoute = await fs.readFile(path.join(process.cwd(), "src/app/(localized)/[locale]/admin/orders/page.tsx"), "utf-8");

    // Both routes
    assert.match(plRoute, /export const dynamic = "force-dynamic"/);
    assert.match(locRoute, /export const dynamic = "force-dynamic"/);

    assert.match(plRoute, /searchParams:\s*Promise<unknown>/);
    assert.match(locRoute, /searchParams:\s*Promise<unknown>/);

    assert.match(plRoute, /await searchParams/);
    assert.match(locRoute, /await searchParams/);

    assert.match(plRoute, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*,?\s*\}/);
    assert.match(locRoute, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*,?\s*\}/);

    // Metadata uses adminOrders dictionary (RFQ pattern)
    assert.match(plRoute, /export async function generateMetadata/);
    assert.match(plRoute, /getDictionary\("pl"\)/);
    assert.match(plRoute, /adminOrders\.metaTitle/);
    assert.match(plRoute, /adminOrders\.metaDescription/);

    assert.match(locRoute, /export async function generateMetadata/);
    assert.match(locRoute, /getDictionary\(resolvedParams\.locale\)/);
    assert.match(locRoute, /adminOrders\.metaTitle/);
    assert.match(locRoute, /adminOrders\.metaDescription/);

    // Localized specific
    assert.match(locRoute, /params:\s*Promise<\{\s*locale:\s*string\s*}>/);
    assert.match(locRoute, /await params/);
    assert.match(locRoute, /isLocale/);
    assert.match(locRoute, /notFound/);
    assert.match(locRoute, /locale === "pl"/);
  });

  await t.test("Server Components have no client directives or direct DB imports", async () => {
    const page = await fs.readFile(path.join(process.cwd(), "src/app/_shared/AdminOrdersPage.tsx"), "utf-8");
    const table = await fs.readFile(path.join(process.cwd(), "src/components/admin/AdminOrdersTable.tsx"), "utf-8");

    assert.doesNotMatch(page, /"use client"/);
    assert.doesNotMatch(table, /"use client"/);

    assert.doesNotMatch(page, /import \{ db \}/);
    assert.doesNotMatch(table, /import \{ db \}/);

    assert.doesNotMatch(page, /useEffect/);
    assert.doesNotMatch(table, /useEffect/);
  });

  await t.test("Server Action - Auth First ordering", async () => {
    const actions = await fs.readFile(path.join(process.cwd(), "src/app/actions.ts"), "utf-8");

    assert.match(actions, /export async function getAdminOrdersPage/);

    const actionMatch = actions.match(/export async function getAdminOrdersPage[\s\S]*?(catch[\s\S]*?ADMIN_ORDERS_UNAVAILABLE[\s\S]*?})/);
    assert.ok(actionMatch, "getAdminOrdersPage must be present");
    const actionBody = actionMatch[0];

    assert.match(actionBody, /getAdminOrdersPage\s*\(\s*rawInput\s*:\s*unknown\s*\)/);
    assert.match(actionBody, /requireAdmin/);

    const requireAdminIdx = actionBody.indexOf("await requireAdmin()");
    const tryIdx = actionBody.indexOf("try {");
    assert.ok(requireAdminIdx !== -1 && tryIdx !== -1 && requireAdminIdx < tryIdx,
      "requireAdmin must execute before try block");

    const parseQueryIdx = actionBody.indexOf("parseAdminOrdersQuery");
    assert.ok(parseQueryIdx > requireAdminIdx,
      "parseAdminOrdersQuery must execute after requireAdmin");

    const dbQueryIdx = actionBody.indexOf("getAdminOrdersReadModel");
    assert.ok(dbQueryIdx > requireAdminIdx,
      "getAdminOrdersReadModel must execute after requireAdmin");

    assert.match(actionBody, /ADMIN_ORDERS_UNAVAILABLE/);

    // Auth failure must NOT be caught as ADMIN_ORDERS_UNAVAILABLE
    const catchRegex = /catch(?: \((.*?)\))? \{([\s\S]*?)\}/;
    const catchBlock = actionBody.match(catchRegex);
    assert.ok(catchBlock);
    const errName = catchBlock[1];
    const catchBody = catchBlock[2];

    assert.doesNotMatch(catchBody, /error\.stack/);
    assert.doesNotMatch(catchBody, /error\.message/);
    if (errName) {
      assert.doesNotMatch(catchBody, new RegExp(`console\\.error\\(${errName}\\)`));
    }
  });

  await t.test("DTO minimization - allowed fields present", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/orders-read-model-core.ts"), "utf-8");

    assert.match(core, /id:/);
    assert.match(core, /createdAt:/);
    assert.match(core, /status:/);
    assert.match(core, /companyName:/);
    assert.match(core, /contactName:/);
    assert.match(core, /email:/);
    assert.match(core, /itemCount:/);
  });

  await t.test("DTO minimization - forbidden fields absent", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/orders-read-model-core.ts"), "utf-8");

    assert.doesNotMatch(core, /sessionHash/);
    assert.doesNotMatch(core, /schema\.orders\.phone/);
    assert.doesNotMatch(core, /schema\.orders\.message/);
    assert.doesNotMatch(core, /totalAmount/);
    assert.doesNotMatch(core, /unitPrice/);
    assert.doesNotMatch(core, /totalPrice/);
  });

  await t.test("Search privacy - allowed predicates only", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/orders-read-model-core.ts"), "utf-8");

    // Allowed search targets
    assert.match(core, /schema\.orders\.id/);
    assert.match(core, /schema\.orders\.companyName/);

    // Forbidden PII search
    assert.doesNotMatch(core, /ilike\(schema\.orders\.contactName/);
    assert.doesNotMatch(core, /ilike\(schema\.orders\.email/);
    assert.doesNotMatch(core, /ilike\(schema\.orders\.phone/);
    assert.doesNotMatch(core, /ilike\(schema\.orders\.message/);
    assert.doesNotMatch(core, /ilike\(schema\.orders\.sessionHash/);
    assert.doesNotMatch(core, /ilike\(schema\.orders\.totalAmount/);
    assert.doesNotMatch(core, /orderItems\.title/);
    assert.doesNotMatch(core, /orderItems\.offerId/);
  });

  await t.test("ItemCount strategy - correlated subquery prevents row multiplication", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/orders-read-model-core.ts"), "utf-8");

    // Must NOT use ordinary leftJoin on orderItems that would multiply rows
    assert.doesNotMatch(core, /\.leftJoin\(schema\.orderItems,/);
    assert.doesNotMatch(core, /\.leftJoin\(orderItems,/);

    // Must reference orderItems table in a safe correlated context (raw sql or db.select subquery)
    assert.match(core, /orderItems/);
    assert.match(core, /itemCount/);
  });

  await t.test("Pagination contract", async () => {
    const query = await fs.readFile(path.join(process.cwd(), "src/lib/admin/orders-query.ts"), "utf-8");
    assert.match(query, /ADMIN_ORDERS_PAGE_SIZE = 25/);
  });

  await t.test("Sorting contract", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/orders-read-model-core.ts"), "utf-8");
    assert.match(core, /DESC NULLS LAST/);
    assert.match(core, /desc\(schema\.orders\.id\)/);
  });

  await t.test("Nullable createdAt handling", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/orders-read-model-core.ts"), "utf-8");
    assert.match(core, /row\.createdAt \? row\.createdAt\.toISOString\(\) : null/);
  });

  await t.test("UI - forbidden patterns absent in Orders UI", async () => {
    const page = await fs.readFile(path.join(process.cwd(), "src/app/_shared/AdminOrdersPage.tsx"), "utf-8");
    const table = await fs.readFile(path.join(process.cwd(), "src/components/admin/AdminOrdersTable.tsx"), "utf-8");

    assert.doesNotMatch(table, /mailto:/);
    assert.doesNotMatch(table, /tel:/);
    assert.doesNotMatch(table, /sessionHash/);
    assert.doesNotMatch(table, /phone/);
    assert.doesNotMatch(table, /message/);
    assert.doesNotMatch(table, /totalAmount/);
    assert.doesNotMatch(table, /style=\{\{/);
    assert.doesNotMatch(page, /style=\{\{/);
    assert.doesNotMatch(page, /tailwind\.config/);

    assert.match(page, /rounded-industrial/);
  });

  await t.test("Navigation - Orders is Link and has active state", async () => {
    const nav = await fs.readFile(path.join(process.cwd(), "src/components/admin/AdminNavigation.tsx"), "utf-8");

    assert.match(nav, /ordersPath: string/);
    assert.match(nav, /pathname === ordersPath/);
    assert.match(nav, /pathname\.startsWith\(`\$\{ordersPath\}\/`\)/);

    // Orders is now a real Link
    assert.match(nav, /<Link[^>]*href=\{ordersPath\}/);

    // Taxonomy remains planned/disabled
    assert.match(nav, /\{labels\.taxonomyNav\} <span[^>]*>\{labels\.plannedLabel\}<\/span>/);
  });

  await t.test("AdminShell - ordersPath passed to AdminNavigation", async () => {
    const shell = await fs.readFile(path.join(process.cwd(), "src/components/admin/AdminShell.tsx"), "utf-8");

    assert.match(shell, /ordersPath/);
    assert.match(shell, /admin\/zamowienia/);
    assert.match(shell, /admin\/orders/);
  });

  await t.test("AdminEntryPage - RFQ and Orders both show as read-only", async () => {
    const entry = await fs.readFile(path.join(process.cwd(), "src/app/_shared/AdminEntryPage.tsx"), "utf-8");

    // Both rfqNav and ordersNav should appear with moduleReadOnlyStatus
    const rfqIdx = entry.indexOf("rfqNav");
    const ordersIdx = entry.indexOf("ordersNav");

    assert.ok(rfqIdx !== -1, "rfqNav must be present");
    assert.ok(ordersIdx !== -1, "ordersNav must be present");

    // Orders should NOT appear with plannedLabel anymore
    const ordersBlock = entry.slice(ordersIdx, ordersIdx + 200);
    assert.doesNotMatch(ordersBlock, /plannedLabel/);
    assert.match(ordersBlock, /moduleReadOnlyStatus/);
  });

  await t.test("i18n - all 7 locales have adminOrders with aligned keys", async () => {
    const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"];
    const sections: Record<string, Record<string, unknown>> = {};

    for (const locale of locales) {
      const raw = JSON.parse(
        await fs.readFile(path.join(process.cwd(), `src/messages/${locale}.json`), "utf-8")
      );
      assert.ok(raw.adminOrders, `${locale}.json must have adminOrders`);
      sections[locale] = raw.adminOrders;
    }

    const requiredKeys = [
      "metaTitle", "metaDescription", "eyebrow", "title", "description",
      "searchLabel", "searchPlaceholder", "applyFilters", "clearFilters",
      "tableCaption", "resultsCount",
      "emptyTitle", "emptyDescription", "filteredEmptyTitle", "filteredEmptyDescription",
      "errorTitle", "errorDescription",
      "idColumn", "createdColumn", "statusColumn", "companyColumn", "emailColumn", "itemsColumn",
      "paginationSummary", "paginationPrevious", "paginationNext"
    ];

    const en = sections["en"];
    const enKeys = Object.keys(en as object).sort();

    for (const key of requiredKeys) {
      assert.ok(key in (en as object), `en adminOrders must have key: ${key}`);
    }

    for (const locale of locales) {
      const section = sections[locale];
      const keys = Object.keys(section as object).sort();
      assert.deepEqual(keys, enKeys, `${locale} adminOrders keys must match en`);

      // resultsCount must have {count} placeholder
      assert.match(String((section as Record<string, unknown>).resultsCount), /\{count\}/);
      // paginationSummary must have {current} and {total}
      assert.match(String((section as Record<string, unknown>).paginationSummary), /\{current\}/);
      assert.match(String((section as Record<string, unknown>).paginationSummary), /\{total\}/);
    }

    // No price-related labels
    for (const locale of locales) {
      const section = sections[locale];
      const keys = Object.keys(section as object);
      for (const key of keys) {
        assert.doesNotMatch(key, /price|amount|total|financial/i,
          `${locale} adminOrders must not have price key: ${key}`);
      }
    }
  });

  await t.test("Scope wall - checkout files unchanged", async () => {
    const checkoutModal = await fs.readFile(path.join(process.cwd(), "src/components/CheckoutModal.tsx"), "utf-8");
    const cartDrawer = await fs.readFile(path.join(process.cwd(), "src/components/CartDrawer.tsx"), "utf-8");
    const useCart = await fs.readFile(path.join(process.cwd(), "src/hooks/useCart.tsx"), "utf-8");

    assert.match(checkoutModal, /submitCheckout/);
    assert.match(cartDrawer, /useCart/);
    assert.match(useCart, /CartProvider/);

    // Schema not changed - verify schema file exists and has no NEW orders columns
    const schema = await fs.readFile(path.join(process.cwd(), "src/lib/schema.ts"), "utf-8");
    assert.match(schema, /orders/);
    assert.doesNotMatch(schema, /adminOrdersReadModel/);
  });
});
