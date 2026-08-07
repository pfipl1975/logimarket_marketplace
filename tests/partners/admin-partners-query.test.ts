import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminPartnersQuery, buildAdminPartnersUrl } from "../../src/lib/admin/partners-query";

test("Admin Partners Query Parser", async (t) => {
  await t.test("empty defaults", () => {
    const query = parseAdminPartnersQuery(undefined);
    assert.equal(query.q, "");
    assert.equal(query.page, 1);
  });

  await t.test("null defaults", () => {
    const query = parseAdminPartnersQuery(null);
    assert.equal(query.q, "");
    assert.equal(query.page, 1);
  });

  await t.test("empty object defaults", () => {
    const query = parseAdminPartnersQuery({});
    assert.equal(query.q, "");
    assert.equal(query.page, 1);
  });

  await t.test("q trim", () => {
    const query = parseAdminPartnersQuery({ q: "  test  " });
    assert.equal(query.q, "test");
  });

  await t.test("q max 100", () => {
    const query = parseAdminPartnersQuery({ q: "a".repeat(150) });
    assert.equal(query.q, "a".repeat(100));
  });

  await t.test("q array -> ignored (Next.js multi-param behavior)", () => {
    // Next.js produces an array for multiple params with same name.
    // Our getSingleString function will return null for arrays.
    const query = parseAdminPartnersQuery({ q: ["a", "b"] });
    assert.equal(query.q, "");
  });

  await t.test("page array -> 1 (Next.js multi-param behavior)", () => {
    const query = parseAdminPartnersQuery({ page: ["2", "3"] });
    assert.equal(query.page, 1);
  });

  await t.test("page 1 valid", () => {
    const query = parseAdminPartnersQuery({ page: "1" });
    assert.equal(query.page, 1);
  });

  await t.test("page 25 valid", () => {
    const query = parseAdminPartnersQuery({ page: "25" });
    assert.equal(query.page, 25);
  });

  await t.test("page 0 invalid", () => {
    const query = parseAdminPartnersQuery({ page: "0" });
    assert.equal(query.page, 1);
  });

  await t.test("page -1 invalid", () => {
    const query = parseAdminPartnersQuery({ page: "-1" });
    assert.equal(query.page, 1);
  });

  await t.test("page 1.0 invalid", () => {
    const query = parseAdminPartnersQuery({ page: "1.0" });
    assert.equal(query.page, 1);
  });

  await t.test("page 1e3 invalid", () => {
    const query = parseAdminPartnersQuery({ page: "1e3" });
    assert.equal(query.page, 1);
  });

  await t.test("page +1 invalid", () => {
    const query = parseAdminPartnersQuery({ page: "+1" });
    assert.equal(query.page, 1);
  });

  await t.test("page ' 1 ' invalid", () => {
    const query = parseAdminPartnersQuery({ page: " 1 " });
    assert.equal(query.page, 1);
  });

  await t.test("page 01 invalid", () => {
    const query = parseAdminPartnersQuery({ page: "01" });
    assert.equal(query.page, 1);
  });

  await t.test("unsafe integer invalid", () => {
    const query = parseAdminPartnersQuery({ page: "9007199254740992" });
    assert.equal(query.page, 1);
  });

  await t.test("empty string invalid page", () => {
    const query = parseAdminPartnersQuery({ page: "" });
    assert.equal(query.page, 1);
  });
});

test("Admin Partners URL Builder", async (t) => {
  await t.test("URL builder omits page=1", () => {
    const url = buildAdminPartnersUrl("/admin", {}, { q: "", page: 1 });
    assert.equal(url, "/admin");
  });

  await t.test("pagination preserves q", () => {
    const url = buildAdminPartnersUrl("/admin", { page: 2 }, { q: "test", page: 1 });
    assert.equal(url, "/admin?q=test&page=2");
  });

  await t.test("q change resets page", () => {
    const url = buildAdminPartnersUrl("/admin", { q: "new" }, { q: "old", page: 5 });
    assert.equal(url, "/admin?q=new");
  });

  await t.test("q update same value preserves page", () => {
    const url = buildAdminPartnersUrl("/admin", { q: "same" }, { q: "same", page: 5 });
    assert.equal(url, "/admin?q=same&page=5");
  });
});
