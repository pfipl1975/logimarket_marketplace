import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPublicAuthNavigationState } from "../../src/lib/auth/public-auth-navigation";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("public auth navigation state", async (t) => {
  await t.test("unauthenticated state: login visible, Partner Panel hidden, logout hidden", () => {
    const state = getPublicAuthNavigationState(false, false, "pl");
    assert.equal(state.showLogin, true);
    assert.equal(state.showPartnerPanel, false);
    assert.equal(state.showLogout, false);
  });

  await t.test("authenticated active Partner: Partner Panel visible, logout visible", () => {
    const state = getPublicAuthNavigationState(true, true, "pl");
    assert.equal(state.showLogin, false);
    assert.equal(state.showPartnerPanel, true);
    assert.equal(state.showLogout, true);
  });

  await t.test("authenticated non-Partner: Partner Panel hidden, logout visible", () => {
    const state = getPublicAuthNavigationState(true, false, "pl");
    assert.equal(state.showLogin, false);
    assert.equal(state.showPartnerPanel, false);
    assert.equal(state.showLogout, true);
  });

  await t.test("Partner CTA always enters through /partner, never browser partnerId", () => {
    const statePl = getPublicAuthNavigationState(true, true, "pl");
    assert.equal(statePl.partnerUrl, "/partner");
    assert.doesNotMatch(statePl.partnerUrl, /\/partner\/\d+/);

    const stateEn = getPublicAuthNavigationState(true, true, "en");
    assert.equal(stateEn.partnerUrl, "/en/partner");
    assert.doesNotMatch(stateEn.partnerUrl, /\/partner\/\d+/);
  });

  await t.test("PL paths: login next /partner, Partner /partner", () => {
    const state = getPublicAuthNavigationState(false, false, "pl");
    assert.equal(state.loginUrl, "/login?next=/partner");
    assert.equal(state.partnerUrl, "/partner");
  });

  await t.test("localized paths: login next /en/partner, Partner /en/partner", () => {
    const state = getPublicAuthNavigationState(false, false, "en");
    assert.equal(state.loginUrl, "/en/login?next=/en/partner");
    assert.equal(state.partnerUrl, "/en/partner");
  });
});

test("logout forms and action contract", async (t) => {
  await t.test("PublicLogoutForm submits intent=public and forbids arbitrary redirect", async () => {
    const filePath = path.join(__dirname, "../../src/components/auth/PublicLogoutForm.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    assert.match(content, /name="intent"/);
    assert.match(content, /value="public"/);
    assert.match(content, /name="locale"/);

    // Forbidden patterns
    assert.doesNotMatch(content, /name="redirectTo"/);
    assert.doesNotMatch(content, /name="path"/);
    assert.doesNotMatch(content, /name="url"/);
  });

  await t.test("AdminLogoutForm submits intent=admin and forbids arbitrary redirect", async () => {
    const filePath = path.join(__dirname, "../../src/components/auth/AdminLogoutForm.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    assert.match(content, /name="intent"/);
    assert.match(content, /value="admin"/);
    assert.match(content, /name="locale"/);

    // Forbidden patterns
    assert.doesNotMatch(content, /name="redirectTo"/);
    assert.doesNotMatch(content, /name="path"/);
    assert.doesNotMatch(content, /name="url"/);
  });

  await t.test("logoutUser contract: intent-based destination and no arbitrary redirect", async () => {
    const filePath = path.join(__dirname, "../../src/app/actions.ts");
    const content = await fs.readFile(filePath, "utf-8");

    const match = content.match(/export async function logoutUser[\s\S]*?^}/m);
    assert.ok(match, "logoutUser function should be present");
    const logoutUserContent = match[0];

    // Checks intent
    assert.match(logoutUserContent, /formData\?\.get\("intent"\)/);

    // Admin intent routes to canonical admin login
    assert.match(logoutUserContent, /intent === "admin"/);
    assert.match(logoutUserContent, /getAdminLoginRedirectPath/);
    assert.match(logoutUserContent, /redirect\(getAdminLoginRedirectPath\(safeLocale\)\)/);

    // Public / default routes to canonical home
    assert.match(logoutUserContent, /getHomePath/);
    assert.match(logoutUserContent, /redirect\(getHomePath\(safeLocale\)\)/);

    // Forbids arbitrary redirect input
    assert.doesNotMatch(logoutUserContent, /formData\?\.get\("redirectTo"\)/);
    assert.doesNotMatch(logoutUserContent, /formData\?\.get\("path"\)/);
    assert.doesNotMatch(logoutUserContent, /formData\?\.get\("url"\)/);
    assert.doesNotMatch(logoutUserContent, /formData\?\.get\("next"\)/);
  });
});

test("all seven locale dictionaries contain navigation auth keys", async (t) => {
  const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"];
  for (const loc of locales) {
    await t.test(`locale ${loc} has non-empty nav.login, nav.partnerPanel, nav.logout`, async () => {
      const filePath = path.join(__dirname, `../../src/messages/${loc}.json`);
      const raw = await fs.readFile(filePath, "utf-8");
      const dict = JSON.parse(raw);

      assert.ok(dict.nav, `nav should exist in ${loc}.json`);
      assert.ok(typeof dict.nav.login === "string" && dict.nav.login.trim().length > 0, `nav.login missing or empty in ${loc}`);
      assert.ok(typeof dict.nav.partnerPanel === "string" && dict.nav.partnerPanel.trim().length > 0, `nav.partnerPanel missing or empty in ${loc}`);
      assert.ok(typeof dict.nav.logout === "string" && dict.nav.logout.trim().length > 0, `nav.logout missing or empty in ${loc}`);
    });
  }
});
