import { test, expect, type Page } from "@playwright/test";

const effectiveInstant = Date.parse("2026-09-30T22:00:00.000Z");
const pdfPath = "/legal/core-v1/LogiMarket.eu_Marketplace_Regulamin_v1_0.pdf";

function collectErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}

test("public Legal Center displays the seven public PDFs without mobile overflow", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/dokumenty-prawne");
  expect(response?.status()).toBe(200);
  expect(await response?.text()).toContain("Dokumenty prawne LogiMarket");
  await expect(page.getByRole("heading", { name: "Dokumenty prawne LogiMarket" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aktualne dokumenty" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nadchodzące dokumenty" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Historia wersji" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Integralność / pakiet dokumentów" })).toBeVisible();
  const section = page.locator(Date.now() < effectiveInstant ? "#upcoming-heading + ul" : "#current-heading + ul");
  await expect(section.locator("li")).toHaveCount(7);
  await expect(page.getByText("Umowa o świadczenie usług i pośrednictwa agencyjnego")).toHaveCount(0);
  await expect(section.getByRole("link", { name: "Otwórz dokument" })).toHaveCount(7);
  await expect(section.getByRole("link", { name: "Pobierz PDF" })).toHaveCount(7);
  await expect(section.getByRole("link", { name: "Otwórz dokument" }).first()).toHaveAttribute("href", /^\/legal\/core-v1\//);
  await expect(page.getByText("Nie ma jeszcze wcześniejszych publicznych wersji dokumentów.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.content()).not.toContain("drive.google.com");
  expect(await page.content()).not.toContain("storage_reference");
  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

test("public detail, first-party PDF and stable privacy URL work on desktop", async ({ page, request }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const detail = await page.goto("/dokumenty-prawne/regulamin-marketplace");
  expect(detail?.status()).toBe(200);
  expect(await detail?.text()).toContain("Regulamin LogiMarket.eu Marketplace");
  await expect(page.getByRole("heading", { name: "Regulamin LogiMarket.eu Marketplace" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Otwórz PDF" })).toHaveAttribute("href", pdfPath);
  await expect(page.getByRole("link", { name: "Pobierz PDF" })).toHaveAttribute("href", pdfPath);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const pdf = await request.get(pdfPath);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).length).toBe(127639);
  expect((await request.get("/dokumenty-prawne/partner-agreement")).status()).toBe(404);

  const privacy = await page.goto("/polityka-prywatnosci");
  expect(privacy?.status()).toBe(200);
  if (Date.now() < effectiveInstant) {
    await expect(page.getByText(/Nowa Polityka Prywatności v1\.0 została opublikowana i zacznie obowiązywać 1 października 2026 r\./)).toBeVisible();
    await expect(page.getByRole("link", { name: "Zobacz nową wersję" })).toHaveAttribute("href", "/dokumenty-prawne/polityka-prywatnosci");
  } else {
    await expect(page.getByRole("heading", { name: "Polityka Prywatności LogiMarket.eu Marketplace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Otwórz PDF" })).toHaveAttribute("href", /Polityka_Prywatnosci_v1_0\.pdf$/);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});
