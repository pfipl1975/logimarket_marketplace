import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { test, createDummySupabaseCookie } from "./fixtures/auth";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";
import {
  CHECKOUT_NEW_BUYER_ID, CHECKOUT_NEW_BUYER_NIP, CHECKOUT_OFFER_TITLE,
  CHECKOUT_READY_BUYER_ID, CHECKOUT_READY_BUYER_LEGAL_NAME, CHECKOUT_READY_BUYER_NIP,
  CHECKOUT_SELLER_NAME, CHECKOUT_SELLER_NIP, createBuyerCheckoutSellerFixture,
} from "../../scripts/e2e/buyer-checkout-fixtures";
import pl from "../../src/messages/pl.json";

function assertFixtureNip(value: string) {
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const digits = [...value].map(Number);
  expect(value).toMatch(/^\d{10}$/);
  expect(weights.reduce((sum, weight, index) => sum + weight * digits[index], 0) % 11).toBe(digits[9]);
}

function watchBrowserErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("response", response => { if (response.status() >= 500) serverErrors.push(response.url()); });
  return () => {
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(serverErrors).toEqual([]);
  };
}

async function addCheckoutOfferToCart(page: Page, offerId: string) {
  const response = await page.goto(`/oferta/${offerId}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByText(CHECKOUT_OFFER_TITLE).first()).toBeVisible();
  await page.getByRole("button", { name: /dodaj do koszyka/i }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText(CHECKOUT_OFFER_TITLE);
  await expect(drawer).toContainText(pl.cart.total);
  return drawer;
}

async function addAuthCookie(page: Page, userId: string) {
  await page.context().addCookies([{
    name: "sb-localhost-auth-token",
    value: createDummySupabaseCookie(userId),
    domain: "localhost",
    path: "/",
  }]);
}

test("anonymous checkout requires login with a local return path at desktop and 375px", async ({ page }) => {
  const consoleErrors: string[] = [];
  const serverErrors: string[] = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 500) serverErrors.push(response.url()); });

  for (const [width, checkout, login, register] of [
    [1280, "/zamowienie", "/login", "/register"],
    [375, "/en/checkout", "/en/login", "/en/register"],
  ] as const) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(checkout);
    await expect(page).toHaveURL(new RegExp(`${login.replaceAll("/", "\\/")}\\?next=`));
    const destination = new URL(page.url());
    expect(destination.pathname).toBe(login);
    expect(destination.searchParams.get("next")).toBe(checkout);
    await expect(page.locator(`a[href^="${register}?next="]`)).toHaveCount(1);
    expect(await page.evaluate(() => window.innerWidth)).toBe(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  expect(consoleErrors).toEqual([]);
  expect(serverErrors).toEqual([]);
});

test.describe("isolated canonical Buyer checkout", () => {
  test.describe.configure({ mode: "serial", retries: 0 });

  let database: Pool;
  let seller: Awaited<ReturnType<typeof createBuyerCheckoutSellerFixture>>;

  test.beforeAll(async () => {
    database = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
    for (const nip of [CHECKOUT_READY_BUYER_NIP, CHECKOUT_NEW_BUYER_NIP, CHECKOUT_SELLER_NIP]) {
      assertFixtureNip(nip);
    }
    seller = await createBuyerCheckoutSellerFixture(database);
  });
  test.afterAll(async () => { if (database) await database.end(); });

  test("anonymous cart survives the auth boundary for the ready Buyer", async ({ page, adminPage }) => {
    const assertPageClean = watchBrowserErrors(page);
    const assertAdminClean = watchBrowserErrors(adminPage);

    // The Admin page uses the real server-side Seller Readiness evaluator.
    const adminResponse = await adminPage.goto(`/admin/partnerzy/${seller.partnerId}`);
    expect(adminResponse?.status()).toBe(200);
    await expect(adminPage.getByText("GOTOWY", { exact: true })).toBeVisible();

    const drawer = await addCheckoutOfferToCart(page, seller.offerId);
    await drawer.getByRole("button", { name: pl.cta.goToCheckout }).click();
    await expect(page).toHaveURL(/\/login\?next=/);
    const loginUrl = new URL(page.url());
    expect(loginUrl.pathname).toBe("/login");
    expect(loginUrl.searchParams.get("next")).toBe("/zamowienie");

    await addAuthCookie(page, CHECKOUT_READY_BUYER_ID);
    await page.goto(loginUrl.searchParams.get("next")!);
    await expect(page).toHaveURL(/\/zamowienie$/);
    await expect(page.getByText(CHECKOUT_OFFER_TITLE)).toBeVisible();
    await expect(page.getByText(CHECKOUT_READY_BUYER_LEGAL_NAME)).toBeVisible();
    assertPageClean();
    assertAdminClean();
  });

  test("a Buyer without an organization returns to checkout after onboarding", async ({ page }) => {
    const assertPageClean = watchBrowserErrors(page);
    const zeroMembership = await database.query<{ count: number }>(`
      SELECT count(*)::int AS count FROM buyer_organization_memberships
      WHERE auth_user_id = $1 AND membership_status = 'active' AND ended_at IS NULL
    `, [CHECKOUT_NEW_BUYER_ID]);
    expect(zeroMembership.rows[0].count).toBe(0);

    await addCheckoutOfferToCart(page, seller.offerId);
    await addAuthCookie(page, CHECKOUT_NEW_BUYER_ID);
    await page.goto("/zamowienie");
    await expect(page).toHaveURL(/\/konto\?next=/);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/zamowienie");
    for (const [name, value] of Object.entries({
      nip: CHECKOUT_NEW_BUYER_NIP,
      legalName: "LM Checkout New Buyer Sp. z o.o.",
      street: "Testowa", buildingNumber: "21", postalCode: "00-001", city: "Warszawa",
      firstName: "E2E", lastName: "Checkout Buyer",
      contactEmail: "new-buyer@checkout.example.invalid", phone: "+48123000001",
    })) {
      await page.locator(`input[name="${name}"]`).fill(value);
    }
    await page.locator("form[aria-label] button[type=submit]").click();
    await expect(page).toHaveURL(/\/zamowienie$/);
    await expect(page.getByText(CHECKOUT_OFFER_TITLE)).toBeVisible();
    await expect(page.getByText("LM Checkout New Buyer Sp. z o.o.")).toBeVisible();
    const membership = await database.query<{ count: number }>(`
      SELECT count(*)::int AS count FROM buyer_organization_memberships
      WHERE auth_user_id = $1 AND membership_status = 'active' AND ended_at IS NULL
    `, [CHECKOUT_NEW_BUYER_ID]);
    expect(membership.rows[0].count).toBe(1);
    assertPageClean();
  });

  test("ready Buyer reviews Seller disclosure and submits one canonical E2", async ({ browser }) => {
    const context = await browser.newContext();
    try {
      await context.addCookies([{
        name: "sb-localhost-auth-token",
        value: createDummySupabaseCookie(CHECKOUT_READY_BUYER_ID),
        domain: "localhost",
        path: "/",
      }]);
      const page = await context.newPage();
      const assertPageClean = watchBrowserErrors(page);
      await addCheckoutOfferToCart(page, seller.offerId);
      await page.goto("/zamowienie");
      await expect(page.getByRole("heading", { name: pl.checkoutFlow.title })).toBeVisible();
      for (const value of [
        CHECKOUT_READY_BUYER_LEGAL_NAME, CHECKOUT_READY_BUYER_NIP,
        "Testowa 12/3", "00-001", "Warszawa", "E2E Ready Buyer",
        "ready-buyer@checkout.example.invalid", "+48123000000",
        CHECKOUT_SELLER_NAME, "Miasto Testowe", CHECKOUT_OFFER_TITLE,
      ]) {
        await expect(page.getByText(value, { exact: false }).first()).toBeVisible();
      }
      await expect(page.getByText(pl.checkoutFlow.sellerRole)).toBeVisible();
      await expect(page.getByText(pl.checkoutFlow.platformRole)).toBeVisible();
      await expect(page.getByText(pl.checkoutFlow.e2Notice, { exact: true })).toBeVisible();
      const checkoutSubmit = page.getByRole("button", { name: pl.checkoutFlow.submit, exact: true });
      await expect(checkoutSubmit).toBeVisible();
      const cartButton = page.getByRole("button", { name: pl.nav.cart, exact: true });
      await expect(cartButton).toHaveAccessibleName(pl.nav.cart);

      await page.setViewportSize({ width: 375, height: 844 });
      expect(await page.evaluate(() => window.innerWidth)).toBe(375);
      await expect(cartButton).toHaveAccessibleName(pl.nav.cart);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      await expect(page.getByRole("heading", { name: pl.checkoutFlow.buyer })).toBeVisible();
      await expect(page.getByRole("heading", { name: pl.checkoutFlow.sellers })).toBeVisible();
      await expect(checkoutSubmit).toBeVisible();

      const before = await database.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM marketplace_orders WHERE buyer_auth_user_id = $1",
        [CHECKOUT_READY_BUYER_ID],
      );
      const legacyBefore = await database.query<{ count: number }>("SELECT count(*)::int AS count FROM orders");
      const cartItem = await database.query<{ id: string }>(
        "SELECT id FROM cart_items WHERE offer_id = $1 ORDER BY id DESC LIMIT 1", [seller.offerId],
      );
      expect(cartItem.rows).toHaveLength(1);

      await checkoutSubmit.click();
      await expect(page).toHaveURL(/\/zamowienia(?:\?|$)/);
      await expect(page.getByText(pl.checkoutFlow.successNotice)).toBeVisible();
      await expect(cartButton).toHaveText(pl.nav.cart);
      await cartButton.click();
      await expect(page.getByText(pl.cart.emptyTitle)).toBeVisible();

      const orders = await database.query<{ id: string; buyer_auth_user_id: string; buyer_legal_context_snapshot_id: string }>(
        "SELECT id, buyer_auth_user_id, buyer_legal_context_snapshot_id FROM marketplace_orders WHERE buyer_auth_user_id = $1 ORDER BY id",
        [CHECKOUT_READY_BUYER_ID],
      );
      expect(orders.rows).toHaveLength(before.rows[0].count + 1);
      const order = orders.rows.at(-1)!;
      expect(order.buyer_auth_user_id).toBe(CHECKOUT_READY_BUYER_ID);
      const counts = await database.query<{
        legal: number; invoice: number; contact: number; seller_order: number;
        seller_snapshot: number; seller_item: number; remaining_cart: number; legacy: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM buyer_legal_context_snapshots WHERE id = $2) AS legal,
          (SELECT count(*)::int FROM marketplace_order_buyer_invoice_snapshots WHERE marketplace_order_id = $1) AS invoice,
          (SELECT count(*)::int FROM marketplace_order_buyer_contact_snapshots WHERE marketplace_order_id = $1) AS contact,
          (SELECT count(*)::int FROM seller_orders WHERE marketplace_order_id = $1 AND partner_id = $3) AS seller_order,
          (SELECT count(*)::int FROM seller_order_seller_snapshots ss JOIN seller_orders so ON so.id = ss.seller_order_id WHERE so.marketplace_order_id = $1 AND so.partner_id = $3) AS seller_snapshot,
          (SELECT count(*)::int FROM seller_order_items si JOIN seller_orders so ON so.id = si.seller_order_id WHERE so.marketplace_order_id = $1 AND so.partner_id = $3 AND si.offer_id = $4) AS seller_item,
          (SELECT count(*)::int FROM cart_items WHERE id = $5) AS remaining_cart,
          (SELECT count(*)::int FROM orders) AS legacy
      `, [order.id, order.buyer_legal_context_snapshot_id, seller.partnerId, seller.offerId, cartItem.rows[0].id]);
      expect(counts.rows[0]).toMatchObject({
        legal: 1, invoice: 1, contact: 1, seller_order: 1,
        seller_snapshot: 1, seller_item: 1, remaining_cart: 0,
        legacy: legacyBefore.rows[0].count,
      });
      assertPageClean();
    } finally {
      await context.close();
    }
  });
});
