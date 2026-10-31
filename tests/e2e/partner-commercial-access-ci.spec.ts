import { Pool } from "pg";
import { expect } from "@playwright/test";
import { test, E2E_NON_ADMIN_USER_ID } from "./fixtures/auth";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";
import pl from "../../src/messages/pl.json";

test("unready Partner sees only offer drafts; RFQ and orders reject direct navigation", async ({ nonAdminPage }) => {
  const database = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
  let partnerId = 0;
  try {
    const target = await database.query("SELECT current_database() AS name, inet_server_port() AS port");
    expect(target.rows).toEqual([{ name: "logimarket_test", port: 5432 }]);
    const partner = await database.query<{ id: string }>(
      "INSERT INTO partners (company_name, contact_email) VALUES ('Unready Partner CI', 'commercial-ci@example.invalid') RETURNING id",
    );
    partnerId = Number(partner.rows[0].id);
    await database.query(
      "INSERT INTO partner_user_memberships (partner_id, auth_user_id, membership_status, can_accept_orders) VALUES ($1, $2, 'active', false)",
      [partnerId, E2E_NON_ADMIN_USER_ID],
    );

    const offers = await nonAdminPage.goto(`/partner/${partnerId}/oferty`);
    expect(offers?.status()).toBe(200);
    const nav = nonAdminPage.getByRole("navigation", { name: pl.PartnerWorkspace.navigationLabel });
    await expect(nav.getByRole("link")).toHaveCount(1);
    await expect(nav.getByRole("link", { name: pl.PartnerWorkspace.offers })).toBeVisible();
    await expect(nonAdminPage.getByText(pl.PartnerWorkspace.commercialRestrictedNotice, { exact: true })).toBeVisible();

    const dashboard = await nonAdminPage.goto(`/partner/${partnerId}`);
    expect(dashboard?.status()).toBe(200);
    await expect(nonAdminPage).toHaveURL(new RegExp(`/partner/${partnerId}/oferty$`));

    for (const path of ["zapytania", "zamowienia"]) {
      const denied = await nonAdminPage.goto(`/partner/${partnerId}/${path}`);
      expect(denied?.status()).toBe(404);
    }
  } finally {
    if (partnerId) {
      await database.query("DELETE FROM partner_user_memberships WHERE partner_id = $1", [partnerId]);
      await database.query("DELETE FROM partners WHERE id = $1", [partnerId]);
    }
    await database.end();
  }
});
