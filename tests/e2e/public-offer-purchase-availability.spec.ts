import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";

const databaseUrl = requireIsolatedE2EDatabaseUrl();
const database = new Pool({ connectionString: databaseUrl });

test.afterAll(async () => {
  await database.end();
});

test.beforeEach(async ({}, testInfo) => {
  const retry = testInfo.retry;
  const companyName = `Public E2E Partner NOT_READY - retry-${retry}`;

  // 1. Cat
  const catRes = await database.query("SELECT id, slug FROM categories LIMIT 1");
  let catId = 1;
  if (catRes.rows.length > 0) {
    catId = catRes.rows[0].id;
  } else {
    const insertCat = await database.query("INSERT INTO categories (name, slug) VALUES ('Test Category', 'test-category') RETURNING id, slug");
    catId = insertCat.rows[0].id;
  }

  // 2. Partner
  const partnerRes = await database.query(
    "INSERT INTO partners (company_name, contact_email) VALUES ($1, 'test-only@example.com') RETURNING id",
    [companyName]
  );
  const partnerId = partnerRes.rows[0].id;

  // We DO NOT insert legal identities, tax, registry, evidence.
  // This guarantees the seller is NOT_READY.

  // 3. Offer (active, published, ecommerce)
  await database.query(
    "INSERT INTO offers (partner_id, category_id, title, offer_model, conversion_type, price_brutto, price_on_request, is_active, publication_status) VALUES ($1, $2, $3, 'marketplace', 'inbound', 100.00, false, true, 'published')",
    [partnerId, catId, `NOT_READY Offer ${retry}`]
  );
});

test.describe("Public Offer Purchase Availability Policy", () => {
  test("Published ecommerce offer from NOT_READY seller remains visible but not purchasable", async ({ page }, testInfo) => {
    const retry = testInfo.retry;
    const offerTitle = `NOT_READY Offer ${retry}`;

    const offerRes = await database.query("SELECT id, category_id FROM offers WHERE title = $1", [offerTitle]);
    const offerId = offerRes.rows[0].id;
    const catId = offerRes.rows[0].category_id;

    const catRes = await database.query("SELECT slug FROM categories WHERE id = $1", [catId]);
    const catSlug = catRes.rows[0].slug;

    // 1. Check Catalog List
    const listRes = await page.goto(`/katalog/c-${catSlug}`);
    expect(listRes?.status()).toBe(200);

    const offerCard = page.locator("article").filter({ hasText: offerTitle });
    await expect(offerCard).toBeVisible();

    await expect(offerCard.getByRole("button", { name: "Dodaj do koszyka" })).toHaveCount(0);
    await expect(offerCard.getByText("Chwilowo niedostępne")).toBeVisible();
    await expect(offerCard.getByRole("button", { name: "Chwilowo niedostępne" })).toBeDisabled();

    // 2. Check Catalog Detail
    const detailRes = await page.goto(`/oferta/${offerId}`);
    expect(detailRes?.status()).toBe(200);

    await expect(page.locator("h1", { hasText: offerTitle })).toBeVisible();

    await expect(page.getByText("Oferta tymczasowo niedostępna")).toBeVisible();
    await expect(page.getByText("Ta oferta jest w tej chwili niedostępna.")).toBeVisible();
    await expect(page.getByText("Chwilowo niedostępne", { exact: true })).toBeVisible();

    const actionArea = page.locator("main");
    await expect(actionArea.getByRole("button", { name: "Dodaj do koszyka" })).toHaveCount(0);
  });
});
