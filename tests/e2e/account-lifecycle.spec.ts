import { expect } from "@playwright/test";
import { test, E2E_NON_ADMIN_USER_ID, createDummySupabaseCookie } from "./fixtures/auth";

test("anonymous registration and recovery use neutral copy", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/polityka-prywatnosci");
  const header = page.locator("header");
  await expect(header.getByRole("link", { name: "Zaloguj się" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Załóż konto" })).toBeVisible();
  await header.getByRole("link", { name: "Załóż konto" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.locator('input[name="email"]').fill("new-account@example.invalid");
  await page.locator('input[name="password"]').fill("safe sample phrase 2026");
  await page.locator('input[name="confirmation"]').fill("safe sample phrase 2026");
  await page.getByRole("button", { name: /Załóż konto i sprawdź pocztę/ }).click();
  await expect(page.getByRole("status")).toContainText("Jeśli ten adres może zostać użyty");

  await page.goto("/login");
  await page.getByRole("link", { name: "Odzyskaj hasło" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.locator('input[name="email"]').fill("unknown@example.invalid");
  await page.getByRole("button", { name: "Wyślij instrukcje" }).click();
  await expect(page.getByRole("status")).toContainText("Jeśli konto istnieje");
  expect(errors).toEqual([]);
});

test("invalid callback clears code and rejects external destination", async ({ page }) => {
  await page.goto("/auth/callback?flow=signup&code=expired-secret&next=https%3A%2F%2Fevil.example");
  await expect(page).toHaveURL(/\/login\?authError=1$/);
  await expect(page.locator("p[role=alert]")).toContainText("Link potwierdzający");
  await expect(page.locator("body")).not.toContainText("expired-secret");
  expect(page.url()).not.toContain("evil.example");
});

test("authenticated non-Partner navigation hides public auth links", async ({ nonAdminPage }) => {
  await nonAdminPage.goto("/polityka-prywatnosci");
  await nonAdminPage.setViewportSize({ width: 390, height: 844 });
  await nonAdminPage.getByRole("button", { name: "Menu", exact: true }).click();
  const navigation = nonAdminPage.getByRole("navigation", { name: "Główna nawigacja" });
  await expect(navigation.getByRole("link", { name: "Zaloguj się" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Załóż konto" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Panel Partnera" })).toHaveCount(0);
  await expect(navigation.getByRole("button", { name: "Wyloguj się" })).toBeVisible();
});

test("valid mocked recovery context changes password and ends session", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addCookies([
    { name: "sb-localhost-auth-token", value: createDummySupabaseCookie(E2E_NON_ADMIN_USER_ID), domain: "localhost", path: "/" },
    { name: "lm-recovery-user", value: E2E_NON_ADMIN_USER_ID, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  const page = await context.newPage();
  await page.goto("/reset-password");
  await page.locator('input[name="password"]').fill("changed sample phrase 2026");
  await page.locator('input[name="confirmation"]').fill("changed sample phrase 2026");
  await page.getByRole("button", { name: "Zmień hasło" }).click();
  await expect(page).toHaveURL(/\/login\?passwordUpdated=1$/);
  await expect(page.getByRole("status")).toContainText("Hasło zostało zmienione");
  await context.close();
});

test("mobile and desktop auth routes have no horizontal overflow", async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/polityka-prywatnosci", "/login", "/register", "/forgot-password", "/reset-password"]) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `${width}px ${route}`).toBe(false);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/polityka-prywatnosci");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Główna nawigacja" }).getByRole("link", { name: "Załóż konto" })).toBeVisible();
});
