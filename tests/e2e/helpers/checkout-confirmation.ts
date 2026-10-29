import { expect, type Browser, type Page } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../../scripts/e2e/buyer-trust-fixtures";
import { CHECKOUT_READY_BUYER_ID } from "../../../scripts/e2e/buyer-checkout-fixtures";
import { verifySqlIdentityBeforeDestructiveDdl } from "../../database/helpers/destructive-db-safety";
import { createDummySupabaseCookie } from "../fixtures/auth";
import pl from "../../../src/messages/pl.json";

export async function proveCheckoutConfirmation(database: Pool, seller: { offerId: string; partnerId: string }, browser: Browser) {
  expect(process.env.GITHUB_ACTIONS).toBe("true");
  expect(process.env.CI).toBeTruthy();
  requireIsolatedE2EDatabaseUrl();
  await verifySqlIdentityBeforeDestructiveDdl(database);
  const prefix = "r03-" + randomUUID();
  const created: string[] = [];
  const errors: string[] = [];
  async function offer(label: string) {
    const result = await database.query<{ id: string }>(
      "INSERT INTO offers(partner_id,category_id,title,offer_model,conversion_type,price_brutto,price_on_request,is_active,publication_status) SELECT $1,category_id,$2,'marketplace','inbound',100.00,false,true,'published' FROM offers WHERE id=$3 RETURNING id",
      [seller.partnerId, prefix + label, seller.offerId]);
    created.push(result.rows[0].id);
    return result.rows[0].id;
  }
  async function add(page: Page, id: string) {
    await page.goto("/oferta/" + id);
    await page.getByRole("button", { name: /dodaj do koszyka/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
  }
  const counts = async () => (await database.query(`
    SELECT
      (SELECT count(*)::int FROM marketplace_orders) AS orders,
      (SELECT count(*)::int FROM buyer_legal_context_snapshots) AS legal,
      (SELECT count(*)::int FROM marketplace_order_buyer_contact_snapshots) AS contact,
      (SELECT count(*)::int FROM marketplace_order_buyer_invoice_snapshots) AS invoice,
      (SELECT count(*)::int FROM marketplace_order_seller_disclosures) AS disclosures,
      (SELECT count(*)::int FROM seller_orders) AS sellers,
      (SELECT count(*)::int FROM seller_order_items) AS items,
      (SELECT count(*)::int FROM seller_order_seller_snapshots) AS seller_snapshots,
      (SELECT count(*)::int FROM seller_acceptance_decisions) AS decisions,
      (SELECT count(*)::int FROM notification_outbox_events) AS outbox`)).rows[0];
  try {
    for (const variant of ["increase-desktop", "increase-mobile", "decrease", "same-total", "quantity", "composition",
      "partner", "model", "unpublished", "on-request", "tampered", "missing", "expired", "foreign-buyer", "http-fields", "two-tabs"]) {
      const context = await browser.newContext({ viewport: { width: variant === "increase-mobile" ? 375 : 1280, height: 844 } });
      try {
        await context.addCookies([{ name: "sb-localhost-auth-token", value: createDummySupabaseCookie(CHECKOUT_READY_BUYER_ID), domain: "localhost", path: "/" }]);
        const page = await context.newPage();
        page.on("pageerror", () => errors.push("pageerror"));
        page.on("console", entry => { if (entry.type() === "error") errors.push("console"); });
        page.on("response", response => { if (response.status() >= 500) errors.push("HTTP_500"); });
        const id = await offer(variant);
        await add(page, id);
        let second: string | undefined;
        if (variant === "same-total") { second = await offer("second"); await add(page, second); }
        await page.goto("/zamowienie");
        const form = page.locator("form").filter({ has: page.locator('input[name="confirmation"]') });
        const tokenInput = form.locator('input[name="confirmation"]');
        await expect(tokenInput).toHaveCount(1);
        const originalToken = await tokenInput.inputValue();
        await form.locator("textarea").fill("Synthetic R03 buyer note");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (variant === "increase-mobile") expect(await page.evaluate(() => window.innerWidth)).toBe(375);
        const hash = (await context.cookies()).find(cookie => cookie.name === "session_hash")!.value;
        const cart = async () => (await database.query("SELECT id,offer_id,quantity FROM cart_items WHERE session_hash=$1 ORDER BY id", [hash])).rows;
        const before = await counts();
        if (variant.startsWith("increase")) await database.query("UPDATE offers SET price_brutto=135.79 WHERE id=$1", [id]);
        if (variant === "decrease") await database.query("UPDATE offers SET price_brutto=80.01 WHERE id=$1", [id]);
        if (variant === "same-total") {
          await database.query("UPDATE offers SET price_brutto=99.00 WHERE id=$1", [id]);
          await database.query("UPDATE offers SET price_brutto=101.00 WHERE id=$1", [second]);
        }
        if (variant === "quantity") await database.query("UPDATE cart_items SET quantity=2 WHERE session_hash=$1", [hash]);
        if (variant === "composition") {
          const additionalOffer = await offer("composition-extra");
          await database.query("INSERT INTO cart_items(session_hash,offer_id,quantity) VALUES($1,$2,1)", [hash, additionalOffer]);
        }
        if (variant === "partner") {
          const foreign = await database.query("SELECT id FROM partners WHERE id<>$1 ORDER BY id LIMIT 1", [seller.partnerId]);
          await database.query("UPDATE offers SET partner_id=$2 WHERE id=$1", [id, foreign.rows[0].id]);
        }
        if (variant === "model") await database.query("UPDATE offers SET offer_model='rfq' WHERE id=$1", [id]);
        if (variant === "unpublished") await database.query("UPDATE offers SET publication_status='draft' WHERE id=$1", [id]);
        if (variant === "on-request") await database.query("UPDATE offers SET price_on_request=true WHERE id=$1", [id]);
        if (["tampered", "missing", "expired", "foreign-buyer"].includes(variant)) {
          let supplied = originalToken;
          if (variant === "tampered") supplied = supplied.slice(0, -1) + (supplied.endsWith("A") ? "Q" : "A");
          if (variant === "missing") supplied = "";
          if (variant === "expired" || variant === "foreign-buyer") {
            const data = JSON.parse(Buffer.from(supplied.split(".")[0], "base64url").toString());
            if (variant === "expired") { data.iat -= 16 * 60 * 1000; data.exp -= 16 * 60 * 1000; }
            else data.binding = "0".repeat(64);
            const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
            supplied = payload + "." + createHmac("sha256", process.env.CHECKOUT_CONFIRMATION_SECRET!).update("checkout-confirmation:v1:" + payload).digest("base64url");
          }
          await tokenInput.evaluate((input, value) => { (input as HTMLInputElement).value = value; }, supplied);
        }
        if (variant === "http-fields") {
          await form.evaluate(node => {
            for (const name of ["priceBrutto", "total", "quantity", "offerId", "partnerId", "sessionHash", "authUserId", "currency"]) {
              const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = "1"; node.append(input);
            }
          });
        }
        let other: Page | undefined;
        if (variant === "two-tabs") { other = await context.newPage(); await other.goto("/zamowienie"); await expect(other.locator('input[name="confirmation"]')).toHaveCount(1); }
        const beforeCart = await cart();
        const responsePromise = page.waitForResponse(response => response.request().method() === "POST" && !!response.request().headers()["next-action"]);
        await form.getByRole("button", { name: pl.checkoutFlow.submit, exact: true }).click();
        const response = await responsePromise;
        expect(response.status()).toBeLessThan(400);
        if (["http-fields", "two-tabs"].includes(variant)) {
          await expect(page).toHaveURL(/\/zamowienia(?:\?|$)/);
          if (other) {
            await other.getByRole("button", { name: pl.checkoutFlow.submit, exact: true }).click();
            await expect(other.getByText(pl.checkoutFlow.cartEmpty, { exact: false }).first()).toBeVisible();
          }
          const written = await database.query("SELECT si.unit_price,si.quantity FROM seller_order_items si JOIN seller_orders so ON so.id=si.seller_order_id JOIN marketplace_orders mo ON mo.id=so.marketplace_order_id WHERE mo.session_hash=$1", [hash]);
          expect(written.rows).toEqual([{ unit_price: "100.00", quantity: 1 }]);
          expect((await counts()).orders).toBe(before.orders + 1);
        } else {
          expect((await response.text()).includes("CHECKOUT_ORDER_CREATED")).toBe(false);
          expect(page.url()).toContain("/zamowienie");
          expect(await counts()).toEqual(before);
          expect(await cart()).toEqual(beforeCart);
          if (!["partner", "model", "unpublished", "on-request"].includes(variant)) {
            expect((await response.text()).includes("CHECKOUT_CONFIRMATION_STALE")).toBe(true);
            const alert = page.getByRole("alert").filter({ hasText: pl.checkoutFlow.confirmationStale });
            await expect(alert).toBeVisible();
            await expect(alert).toBeFocused();
            // Compare booleans, so a failed assertion never prints the consent token.
            await expect.poll(async () => (await tokenInput.inputValue()) !== originalToken).toBe(true);
            await expect(form.locator("textarea")).toHaveValue("Synthetic R03 buyer note");
            if (variant.startsWith("increase") || variant === "decrease") {
              const price = variant === "decrease" ? "80,01" : "135,79";
              await expect(page.getByText(new RegExp(price)).first()).toBeVisible();
              expect(await counts()).toEqual(before); // Refresh itself must not submit.
              await form.getByRole("button", { name: pl.checkoutFlow.submit, exact: true }).click();
              await expect(page).toHaveURL(/\/zamowienia(?:\?|$)/);
              const written = await database.query("SELECT si.unit_price,si.quantity FROM seller_order_items si JOIN seller_orders so ON so.id=si.seller_order_id JOIN marketplace_orders mo ON mo.id=so.marketplace_order_id WHERE mo.session_hash=$1", [hash]);
              expect(written.rows).toEqual([{ unit_price: variant === "decrease" ? "80.01" : "135.79", quantity: 1 }]);
              expect((await counts()).orders).toBe(before.orders + 1);
              console.log("R03_RUNTIME " + variant + " OLD=100.00 REJECTION_WRITES=0 ACCEPTED_UNIT=" + (variant === "decrease" ? "80.01" : "135.79"));
            }
          }
        }
        expect(errors).toEqual([]);
        console.log("R03_RUNTIME_CASE " + variant + " PASS");
      } finally { await context.close(); }
    }
  } finally {
    if (created.length) await database.query("UPDATE offers SET is_active=false,publication_status='draft' WHERE id=ANY($1::bigint[])", [created]);
  }
}
