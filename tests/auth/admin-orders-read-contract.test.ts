import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const read = (file: string) => fs.readFile(path.join(process.cwd(), file), "utf8");

test("Canonical Admin Marketplace Orders read contract", async t => {
  const core = await read("src/lib/admin/orders-read-model-core.ts");
  const actions = await read("src/app/actions.ts");
  await t.test("list and detail routes are dynamic, localized and noindex", async () => {
    for (const route of ["src/app/(pl)/admin/zamowienia/page.tsx", "src/app/(localized)/[locale]/admin/orders/page.tsx", "src/app/(pl)/admin/zamowienia/[orderId]/page.tsx", "src/app/(localized)/[locale]/admin/orders/[orderId]/page.tsx"]) {
      const source = await read(route);
      assert.match(source, /dynamic = "force-dynamic"/);
      assert.match(source, /index: false/); assert.match(source, /follow: false/); assert.match(source, /nocache: true/);
      assert.match(source, /adminOrders.metaTitle/);
      if (route.includes("localized")) { assert.match(source, /isLocale/); assert.match(source, /notFound/); }
    }
  });
  await t.test("both actions authorize before parsing and database access, outside catch", () => {
    for (const [name, parser, query] of [
      ["getAdminOrdersPage", "parseAdminOrdersQuery", "getAdminOrdersReadModel"],
      ["getAdminMarketplaceOrderDetail", "isCanonicalPositiveInteger", "getAdminMarketplaceOrderDetailReadModel"],
    ]) {
      const start = actions.indexOf("export async function " + name + "(");
      const next = actions.indexOf("export async function", start + 1);
      const body = actions.slice(start, next);
      const auth = body.indexOf("await requireAdmin()");
      assert.ok(auth >= 0 && auth < body.indexOf(parser) && auth < body.indexOf(query) && auth < body.indexOf("try {"));
      assert.doesNotMatch(body, /error\.stack|error\.message/);
      assert.match(body, /ADMIN_ORDERS_UNAVAILABLE/);
    }
  });
  await t.test("canonical immutable sources only, bounded grouping, read-only consistent transactions", () => {
    for (const source of ["marketplaceOrders", "buyerLegalContextSnapshots", "sellerOrders", "sellerAcceptanceDecisions", "sellerOrderSellerSnapshots", "sellerOrderItems"]) assert.ok(core.includes("schema." + source));
    assert.doesNotMatch(core, /schema\.(orders|orderItems|partners|buyerOrganizations|rfqLeads)\b/);
    assert.doesNotMatch(core, /sessionHash|\bemail\b|\bphone\b|registeredAddress|buyerInvoice|\.insert\(|\.update\(|\.delete\(/);
    assert.match(core, /accessMode: "read only"/); assert.match(core, /isolationLevel: "repeatable read"/);
    assert.match(core, /inArray\(schema\.sellerOrders\.marketplaceOrderId, parentIds\)/);
    assert.match(core, /desc\(schema\.marketplaceOrders\.createdAt\), desc\(schema\.marketplaceOrders\.id\)/);
    assert.match(core, /limit\(ADMIN_ORDERS_PAGE_SIZE\)/);
  });
  await t.test("primary navigation exposes Orders and active nested routes", async () => {
    const nav = await read("src/components/admin/AdminNavigation.tsx");
    const shell = await read("src/components/admin/AdminShell.tsx");
    const entry = await read("src/app/_shared/AdminEntryPage.tsx");
    assert.match(nav, /href=\{ordersPath\}/); assert.match(nav, /aria-current=\{isOrdersActive/);
    assert.ok(nav.includes('pathname.startsWith(`${ordersPath}/`)'));
    assert.match(nav, /focus-visible:ring-2/); assert.match(nav, /href=\{rfqPath\}/);
    assert.equal((shell.match(/ordersPath=\{ordersPath\}/g) || []).length, 2);
    assert.match(shell, /adminDict\.ordersNav/); assert.match(entry, /dictionary\.ordersNav/);
  });
  await t.test("server UI minimizes data and preserves semantic responsive navigation", async () => {
    const table = await read("src/components/admin/AdminOrdersTable.tsx");
    const detail = await read("src/app/_shared/AdminMarketplaceOrderDetailPage.tsx");
    const page = await read("src/app/_shared/AdminOrdersPage.tsx");
    for (const source of [table, detail, page]) {
      assert.doesNotMatch(source, /"use client"|import \{ db \}|mailto:|tel:|style=\{\{|sessionHash/);
    }
    assert.match(table, /<article/); assert.match(table, /<table/); assert.match(table, /scope="col"/); assert.match(table, /scope="row"/);
    assert.match(table, /aria-label=/); assert.match(table, /focus-visible/); assert.match(table, /min-h-11/);
    assert.match(detail, /<h1/); assert.match(detail, /<h2/); assert.match(detail, /<h3/);
    assert.match(detail, /notFound\(\)/);
  });
  await t.test("seven locale dictionaries have semantic parity and complete operational labels", async () => {
    const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"];
    let keys: string[] | undefined;
    for (const locale of locales) {
      const dictionary = JSON.parse(await read("src/messages/" + locale + ".json"));
      const section = dictionary.adminOrders;
      const actual = Object.keys(section).sort(); keys ??= actual; assert.deepEqual(actual, keys);
      for (const key of ["sellerCountColumn", "lifecycleColumn", "details", "routedAt", "acceptedAt", "recordState", "buyerCountry", "itemsTitle", "unitPrice", "noSellerOrders"]) assert.ok(section[key]);
      assert.deepEqual(Object.keys(section.lifecycleLabels).sort(), ["not_routed", "pending_decision", "accepted", "fulfillment_in_progress", "fulfilled", "rejected", "expired", "cancelled", "invalid_order_state"].sort());
      assert.equal(section.lifecycleLabels.fulfilled, dictionary.PartnerWorkspace.statusFulfilled);
      assert.match(section.resultsCount, /\{count\}/); assert.match(section.paginationSummary, /\{current\}/);
      assert.ok(!section.emailColumn);
    }
  });
});
