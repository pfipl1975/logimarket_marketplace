import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Admin Partner Detail Route Contract", async (t) => {
  await t.test("PL detail route istnieje", () => {
    const routePath = path.join(process.cwd(), "src/app/(pl)/admin/partnerzy/[id]/page.tsx");
    assert.ok(fs.existsSync(routePath), "PL route must exist");
  });

  await t.test("localized detail route istnieje", () => {
    const routePath = path.join(process.cwd(), "src/app/(localized)/[locale]/admin/partners/[id]/page.tsx");
    assert.ok(fs.existsSync(routePath), "Localized route must exist");
  });

  await t.test("PL partner detail href: /admin/partnerzy/{id} & localized partner detail href: /en/admin/partners/{id}", () => {
    // We check the admin partners table file where the links are generated
    const tablePath = path.join(process.cwd(), "src/components/admin/AdminPartnersTable.tsx");
    const content = fs.readFileSync(tablePath, "utf-8");
    assert.ok(content.includes('href={locale === "pl" ? `/admin/partnerzy/${item.id}` : `/${locale}/admin/partners/${item.id}`}'), "Should generate correct PL and localized hrefs");
  });

  await t.test("getAdminPartnerDetail pozostaje zabezpieczony requireAdmin()", () => {
    const actionsPath = path.join(process.cwd(), "src/app/actions.ts");
    const content = fs.readFileSync(actionsPath, "utf-8");
    const actionMatch = content.match(/export async function getAdminPartnerDetail\([\s\S]*?requireAdmin\(\)/);
    assert.ok(actionMatch, "getAdminPartnerDetail must call requireAdmin()");
  });
});
