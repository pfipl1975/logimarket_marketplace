import test from "node:test";
import assert from "node:assert/strict";
import { getPublicAuthNavigationState } from "../../src/lib/auth/public-auth-navigation";

test("public auth navigation state", async (t) => {
  await t.test("unauthenticated state", () => {
    const state = getPublicAuthNavigationState(false, false, "pl");
    assert.equal(state.showLogin, true);
    assert.equal(state.showPartnerPanel, false);
    assert.equal(state.showLogout, false);
  });

  await t.test("authenticated active Partner", () => {
    const state = getPublicAuthNavigationState(true, true, "pl");
    assert.equal(state.showLogin, false);
    assert.equal(state.showPartnerPanel, true);
    assert.equal(state.showLogout, true);
  });

  await t.test("authenticated non-Partner", () => {
    const state = getPublicAuthNavigationState(true, false, "pl");
    assert.equal(state.showLogin, false);
    assert.equal(state.showPartnerPanel, false);
    assert.equal(state.showLogout, true);
  });

  await t.test("PL paths", () => {
    const state = getPublicAuthNavigationState(false, false, "pl");
    assert.equal(state.loginUrl, "/login?next=/partner");
    assert.equal(state.partnerUrl, "/partner");
  });

  await t.test("localized paths", () => {
    const state = getPublicAuthNavigationState(false, false, "en");
    assert.equal(state.loginUrl, "/en/login?next=/en/partner");
    assert.equal(state.partnerUrl, "/en/partner");
  });
});
