import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { registerSchema, resetSchema, validateNewPassword } from "../../src/lib/auth/account-lifecycle-core";
import { accountLinkWithNext, accountPath, safeAccountNext } from "../../src/lib/auth/account-paths";
import { buildLoginRedirectUrl } from "../../src/lib/auth/login-redirect";
import { trustedAccountCallbackUrl } from "../../src/lib/auth/account-origin";

test("new password policy and confirmation", () => {
  assert.equal(validateNewPassword("short", "short"), "PASSWORD_POLICY");
  assert.equal(validateNewPassword("a".repeat(129), "a".repeat(129)), "PASSWORD_POLICY");
  assert.equal(validateNewPassword("simple phrase 12", "different phrase"), "MISMATCH");
  assert.equal(validateNewPassword("simple phrase 12", "simple phrase 12"), null);
  assert.equal(registerSchema.safeParse({ email: "  TEST@EXAMPLE.COM  ", password: "simple phrase 12", confirmation: "simple phrase 12" }).data?.email, "test@example.com");
  assert.equal(resetSchema.safeParse({ password: "simple phrase 12", confirmation: "wrong" }).success, false);
});

test("local account paths and protected Partner entry", () => {
  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"] as const) {
    for (const route of ["login", "register", "forgot-password", "reset-password"] as const) {
      assert.equal(accountPath(locale, route), `${locale === "pl" ? "" : `/${locale}`}/${route}`);
    }
  }
  assert.equal(buildLoginRedirectUrl(new URL("https://www.logimarket.eu/partner")).pathname, "/login");
  assert.equal(buildLoginRedirectUrl(new URL("https://www.logimarket.eu/partner")).searchParams.get("next"), "/partner");
  assert.equal(accountLinkWithNext("pl", "register", "/partner"), "/register?next=%2Fpartner");
});

test("signup and callback destinations reject external and encoded redirects", () => {
  for (const unsafe of ["https://evil.example", "//evil.example", "/%2f%2fevil.example", "/%5c%5cevil.example", "/%0d%0aLocation:evil", "/register?next=/partner"]) {
    assert.equal(safeAccountNext(unsafe, "pl"), "/");
  }
  assert.equal(safeAccountNext("/partner", "pl"), "/partner");
  const callback = trustedAccountCallbackUrl({ flow: "signup", locale: "pl", next: "/partner" });
  assert.equal(new URL(callback!).pathname, "/auth/callback");
  assert.equal(new URL(callback!).searchParams.get("next"), "/partner");
});

test("all seven locales have account copy and public register label", async () => {
  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"]) {
    const dict = JSON.parse(await fs.readFile(path.join(process.cwd(), "src/messages", `${locale}.json`), "utf8"));
    assert.ok(dict.nav.register);
    for (const key of ["registerTitle", "forgotTitle", "resetTitle", "checkEmailRegister", "checkEmailRecovery", "passwordUpdated", "invalidLink", "unavailable", "passwordPolicy", "mismatch", "registerLink", "forgotLink"]) {
      assert.ok(dict.auth.account[key], `${locale}.${key}`);
    }
  }
});

test("auth pages carry noindex and nofollow metadata", async () => {
  for (const group of ["(pl)", "(localized)/[locale]"]) {
    for (const route of ["login", "register", "forgot-password", "reset-password"]) {
      const source = await fs.readFile(path.join(process.cwd(), "src/app", group, route, "page.tsx"), "utf8");
      assert.match(source, /index: false, follow: false, nocache: true/);
    }
  }
});

test("account operations call only Supabase Auth, never application memberships", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "src/app/account-actions.ts"), "utf8");
  assert.match(source, /supabase\.auth\.signUp/);
  assert.match(source, /supabase\.auth\.resetPasswordForEmail/);
  assert.match(source, /supabase\.auth\.updateUser/);
  assert.doesNotMatch(source, /partner_user_memberships|buyer_organization_memberships|buyer_organizations|service_role/);
});
