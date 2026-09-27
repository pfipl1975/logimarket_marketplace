import { test, expect } from "@playwright/test";

test("public Legal Center is server rendered and fits a mobile viewport", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/dokumenty-prawne");
  expect(response?.status()).toBe(200);
  expect(await response?.text()).toContain("Dokumenty prawne LogiMarket");
  await expect(page.getByRole("heading", { name: "Dokumenty prawne LogiMarket" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aktualne dokumenty" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Historia wersji" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Integralność / pakiet dokumentów" })).toBeVisible();
  await expect(page.getByText("Brak obecnie opublikowanych dokumentów prawnych.", { exact: true })).toBeVisible();
  await expect(page.getByText("Nie ma jeszcze wcześniejszych publicznych wersji dokumentów.", { exact: true })).toBeVisible();
  await expect(page.getByText("Brak obecnie opublikowanego pakietu dokumentów prawnych.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.innerWidth)).toBe(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("link", { name: "Dokumenty prawne" })).toHaveAttribute("href", "/dokumenty-prawne");
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
