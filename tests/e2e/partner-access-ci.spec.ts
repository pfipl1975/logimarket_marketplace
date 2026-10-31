import { Pool } from "pg";
import { expect } from "@playwright/test";
import { test, createDummySupabaseCookie } from "./fixtures/auth";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";
import pl from "../../src/messages/pl.json";

const memberUserId = "22222222-2222-4222-8222-222222222222";
const memberEmail = `e2e-${memberUserId}@test.local`;

test("ADMIN links a confirmed existing Auth user, Partner enters own portal, revocation denies access", async ({ adminPage, nonAdminPage, browser }) => {
  // Explicit disposable fixture guard. Never test on production/shared Postgres.
  const database = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
  try {
    const identity = await database.query("SELECT current_database() AS name, inet_server_port() AS port");
    expect(identity.rows).toEqual([{ name: "logimarket_test", port: 5432 }]);

    const partnerRow = await database.query<{ id: string }>(
      "INSERT INTO public.partners (company_name, contact_email) VALUES ('E2E Partner Access Proof', 'access-e2e@example.invalid') RETURNING id",
    );
    const partnerId = Number(partnerRow.rows[0].id);
    const membership = async () => {
      const response = await database.query(
        `SELECT membership_status AS status, can_accept_orders AS orders, revoked_at IS NOT NULL AS revoked
         FROM public.partner_user_memberships WHERE partner_id=$1 AND auth_user_id=$2`,
        [partnerId, memberUserId],
      );
      return response.rows[0] ?? null;
    };
    expect(await membership()).toBeNull();

    await nonAdminPage.goto(`/admin/partnerzy/${partnerId}`);
    await expect(nonAdminPage.locator('input[name="authUserId"]')).toHaveCount(0);

    const response = await adminPage.goto(`/admin/partnerzy/${partnerId}`);
    expect(response?.status()).toBe(200);
    await expect(adminPage.getByRole("heading", { name: pl.partnerAccess.title })).toBeVisible();
    await adminPage.locator('input[name="authUserId"]').fill(memberUserId);
    await adminPage.locator('input[name="email"]').fill("wrong@example.invalid");
    await adminPage.locator('input[name="authorityConfirmed"]').check();
    await adminPage.getByRole("button", { name: pl.partnerAccess.grant, exact: true }).click();
    await expect(adminPage.getByRole("alert")).toContainText(pl.partnerAccess.identityNotVerified);
    expect(await membership()).toBeNull();

    await adminPage.locator('input[name="email"]').fill(memberEmail);
    await adminPage.getByRole("button", { name: pl.partnerAccess.grant, exact: true }).click();
    await expect(adminPage.getByRole("status")).toContainText(pl.partnerAccess.granted);
    await expect.poll(membership).toEqual({ status: "active", orders: false, revoked: false });
    await expect(adminPage.getByText(memberUserId, { exact: true })).toBeVisible();

    const context = await browser.newContext();
    await context.addCookies([{
      name: "sb-localhost-auth-token",
      value: createDummySupabaseCookie(memberUserId),
      domain: "localhost", path: "/",
    }]);
    try {
      const partnerPage = await context.newPage();
      const accessible = await partnerPage.goto(`/partner/${partnerId}`);
      expect(accessible?.status()).toBe(200);
      await expect(partnerPage.getByText("E2E Partner Access Proof", { exact: true })).toBeVisible();

      adminPage.once("dialog", dialog => dialog.accept());
      await adminPage.getByRole("button", { name: pl.partnerAccess.revoke, exact: true }).click();
      await expect.poll(membership).toEqual({ status: "revoked", orders: false, revoked: true });
      const denied = await partnerPage.reload();
      expect(denied?.status()).toBe(404);
      await expect(partnerPage.getByText("E2E Partner Access Proof", { exact: true })).toHaveCount(0);
    } finally {
      await context.close();
    }
  } finally {
    await database.end();
  }
});
