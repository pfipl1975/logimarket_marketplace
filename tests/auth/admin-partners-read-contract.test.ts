import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";

test("Admin Partners Read Contract", async (t) => {
  await t.test("Routes exist and are dynamic", async () => {
    const plRoute = await fs.readFile(path.join(process.cwd(), "src/app/(pl)/admin/partnerzy/page.tsx"), "utf-8");
    const locRoute = await fs.readFile(path.join(process.cwd(), "src/app/(localized)/[locale]/admin/partners/page.tsx"), "utf-8");
    
    assert.match(plRoute, /export const dynamic = "force-dynamic"/);
    assert.match(locRoute, /export const dynamic = "force-dynamic"/);
    assert.match(locRoute, /notFound\(\)/);
    assert.match(locRoute, /locale === "pl"/);
  });

  await t.test("Server Components have no client directives", async () => {
    const page = await fs.readFile(path.join(process.cwd(), "src/app/_shared/AdminPartnersPage.tsx"), "utf-8");
    const table = await fs.readFile(path.join(process.cwd(), "src/components/admin/AdminPartnersTable.tsx"), "utf-8");
    
    assert.doesNotMatch(page, /"use client"/);
    assert.doesNotMatch(table, /"use client"/);
    
    assert.doesNotMatch(page, /import \{ db \}/);
    assert.doesNotMatch(table, /import \{ db \}/);
  });

  await t.test("Server Action implementation", async () => {
    const actions = await fs.readFile(path.join(process.cwd(), "src/app/actions.ts"), "utf-8");
    
    assert.match(actions, /export async function getAdminPartnersPage/);
    
    const actionMatch = actions.match(/export async function getAdminPartnersPage[\s\S]*?(catch[\s\S]*?ADMIN_PARTNERS_UNAVAILABLE[\s\S]*?})/);
    assert.ok(actionMatch);
    const actionBody = actionMatch[0];
    
    const requireAdminIdx = actionBody.indexOf("await requireAdmin()");
    const tryIdx = actionBody.indexOf("try {");
    assert.ok(requireAdminIdx !== -1 && tryIdx !== -1 && requireAdminIdx < tryIdx);
    
    assert.match(actionBody, /ADMIN_PARTNERS_UNAVAILABLE/);
    
    const catchRegex = /catch(?: \((.*?)\))? \{([\s\S]*?)\}/;
    const catchBlock = actionBody.match(catchRegex);
    assert.ok(catchBlock);
    const errName = catchBlock[1];
    if (errName) {
      assert.doesNotMatch(catchBlock[2], new RegExp(`console\\.error\\([^)]*${errName}[^)]*\\)`));
    }
  });

  await t.test("DTO minimization", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/partners-read-model-core.ts"), "utf-8");
    
    assert.match(core, /id: number;/);
    assert.match(core, /companyName: string;/);
    assert.match(core, /contactEmail: string;/);
    assert.match(core, /createdAt: string;/);
    
    assert.doesNotMatch(core, /logoUrl/);
    assert.doesNotMatch(core, /websiteUrl/);
    assert.doesNotMatch(core, /offerCount/);
    assert.doesNotMatch(core, /outboundUrl/);
  });

  await t.test("Search privacy", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/partners-read-model-core.ts"), "utf-8");
    
    assert.doesNotMatch(core, /ilike\(partners\.contactEmail/);
    assert.doesNotMatch(core, /ilike\(partners\.websiteUrl/);
    assert.doesNotMatch(core, /ilike\(partners\.logoUrl/);
  });

  await t.test("No aggregation", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/partners-read-model-core.ts"), "utf-8");
    
    assert.doesNotMatch(core, /GROUP BY/i);
    assert.doesNotMatch(core, /offers/);
    assert.doesNotMatch(core, /rfqLeads/);
    assert.doesNotMatch(core, /clicks/);
    assert.doesNotMatch(core, /orders/);
  });

  await t.test("UI considerations", async () => {
    const table = await fs.readFile(path.join(process.cwd(), "src/components/admin/AdminPartnersTable.tsx"), "utf-8");
    
    assert.match(table, /contactEmail/);
    assert.doesNotMatch(table, /mailto:/);
    assert.doesNotMatch(table, /website/);
    assert.doesNotMatch(table, /edit/i);
    assert.doesNotMatch(table, /delete/i);
    assert.doesNotMatch(table, /approve/i);
    
    assert.match(table, /font-mono/);
    assert.match(table, /text-xs/);
    
    assert.doesNotMatch(table, /select-none/);
  });

  await t.test("Navigation state", async () => {
    const nav = await fs.readFile(path.join(process.cwd(), "src/components/admin/AdminNavigation.tsx"), "utf-8");
    
    assert.match(nav, /partnersPath: string/);
    assert.match(nav, /pathname === partnersPath/);
    assert.match(nav, /pathname\.startsWith\(`\$\{partnersPath\}\/`\)/);
    
    // Partners is Link
    assert.match(nav, /<Link[^>]*href=\{partnersPath\}/);
    
    // Others disabled
    assert.match(nav, /\{labels\.rfqNav\} <span[^>]*>\{labels\.plannedLabel\}<\/span>/);
    assert.match(nav, /\{labels\.ordersNav\} <span[^>]*>\{labels\.plannedLabel\}<\/span>/);
    assert.match(nav, /\{labels\.taxonomyNav\} <span[^>]*>\{labels\.plannedLabel\}<\/span>/);
  });

  await t.test("i18n check", async () => {
    const en = JSON.parse(await fs.readFile(path.join(process.cwd(), "src/messages/en.json"), "utf-8")).adminPartners;
    const de = JSON.parse(await fs.readFile(path.join(process.cwd(), "src/messages/de.json"), "utf-8")).adminPartners;
    
    assert.ok(en.title);
    assert.ok(de.title);
    assert.notDeepEqual(en, de);
  });
});
