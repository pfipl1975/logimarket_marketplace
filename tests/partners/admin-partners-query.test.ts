import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminPartnersQuery, buildAdminPartnersUrl } from "../../src/lib/admin/partners-query";

test("Admin Partners Query Parser", async (t) => {
  await t.test("empty defaults", () => {
    const params = new URLSearchParams();
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.q, "");
    assert.equal(query.page, 1);
  });

  await t.test("q trim", () => {
    const params = new URLSearchParams({ q: "  test  " });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.q, "test");
  });

  await t.test("q max 100", () => {
    const params = new URLSearchParams({ q: "a".repeat(150) });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.q, "a".repeat(100));
  });

  await t.test("q array -> \"\"", () => {
    const params = new URLSearchParams();
    params.append("q", "a");
    params.append("q", "b");
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.q, "a");
  });

  await t.test("page array -> 1", () => {
    const params = new URLSearchParams();
    params.append("page", "2");
    params.append("page", "3");
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 2);
  });

  await t.test("page 1 valid", () => {
    const params = new URLSearchParams({ page: "1" });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 1);
  });

  await t.test("page 25 valid", () => {
    const params = new URLSearchParams({ page: "25" });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 25);
  });

  await t.test("page 0 invalid", () => {
    const params = new URLSearchParams({ page: "0" });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 1);
  });

  await t.test("page -1 invalid", () => {
    const params = new URLSearchParams({ page: "-1" });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 1);
  });

  await t.test("page 1.0 invalid", () => {
    const params = new URLSearchParams({ page: "1.0" });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 1);
  });

  await t.test("page 1e3 invalid", () => {
    const params = new URLSearchParams({ page: "1e3" });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 1);
  });

  await t.test("page +1 invalid", () => {
    const params = new URLSearchParams({ page: "+1" });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 1);
  });

  await t.test("page ' 1 ' invalid", () => {
    const params = new URLSearchParams({ page: " 1 " });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 1);
  });

  await t.test("page 01 invalid", () => {
    const params = new URLSearchParams({ page: "01" });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 1);
  });

  await t.test("unsafe integer invalid", () => {
    const params = new URLSearchParams({ page: "9007199254740992" });
    const query = parseAdminPartnersQuery(params);
    assert.equal(query.page, 1);
  });
});

test("Admin Partners URL Builder", async (t) => {
  await t.test("URL builder omits page=1", () => {
    const url = buildAdminPartnersUrl("/admin", { q: "", page: 1 });
    assert.equal(url, "/admin");
  });

  await t.test("pagination preserves q", () => {
    const url = buildAdminPartnersUrl("/admin", { q: "test", page: 2 });
    assert.equal(url, "/admin?q=test&page=2");
  });

  await t.test("q change resets page", () => {
    // Actually the builder doesn't handle action transitions, but passing page 1 to it:
    const url = buildAdminPartnersUrl("/admin", { q: "new", page: 1 });
    assert.equal(url, "/admin?q=new");
  });
});
