import test from "node:test";
import assert from "node:assert/strict";
import { getSafeRedirectUrl } from "../../src/lib/auth/safe-redirect";

test("safe redirect module", async (t) => {
  await t.test("returns valid relative path", () => {
    assert.equal(getSafeRedirectUrl("/admin/dashboard"), "/admin/dashboard");
    assert.equal(getSafeRedirectUrl("/de/admin"), "/de/admin");
  });

  await t.test("falls back to default locale root on empty", () => {
    assert.equal(getSafeRedirectUrl(null), "/");
    assert.equal(getSafeRedirectUrl(""), "/");
    assert.equal(getSafeRedirectUrl(undefined), "/");
  });

  await t.test("falls back to specified locale root on empty", () => {
    assert.equal(getSafeRedirectUrl(null, "de"), "/de");
  });

  await t.test("rejects absolute URLs with http", () => {
    assert.equal(getSafeRedirectUrl("http://attacker.example"), "/");
  });

  await t.test("rejects absolute URLs with https", () => {
    assert.equal(getSafeRedirectUrl("https://attacker.example"), "/");
  });

  await t.test("rejects protocol-relative URLs", () => {
    assert.equal(getSafeRedirectUrl("//attacker.example"), "/");
    assert.equal(getSafeRedirectUrl("/%2f%2fattacker.example"), "/");
    assert.equal(getSafeRedirectUrl("///attacker.example"), "/");
  });

  await t.test("rejects backslash URLs", () => {
    assert.equal(getSafeRedirectUrl("\\attacker.example"), "/");
    assert.equal(getSafeRedirectUrl("\\\\attacker.example"), "/");
    assert.equal(getSafeRedirectUrl("/%5c%5cattacker.example"), "/");
  });

  await t.test("rejects javascript and data schemes", () => {
    assert.equal(getSafeRedirectUrl("javascript:alert(1)"), "/");
    assert.equal(getSafeRedirectUrl("data:text/html,test"), "/");
    assert.equal(getSafeRedirectUrl("file:///etc/passwd"), "/");
  });

  await t.test("rejects header injection", () => {
    assert.equal(getSafeRedirectUrl("/%0d%0aLocation%3a%20https%3a%2f%2fattacker.example"), "/");
  });

  await t.test("rejects urls without leading slash", () => {
    assert.equal(getSafeRedirectUrl("admin/dashboard"), "/");
  });

  await t.test("invalid locales fallback safely", () => {
    assert.equal(getSafeRedirectUrl(null, "//attacker.example"), "/");
    assert.equal(getSafeRedirectUrl(null, "///attacker.example"), "/");
    assert.equal(getSafeRedirectUrl(null, "https://attacker.example"), "/");
    assert.equal(getSafeRedirectUrl(null, "javascript:alert(1)"), "/");
    assert.equal(getSafeRedirectUrl(null, "unknown"), "/");
    assert.equal(getSafeRedirectUrl("", "//attacker.example"), "/");
  });
});
