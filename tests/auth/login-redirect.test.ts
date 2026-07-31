import test from "node:test";
import assert from "node:assert/strict";
import { buildLoginRedirectUrl } from "../../src/lib/auth/login-redirect";

test("buildLoginRedirectUrl", async (t) => {
  await t.test("REQUEST=/admin/users", () => {
    const url = new URL("https://logimarket.eu/admin/users");
    const result = buildLoginRedirectUrl(url);
    assert.equal(result.pathname, "/login");
    assert.equal(result.searchParams.get("next"), "/admin/users");
  });

  await t.test("REQUEST=/de/partner/offers", () => {
    const url = new URL("https://logimarket.eu/de/partner/offers");
    const result = buildLoginRedirectUrl(url);
    assert.equal(result.pathname, "/de/login");
    assert.equal(result.searchParams.get("next"), "/de/partner/offers");
  });

  await t.test("REQUEST=/zh/admin", () => {
    const url = new URL("https://logimarket.eu/zh/admin");
    const result = buildLoginRedirectUrl(url);
    assert.equal(result.pathname, "/zh/login");
    assert.equal(result.searchParams.get("next"), "/zh/admin");
  });
});
