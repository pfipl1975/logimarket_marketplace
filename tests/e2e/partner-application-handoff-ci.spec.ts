import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect } from "@playwright/test";
import { test } from "./fixtures/auth";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";
import pl from "../../src/messages/pl.json";
import en from "../../src/messages/en.json";

test("accepted Partner application links to ADMIN onboarding without creating a Partner", async ({ adminPage, nonAdminPage }) => {
  // The default GitHub Actions Playwright job supplies a disposable localhost:5432/logimarket_test.
  // Refuse any other DB target before even opening a connection or seeding the application.
  const database = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });

  try {
    const identity = await database.query<{ name: string; port: number }>(
      "SELECT current_database() AS name, inet_server_port() AS port",
    );
    expect(identity.rows).toEqual([{ name: "logimarket_test", port: 5432 }]);

    const id = randomUUID();
    const rejectedId = randomUUID();
    const company = `E2E Partner Handoff ${id}`;
    const contactEmail = `handoff-${id}@example.invalid`;
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");

    async function seedApplication(applicationId: string, name: string, email: string) {
      await database.query(
        `INSERT INTO public.partner_applications
          (id, company_name, country_code, contact_email, business_type, tax_identifier,
           submission_key_hash, request_digest, privacy_notice_version, locale)
         VALUES ($1, $2, 'PL', $3, 'distributor', '0000000017', $4, $5, 'LOCAL_FIXTURE_ONLY', 'pl')`,
        [applicationId, name, email, hash(`submission:${applicationId}`), hash(`request:${applicationId}`)],
      );
    }

    const partnerCount = async () => {
      const result = await database.query<{ total: number }>("SELECT count(*)::int AS total FROM public.partners");
      return result.rows[0].total;
    };
    const applicationState = async () => {
      const result = await database.query<{ status: string; version: number; events: number }>(
        `SELECT a.status, a.version,
           (SELECT count(*)::int FROM public.partner_application_events e WHERE e.application_id = a.id) AS events
         FROM public.partner_applications a WHERE a.id = $1`,
        [id],
      );
      return result.rows[0];
    };

    const partnerCountBefore = await partnerCount();
    await seedApplication(id, company, contactEmail);
    await seedApplication(rejectedId, "E2E unaccepted Partner", "unaccepted@example.invalid");
    expect(await applicationState()).toEqual({ status: "submitted", version: 1, events: 1 });

    const applicationPath = `/admin/partner-applications?id=${id}`;
    const response = await adminPage.goto(applicationPath);
    expect(response?.status()).toBe(200);
    await expect(adminPage.getByRole("heading", { name: company, exact: true })).toBeVisible();
    await expect(adminPage.getByRole("link", { name: pl.adminPartnerCreate.title, exact: true })).toHaveCount(0);

    const review = async (status: "under_review" | "accepted_for_onboarding") => {
      await adminPage.locator('select[name="status"]').selectOption(status);
      await adminPage.locator('input[name="reason"]').fill("Isolated CI application review");
      await adminPage.locator('textarea[name="note"]').fill("Synthetic fixture only");
      await adminPage.getByRole("button", { name: pl.partnerApplications.update, exact: true }).click();
    };
    await review("under_review");
    await expect.poll(applicationState).toEqual({ status: "under_review", version: 2, events: 2 });
    await adminPage.goto(applicationPath);
    await expect(adminPage.getByRole("link", { name: pl.adminPartnerCreate.title, exact: true })).toHaveCount(0);

    await review("accepted_for_onboarding");
    await expect.poll(applicationState).toEqual({ status: "accepted_for_onboarding", version: 3, events: 3 });
    await adminPage.goto(applicationPath);
    const handoff = adminPage.getByRole("link", { name: pl.adminPartnerCreate.title, exact: true });
    await expect(handoff).toHaveAttribute("href", `/admin/partnerzy/nowy?applicationId=${id}`);
    await handoff.click();

    await expect(adminPage).toHaveURL(new RegExp(`/admin/partnerzy/nowy\\?applicationId=${id}$`));
    await expect(adminPage.locator('input[name="companyName"]')).toHaveValue(company);
    await expect(adminPage.locator('input[name="contactEmail"]')).toHaveValue(contactEmail);
    await expect(adminPage.locator('input[name="jurisdictionCountry"]')).toHaveValue("PL");
    await expect(adminPage.locator('input[name="registeredCountryCode"]')).toHaveValue("PL");
    await expect(adminPage.locator('input[name="taxIdValue"]')).toHaveValue("0000000017");
    await expect(adminPage.locator('input[name="legalName"]')).toHaveValue("");
    await expect(adminPage.locator('input[name="registeredAddressLine1"]')).toHaveValue("");
    await expect(adminPage.getByText(pl.partnerApplications.unverified, { exact: true })).toBeVisible();
    expect(await partnerCount()).toBe(partnerCountBefore);

    await adminPage.goto(`/en/admin/partner-applications?id=${id}`);
    const localizedHandoff = adminPage.getByRole("link", { name: en.adminPartnerCreate.title, exact: true });
    await expect(localizedHandoff).toHaveAttribute("href", `/en/admin/partners/new?applicationId=${id}`);
    await localizedHandoff.click();
    await expect(adminPage.locator('input[name="contactEmail"]')).toHaveValue(contactEmail);

    const unavailable = await adminPage.goto(`/admin/partnerzy/nowy?applicationId=${rejectedId}`);
    expect(unavailable?.status()).toBe(404);
    await expect(adminPage.locator('input[name="companyName"]')).toHaveCount(0);

    await nonAdminPage.goto(`/admin/partnerzy/nowy?applicationId=${id}`);
    await expect(nonAdminPage.locator('input[name="companyName"]')).toHaveCount(0);
    await expect(nonAdminPage.getByText(contactEmail, { exact: true })).toHaveCount(0);
    expect(await partnerCount()).toBe(partnerCountBefore);
  } finally {
    await database.end();
  }
});
