import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import {
  E2E_ADMIN_USER_ID,
  E2E_BUYER_FIXTURES,
  requireIsolatedE2EDatabaseUrl,
} from "../../scripts/e2e/buyer-trust-fixtures";
import { test } from "./fixtures/auth";

const databaseUrl = requireIsolatedE2EDatabaseUrl();
const database = new Pool({ connectionString: databaseUrl });

test.describe.configure({ retries: 0 });

test.afterAll(async () => {
  await database.end();
});

async function expectDecisionAlert(page: Page, action: () => Promise<void>, expectedMessage: string) {
  const dialogPromise = page.waitForEvent("dialog");
  await action();
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe("alert");
  expect(dialog.message()).toBe(expectedMessage);
  await dialog.accept();
  return dialog.message();
}

async function currentTrustEvidence(organizationId: number) {
  const result = await database.query(
    `SELECT
       o.verification_status,
       o.verified_at,
       o.current_verification_event_id::text AS current_event_id,
       e.event_type,
       e.outcome_status,
       e.actor_user_id::text AS actor_user_id,
       e.source_type,
       e.verification_method,
       e.reason_code,
       t.trusted_by_verification_event_id::text AS trusted_tax_event_id,
       r.trusted_by_verification_event_id::text AS trusted_registry_event_id,
       (SELECT count(*)::int
        FROM buyer_organization_verification_events history
        WHERE history.buyer_organization_id = o.id) AS history_count
     FROM buyer_organizations o
     LEFT JOIN buyer_organization_verification_events e
       ON e.id = o.current_verification_event_id
      AND e.buyer_organization_id = o.id
     LEFT JOIN buyer_tax_identifiers t
       ON t.buyer_organization_id = o.id AND t.retired_at IS NULL
     LEFT JOIN buyer_registry_identifiers r
       ON r.buyer_organization_id = o.id AND r.retired_at IS NULL
     WHERE o.id = $1`,
    [organizationId],
  );

  expect(result.rowCount).toBe(1);
  return result.rows[0] as Record<string, unknown>;
}

test("authorization denies unauthenticated and non-Admin users while authorizing Admin", async ({ page, nonAdminPage, adminPage }) => {
  await page.goto("/admin/kupujacy");
  expect(page.url()).toMatch(/login/i);

  await page.goto(`/admin/kupujacy/${E2E_BUYER_FIXTURES.detail.organizationId}`);
  expect(page.url()).toMatch(/login/i);

  await nonAdminPage.goto("/admin/kupujacy");
  await expect(nonAdminPage.locator("body")).toContainText("404");
  await expect(nonAdminPage.getByRole("heading", { name: "Kupujący / Buyers" })).toHaveCount(0);

  await nonAdminPage.goto(`/admin/kupujacy/${E2E_BUYER_FIXTURES.detail.organizationId}`);
  await expect(nonAdminPage.locator("body")).toContainText("404");

  const listResponse = await adminPage.goto("/admin/kupujacy");
  expect(listResponse?.ok()).toBeTruthy();
  await expect(adminPage.getByRole("heading", { name: "Kupujący / Buyers" })).toBeVisible();

  const detailResponse = await adminPage.goto(`/admin/kupujacy/${E2E_BUYER_FIXTURES.detail.organizationId}`);
  expect(detailResponse?.ok()).toBeTruthy();
  await expect(adminPage.getByRole("heading", { name: E2E_BUYER_FIXTURES.detail.legalName })).toBeVisible();
});

test("Admin Buyer list renders deterministic statuses, identifiers, navigation and active state", async ({ adminPage }) => {
  await adminPage.goto("/admin/kupujacy");
  await expect(adminPage.getByRole("heading", { name: "Kupujący / Buyers" })).toBeVisible();

  for (const fixture of Object.values(E2E_BUYER_FIXTURES)) {
    const row = adminPage.getByRole("row", { name: new RegExp(fixture.legalName) });
    await expect(row).toBeVisible();
    await expect(row).toContainText(fixture.initialStatus === "verified" ? "Verified" : "Pending");
    await expect(row).toContainText(fixture.nip);
    await expect(row).toContainText(fixture.registryValue);
  }

  const activeBuyerLinks = adminPage.getByRole("link", { name: /Kupujący|Buyers/ });
  await expect(activeBuyerLinks.first()).toHaveAttribute("aria-current", "page");
});

test("Buyer detail distinguishes declared identifiers from trusted evidence and renders history", async ({ adminPage }) => {
  const pending = E2E_BUYER_FIXTURES.verify;
  await adminPage.goto(`/admin/kupujacy/${pending.organizationId}`);
  await expect(adminPage.getByRole("heading", { name: pending.legalName })).toBeVisible();
  await expect(adminPage.getByText(`PL${pending.nip}`, { exact: false })).toBeVisible();
  await expect(adminPage.getByText(`PL:${pending.registryValue}`, { exact: false })).toBeVisible();
  await expect(adminPage.getByText("TRUSTED")).toHaveCount(0);
  await expect(adminPage.getByText("Brak historii.")).toBeVisible();

  const trusted = E2E_BUYER_FIXTURES.detail;
  await adminPage.goto(`/admin/kupujacy/${trusted.organizationId}`);
  await expect(adminPage.getByRole("heading", { name: trusted.legalName })).toBeVisible();
  await expect(adminPage.getByText(`Status: ${trusted.initialStatus}`, { exact: false })).toBeVisible();
  await expect(adminPage.getByText("TRUSTED")).toHaveCount(2);

  const history = adminPage.getByRole("heading", { name: /Historia zdarzeń/ }).locator("..");
  await expect(history).toContainText(/\bverified\b/i);
  await expect(history).toContainText("Aktor: admin");
  await expect(history).toContainText("Źródło: admin_manual");
});

test("VERIFY runs through the UI, records server authority and rejects a repeated transition safely", async ({ adminPage }) => {
  const fixture = E2E_BUYER_FIXTURES.verify;
  await adminPage.goto(`/admin/kupujacy/${fixture.organizationId}`);

  await expectDecisionAlert(
    adminPage,
    () => adminPage.getByRole("button", { name: "VERIFY (Zatwierdź)" }).click(),
    "Organization verified successfully.",
  );

  await expect(adminPage.getByText("Status: verified", { exact: false })).toBeVisible();
  const history = adminPage.getByRole("heading", { name: /Historia zdarzeń/ }).locator("..");
  await expect(history).toContainText(/\bverified\b/i);
  await expect(history).toContainText("Aktor: admin");
  await expect(history).toContainText("Źródło: admin_manual");

  const evidence = await currentTrustEvidence(fixture.organizationId);
  expect(evidence.verification_status).toBe("verified");
  expect(evidence.event_type).toBe("verified");
  expect(evidence.outcome_status).toBe("verified");
  expect(evidence.actor_user_id).toBe(E2E_ADMIN_USER_ID);
  expect(evidence.source_type).toBe("admin_manual");
  expect(evidence.verification_method).toBe("manual_admin");
  expect(evidence.verified_at).not.toBeNull();
  expect(evidence.trusted_tax_event_id).toBe(evidence.current_event_id);
  expect(evidence.trusted_registry_event_id).toBe(evidence.current_event_id);
  expect(evidence.history_count).toBe(1);

  const repeatedTransitionMessage = await expectDecisionAlert(
    adminPage,
    () => adminPage.getByRole("button", { name: "VERIFY (Zatwierdź)" }).click(),
    "Failed to verify: BUYER_TRUST_INVALID_TRANSITION",
  );
  expect(repeatedTransitionMessage).not.toMatch(/SELECT |INSERT |UPDATE |DELETE |stack|at\s+\w+/i);
  await expect(adminPage.getByText("Status: verified", { exact: false })).toBeVisible();
});

test("REJECT runs through the UI and preserves auditable identifier evidence", async ({ adminPage }) => {
  const fixture = E2E_BUYER_FIXTURES.reject;
  await adminPage.goto(`/admin/kupujacy/${fixture.organizationId}`);
  await adminPage.getByPlaceholder("Np. dane_nieprawidlowe, brak_odpowiedzi...").fill("synthetic_data_rejected");

  await expectDecisionAlert(
    adminPage,
    () => adminPage.getByRole("button", { name: "REJECT (Odrzuć)" }).click(),
    "Organization rejected.",
  );

  await expect(adminPage.getByText("Status: rejected", { exact: false })).toBeVisible();
  const history = adminPage.getByRole("heading", { name: /Historia zdarzeń/ }).locator("..");
  await expect(history).toContainText(/\brejected\b/i);
  await expect(history).toContainText("synthetic_data_rejected");

  const evidence = await currentTrustEvidence(fixture.organizationId);
  expect(evidence.verification_status).toBe("rejected");
  expect(evidence.event_type).toBe("rejected");
  expect(evidence.outcome_status).toBe("rejected");
  expect(evidence.actor_user_id).toBe(E2E_ADMIN_USER_ID);
  expect(evidence.source_type).toBe("admin_manual");
  expect(evidence.reason_code).toBe("synthetic_data_rejected");
  expect(evidence.history_count).toBe(1);
});

test("REVOKE runs through the UI, fails closed and preserves prior verification history", async ({ adminPage }) => {
  const fixture = E2E_BUYER_FIXTURES.revoke;
  await adminPage.goto(`/admin/kupujacy/${fixture.organizationId}`);
  await expect(adminPage.getByText("TRUSTED")).toHaveCount(2);
  await adminPage.getByPlaceholder("Np. dane_nieprawidlowe, brak_odpowiedzi...").fill("synthetic_verification_revoked");

  await expectDecisionAlert(
    adminPage,
    () => adminPage.getByRole("button", { name: "REVOKE (Cofnij)" }).click(),
    "Organization revoked.",
  );

  await expect(adminPage.getByText("Status: revoked", { exact: false })).toBeVisible();
  await expect(adminPage.getByText("TRUSTED")).toHaveCount(0);
  const history = adminPage.getByRole("heading", { name: /Historia zdarzeń/ }).locator("..");
  await expect(history).toContainText(/\brevoked\b/i);
  await expect(history).toContainText(/\bverified\b/i);
  await expect(history).toContainText("synthetic_verification_revoked");

  const evidence = await currentTrustEvidence(fixture.organizationId);
  expect(evidence.verification_status).toBe("revoked");
  expect(evidence.event_type).toBe("revoked");
  expect(evidence.outcome_status).toBe("revoked");
  expect(evidence.actor_user_id).toBe(E2E_ADMIN_USER_ID);
  expect(evidence.source_type).toBe("admin_manual");
  expect(evidence.reason_code).toBe("synthetic_verification_revoked");
  expect(evidence.verified_at).toBeNull();
  expect(evidence.trusted_tax_event_id).toBeNull();
  expect(evidence.trusted_registry_event_id).toBeNull();
  expect(evidence.history_count).toBe(2);
});

test("localized route and narrow viewport keep Buyer verification usable", async ({ adminPage }) => {
  const fixture = E2E_BUYER_FIXTURES.detail;
  await adminPage.goto("/en/admin/buyers");
  await expect(adminPage.getByRole("heading", { name: "Kupujący / Buyers" })).toBeVisible();
  await expect(adminPage.getByRole("row", { name: new RegExp(fixture.legalName) })).toBeVisible();
  await expect(adminPage.getByRole("link", { name: /Buyers/ }).first()).toHaveAttribute("aria-current", "page");

  await adminPage.setViewportSize({ width: 390, height: 844 });
  await adminPage.goto("/admin/kupujacy");
  await expect(adminPage.getByRole("heading", { name: "Kupujący / Buyers" })).toBeVisible();
  await expect(adminPage.getByRole("row", { name: new RegExp(fixture.legalName) })).toBeVisible();
  expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  await adminPage.goto(`/admin/kupujacy/${fixture.organizationId}`);
  await expect(adminPage.getByRole("heading", { name: fixture.legalName })).toBeVisible();
  await expect(adminPage.getByRole("button", { name: "VERIFY (Zatwierdź)" })).toBeVisible();
  await expect(adminPage.getByPlaceholder("Np. dane_nieprawidlowe, brak_odpowiedzi...")).toBeVisible();
  expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
