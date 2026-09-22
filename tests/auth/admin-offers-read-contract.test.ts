import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

test("Admin Offers Read Architecture Contract", async (t) => {
  const plRoutePath = join(process.cwd(), "src/app/(pl)/admin/oferty/page.tsx");
  const locRoutePath = join(process.cwd(), "src/app/(localized)/[locale]/admin/offers/page.tsx");
  const sharedPagePath = join(process.cwd(), "src/app/_shared/AdminOffersPage.tsx");
  const corePath = join(process.cwd(), "src/lib/admin/offers-read-model-core.ts");
  const actionPath = join(process.cwd(), "src/app/actions.ts");
  const tablePath = join(process.cwd(), "src/components/admin/AdminOffersTable.tsx");
  const navPath = join(process.cwd(), "src/components/admin/AdminNavigation.tsx");

  await t.test("istnieją obie trasy i są force-dynamic", () => {
    assert.ok(existsSync(plRoutePath));
    assert.ok(existsSync(locRoutePath));
    
    const plContent = readFileSync(plRoutePath, "utf-8");
    assert.match(plContent, /export const dynamic = "force-dynamic"/);
    
    const locContent = readFileSync(locRoutePath, "utf-8");
    assert.match(locContent, /export const dynamic = "force-dynamic"/);
  });

  await t.test("localized route waliduje locale i odrzuca pl", () => {
    const content = readFileSync(locRoutePath, "utf-8");
    assert.match(content, /!isLocale\(/);
    assert.match(content, /=== "pl"/);
    assert.match(content, /notFound\(\)/);
  });

  await t.test("strony nie importują bazy danych", () => {
    const plContent = readFileSync(plRoutePath, "utf-8");
    const locContent = readFileSync(locRoutePath, "utf-8");
    const sharedContent = readFileSync(sharedPagePath, "utf-8");
    
    assert.doesNotMatch(plContent, /@\/lib\/db/);
    assert.doesNotMatch(locContent, /@\/lib\/db/);
    assert.doesNotMatch(sharedContent, /@\/lib\/db/);
  });

  await t.test("komponenty UI nie używają klienta, oprócz nawigacji", () => {
    const sharedContent = readFileSync(sharedPagePath, "utf-8");
    const tableContent = readFileSync(tablePath, "utf-8");
    const navContent = readFileSync(navPath, "utf-8");
    
    assert.doesNotMatch(sharedContent, /"use client"/);
    assert.doesNotMatch(tableContent, /"use client"/);
    assert.match(navContent, /"use client"/);
  });

  await t.test("AdminOffersPage nie zawiera searchParams as Record, nie odtwarza przez Number, używa query", () => {
    const content = readFileSync(sharedPagePath, "utf-8");
    assert.doesNotMatch(content, /searchParams as Record/);
    assert.doesNotMatch(content, /query\.partner \? Number/);
    assert.match(content, /query: currentQuery/);
  });

  await t.test("akcja serwerowa wymusza requireAdmin i nie mutuje, zwraca query z page, bez error.stack", () => {
    const content = readFileSync(actionPath, "utf-8");
    assert.match(content, /export async function getAdminOffersPage/);
    assert.match(content, /await requireAdmin\(\)/);
    assert.doesNotMatch(content, /console\.error.*error\);/);
    assert.match(content, /\.\.\.query, page:/);
  });

  await t.test("read model nie zwraca wrażliwych danych partnera i brak polskich fallbacków", () => {
    const content = readFileSync(corePath, "utf-8");
    assert.doesNotMatch(content, /contactEmail/);
    assert.doesNotMatch(content, /outboundUrl/);
    assert.doesNotMatch(content, /Nieznany partner/);
    assert.doesNotMatch(content, /Bez kategorii/);
  });

  await t.test("projekcja używa resolveCanonicalOfferModel", () => {
    const content = readFileSync(corePath, "utf-8");
    assert.match(content, /resolveCanonicalOfferModel\(/);
  });

  await t.test("tabela używa text z dict dla active i neutral dla unknown, bez outboud", () => {
    const content = readFileSync(tablePath, "utf-8");
    assert.doesNotMatch(content, /outboundUrl/);
    assert.doesNotMatch(content, /text-destructive/);
    assert.doesNotMatch(content, /bg-destructive/);
    assert.match(content, /dict\.activeYes/);
    assert.match(content, /dict\.activeNo/);
  });

  await t.test("AdminNavigation używa pathname i disabled do planowanych", () => {
    const content = readFileSync(navPath, "utf-8");
    assert.match(content, /usePathname\(\)/);
    assert.match(content, /aria-disabled="true"/);
    assert.doesNotMatch(content, /href="#"/);
  });

  await t.test("wszystkie słowniki mają spójną sekcję adminOffers pod względem kluczy", () => {
    const dir = join(process.cwd(), "src/messages");
    const enData = JSON.parse(readFileSync(join(dir, "en.json"), "utf-8"));
    const plData = JSON.parse(readFileSync(join(dir, "pl.json"), "utf-8"));
    
    const enKeys = Object.keys(enData.adminOffers).sort();
    const plKeys = Object.keys(plData.adminOffers).sort();
    
    assert.deepEqual(plKeys, enKeys, "PL keys mismatch EN keys");

    const nonEnLocales = ["de", "fr", "es", "uk", "zh"];
    for (const loc of nonEnLocales) {
      const data = JSON.parse(readFileSync(join(dir, `${loc}.json`), "utf-8"));
      const locKeys = Object.keys(data.adminOffers).sort();
      assert.deepEqual(locKeys, enKeys, `${loc} keys mismatch EN keys`);
      assert.notDeepEqual(data.adminOffers, enData.adminOffers, `${loc} dictionary is identical to EN`);
    }
  });
});
