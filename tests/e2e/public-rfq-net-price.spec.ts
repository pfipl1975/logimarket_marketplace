import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";

// Hard guard prevents connecting this fixture to production or shared development.
const database = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
const suffix = randomUUID().slice(0, 8);
const slug = `e2e-rfq-net-${suffix}`;
const categoryName = `E2E RFQ net category ${suffix}`;
const visibleTitle = `E2E RFQ NET VISIBLE ${suffix}`;
const lowerTitle = `E2E RFQ NET LOWER ${suffix}`;
const hiddenTitle = `E2E RFQ NET HIDDEN ${suffix}`;
let categoryId: number | null = null;
let partnerId: number | null = null;
const offerIds: number[] = [];

test.beforeAll(async () => {
  const c = await database.query(
    "INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id",
    [categoryName, slug],
  );
  categoryId = Number(c.rows[0].id);

  const p = await database.query(
    "INSERT INTO partners (company_name, contact_email) VALUES ($1, $2) RETURNING id",
    [`E2E RFQ net supplier ${suffix}`, `e2e-rfq-net-${suffix}@example.invalid`],
  );
  partnerId = Number(p.rows[0].id);

  for (const row of [
    { title: visibleTitle, net: "18000.00", gross: "250000.00", visible: true },
    { title: lowerTitle, net: "1000.00", gross: "300000.00", visible: true },
    { title: hiddenTitle, net: "10.00", gross: "1.00", visible: false },
  ]) {
    const inserted = await database.query(
      `INSERT INTO offers
        (partner_id, category_id, title, offer_model, conversion_type,
         publication_status, is_active, price_brutto, price_netto,
         rfq_net_price_visible, price_on_request)
       VALUES ($1, $2, $3, 'rfq', 'inbound', 'published', true, $4, $5, $6, false)
       RETURNING id`,
      [partnerId, categoryId, row.title, row.gross, row.net, row.visible],
    );
    offerIds.push(Number(inserted.rows[0].id));
  }
});

test.afterAll(async () => {
  try {
    if (offerIds.length) {
      await database.query("DELETE FROM offers WHERE id = ANY($1::bigint[])", [offerIds]);
    }
    if (partnerId !== null) {
      await database.query("DELETE FROM partners WHERE id = $1", [partnerId]);
    }
    if (categoryId !== null) {
      await database.query("DELETE FROM categories WHERE id = $1", [categoryId]);
    }
  } finally {
    await database.end();
  }
});

test("RFQ cards, net-price sorting, and English detail never disclose hidden gross", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  const result = await page.goto(`/katalog/c-${slug}?sort=price-asc`);
  expect(result?.status()).toBe(200);

  const lower = page.locator("article").filter({ hasText: lowerTitle });
  const visible = page.locator("article").filter({ hasText: visibleTitle });
  const hidden = page.locator("article").filter({ hasText: hiddenTitle });
  await expect(lower).toBeVisible();
  await expect(visible).toBeVisible();
  await expect(hidden).toBeVisible();
  await expect(lower.getByText("Cena orientacyjna netto")).toBeVisible();
  await expect(visible.getByText(/18\\s*000,00 PLN/)).toBeVisible();
  await expect(visible.getByText(/VAT według właściwej stawki/)).toBeVisible();
  await expect(hidden.getByText("Cena na zapytanie")).toBeVisible();
  await expect(hidden.getByText("1,00 PLN")).toHaveCount(0);

  const offerCards = await page.locator("article").allTextContents();
  const lowerPosition = offerCards.findIndex((text) => text.includes(lowerTitle));
  const visiblePosition = offerCards.findIndex((text) => text.includes(visibleTitle));
  const hiddenPosition = offerCards.findIndex((text) => text.includes(hiddenTitle));
  expect(lowerPosition).toBeGreaterThanOrEqual(0);
  expect(lowerPosition).toBeLessThan(visiblePosition);
  expect(visiblePosition).toBeLessThan(hiddenPosition);

  const english = await page.goto(`/en/oferta/${offerIds[0]}`);
  expect(english?.status()).toBe(200);
  await expect(page.getByText("Indicative net price")).toBeVisible();
  await expect(page.getByText("18,000.00 PLN")).toBeVisible();
  await expect(page.getByText(/VAT at the applicable rate/)).toBeVisible();
  await expect(page.getByText("250,000.00 PLN")).toHaveCount(0);
  expect(errors).toEqual([]);
});
