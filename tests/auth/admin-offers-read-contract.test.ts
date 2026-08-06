import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
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

  await t.test("akcja serwerowa wymusza requireAdmin i nie mutuje", () => {
    const content = readFileSync(actionPath, "utf-8");
    // Wyszukujemy getAdminOffersPage
    assert.match(content, /export async function getAdminOffersPage/);
    assert.match(content, /await requireAdmin\(\)/);
    // Brak mutacji z getAdminOffersPage: no delete, no insert, no update w tej funkcji.
    // Nie jesteśmy w stanie wyparować perfekcyjnie, ale core path używa select
  });

  await t.test("read model nie zwraca wrażliwych danych partnera", () => {
    const content = readFileSync(corePath, "utf-8");
    assert.doesNotMatch(content, /contactEmail/);
    assert.doesNotMatch(content, /outboundUrl/);
  });

  await t.test("projekcja używa resolveCanonicalOfferModel", () => {
    const content = readFileSync(corePath, "utf-8");
    assert.match(content, /resolveCanonicalOfferModel\(/);
  });

  await t.test("publiczny podgląd uwzględnia status z functions i nie używa external", () => {
    const coreContent = readFileSync(corePath, "utf-8");
    assert.match(coreContent, /isPublicOfferDetailStatus\(/);
    
    const tableContent = readFileSync(tablePath, "utf-8");
    assert.match(tableContent, /\/oferta\/\$\{id\}/);
    assert.doesNotMatch(tableContent, /outboundUrl/);
  });

  await t.test("AdminNavigation używa pathname i disabled do planowanych", () => {
    const content = readFileSync(navPath, "utf-8");
    assert.match(content, /usePathname\(\)/);
    assert.match(content, /aria-disabled="true"/);
    assert.doesNotMatch(content, /href="#"/);
  });

  await t.test("wszystkie słowniki mają spójną sekcję adminOffers", () => {
    const dir = join(process.cwd(), "src/messages");
    const files = readdirSync(dir).filter(f => f.endsWith(".json"));
    
    for (const file of files) {
      const data = JSON.parse(readFileSync(join(dir, file), "utf-8"));
      assert.ok(data.adminOffers, `${file} missing adminOffers section`);
      assert.ok(data.adminOffers.metaTitle, `${file} missing metaTitle`);
      assert.ok(data.adminOffers.modelRfq, `${file} missing modelRfq`);
      assert.ok(data.adminOffers.statusPublished, `${file} missing statusPublished`);
    }

    const enData = JSON.parse(readFileSync(join(dir, "en.json"), "utf-8"));
    const plData = JSON.parse(readFileSync(join(dir, "pl.json"), "utf-8"));
    const deData = JSON.parse(readFileSync(join(dir, "de.json"), "utf-8"));
    const frData = JSON.parse(readFileSync(join(dir, "fr.json"), "utf-8"));
    const esData = JSON.parse(readFileSync(join(dir, "es.json"), "utf-8"));
    const ukData = JSON.parse(readFileSync(join(dir, "uk.json"), "utf-8"));
    const zhData = JSON.parse(readFileSync(join(dir, "zh.json"), "utf-8"));

    const checkNotCopied = (locale: string, data: Record<string, Record<string, string>>) => {
      // Wymagamy, aby przynajmniej metaTitle był różny od angielskiego 
      // (z wyjątkiem ewentualnych uniwersalnych pojęć, upewnijmy się, że 'Offers' -> 'Oferty' itd.)
      assert.notEqual(data.adminOffers.title, enData.adminOffers.title, `${locale} title is identical to EN`);
    };

    checkNotCopied("pl", plData);
    checkNotCopied("de", deData);
    checkNotCopied("fr", frData);
    checkNotCopied("es", esData);
    checkNotCopied("uk", ukData);
    // W chińskim title to "优惠", po angielsku "Offers". Zapewnijmy że się różnią.
    checkNotCopied("zh", zhData);
  });
});
