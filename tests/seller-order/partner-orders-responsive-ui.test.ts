import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function read(relativePath: string) {
  return fs.readFile(path.join(root, relativePath), "utf8");
}

test("mobile filters expose all five counted choices without horizontal scrolling", async () => {
  const source = await read("src/app/(pl)/partner/[partnerId]/zamowienia/page.tsx");
  const navStart = source.indexOf("<nav");
  const navEnd = source.indexOf("</nav>", navStart);
  const navigation = source.slice(navStart, navEnd);

  assert.match(navigation, /grid-cols-2/);
  assert.match(navigation, /sm:grid-cols-5/);
  assert.doesNotMatch(navigation, /overflow-x-auto|whitespace-nowrap/);
  assert.match(navigation, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(navigation, /listModel\.counts\[tab\.id\]/);
  for (const filter of ["pending", "accepted", "rejected", "expired", "all"]) {
    assert.match(source, new RegExp(`id: "${filter}"`));
  }
});

test("mobile cards and desktop semantic table share the same filtered server data", async () => {
  const source = await read("src/app/(pl)/partner/[partnerId]/zamowienia/page.tsx");

  assert.match(source, /function MobileOrderCard/);
  assert.match(source, /<ul className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">/);
  assert.match(source, /<table className="min-w-full/);
  assert.match(source, /hidden overflow-x-auto lg:block/);
  assert.equal(source.match(/listModel\.filteredItems\.map/g)?.length, 2);
  assert.match(source, /item\.publicOrderReference/);
  assert.match(source, /item\.buyerBusinessName/);
  assert.match(source, /formatOrderDate\(item\.createdAt, locale\)/);
  assert.match(source, /item\.orderTotal\} \{item\.currency/);
  assert.match(source, /item\.itemCount/);
  assert.match(source, /<StatusBadge status=\{status\}/);
  assert.match(source, /href=\{`\$\{basePath\}\/\$\{item\.sellerOrderId\}`\}/);
});

test("orders stay server-authorized and reuse the trusted countdown helper", async () => {
  const page = await read("src/app/(pl)/partner/[partnerId]/zamowienia/page.tsx");
  const readModel = await read("src/lib/partner-orders/read-model.ts");

  assert.doesNotMatch(page, /^"use client";/);
  assert.equal(page.match(/getPartnerOrdersList\(parsedPartnerId\)/g)?.length, 1);
  assert.match(readModel, /await requirePartnerMembership\(partnerId\)/);
  assert.match(page, /formatPartnerOrderRemainingTime\(item\.expiresAt, item\.serverNow, dict\)/);
  assert.doesNotMatch(page, /Date\.now\(\)|fetch\(/);
});

test("contextual empty states and new strings exist in all seven locales", async () => {
  const requiredKeys = [
    "orderFiltersLabel",
    "emptyPendingOrders",
    "emptyAcceptedOrders",
    "emptyRejectedOrders",
    "emptyExpiredOrders",
    "emptyAllOrders",
    "viewAllOrders",
  ];

  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"]) {
    const dictionary = JSON.parse(await read(`src/messages/${locale}.json`));
    for (const key of requiredKeys) {
      const value = dictionary.PartnerWorkspace?.[key];
      assert.ok(typeof value === "string" && value.trim(), `${locale}.${key} must be translated`);
    }
  }
});

test("dashboard status links remain valid canonical Orders filters", async () => {
  const dashboard = await read("src/app/_shared/partner/PartnerDashboardPage.tsx");
  const listModel = await read("src/lib/partner-orders/list-presentation.ts");

  assert.match(dashboard, /`\$\{ordersHref\}\?filter=pending`/);
  assert.match(dashboard, /`\$\{ordersHref\}\?filter=expired`/);
  assert.match(listModel, /"pending",/);
  assert.match(listModel, /"expired",/);
});
