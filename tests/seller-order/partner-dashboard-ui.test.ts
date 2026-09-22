import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function read(relativePath: string) {
  return fs.readFile(path.join(root, relativePath), "utf8");
}

test("dashboard routes parse IDs and use the authorized Partner order read model once", async () => {
  for (const relativePath of [
    "src/app/(pl)/partner/[partnerId]/page.tsx",
    "src/app/(localized)/[locale]/partner/[partnerId]/page.tsx",
  ]) {
    const source = await read(relativePath);
    assert.match(source, /parseStrictIdOrNotFound\(partnerId\)/);
    assert.equal(source.match(/getPartnerOrdersList\(parsedPartnerId\)/g)?.length, 1);
    assert.match(source, /result\.code === "UNAUTHORIZED"/);
    assert.match(source, /buildPartnerDashboardModel\(result\.items/);
    assert.match(source, /orderDetailBaseHref=\{ordersHref\}/);
  }

  const pl = await read("src/app/(pl)/partner/[partnerId]/page.tsx");
  const localized = await read("src/app/(localized)/[locale]/partner/[partnerId]/page.tsx");
  assert.match(pl, /const ordersHref = `\/partner\/\$\{parsedPartnerId\}\/zamowienia`/);
  assert.match(localized, /const ordersHref = `\/\$\{locale\}\/partner\/\$\{parsedPartnerId\}\/orders`/);
});

test("dashboard remains server rendered and charts have an accessible dependency-free contract", async () => {
  const dashboard = await read("src/app/_shared/partner/PartnerDashboardPage.tsx");
  const activity = await read("src/app/_shared/partner/dashboard/PartnerActivityChart.tsx");
  const status = await read("src/app/_shared/partner/dashboard/PartnerStatusChart.tsx");
  const packageJson = JSON.parse(await read("package.json"));
  const combinedCharts = `${activity}\n${status}`;

  assert.doesNotMatch(dashboard, /^"use client";/);
  assert.doesNotMatch(combinedCharts, /^"use client";/m);
  assert.doesNotMatch(combinedCharts, /style=\{\{/);
  assert.match(activity, /<figure/);
  assert.match(activity, /<svg/);
  assert.match(activity, /viewBox=/);
  assert.match(activity, /className="sr-only"/);
  assert.match(status, /<figure/);
  assert.match(status, /aria-hidden="true"/);
  assert.match(status, /distribution\.map/);
  assert.equal(packageJson.dependencies?.recharts, undefined);
  assert.equal(packageJson.dependencies?.["chart.js"], undefined);
  assert.equal(packageJson.dependencies?.d3, undefined);
});

test("dashboard presents real operational sections without financial aggregation", async () => {
  const source = await read("src/app/_shared/partner/PartnerDashboardPage.tsx");

  assert.match(source, /model\.kpis\.pending/);
  assert.match(source, /model\.statusDistribution/);
  assert.match(source, /model\.attention\.map/);
  assert.match(source, /model\.latest\.map/);
  assert.match(source, /formatPartnerOrderRemainingTime\(order\.expiresAt, order\.serverNow/);
  assert.match(source, /`\$\{order\.orderTotal\} \$\{order\.currency\}`/);
  assert.doesNotMatch(source, /GMV|revenue|turnover|commission/i);
  assert.doesNotMatch(source, /reduce\([^)]*orderTotal|Number\(order\.orderTotal\)|parseFloat/);
});

test("all seven locales provide the complete dashboard dictionary", async () => {
  const requiredKeys = [
    "dashboardUnavailableTitle",
    "dashboardUnavailableDescription",
    "dashboardKpiSectionTitle",
    "dashboardKpiPending",
    "dashboardKpiAccepted",
    "dashboardKpiRejected",
    "dashboardKpiExpired",
    "dashboardKpiCurrentState",
    "dashboardActivityTitle",
    "dashboardActivitySummary",
    "dashboardActivityEmpty",
    "dashboardOrdersCountLabel",
    "dashboardStatusTitle",
    "dashboardStatusSummary",
    "dashboardStatusEmpty",
    "dashboardAttentionTitle",
    "dashboardAttentionDescription",
    "dashboardAttentionEmpty",
    "dashboardDeadline",
    "dashboardViewOrder",
    "dashboardLatestTitle",
    "dashboardLatestEmpty",
    "dashboardAllOrders",
    "statusFulfillmentInProgress",
    "statusFulfilled",
  ];

  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"]) {
    const dictionary = JSON.parse(await read(`src/messages/${locale}.json`));
    for (const key of requiredKeys) {
      const value = dictionary.PartnerWorkspace?.[key];
      assert.ok(typeof value === "string" && value.trim(), `${locale}.${key} must be translated`);
    }
  }
});
