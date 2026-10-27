import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import { Pool } from "pg";
import { test, E2E_NON_ADMIN_USER_ID } from "./fixtures/auth";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";
import pl from "../../src/messages/pl.json";

test.describe("Admin-owned workflow: Partner RFQ draft net price and tenant isolation", () => {
  test.describe.configure({ mode: "serial", retries: 0 });

  const tag = "qa-rfq-net-" + randomUUID().slice(0, 8);
  const categoryName = "QA RFQ net category " + tag;
  const offerTitle = "QA ADMIN RFQ draft " + tag;
  const net = "18000.75";
  const grossSentinel = "987654321.55";
  let database: Pool | null = null;
  let partnerA = 0;
  let partnerB = 0;
  let categoryId = 0;
  let offerId = 0;

  test.beforeAll(async () => {
    // Only CI's disposable local PostgreSQL is authorized for these fixtures.
    database = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
    const partners = await database.query<{ id: string }>(
      "INSERT INTO partners (company_name, contact_email) VALUES ($1, $2), ($3, $4) RETURNING id",
      ["QA RFQ Partner A " + tag, "a-" + tag + "@example.invalid",
        "QA RFQ Partner B " + tag, "b-" + tag + "@example.invalid"],
    );
    [partnerA, partnerB] = partners.rows.map((row) => Number(row.id));

    const category = await database.query<{ id: string }>(
      "INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id",
      [categoryName, tag],
    );
    categoryId = Number(category.rows[0].id);

    // The same authenticated user can represent B; membership in A is granted later.
    await database.query(
      "INSERT INTO partner_user_memberships (partner_id, auth_user_id, membership_status, can_accept_orders) VALUES ($1, $2, 'active', false)",
      [partnerB, E2E_NON_ADMIN_USER_ID],
    );
  });

  test.afterAll(async () => {
    if (!database) return;
    try {
      if (partnerA) {
        await database.query("DELETE FROM offers WHERE partner_id = $1 AND title = $2", [partnerA, offerTitle]);
      }
      if (partnerA && partnerB) {
        await database.query("DELETE FROM partner_user_memberships WHERE partner_id IN ($1, $2)", [partnerA, partnerB]);
      }
      if (categoryId) await database.query("DELETE FROM categories WHERE id = $1", [categoryId]);
      if (partnerA && partnerB) await database.query("DELETE FROM partners WHERE id IN ($1, $2)", [partnerA, partnerB]);
    } finally {
      await database.end();
    }
  });

  test("Admin creates draft; Partner edits, persists and toggles net; foreign read denied; public HTML respects visibility", async ({
    page, adminPage, nonAdminPage,
  }) => {
    if (!database) throw new Error("Disposable test database unavailable");

    // Real authenticated Admin Server Action, not a direct INSERT fixture.
    const adminCreate = await adminPage.goto("/admin/oferty/nowa");
    expect(adminCreate?.status()).toBe(200);
    await adminPage.locator("#partnerId").selectOption(String(partnerA));
    await adminPage.locator('input[name="adminOfferType"][value="rfq"]').check({ force: true });
    await adminPage.getByRole("textbox", { name: pl.adminOffers.createCategorySearchAriaLabel }).fill(categoryName);
    await adminPage.getByRole("button", { name: new RegExp(categoryName) }).click();
    await expect(adminPage.locator('input[name="categoryId"]')).toHaveValue(String(categoryId));
    await adminPage.locator("#title").fill(offerTitle);
    await adminPage.getByRole("button", { name: pl.adminOffers.createSave, exact: true }).click();
    await expect(adminPage).toHaveURL(/\/admin\/oferty\/[0-9]+\/edytuj$/);
    const idMatch = new URL(adminPage.url()).pathname.match(/\/admin\/oferty\/([0-9]+)\/edytuj$/);
    expect(idMatch).not.toBeNull();
    offerId = Number(idMatch![1]);

    const stored = async () => {
      const result = await database!.query<{
        partner_id: string; publication_status: string; price_netto: string | null;
        rfq_net_price_visible: boolean; price_brutto: string | null;
      }>(
        "SELECT partner_id, publication_status, price_netto::text, rfq_net_price_visible, price_brutto::text FROM offers WHERE id = $1",
        [offerId],
      );
      expect(result.rows).toHaveLength(1);
      return result.rows[0];
    };

    expect(Number((await stored()).partner_id)).toBe(partnerA);
    expect((await stored()).publication_status).toBe("draft");

    const ownEdit = "/partner/" + partnerA + "/oferty/" + offerId + "/edytuj";
    const foreignContextEdit = "/partner/" + partnerB + "/oferty/" + offerId + "/edytuj";

    // B has active membership, but no membership in A: ownership and auth both deny read.
    const deniedWithoutMembership = await nonAdminPage.goto(ownEdit);
    expect(deniedWithoutMembership?.status()).toBe(404);
    expect(await nonAdminPage.content()).not.toContain(offerTitle);

    await database.query(
      "INSERT INTO partner_user_memberships (partner_id, auth_user_id, membership_status, can_accept_orders) VALUES ($1, $2, 'active', false)",
      [partnerA, E2E_NON_ADMIN_USER_ID],
    );

    const edit = await nonAdminPage.goto(ownEdit);
    expect(edit?.status()).toBe(200);
    await expect(nonAdminPage.locator("#priceNetto")).toBeVisible();

    // An authenticated Partner persists a hidden net amount via the actual edit action.
    await nonAdminPage.locator("#priceNetto").fill(net);
    await expect(nonAdminPage.locator("#rfqNetPriceVisible")).not.toBeChecked();
    const save = () => nonAdminPage.locator("form").filter({ has: nonAdminPage.locator("#priceNetto") }).locator('button[type="submit"]');
    await save().click();
    await expect(nonAdminPage).toHaveURL("/partner/" + partnerA + "/oferty/" + offerId);
    let row = await stored();
    expect(row.price_netto).toBe(net);
    expect(row.rfq_net_price_visible).toBe(false);
    expect(row.publication_status).toBe("draft");
    expect(row.price_brutto).toBeNull();

    // Read-after-write through the Partner UI, then save a visible net price.
    await nonAdminPage.goto(ownEdit);
    await expect(nonAdminPage.locator("#priceNetto")).toHaveValue(net);
    await expect(nonAdminPage.locator("#rfqNetPriceVisible")).not.toBeChecked();
    await nonAdminPage.locator("#rfqNetPriceVisible").check();
    await save().click();
    await expect(nonAdminPage).toHaveURL("/partner/" + partnerA + "/oferty/" + offerId);
    row = await stored();
    expect(row.price_netto).toBe(net);
    expect(row.rfq_net_price_visible).toBe(true);
    expect(row.publication_status).toBe("draft");

    // Even a user with memberships in A AND B cannot read A's offer via B's context.
    const deniedForeignRead = await nonAdminPage.goto(foreignContextEdit);
    expect(deniedForeignRead?.status()).toBe(404);
    expect(await nonAdminPage.content()).not.toContain(offerTitle);
    expect(await nonAdminPage.content()).not.toContain(net);

    // A draft remains absent from the public offer route.
    const unpublished = await page.goto("/oferta/" + offerId);
    expect(unpublished?.status()).toBe(404);

    // Publication is a fixture transition only; this does NOT test Admin moderation.
    await database.query(
      "UPDATE offers SET publication_status = 'published', is_active = true, price_brutto = $2 WHERE id = $1",
      [offerId, grossSentinel],
    );
    const publicVisible = await page.goto("/oferta/" + offerId);
    expect(publicVisible?.status()).toBe(200);
    await expect(page.getByText("Cena orientacyjna netto")).toBeVisible();
    await expect(page.getByText(/18\s*000,75 PLN/)).toBeVisible();
    expect(await page.content()).not.toContain(grossSentinel);

    // Published offers cannot be edited using the draft editor.
    const publishedEdit = await nonAdminPage.goto(ownEdit);
    expect(publishedEdit?.status()).toBe(200);
    await expect(nonAdminPage.locator("#priceNetto")).toHaveCount(0);

    // Simulate hidden visibility on a published row; verify no browser HTML/RSC leak.
    // This is intentionally a fixture state change, not a Partner edit of a published offer.
    await database.query(
      "UPDATE offers SET rfq_net_price_visible = false WHERE id = $1",
      [offerId],
    );
    const publicHidden = await page.goto("/oferta/" + offerId + "?qa=hidden");
    expect(publicHidden?.status()).toBe(200);
    await expect(page.getByText("Cena na zapytanie").first()).toBeVisible();
    const hiddenHtml = await page.content();
    expect(hiddenHtml).not.toContain(net);
    expect(hiddenHtml).not.toContain(grossSentinel);
  });
});
