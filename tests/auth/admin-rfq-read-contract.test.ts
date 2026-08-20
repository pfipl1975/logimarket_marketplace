import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";

test("Admin RFQ Read Contract", async (t) => {
  await t.test("Routes exist and are dynamic", async () => {
    const plRoute = await fs.readFile(path.join(process.cwd(), "src/app/(pl)/admin/zapytania/page.tsx"), "utf-8");
    const locRoute = await fs.readFile(path.join(process.cwd(), "src/app/(localized)/[locale]/admin/rfq/page.tsx"), "utf-8");

    // Both
    assert.match(plRoute, /export const dynamic = "force-dynamic"/);
    assert.match(locRoute, /export const dynamic = "force-dynamic"/);

    assert.match(plRoute, /searchParams:\s*Promise<unknown>/);
    assert.match(locRoute, /searchParams:\s*Promise<unknown>/);

    assert.match(plRoute, /await searchParams/);
    assert.match(locRoute, /await searchParams/);

    assert.match(plRoute, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*,?\s*\}/);
    assert.match(locRoute, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*,?\s*\}/);

    // Localized specific
    assert.match(locRoute, /params:\s*Promise<\{\s*locale:\s*string\s*}>/);
    assert.match(locRoute, /await params/);
    assert.match(locRoute, /isLocale/);
    assert.match(locRoute, /notFound/);
    assert.match(locRoute, /locale === "pl"/);
  });

  await t.test("Server Components have no client directives", async () => {
    const page = await fs.readFile(path.join(process.cwd(), "src/app/_shared/AdminRfqPage.tsx"), "utf-8");
    const table = await fs.readFile(path.join(process.cwd(), "src/components/admin/AdminRfqTable.tsx"), "utf-8");

    assert.doesNotMatch(page, /"use client"/);
    assert.doesNotMatch(table, /"use client"/);

    assert.doesNotMatch(page, /import \{ db \}/);
    assert.doesNotMatch(table, /import \{ db \}/);
  });

  await t.test("Server Action implementation - Auth First", async () => {
    const actions = await fs.readFile(path.join(process.cwd(), "src/app/actions.ts"), "utf-8");

    const actionMatch = actions.match(/export async function getAdminRfqPage[\s\S]*?(catch[\s\S]*?ADMIN_RFQ_UNAVAILABLE[\s\S]*?})/);
    assert.ok(actionMatch);
    const actionBody = actionMatch[0];

    assert.match(actionBody, /getAdminRfqPage\s*\(\s*rawInput\s*:\s*unknown\s*\)/);
    assert.match(actionBody, /requireAdmin/);

    const requireAdminIdx = actionBody.indexOf("await requireAdmin()");
    const tryIdx = actionBody.indexOf("try {");
    assert.ok(requireAdminIdx !== -1 && tryIdx !== -1 && requireAdminIdx < tryIdx);

    const parseQueryIdx = actionBody.indexOf("parseAdminRfqQuery");
    assert.ok(parseQueryIdx > requireAdminIdx);

    const dbQueryIdx = actionBody.indexOf("getAdminRfqReadModel");
    assert.ok(dbQueryIdx > requireAdminIdx);

    assert.match(actionBody, /ADMIN_RFQ_UNAVAILABLE/);
  });

  await t.test("DTO minimization and PII protection", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/rfq-read-model-core.ts"), "utf-8");

    // MVP-08 contract: list read model (triage) must NOT fetch or carry PII.
    // Full contact/message data lives ONLY in the detail read model.
    assert.doesNotMatch(core, /contactName:/);
    assert.doesNotMatch(core, /email:/);
    assert.doesNotMatch(core, /phone:/);
    assert.doesNotMatch(core, /message:/);
    assert.doesNotMatch(core, /schema\.rfqLeads\.contactName/);
    assert.doesNotMatch(core, /schema\.rfqLeads\.email/);
    assert.doesNotMatch(core, /schema\.rfqLeads\.phone/);
    assert.doesNotMatch(core, /schema\.rfqLeads\.message/);

    // List DTO keeps non-PII triage fields
    assert.match(core, /companyName:/);
    assert.match(core, /offerTitle:/);
    assert.match(core, /partnerCompanyName:/);

    // Detail read model MUST expose full contact/message data (admin-protected)
    const detailCore = await fs.readFile(path.join(process.cwd(), "src/lib/admin/rfq-detail-read-model-core.ts"), "utf-8");
    assert.match(detailCore, /contactName:/);
    assert.match(detailCore, /email:/);
    assert.match(detailCore, /phone:/);
    assert.match(detailCore, /message:/);
    assert.match(detailCore, /schema\.rfqLeads\.contactName/);
    assert.match(detailCore, /schema\.rfqLeads\.email/);
    assert.match(detailCore, /schema\.rfqLeads\.phone/);
    assert.match(detailCore, /schema\.rfqLeads\.message/);
  });

  await t.test("Search and structural contract", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/rfq-read-model-core.ts"), "utf-8");

    assert.doesNotMatch(core, /ilike\(schema\.rfqLeads\.email/);
    assert.doesNotMatch(core, /ilike\(schema\.rfqLeads\.contactName/);
    assert.doesNotMatch(core, /ilike\(schema\.rfqLeads\.phone/);
    assert.doesNotMatch(core, /ilike\(schema\.rfqLeads\.message/);

    assert.match(core, /eq\(schema\.rfqLeads\.id,\s*num\)/);
    assert.match(core, /eq\(schema\.rfqLeads\.offerId,\s*num\)/);
    assert.match(core, /eq\(schema\.rfqLeads\.partnerId,\s*num\)/);

    assert.match(core, /ilike\(schema\.rfqLeads\.companyName/);
    assert.match(core, /ilike\(schema\.offers\.title/);
    assert.match(core, /ilike\(schema\.partners\.companyName/);
  });

  await t.test("Pagination contract", async () => {
    const query = await fs.readFile(path.join(process.cwd(), "src/lib/admin/rfq-query.ts"), "utf-8");
    assert.match(query, /ADMIN_RFQ_PAGE_SIZE = 25/);
  });

  await t.test("Join Contract (Orphan preservation & right partner ID)", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/rfq-read-model-core.ts"), "utf-8");

    assert.match(core, /leftJoin\(schema\.offers, eq\(schema\.offers\.id, schema\.rfqLeads\.offerId\)\)/);
    assert.match(core, /leftJoin\(schema\.partners, eq\(schema\.partners\.id, schema\.rfqLeads\.partnerId\)\)/);

    // Must NOT join on offers.partnerId
    assert.doesNotMatch(core, /eq\(schema\.partners\.id, schema\.offers\.partnerId\)/);
  });

  await t.test("Sorting contract", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/rfq-read-model-core.ts"), "utf-8");
    assert.match(core, /sql\`\$\{schema\.rfqLeads\.createdAt\} DESC NULLS LAST\`/);
    assert.match(core, /desc\(schema\.rfqLeads\.id\)/);
  });

  await t.test("Nullable createdAt handling", async () => {
    const core = await fs.readFile(path.join(process.cwd(), "src/lib/admin/rfq-read-model-core.ts"), "utf-8");
    assert.match(core, /row\.createdAt \? row\.createdAt\.toISOString\(\) : null/);
  });

  await t.test("UI Considerations", async () => {
    const page = await fs.readFile(path.join(process.cwd(), "src/app/_shared/AdminRfqPage.tsx"), "utf-8");
    const table = await fs.readFile(path.join(process.cwd(), "src/components/admin/AdminRfqTable.tsx"), "utf-8");

    assert.doesNotMatch(table, /mailto:/);
    assert.doesNotMatch(table, /tel:/);

    assert.match(page, /rounded-industrial/);
  });

  await t.test("i18n check", async () => {
    const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"];
    const sections: Record<string, Record<string, unknown>> = {};

    for (const locale of locales) {
      sections[locale] = JSON.parse(
        await fs.readFile(path.join(process.cwd(), `src/messages/${locale}.json`), "utf-8")
      ).adminRfq;
    }

    const en = sections["en"] as Record<string, unknown>;
    assert.ok(en.idColumn === "RFQ");
  });
});
