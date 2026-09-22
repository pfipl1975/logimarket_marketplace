/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from "@playwright/test";
import * as crypto from "crypto";

export const E2E_ADMIN_USER_ID = "00000000-0000-0000-0000-000000000000";
export const E2E_NON_ADMIN_USER_ID = "11111111-1111-1111-1111-111111111111";
const SECRET = "e2e-dummy-jwt-secret-do-not-use-in-prod";

export function createDummySupabaseCookie(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const headerB64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  // @supabase/ssr 0.12.4 checks session.expires_at before calling /auth/v1/user.
  // Missing expires_at → AuthSessionMissingError (no network call to mock).
  // Also include aud and iat for a realistic Supabase-shaped JWT.
  const payloadStr = JSON.stringify({
    sub: userId,
    aud: "authenticated",
    role: "authenticated",
    iat: now,
    exp: now + 3600,
  });
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");

  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(`${headerB64}.${payloadB64}`);
  const signatureB64 = hmac.digest("base64url");

  const token = `${headerB64}.${payloadB64}.${signatureB64}`;

  const obj = {
    access_token: token,
    refresh_token: "fake-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
  };
  const objStr = JSON.stringify(obj);
  return "base64-" + Buffer.from(objStr).toString("base64url");
}

type AuthFixtures = {
  adminPage: import("@playwright/test").Page;
  nonAdminPage: import("@playwright/test").Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "sb-localhost-auth-token",
        value: createDummySupabaseCookie(E2E_ADMIN_USER_ID),
        domain: "localhost",
        path: "/",
      }
    ]);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  nonAdminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "sb-localhost-auth-token",
        value: createDummySupabaseCookie(E2E_NON_ADMIN_USER_ID),
        domain: "localhost",
        path: "/",
      }
    ]);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
