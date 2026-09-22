import { expect } from "@playwright/test";
import { test, E2E_ADMIN_USER_ID, E2E_NON_ADMIN_USER_ID } from "./fixtures/auth";
import * as crypto from "crypto";

const SECRET = "e2e-dummy-jwt-secret-do-not-use-in-prod";

function createCustomCookie(header: Record<string, unknown>, payload: Record<string, unknown>, mutateSignature: (sig: string) => string = (s) => s) {
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(`${headerB64}.${payloadB64}`);
  const signatureB64 = mutateSignature(hmac.digest("base64url"));

  const token = `${headerB64}.${payloadB64}.${signatureB64}`;
  // @supabase/ssr 0.12.4 requires expires_at in the session object.
  const now = Math.floor(Date.now() / 1000);
  const obj = { access_token: token, refresh_token: "fake", token_type: "bearer", expires_in: 3600, expires_at: now + 3600 };
  return "base64-" + Buffer.from(JSON.stringify(obj)).toString("base64url");
}

test.describe("E2E Auth Harness Negative Security Tests", () => {

  test("A. unauthenticated access is redirected to login", async ({ page }) => {
    await page.goto("/admin");
    const url = page.url();
    expect(url).not.toMatch(/\/admin$/);
    expect(url).toMatch(/login/i);
  });

  test("A. malformed session is rejected", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([
      { name: "sb-localhost-auth-token", value: "malformed-junk", domain: "localhost", path: "/" }
    ]);
    const page = await context.newPage();
    await page.goto("/admin");
    expect(page.url()).not.toMatch(/\/admin$/);
    await context.close();
  });

  test("B. structurally valid JWT with invalid signature is rejected", async ({ browser }) => {
    const now = Math.floor(Date.now() / 1000);
    const cookieValue = createCustomCookie(
      { alg: "HS256", typ: "JWT" },
      { sub: E2E_ADMIN_USER_ID, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600 },
      () => "invalid-signature-1234"
    );
    const context = await browser.newContext();
    await context.addCookies([{ name: "sb-localhost-auth-token", value: cookieValue, domain: "localhost", path: "/" }]);
    const page = await context.newPage();
    await page.goto("/admin");
    expect(page.url()).not.toMatch(/\/admin$/);
    await context.close();
  });

  test("C. non-Admin valid signed token is authenticated but access denied", async ({ nonAdminPage }) => {
    await nonAdminPage.goto("/admin");
    const bodyText = await nonAdminPage.locator("body").textContent();
    expect(bodyText?.toLowerCase()).toContain("404");
    await expect(nonAdminPage.locator("text=Panel Administratora")).toHaveCount(0);
  });

  test("D. tampered non-Admin token to Admin without re-signing is rejected", async ({ browser }) => {
    // We sign for NON_ADMIN, but then change payload to ADMIN in the final token
    const headerB64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const origPayload = { sub: E2E_NON_ADMIN_USER_ID, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600 };
    const origPayloadB64 = Buffer.from(JSON.stringify(origPayload)).toString("base64url");

    const hmac = crypto.createHmac("sha256", SECRET);
    hmac.update(`${headerB64}.${origPayloadB64}`);
    const validNonAdminSignature = hmac.digest("base64url");

    // Tamper payload
    const tamperedPayload = { ...origPayload, sub: E2E_ADMIN_USER_ID };
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(tamperedPayload)).toString("base64url");

    const token = `${headerB64}.${tamperedPayloadB64}.${validNonAdminSignature}`;
    const cookieValue = "base64-" + Buffer.from(JSON.stringify({ access_token: token, refresh_token: "fake", token_type: "bearer", expires_in: 3600, expires_at: now + 3600 })).toString("base64url");

    const context = await browser.newContext();
    await context.addCookies([{ name: "sb-localhost-auth-token", value: cookieValue, domain: "localhost", path: "/" }]);
    const page = await context.newPage();
    await page.goto("/admin");
    expect(page.url()).not.toMatch(/\/admin$/);
    await context.close();
  });

  test("E. valid Admin signed token is authorized", async ({ adminPage }) => {
    const response = await adminPage.goto("/admin");
    expect(response?.ok()).toBeTruthy();
    expect(adminPage.url()).toMatch(/\/admin$/);
    await expect(adminPage.locator("h1")).toBeVisible();
  });

  test("F. correctly signed token with unknown synthetic subject is rejected", async ({ browser }) => {
    const now = Math.floor(Date.now() / 1000);
    const cookieValue = createCustomCookie(
      { alg: "HS256", typ: "JWT" },
      { sub: "22222222-2222-2222-2222-222222222222", aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600 }
    );
    const context = await browser.newContext();
    await context.addCookies([{ name: "sb-localhost-auth-token", value: cookieValue, domain: "localhost", path: "/" }]);
    const page = await context.newPage();
    await page.goto("/admin");
    expect(page.url()).not.toMatch(/\/admin$/);
    await context.close();
  });

});
