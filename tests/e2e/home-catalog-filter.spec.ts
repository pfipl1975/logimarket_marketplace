import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";
import pl from "../../src/messages/pl.json";

test.describe("Homepage canonical offer filters and condition list badge", () => {
  test.describe.configure({ mode: "serial", retries: 0 });
  const tag = "qa-homefilter-" + randomUUID().slice(0, 8);
  const titles = {
    rfq: "QA home RFQ " + tag,
    ecommerce: "QA home ecommerce " + tag,
    outbound: "QA home outbound " + tag,
    draft: "QA home unpublished " + tag,
  };
  let db: Pool | null = null;
  let partnerId = 0;
  let categoryId = 0;
  const offerIds: number[] = [];

  test.beforeAll(async () => {
    db = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
    const partner = await db.query<{ id: string }>(
      "INSERT INTO partners (company_name, contact_email) VALUES ($1,$2) RETURNING id",
      ["QA Home Filter " + tag, tag + "@example.invalid"],
    );
    partnerId = Number(partner.rows[0].id);
    const category = await db.query<{ id: string }>(
      "INSERT INTO categories (name, slug) VALUES ($1,$2) RETURNING id",
      ["QA Home Filter " + tag, tag],
    );
    categoryId = Number(category.rows[0].id);
    for (const [title, model, conversion, condition, status] of [
      [titles.rfq, "rfq", "inbound", "new", "published"],
      [titles.ecommerce, "marketplace", "inbound", "used", "published"],
      [titles.outbound, "rfq", "outbound", "refurbished", "published"],
      [titles.draft, "marketplace", "inbound", "used", "draft"],
    ]) {
      const row = await db.query<{ id: string }>(
        "INSERT INTO offers (partner_id,category_id,title,offer_model,conversion_type,product_condition,publication_status,is_active,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,true,CASE WHEN $7='published' THEN now() ELSE NULL END) RETURNING id",
        [partnerId, categoryId, title, model, conversion, condition, status],
      );
      offerIds.push(Number(row.rows[0].id));
    }
  });

  test.afterAll(async () => {
    if (!db) return;
    try {
      if (offerIds.length) await db.query("DELETE FROM offers WHERE id = ANY($1::bigint[])", [offerIds]);
      if (categoryId) await db.query("DELETE FROM categories WHERE id=$1", [categoryId]);
      if (partnerId) await db.query("DELETE FROM partners WHERE id=$1", [partnerId]);
    } finally {
      await db.end();
    }
  });

  test("server filters use canonical model, preserve URL across view/sort, and show list condition in all locales", async ({ page }) => {
    test.setTimeout(180_000);
    const offers = page.locator("main article");
    expect((await page.goto("/?model=ecommerce&condition=used&view=list"))?.status()).toBe(200);
    const ecommerce = offers.filter({ hasText: titles.ecommerce });
    await expect(ecommerce).toHaveCount(1);
    await expect(ecommerce.getByText(pl.offers.productConditionUsed, { exact: true })).toBeVisible();
    await expect(offers.filter({ hasText: titles.rfq })).toHaveCount(0);
    await expect(offers.filter({ hasText: titles.outbound })).toHaveCount(0);
    await expect(offers.filter({ hasText: titles.draft })).toHaveCount(0);

    await page.getByRole("link", { name: pl.offers.gridView, exact: true }).click();
    await expect(page).toHaveURL(/model=ecommerce/);
    await expect(page).toHaveURL(/condition=used/);
    await expect(page).not.toHaveURL(/view=list/);
    await expect(offers.filter({ hasText: titles.ecommerce })).toHaveCount(1);

    await page.locator("#catalog-offer-sort").selectOption("newest");
    await page.locator('form:has(#catalog-offer-sort) button[type="submit"]').click();
    await expect(page).toHaveURL(/sort=newest/);
    await expect(page).toHaveURL(/model=ecommerce/);
    await expect(page).toHaveURL(/condition=used/);

    const locales = ["pl", "en", "de", "fr", "es", "uk", "zh"];
    for (const locale of locales) {
      const root = locale === "pl" ? "/" : "/" + locale;
      const dict = JSON.parse(readFileSync(join(process.cwd(), "src", "messages", locale + ".json"), "utf8"));
      expect((await page.goto(root + "?model=outbound&condition=refurbished&view=list"))?.status()).toBe(200);
      const outbound = page.locator("main article").filter({ hasText: titles.outbound });
      await expect(outbound).toHaveCount(1);
      await expect(outbound.getByText(dict.offers.productConditionRefurbished, { exact: true })).toBeVisible();
      await expect(page.locator("main article").filter({ hasText: titles.rfq })).toHaveCount(0);
      await expect(page.locator("main article").filter({ hasText: titles.ecommerce })).toHaveCount(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    expect((await page.goto("/?model=rfq&condition=new&view=list"))?.status()).toBe(200);
    await expect(page.locator("main article").filter({ hasText: titles.rfq })).toHaveCount(1);
    const filters = page.locator("main details").filter({ has: page.getByText(pl.catalog.filtersSummary, { exact: true }) });
    await filters.locator("summary").click();
    await expect(filters.getByRole("link", { name: pl.catalog.productConditionUsed, exact: true })).toBeVisible();
  });
});
