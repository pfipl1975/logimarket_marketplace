import { expect } from "@playwright/test";
import { test } from "./fixtures/auth";
import { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";

const databaseUrl = requireIsolatedE2EDatabaseUrl();
const database = new Pool({ connectionString: databaseUrl });

test.afterAll(async () => {
  await database.end();
});

test.beforeEach(async () => {
  const checkRes = await database.query("SELECT count(*)::int AS count FROM partner_agreement_execution_evidence WHERE external_platform != 'LM_E2E_TEST'");
  if (checkRes.rows[0].count > 0) {
    throw new Error("STOP_TEST_FIXTURE_CONFLICT: non-test agreement evidence exists");
  }

  await database.query(`UPDATE agreement_versions
    SET
      status = 'archived',
      effective_to = COALESCE(effective_to, CURRENT_TIMESTAMP + interval '1 minute')
    WHERE status = 'active'
    AND id IN (
      SELECT agreement_version_id
      FROM partner_agreement_execution_evidence
      WHERE external_platform = 'LM_E2E_TEST'
    )
  `);

  await database.query(`DELETE FROM agreement_versions av
    WHERE NOT EXISTS (
      SELECT 1 FROM partner_agreement_execution_evidence e
      WHERE e.agreement_version_id = av.id
    )
  `);
});

test.describe("Admin Agreement Version Lifecycle", () => {
  test("Happy path: create and activate draft", async ({ adminPage }) => {
    const errors: Error[] = [];
    adminPage.on("pageerror", (err) => errors.push(err));
    adminPage.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(new Error(`Console error: ${msg.text()}`));
      }
    });

    // 1. admin otwiera Partner Agreements
    const response = await adminPage.goto("/admin/umowy-partnerskie");
    expect(response?.status()).toBe(200);

    // 2. brak active version jest widoczny
    await expect(adminPage.getByText("Brak aktywnej Umowy Partnerskiej")).toBeVisible();

    // 3. tworzy: version=v1.0, valid SHA-A
    const testHashA = "a".repeat(64);
    await adminPage.getByLabel("Wersja").fill("v1.0");
    await adminPage.getByLabel("Odcisk SHA-256 (Canonical Template)").fill(testHashA);

    await adminPage.getByRole("button", { name: "Utwórz" }).click();

    // 4. widzi sukces i DRAFT w tabeli
    await expect(adminPage.getByRole("status").filter({ hasText: "Pomyślnie utworzono nową wersję" })).toBeVisible();
    await expect(adminPage.getByRole("cell", { name: "v1.0" })).toBeVisible();
    await expect(adminPage.getByRole("cell", { name: "Szkic" })).toBeVisible();

    // 5. klika Activate
    await adminPage.getByRole("button", { name: "Aktywuj" }).click();

    // 6. widzi sukces, widzi ACTIVE
    await expect(adminPage.getByRole("status").filter({ hasText: "Pomyślnie aktywowano wersję" })).toBeVisible();
    await expect(adminPage.getByText("Brak aktywnej Umowy Partnerskiej")).not.toBeVisible();

    const activeSection = adminPage.locator("section[aria-labelledby='active-agreement-version-heading']");
    const activeRow = adminPage.locator("tr", { hasText: "v1.0" });
    await expect(activeRow.getByText("Aktywna", { exact: true })).toBeVisible();

    // 7. widzi populated effectiveFrom/publishedAt != "-"
    const effectiveFromVal = activeSection.locator("dd[data-testid='effective-from']");
    await expect(effectiveFromVal).not.toHaveText("-");

    const publishedAtVal = activeSection.locator("dd[data-testid='published-at']");
    await expect(publishedAtVal).not.toHaveText("-");

    // 8. tworzy v1.1 z SHA-B
    const testHashB = "b".repeat(64);
    await adminPage.getByLabel("Wersja").fill("v1.1");
    await adminPage.getByLabel("Odcisk SHA-256 (Canonical Template)").fill(testHashB);
    await adminPage.getByRole("button", { name: "Utwórz" }).click();

    // 9. v1.1 jest DRAFT
    await expect(adminPage.getByRole("cell", { name: "v1.1" })).toBeVisible();

    // 10. jego Activate jest disabled
    const row = adminPage.locator("tr", { hasText: "v1.1" });
    const activateButton = row.getByRole("button", { name: "Aktywuj" });
    await expect(activateButton).toBeDisabled();

    // 11. widoczny/accessibility-readable rollover explanation
    const tooltipId = await activateButton.getAttribute("aria-describedby");
    expect(tooltipId).toBeTruthy();
    await expect(adminPage.locator(`#${tooltipId}`)).toContainText("W systemie istnieje już aktywna umowa");

    // 15. effectiveTo column exists
    await expect(adminPage.getByRole("columnheader", { name: "Obowiązuje do" })).toBeVisible();

    expect(errors.length).toBe(0);
  });
});
