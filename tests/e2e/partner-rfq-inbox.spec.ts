import { expect, type Page, type Request } from "@playwright/test";
import { Pool } from "pg";
import { test, E2E_NON_ADMIN_USER_ID } from "./fixtures/auth";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";
import pl from "../../src/messages/pl.json";
import de from "../../src/messages/de.json";

test.describe("Partner RFQ inbox — public submission, shared workflow and tenancy", () => {
  let database: Pool;
  let partnerA: number;
  let partnerB: number;
  let offerId: number;
  let categoryId: number;
  const tag = `rfq-inbox-${Date.now()}`;
  const companyName = `SyntheticBuyerWithAVeryLongUnbrokenCompanyNameForMobileWrapping-${tag}`;
  const contactName = "Synthetic RFQ Contact";
  const email = `long-synthetic-rfq-contact-${tag}@example.invalid`;
  const phone = "+48 000 000 000";
  const message = "Proszę o warunki handlowe.\n" + "SyntheticLongMessageWithoutSpaces".repeat(8);
  const offerTitle = `Synthetic RFQ offer ${tag}`;

  test.beforeAll(async () => {
    database = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
    const partners = await database.query<{ id: string }>(
      "INSERT INTO partners (company_name, contact_email) VALUES ($1, $2), ($3, $4) RETURNING id",
      [`RFQ Partner A ${tag}`, "a@example.invalid", `RFQ Partner B ${tag}`, "b@example.invalid"],
    );
    [partnerA, partnerB] = partners.rows.map(row => Number(row.id));
    const category = await database.query<{ id: string }>("INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id", ["RFQ inbox test", tag]);
    categoryId = Number(category.rows[0].id);
    const offer = await database.query<{ id: string }>(
      "INSERT INTO offers (partner_id, category_id, title, offer_model, conversion_type, price_on_request, is_active, publication_status) VALUES ($1, $2, $3, 'rfq', 'inbound', true, true, 'published') RETURNING id",
      [partnerA, categoryId, offerTitle],
    );
    offerId = Number(offer.rows[0].id);
    await database.query("INSERT INTO partner_user_memberships (partner_id, auth_user_id, membership_status, can_accept_orders) VALUES ($1, $3, 'active', false), ($2, $3, 'active', false)", [partnerA, partnerB, E2E_NON_ADMIN_USER_ID]);
  });

  test.afterAll(async () => {
    if (!database) return;
    if (partnerA && partnerB) {
      await database.query("DELETE FROM rfq_leads WHERE partner_id IN ($1, $2)", [partnerA, partnerB]);
      await database.query("DELETE FROM partner_user_memberships WHERE partner_id IN ($1, $2)", [partnerA, partnerB]);
      await database.query("DELETE FROM offers WHERE id = $1", [offerId]);
      await database.query("DELETE FROM categories WHERE id = $1", [categoryId]);
      await database.query("DELETE FROM partners WHERE id IN ($1, $2)", [partnerA, partnerB]);
    }
    await database.end();
  });

  test("real public RFQ -> Admin and Partner -> handling/responded/closed, responsive and isolated", async ({ page, adminPage, nonAdminPage }) => {
    const dict = pl.PartnerRfq;
    await page.goto(`/oferta/${offerId}`);
    await page.getByRole("button", { name: pl.cta.requestQuote, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#rfq-company").fill(companyName);
    await dialog.locator("#rfq-contact").fill(contactName);
    await dialog.locator("#rfq-email").fill(email);
    await dialog.locator("#rfq-phone").fill(phone);
    await dialog.locator("#rfq-msg").fill(message);
    await dialog.getByRole("button", { name: pl.cta.sendRequest, exact: true }).click();
    await expect(page.getByText(pl.rfq.successTitle, { exact: true })).toBeVisible();
    const lead = await database.query<{ id: string; status: string }>("SELECT id, status FROM rfq_leads WHERE offer_id = $1 AND company_name = $2", [offerId, companyName]);
    expect(lead.rows).toHaveLength(1);
    expect(lead.rows[0].status).toBe("new");
    const rfqId = Number(lead.rows[0].id);
    const base = `/partner/${partnerA}/zapytania`;

    await adminPage.goto(`/admin/zapytania?q=${rfqId}`);
    const adminRow = adminPage.getByRole("row").filter({ has: adminPage.getByText(companyName, { exact: true }) });
    await expect(adminRow.getByText(pl.adminRfq.status_new, { exact: true })).toBeVisible();
    await adminRow.getByRole("link", { name: pl.adminRfq.detailLink, exact: true }).click();
    await expect(adminPage).toHaveURL(new RegExp(`/admin/zapytania/${rfqId}$`));
    await expect(adminPage.getByText(companyName, { exact: true })).toBeVisible();

    await nonAdminPage.goto(`/partner/${partnerA}`);
    const nav = () => nonAdminPage.getByRole("navigation", { name: pl.PartnerWorkspace.navigationLabel, exact: true });
    await nav().getByRole("link", { name: pl.PartnerWorkspace.rfq, exact: true }).click();
    await expect(nonAdminPage).toHaveURL(base);
    await expect(nav().getByRole("link", { name: pl.PartnerWorkspace.rfq, exact: true })).toHaveAttribute("aria-current", "page");
    const filters = () => nonAdminPage.getByRole("navigation", { name: dict.filtersLabel, exact: true });
    for (const [status, count] of [[dict.status_new, 1], [dict.status_in_progress, 0], [dict.status_responded, 0], [dict.status_closed, 0], [dict.all, 1]] as const)
      await expect(filters().getByRole("link").filter({ hasText: status })).toContainText(String(count));
    await expect(nonAdminPage.getByText(email, { exact: true })).toHaveCount(0);
    await expect(nonAdminPage.getByText(phone, { exact: true })).toHaveCount(0);
    await expect(nonAdminPage.getByText(message, { exact: true })).toHaveCount(0);
    const details = () => nonAdminPage.getByRole("link", { name: `${dict.details} — RFQ #${rfqId}`, exact: true });
    const noOverflow = async (target: Page) => expect(await target.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const width of [375, 1280]) {
      await nonAdminPage.setViewportSize({ width, height: 900 });
      await noOverflow(nonAdminPage);
      for (const filter of await filters().getByRole("link").all()) expect((await filter.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(details()).toBeVisible();
      if (width === 375) {
        const links = await nav().getByRole("link").all();
        expect(links).toHaveLength(4);
        const boxes = await Promise.all(links.map(link => link.boundingBox()));
        expect(boxes[0]!.y).toBe(boxes[1]!.y);
        expect(boxes[2]!.y).toBeGreaterThan(boxes[0]!.y);
        for (const box of boxes) expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
    await details().click();
    await expect(nonAdminPage).toHaveURL(`${base}/${rfqId}`);
    const header = () => nonAdminPage.locator('header[aria-labelledby="rfq-heading"]');
    await expect(header().getByText(dict.status_new, { exact: true })).toBeVisible();
    await expect(nav().getByRole("link", { name: pl.PartnerWorkspace.rfq, exact: true })).toHaveAttribute("aria-current", "page");
    for (const value of [companyName, contactName, message, offerTitle]) await expect(nonAdminPage.getByText(value, { exact: true })).toBeVisible();
    await expect(nonAdminPage.getByRole("link", { name: email, exact: true })).toHaveAttribute("href", `mailto:${email}`);
    await expect(nonAdminPage.getByRole("link", { name: phone, exact: true })).toHaveAttribute("href", "tel:+48000000000");
    await expect(nonAdminPage.getByRole("link", { name: dict.openOffer, exact: true })).toHaveAttribute("href", `/partner/${partnerA}/oferty/${offerId}`);
    for (const width of [375, 1280]) {
      await nonAdminPage.setViewportSize({ width, height: 900 });
      await noOverflow(nonAdminPage);
      for (const button of await nonAdminPage.getByRole("region", { name: dict.workflow, exact: true }).getByRole("button").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    const firstAction = nonAdminPage.getByRole("button", { name: dict.startHandling, exact: true });
    await firstAction.focus();
    await nonAdminPage.keyboard.press("Shift+Tab");
    await nonAdminPage.keyboard.press("Tab");
    await expect(firstAction).toBeFocused();
    expect(await firstAction.evaluate(element => element.matches(":focus-visible"))).toBe(true);

    const requestPromise = nonAdminPage.waitForRequest(request => request.method() === "POST" && !!request.headers()["next-action"]);
    await firstAction.click();
    const actionRequest: Request = await requestPromise;
    await expect(header().getByText(dict.status_in_progress, { exact: true })).toBeVisible();
    await adminPage.reload();
    await expect(adminPage.getByText(pl.adminRfq.status_in_progress, { exact: true }).first()).toBeVisible();

    // An actor with membership in both Partners still cannot move A's lead via B's context.
    const replayBody = JSON.parse(actionRequest.postData()!);
    replayBody[0].partnerId = partnerB;
    const denied = await nonAdminPage.request.post(`${base}/${rfqId}`, {
      headers: { "next-action": actionRequest.headers()["next-action"], "content-type": "text/plain;charset=UTF-8" },
      data: JSON.stringify(replayBody),
    });
    expect(await denied.text()).toContain('"code":"NOT_FOUND"');
    expect((await database.query<{ status: string }>("SELECT status FROM rfq_leads WHERE id=$1", [rfqId])).rows[0].status).toBe("in_progress");

    await nonAdminPage.getByRole("button", { name: dict.markResponded, exact: true }).click();
    await expect(header().getByText(dict.status_responded, { exact: true })).toBeVisible();
    await adminPage.reload();
    await expect(adminPage.getByText(pl.adminRfq.status_responded, { exact: true }).first()).toBeVisible();
    await nonAdminPage.getByRole("button", { name: dict.close, exact: true }).click();
    const confirmation = nonAdminPage.getByRole("dialog", { name: dict.close, exact: true });
    await expect(confirmation.getByText(dict.closeConfirm, { exact: true })).toBeVisible();
    await confirmation.getByRole("button", { name: dict.cancel, exact: true }).first().focus();
    await nonAdminPage.keyboard.press("Tab");
    await expect(confirmation.getByRole("button", { name: dict.confirmClose, exact: true })).toBeFocused();
    await nonAdminPage.keyboard.press("Enter");
    await expect(header().getByText(dict.status_closed, { exact: true })).toBeVisible();
    await expect(nonAdminPage.getByRole("region", { name: dict.workflow, exact: true }).getByRole("button")).toHaveCount(0);
    await adminPage.reload();
    await expect(adminPage.getByText(pl.adminRfq.status_closed, { exact: true }).first()).toBeVisible();

    await nonAdminPage.goto(`${base}?status=closed`);
    await expect(details()).toBeVisible();
    await expect(filters().locator('[aria-current="page"]')).toContainText(dict.status_closed);
    await nonAdminPage.goto(`/partner/${partnerB}/zapytania?status=all`);
    await expect(nonAdminPage.getByText(companyName, { exact: true })).toHaveCount(0);
    const wrongDetail = await nonAdminPage.goto(`/partner/${partnerB}/zapytania/${rfqId}`);
    expect(wrongDetail?.status()).toBe(404);
    for (const value of [companyName, email, contactName, message]) await expect(nonAdminPage.getByText(value, { exact: true })).toHaveCount(0);

    await nonAdminPage.goto(`/de/partner/${partnerA}/rfq?status=closed`);
    const germanNav = nonAdminPage.getByRole("navigation", { name: de.PartnerWorkspace.navigationLabel, exact: true });
    await expect(germanNav.getByRole("link", { name: de.PartnerWorkspace.rfq, exact: true })).toHaveAttribute("aria-current", "page");
    await nonAdminPage.getByRole("link", { name: `${de.PartnerRfq.details} — RFQ #${rfqId}`, exact: true }).click();
    await expect(nonAdminPage).toHaveURL(`/de/partner/${partnerA}/rfq/${rfqId}`);
    await expect(nonAdminPage.getByRole("heading", { name: `${de.PartnerRfq.detailTitle} — RFQ #${rfqId}`, exact: true })).toBeVisible();
    await nonAdminPage.setViewportSize({ width: 375, height: 900 });
    await noOverflow(nonAdminPage);

    await database.query("UPDATE partner_user_memberships SET membership_status='revoked', revoked_at=now() WHERE partner_id=$1 AND auth_user_id=$2", [partnerA, E2E_NON_ADMIN_USER_ID]);
    replayBody[0].partnerId = partnerA;
    const revoked = await nonAdminPage.request.post(`${base}/${rfqId}`, {
      headers: { "next-action": actionRequest.headers()["next-action"], "content-type": "text/plain;charset=UTF-8" },
      data: JSON.stringify(replayBody),
    });
    expect(await revoked.text()).toContain('"code":"FORBIDDEN"');
    const revokedPage = await nonAdminPage.goto(base);
    expect(revokedPage?.status()).toBe(404);
  });
});
