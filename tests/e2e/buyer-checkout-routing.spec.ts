import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { test, createDummySupabaseCookie, E2E_NON_ADMIN_USER_ID } from "./fixtures/auth";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";
import {
  CHECKOUT_NEW_BUYER_ID, CHECKOUT_NEW_BUYER_NIP, CHECKOUT_OFFER_TITLE,
  CHECKOUT_READY_BUYER_ID, CHECKOUT_READY_BUYER_LEGAL_NAME, CHECKOUT_READY_BUYER_NIP,
  CHECKOUT_READY_BUYER_INVOICE_ADDRESS,
  CHECKOUT_SELLER_NAME, CHECKOUT_SELLER_NIP, createBuyerCheckoutSellerFixture,
} from "../../scripts/e2e/buyer-checkout-fixtures";
import pl from "../../src/messages/pl.json";
import de from "../../src/messages/de.json";

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
  let foreignPartnerId: string;

  test.beforeAll(async () => {
    database = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
    for (const nip of [CHECKOUT_READY_BUYER_NIP, CHECKOUT_NEW_BUYER_NIP, CHECKOUT_SELLER_NIP]) {
      assertFixtureNip(nip);
    }
    seller = await createBuyerCheckoutSellerFixture(database);
    await database.query(`INSERT INTO partner_user_memberships (auth_user_id, partner_id, membership_status, can_accept_orders)
      VALUES ($1, $2, 'active', true)`, [E2E_NON_ADMIN_USER_ID, seller.partnerId]);
    // A second authorized Partner context proves SellerOrder ownership, not only login.
    const foreignPartner = await database.query<{ id: string }>(
      "INSERT INTO partners (company_name, contact_email) VALUES ('E2E Foreign Invoice Partner', 'foreign@checkout.example.invalid') RETURNING id"
    );
    foreignPartnerId = foreignPartner.rows[0].id;
    await database.query(`INSERT INTO partner_user_memberships (auth_user_id, partner_id, membership_status, can_accept_orders)
      VALUES ($1, $2, 'active', true)`, [E2E_NON_ADMIN_USER_ID, foreignPartnerId]);
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

  test("Buyer tracks E2, E6, E7 and real fulfillment, then Buyer and Admin click canonical details", async ({ browser, adminPage }) => {
    test.setTimeout(120_000);
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
      const invoiceAddress = CHECKOUT_READY_BUYER_INVOICE_ADDRESS;
      const invoiceStreetLine = `${invoiceAddress.street} ${invoiceAddress.buildingNumber}/${invoiceAddress.unitNumber}`;
      for (const value of [
        CHECKOUT_READY_BUYER_LEGAL_NAME, CHECKOUT_READY_BUYER_NIP,
        invoiceStreetLine, invoiceAddress.postalCode, invoiceAddress.city, "E2E Ready Buyer",
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
      const rfqBefore = await database.query<{ count: number }>("SELECT count(*)::int AS count FROM rfq_leads");
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
      await page.keyboard.press("Escape");

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
      const routing = await database.query<{
        id: string; status: string; decisionStatus: string; acceptedAt: Date | null;
        resolvedAt: Date | null; decidedByAuthUserId: string | null; decisionSource: string | null;
        routedAt: Date; expiresAt: Date; outbox: number;
      }>(`SELECT so.id, so.status, d.decision_status AS "decisionStatus", d.accepted_at AS "acceptedAt",
        d.resolved_at AS "resolvedAt", d.decided_by_auth_user_id AS "decidedByAuthUserId", d.decision_source AS "decisionSource",
        so.e6_routed_to_seller_at AS "routedAt", d.expires_at AS "expiresAt",
        (SELECT count(*)::int FROM notification_outbox_events e WHERE e.seller_order_id = so.id
          AND e.event_type = 'seller_order.routed_to_seller') AS outbox
        FROM seller_orders so JOIN seller_acceptance_decisions d ON d.seller_order_id = so.id
        WHERE so.marketplace_order_id = $1 AND so.partner_id = $2`, [order.id, seller.partnerId]);
      expect(routing.rows).toHaveLength(1);
      const routed = routing.rows[0];
      expect(routed).toMatchObject({ status: "submitted", decisionStatus: "pending_seller_review",
        acceptedAt: null, resolvedAt: null, decidedByAuthUserId: null, decisionSource: null, outbox: 1 });
      expect(routed.expiresAt.getTime() - routed.routedAt.getTime()).toBe(24 * 60 * 60 * 1000);

      const buyerCard = () => page.locator("article").filter({ has: page.getByRole("heading", { name: `${pl.BuyerOrders.order} #${order.id}`, exact: true }) });
      const expectLifecycle = async (label: string) => {
        await page.goto("/zamowienia");
        await expect(buyerCard().locator("dl > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd")).toHaveText("1");
      };
      const detailsCta = () => buyerCard().getByRole("link", { name: `${pl.BuyerOrders.viewDetails} — ${pl.BuyerOrders.order} #${order.id}`, exact: true });
      await expectLifecycle(pl.BuyerOrders.awaiting);
      await expect(detailsCta()).toBeVisible();

      const partnerContext = await browser.newContext({ viewport: { width: 375, height: 844 } });
      try {
        const partnerPage = await partnerContext.newPage();
        await addAuthCookie(partnerPage, E2E_NON_ADMIN_USER_ID);
        const assertPartnerClean = watchBrowserErrors(partnerPage);
        const expectPartnerInvoice = async (dict = pl.PartnerWorkspace) => {
          const section = partnerPage.getByRole("region", { name: dict.invoiceDataTitle, exact: true });
          await expect(section).toBeVisible();
          await expect(section.getByRole("heading", { name: dict.invoiceDataTitle, exact: true })).toBeVisible();
          await expect(section.getByText(dict.invoiceSnapshotNotice, { exact: true })).toBeVisible();
          const value = (label: string) => section.locator("dl > div").filter({ has: partnerPage.getByText(label, { exact: true }) }).locator("dd");
          await expect(value(dict.invoiceLegalName)).toHaveText(CHECKOUT_READY_BUYER_LEGAL_NAME);
          await expect(value(dict.invoiceTaxId)).toHaveText(CHECKOUT_READY_BUYER_NIP);
          await expect(value(dict.invoiceAddress).locator("span")).toHaveText([
            invoiceStreetLine, `${invoiceAddress.postalCode} ${invoiceAddress.city}`, invoiceAddress.countryCode,
          ]);
          await expect(partnerPage.getByRole("heading", { name: dict.contactPerson, exact: true })).toBeVisible();
          await expect(partnerPage.getByText("E2E Ready Buyer", { exact: true })).toBeVisible();
          await expect(partnerPage.getByRole("link", { name: "ready-buyer@checkout.example.invalid", exact: true })).toBeVisible();
          await expect(partnerPage.getByRole("link", { name: "+48123000000", exact: true })).toBeVisible();
          expect(await partnerPage.evaluate(() => window.innerWidth)).toBe(375);
          expect(await partnerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          const box = await section.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(375);
        };
        const partnerListPath = `/partner/${seller.partnerId}/zamowienia`;
        const lifecycleLabels = {
          pending: pl.PartnerWorkspace.statusPending,
          accepted: pl.PartnerWorkspace.statusAccepted,
          in_progress: pl.PartnerWorkspace.statusFulfillmentInProgress,
          fulfilled: pl.PartnerWorkspace.statusFulfilled,
          rejected: pl.PartnerWorkspace.statusRejected,
          expired: pl.PartnerWorkspace.statusExpired,
          cancelled: pl.PartnerWorkspace.statusCancelled,
          all: pl.PartnerWorkspace.tabAll,
        };
        const filterNav = () => partnerPage.getByRole("navigation", { name: pl.PartnerWorkspace.orderFiltersLabel, exact: true });
        const filterLink = (filter: keyof typeof lifecycleLabels) => filterNav().locator(`a[href$="?filter=${filter}"]`);
        const reference = `ORD-SO-${routed.id}`;
        const expectPartnerLifecycle = async (filter: "pending" | "accepted" | "in_progress" | "fulfilled") => {
          await partnerPage.goto(partnerListPath);
          let lifecycleSum = 0;
          for (const [id, label] of Object.entries(lifecycleLabels)) {
            const link = filterLink(id as keyof typeof lifecycleLabels);
            const count = id === filter || id === "all" ? 1 : 0;
            await expect(link.locator("span").nth(0)).toHaveText(label);
            await expect(link.locator("span").nth(1)).toHaveText(String(count));
            if (id !== "all") lifecycleSum += Number(await link.locator("span").nth(1).innerText());
          }
          expect(lifecycleSum).toBe(Number(await filterLink("all").locator("span").nth(1).innerText()));
          await filterLink(filter).click();
          await expect(partnerPage).toHaveURL(`${new URL(partnerPage.url()).origin}${partnerListPath}?filter=${filter}`);
          await expect(filterLink(filter)).toHaveAttribute("aria-current", "page");
          const row = partnerPage.locator("li, tr").filter({ has: partnerPage.getByRole("link", { name: reference, exact: true }) }).filter({ visible: true });
          await expect(row).toHaveCount(1);
          await expect(row.getByText(lifecycleLabels[filter], { exact: true })).toBeVisible();
        };
        const expectExcluded = async (filter: "accepted" | "in_progress") => {
          await filterLink(filter).click();
          await expect(filterLink(filter)).toHaveAttribute("aria-current", "page");
          await expect(partnerPage.getByRole("link", { name: reference, exact: true })).toHaveCount(0);
        };
        const list = await partnerPage.goto(`/partner/${seller.partnerId}/zamowienia`);
        expect(list?.status()).toBe(200);
        await expect(partnerPage.getByText(CHECKOUT_READY_BUYER_LEGAL_NAME).first()).toBeVisible();
        await expect(partnerPage.getByText(pl.PartnerWorkspace.statusPending, { exact: true }).first()).toBeVisible();
        await expect(partnerPage.getByText(`ORD-SO-${routed.id}`, { exact: true }).first()).toBeVisible();
        await expect(partnerPage.getByText(pl.PartnerWorkspace.decisionDeadline, { exact: true }).first()).toBeVisible();
        await expectPartnerLifecycle("pending");
        const orderLink = partnerPage.getByRole("link", { name: `ORD-SO-${routed.id}`, exact: true }).filter({ visible: true });
        await expect(orderLink).toBeVisible();
        await orderLink.click();
        await expect(partnerPage.getByText(CHECKOUT_OFFER_TITLE).first()).toBeVisible();
        await expect(partnerPage.getByText(pl.PartnerWorkspace.decisionDeadline, { exact: false }).first()).toBeVisible();
        await expect(partnerPage.getByText(pl.PartnerWorkspace.contactHidden)).toBeVisible();
        await expect(partnerPage.getByText("ready-buyer@checkout.example.invalid", { exact: true })).toHaveCount(0);
        await expect(partnerPage.getByRole("heading", { name: pl.PartnerWorkspace.contactPerson, exact: true })).toHaveCount(0);
        await expect(partnerPage.getByText("+48123000000", { exact: true })).toHaveCount(0);
        await expect(partnerPage.getByRole("region", { name: pl.PartnerWorkspace.invoiceDataTitle, exact: true })).toHaveCount(0);
        await expect(partnerPage.getByRole("heading", { name: pl.PartnerWorkspace.invoiceDataTitle, exact: true })).toHaveCount(0);
        await expect(partnerPage.getByText(invoiceAddress.street, { exact: false })).toHaveCount(0);
        await expect(partnerPage.getByText(invoiceAddress.postalCode, { exact: false })).toHaveCount(0);
        expect(await partnerPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
        await partnerPage.getByRole("button", { name: pl.PartnerWorkspace.acceptOrder, exact: true }).click();
        await partnerPage.getByRole("button", { name: pl.PartnerWorkspace.confirmAcceptButton, exact: true }).click();
        await expect(partnerPage.getByText(pl.PartnerWorkspace.statusAccepted, { exact: true }).first()).toBeVisible();
        await expectPartnerInvoice();
        const foreignResponse = await partnerContext.request.get(`/partner/${foreignPartnerId}/zamowienia/${routed.id}`);
        expect(foreignResponse.status()).toBe(404);
        const foreignHtml = await foreignResponse.text();
        for (const privateValue of [invoiceAddress.street, invoiceAddress.postalCode, CHECKOUT_READY_BUYER_LEGAL_NAME, "ready-buyer@checkout.example.invalid"]) {
          expect(foreignHtml).not.toContain(privateValue);
        }
        const accepted = await database.query<typeof routed>(`SELECT so.status, d.decision_status AS "decisionStatus",
          d.accepted_at AS "acceptedAt", d.resolved_at AS "resolvedAt", d.decided_by_auth_user_id AS "decidedByAuthUserId",
          d.decision_source AS "decisionSource" FROM seller_orders so JOIN seller_acceptance_decisions d ON d.seller_order_id = so.id
          WHERE so.id = $1`, [routed.id]);
        expect(accepted.rows[0]).toMatchObject({ status: "seller_accepted", decisionStatus: "seller_accepted",
          decidedByAuthUserId: E2E_NON_ADMIN_USER_ID, decisionSource: "partner_portal" });
        expect(accepted.rows[0].acceptedAt).toBeInstanceOf(Date);
        expect(accepted.rows[0].resolvedAt).toBeInstanceOf(Date);
        await page.setViewportSize({ width: 1280, height: 844 });
        await expectLifecycle(pl.BuyerOrders.accepted);
        await detailsCta().click();
        await expect(page).toHaveURL(new RegExp(`/zamowienia/${order.id}$`));
        await expect(page.getByText(pl.BuyerOrderDetail.statusAccepted, { exact: true })).toBeVisible();
        await expect(page.getByText(pl.BuyerOrderDetail.decisionAccepted, { exact: true })).toBeVisible();

        await expectPartnerLifecycle("accepted");
        await partnerPage.getByRole("link", { name: reference, exact: true }).filter({ visible: true }).click();
        await partnerPage.getByRole("button", { name: pl.PartnerWorkspace.startFulfillment, exact: true }).click();
        await expect(partnerPage.getByText(pl.PartnerWorkspace.statusFulfillmentInProgress, { exact: true }).first()).toBeVisible();
        await expectPartnerInvoice();
        await expectLifecycle(pl.BuyerOrders.fulfillmentInProgress);
        await expectPartnerLifecycle("in_progress");
        await expectExcluded("accepted");
        await filterLink("in_progress").click();
        await partnerPage.getByRole("link", { name: reference, exact: true }).filter({ visible: true }).click();
        await partnerPage.getByRole("button", { name: pl.PartnerWorkspace.markFulfilled, exact: true }).click();
        await expect(partnerPage.getByText(pl.PartnerWorkspace.tabCompleted, { exact: true }).first()).toBeVisible();
        await expectPartnerInvoice();
        await expectPartnerLifecycle("fulfilled");
        await expectExcluded("accepted");
        await expectExcluded("in_progress");
        await filterLink("all").click();
        await expect(filterLink("all").locator("span").nth(1)).toHaveText("1");
        await expect(partnerPage.getByRole("link", { name: reference, exact: true }).filter({ visible: true })).toBeVisible();

        for (const width of [375, 768, 1280]) {
          await partnerPage.setViewportSize({ width, height: 844 });
          expect(await partnerPage.evaluate(() => window.innerWidth)).toBe(width);
          await expect(filterNav().getByRole("link")).toHaveCount(8);
          for (const id of Object.keys(lifecycleLabels) as Array<keyof typeof lifecycleLabels>) {
            const link = filterLink(id);
            await link.scrollIntoViewIfNeeded();
            await expect(link).toBeVisible();
            const box = await link.boundingBox();
            expect(box!.height).toBeGreaterThanOrEqual(44);
            expect(box!.width).toBeGreaterThanOrEqual(44);
            expect(box!.x).toBeGreaterThanOrEqual(0);
            expect(box!.x + box!.width).toBeLessThanOrEqual(width);
            await link.click();
            await expect(filterNav().locator('[aria-current="page"]')).toHaveCount(1);
            await expect(filterLink(id)).toHaveAttribute("aria-current", "page");
            expect(await filterLink(id).evaluate(element => getComputedStyle(element).textDecorationLine)).toContain("underline");
            expect(await partnerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          }
          // Ordinary links retain DOM order and a visible keyboard focus ring.
          await filterLink("pending").focus();
          for (const id of (Object.keys(lifecycleLabels) as Array<keyof typeof lifecycleLabels>).slice(1)) {
            await partnerPage.keyboard.press("Tab");
            await expect(filterLink(id)).toBeFocused();
            expect(await filterLink(id).evaluate(element => element.matches(":focus-visible") && getComputedStyle(element).boxShadow !== "none")).toBe(true);
          }
          const row = partnerPage.locator("li, tr").filter({ has: partnerPage.getByRole("link", { name: reference, exact: true }) }).filter({ visible: true });
          await expect(row.getByText(pl.PartnerWorkspace.statusFulfilled, { exact: true })).toBeVisible();
        }
        // Exercise longer translated labels against the same order at mobile width.
        await partnerPage.setViewportSize({ width: 375, height: 844 });
        await partnerPage.goto(`/de/partner/${seller.partnerId}/orders?filter=fulfilled`);
        const germanFilters = partnerPage.getByRole("navigation", { name: de.PartnerWorkspace.orderFiltersLabel, exact: true });
        await expect(germanFilters.getByRole("link")).toHaveCount(8);
        await expect(germanFilters.locator('[aria-current="page"]')).toContainText(de.PartnerWorkspace.statusFulfilled);
        await expect(partnerPage.getByRole("link", { name: reference, exact: true }).filter({ visible: true })).toBeVisible();
        expect(await partnerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await partnerPage.getByRole("link", { name: reference, exact: true }).filter({ visible: true }).click();
        await expectPartnerInvoice(de.PartnerWorkspace);
        await page.setViewportSize({ width: 375, height: 844 });
        await expectLifecycle(pl.BuyerOrders.fulfilled);
        await expect(buyerCard().locator("dl > div").filter({ has: page.getByText(pl.BuyerOrders.accepted, { exact: true }) }).locator("dd")).toHaveText("0");
        expect(await page.evaluate(() => window.innerWidth)).toBe(375);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const cta = detailsCta();
        await expect(cta).toBeVisible();
        const ctaBox = await cta.boundingBox();
        expect(ctaBox!.height).toBeGreaterThanOrEqual(44);
        await buyerCard().getByRole("link", { name: `${pl.BuyerOrders.order} #${order.id}`, exact: true }).focus();
        await page.keyboard.press("Tab");
        await expect(cta).toBeFocused();
        expect(await cta.evaluate(element => element.matches(":focus-visible") && getComputedStyle(element).boxShadow !== "none")).toBe(true);
        await cta.click();
        await expect(page).toHaveURL(new RegExp(`/zamowienia/${order.id}$`));
        await expect(page.getByRole("heading", { name: `${pl.BuyerOrderDetail.order} #${order.id}`, exact: true })).toBeVisible();
        await expect(page.getByText(pl.BuyerOrderDetail.statusFulfilled, { exact: true })).toBeVisible();
        await expect(page.getByText(CHECKOUT_OFFER_TITLE, { exact: true })).toBeVisible();
        await expect(page.getByText(CHECKOUT_SELLER_NAME, { exact: true }).first()).toBeVisible();
        const finalState = await database.query<{ status: string; decision_status: string; quantity: number; unit_price: string; currency: string }>(
          `SELECT so.status, d.decision_status, si.quantity, si.unit_price, si.currency FROM seller_orders so
           JOIN seller_acceptance_decisions d ON d.seller_order_id=so.id JOIN seller_order_items si ON si.seller_order_id=so.id WHERE so.id=$1`, [routed.id]);
        expect(finalState.rows).toHaveLength(1);
        const item = finalState.rows[0];
        expect(item).toMatchObject({ status: "fulfilled", decision_status: "seller_accepted", quantity: 1, currency: "PLN" });
        await expect(page.locator("dl > div").filter({ has: page.getByText(pl.BuyerOrderDetail.quantity, { exact: true }) }).locator("dd")).toHaveText(String(item.quantity));
        await expect(page.locator("dl > div").filter({ has: page.getByText(pl.BuyerOrderDetail.unitPrice, { exact: true }) }).locator("dd")).toHaveText(`${item.unit_price} ${item.currency}`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

        // Longer localized lifecycle labels and localized detail navigation at 375px.
        await page.goto("/de/orders");
        const germanCard = page.locator("article").filter({ has: page.getByRole("heading", { name: `${de.BuyerOrders.order} #${order.id}`, exact: true }) });
        await expect(germanCard.getByText(de.BuyerOrders.accepted, { exact: true })).toBeVisible();
        await expect(germanCard.getByText(de.BuyerOrders.fulfilled, { exact: true })).toBeVisible();
        expect(await page.evaluate(() => window.innerWidth)).toBe(375);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await germanCard.getByRole("link", { name: `${de.BuyerOrders.viewDetails} — ${de.BuyerOrders.order} #${order.id}`, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/de/orders/${order.id}$`));
        await expect(page.getByText(de.BuyerOrderDetail.statusFulfilled, { exact: true })).toBeVisible();

        // Canonical Admin operations: real parent list -> detail click, after real E7/fulfillment.
        const assertAdminClean = watchBrowserErrors(adminPage);
        await adminPage.setViewportSize({ width: 375, height: 844 });
        const listResponse = await adminPage.goto(`/admin/zamowienia?q=${order.id}`);
        expect(listResponse?.status()).toBe(200);
        const adminCard = adminPage.getByRole("article").filter({ has: adminPage.getByRole("heading", { name: `${pl.adminOrders.orderLabel} #${order.id}`, exact: true }) });
        await expect(adminCard).toHaveCount(1);
        await expect(adminCard.getByText(CHECKOUT_READY_BUYER_LEGAL_NAME, { exact: true })).toBeVisible();
        await expect(adminCard.getByText(pl.adminOrders.lifecycleLabels.fulfilled, { exact: false })).toBeVisible();
        const cardValue = (label: string) => adminCard.locator("dl > div").filter({ has: adminPage.getByText(label, { exact: true }) }).locator("dd");
        await expect(cardValue(pl.adminOrders.sellerCountColumn)).toHaveText("1");
        expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const adminDetails = adminCard.getByRole("link", { name: `${pl.adminOrders.details} — ${pl.adminOrders.orderLabel} #${order.id}`, exact: true });
        expect((await adminDetails.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await adminDetails.focus();
        await adminPage.keyboard.press("Shift+Tab");
        await adminPage.keyboard.press("Tab");
        await expect(adminDetails).toBeFocused();
        expect(await adminDetails.evaluate(element => element.matches(":focus-visible") && getComputedStyle(element).boxShadow !== "none")).toBe(true);
        if (await adminPage.locator("details").getAttribute("open") === null) {
          await adminPage.locator("summary").filter({ hasText: pl.admin.navigationLabel }).click();
        }
        await expect(adminPage.getByRole("navigation", { name: pl.admin.navigationLabel }).filter({ visible: true }).getByRole("link", { name: pl.admin.ordersNav, exact: true })).toHaveAttribute("aria-current", "page");
        await adminDetails.click();
        await expect(adminPage).toHaveURL(new RegExp(`/admin/zamowienia/${order.id}$`));
        await expect(adminPage.getByRole("heading", { name: `${pl.adminOrders.orderLabel} #${order.id}`, exact: true })).toBeVisible();
        const buyerSection = adminPage.getByRole("region", { name: pl.adminOrders.buyerTitle, exact: true });
        await expect(buyerSection.getByText(CHECKOUT_READY_BUYER_LEGAL_NAME, { exact: true })).toBeVisible();
        await expect(buyerSection.getByText(CHECKOUT_READY_BUYER_NIP, { exact: true })).toBeVisible();
        const sellerSection = adminPage.getByRole("article", { name: `ORD-SO-${routed.id}`, exact: true });
        await expect(sellerSection.getByRole("heading", { name: `ORD-SO-${routed.id}`, exact: true })).toBeVisible();
        const detailValue = (label: string) => sellerSection.locator("dl > div").filter({ has: adminPage.getByText(label, { exact: true }) }).locator("dd");
        await expect(detailValue(pl.adminOrders.sellerLegalName)).toHaveText(CHECKOUT_SELLER_NAME);
        await expect(detailValue(pl.adminOrders.sellerDisplayName)).toHaveText(CHECKOUT_SELLER_NAME);
        await expect(detailValue(pl.adminOrders.partnerId)).toHaveText(seller.partnerId);
        await expect(detailValue(pl.adminOrders.lifecycleColumn)).toHaveText(pl.adminOrders.lifecycleLabels.fulfilled);
        await expect(detailValue(pl.adminOrders.decisionState)).toHaveText(pl.adminOrders.decisionLabels.seller_accepted);
        for (const label of [pl.adminOrders.routedAt, pl.adminOrders.expiresAt, pl.adminOrders.resolvedAt, pl.adminOrders.acceptedAt]) {
          await expect(detailValue(label)).not.toHaveText("—");
        }
        await expect(sellerSection.getByText(CHECKOUT_OFFER_TITLE, { exact: true })).toBeVisible();
        await expect(detailValue(pl.adminOrders.quantity)).toHaveText(String(item.quantity));
        await expect(detailValue(pl.adminOrders.unitPrice)).toHaveText(item.unit_price);
        await expect(detailValue(pl.adminOrders.currency)).toHaveText(item.currency);
        await expect(adminPage.getByText(pl.adminOrders.recordStates.checkout_submitted, { exact: true })).toBeVisible();
        await expect(adminPage.getByText(CHECKOUT_READY_BUYER_INVOICE_ADDRESS.street, { exact: true })).toHaveCount(0);
        expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (await adminPage.locator("details").getAttribute("open") === null) {
          await adminPage.locator("summary").filter({ hasText: pl.admin.navigationLabel }).click();
        }
        await expect(adminPage.getByRole("navigation", { name: pl.admin.navigationLabel }).filter({ visible: true }).getByRole("link", { name: pl.admin.ordersNav, exact: true })).toHaveAttribute("aria-current", "page");
        // Stress long immutable identity/offer text on the rendered page only, with no DB mutation.
        await sellerSection.locator("dd").first().evaluate(element => { element.textContent = "LongImmutableSellerIdentity".repeat(12); });
        await buyerSection.locator("dd").first().evaluate(element => { element.textContent = "LongImmutableBuyerIdentity".repeat(12); });
        expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await adminPage.goto(`/de/admin/orders?q=${order.id}`);
        const localizedAdminCard = adminPage.getByRole("article").filter({ has: adminPage.getByRole("heading", { name: `${de.adminOrders.orderLabel} #${order.id}`, exact: true }) });
        await localizedAdminCard.getByRole("link", { name: `${de.adminOrders.details} — ${de.adminOrders.orderLabel} #${order.id}`, exact: true }).click();
        await expect(adminPage).toHaveURL(new RegExp(`/de/admin/orders/${order.id}$`));
        await expect(adminPage.getByRole("article", { name: `ORD-SO-${routed.id}`, exact: true }).getByText(de.adminOrders.lifecycleLabels.fulfilled, { exact: true })).toBeVisible();
        expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        // Authorization proof: both Buyer and Partner contexts are denied without order-existence disclosure.
        expect((await context.request.get(`/admin/zamowienia/${order.id}`)).status()).toBe(404);
        expect((await partnerContext.request.get(`/admin/zamowienia/${order.id}`)).status()).toBe(404);
        expect((await adminPage.request.get("/admin/zamowienia/invalid")).status()).toBe(404);
        expect((await adminPage.request.get("/admin/zamowienia/9007199254740991")).status()).toBe(404);
        const rfqAfter = await database.query<{ count: number }>("SELECT count(*)::int AS count FROM rfq_leads");
        expect(rfqAfter.rows[0].count).toBe(rfqBefore.rows[0].count);
        assertAdminClean();
        assertPartnerClean();
      } finally { await partnerContext.close(); }
      assertPageClean();
    } finally {
      await context.close();
    }
  });
});
