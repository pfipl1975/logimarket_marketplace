import test from "node:test";
import assert from "node:assert/strict";

test("Admin Orders Query Parser", async (t) => {
  const { parseAdminOrdersQuery, buildAdminOrdersUrl, ADMIN_ORDERS_PAGE_SIZE } = await import(
    "../../src/lib/admin/orders-query.js"
  );

  await t.test("defaults on undefined input", () => {
    const q = parseAdminOrdersQuery(undefined);
    assert.equal(q.q, "");
    assert.equal(q.page, 1);
  });

  await t.test("defaults on null input", () => {
    const q = parseAdminOrdersQuery(null);
    assert.equal(q.q, "");
    assert.equal(q.page, 1);
  });

  await t.test("defaults on non-object", () => {
    const q = parseAdminOrdersQuery("string");
    assert.equal(q.q, "");
    assert.equal(q.page, 1);
  });

  await t.test("defaults on empty object", () => {
    const q = parseAdminOrdersQuery({});
    assert.equal(q.q, "");
    assert.equal(q.page, 1);
  });

  await t.test("q: trims whitespace", () => {
    const q = parseAdminOrdersQuery({ q: "  acme  " });
    assert.equal(q.q, "acme");
  });

  await t.test("q: max 100 chars enforced", () => {
    const long = "a".repeat(200);
    const q = parseAdminOrdersQuery({ q: long });
    assert.equal(q.q.length, 100);
  });

  await t.test("q: array ignored, defaults to empty", () => {
    const q = parseAdminOrdersQuery({ q: ["acme", "other"] });
    assert.equal(q.q, "");
  });

  await t.test("q: number ignored, defaults to empty", () => {
    const q = parseAdminOrdersQuery({ q: 123 });
    assert.equal(q.q, "");
  });

  await t.test("page: valid page=1", () => {
    const q = parseAdminOrdersQuery({ page: "1" });
    assert.equal(q.page, 1);
  });

  await t.test("page: valid page=5", () => {
    const q = parseAdminOrdersQuery({ page: "5" });
    assert.equal(q.page, 5);
  });

  await t.test("page: 0 rejected → default 1", () => {
    const q = parseAdminOrdersQuery({ page: "0" });
    assert.equal(q.page, 1);
  });

  await t.test("page: negative rejected → default 1", () => {
    const q = parseAdminOrdersQuery({ page: "-1" });
    assert.equal(q.page, 1);
  });

  await t.test("page: decimal rejected → default 1", () => {
    const q = parseAdminOrdersQuery({ page: "1.0" });
    assert.equal(q.page, 1);
  });

  await t.test("page: scientific notation rejected → default 1", () => {
    const q = parseAdminOrdersQuery({ page: "1e3" });
    assert.equal(q.page, 1);
  });

  await t.test("page: +1 rejected → default 1", () => {
    const q = parseAdminOrdersQuery({ page: "+1" });
    assert.equal(q.page, 1);
  });

  await t.test("page: leading-zero rejected → default 1", () => {
    const q = parseAdminOrdersQuery({ page: "01" });
    assert.equal(q.page, 1);
  });

  await t.test("page: whitespace-only rejected → default 1", () => {
    const q = parseAdminOrdersQuery({ page: " 1 " });
    assert.equal(q.page, 1);
  });

  await t.test("page: whitespace-padded ' 2 ' rejected → default 1 (regression)", () => {
    const q = parseAdminOrdersQuery({ page: " 2 " });
    assert.equal(q.page, 1);
  });

  await t.test("page: unsafe integer rejected → default 1", () => {
    const q = parseAdminOrdersQuery({ page: "9007199254740992" });
    assert.equal(q.page, 1);
  });

  await t.test("page: array ignored → default 1", () => {
    const q = parseAdminOrdersQuery({ page: ["1", "2"] });
    assert.equal(q.page, 1);
  });

  await t.test("page: number type (not string) ignored → default 1", () => {
    const q = parseAdminOrdersQuery({ page: 5 });
    assert.equal(q.page, 1);
  });

  await t.test("buildAdminOrdersUrl: omits page=1", () => {
    const url = buildAdminOrdersUrl("/admin/zamowienia", {}, { q: "", page: 1 });
    assert.equal(url, "/admin/zamowienia");
  });

  await t.test("buildAdminOrdersUrl: omits empty q", () => {
    const url = buildAdminOrdersUrl("/admin/zamowienia", { page: 2 }, { q: "", page: 1 });
    assert.equal(url, "/admin/zamowienia?page=2");
  });

  await t.test("buildAdminOrdersUrl: includes q and page>1", () => {
    const url = buildAdminOrdersUrl("/admin/zamowienia", { page: 3 }, { q: "acme", page: 1 });
    assert.equal(url, "/admin/zamowienia?q=acme&page=3");
  });

  await t.test("buildAdminOrdersUrl: q present, page=1 omitted", () => {
    const url = buildAdminOrdersUrl("/admin/zamowienia", {}, { q: "acme", page: 1 });
    assert.equal(url, "/admin/zamowienia?q=acme");
  });

  await t.test("buildAdminOrdersUrl: pagination preserves q", () => {
    const url = buildAdminOrdersUrl("/admin/zamowienia", { page: 3 }, { q: "acme", page: 2 });
    assert.equal(url, "/admin/zamowienia?q=acme&page=3");
  });

  await t.test("buildAdminOrdersUrl: q change resets page to 1", () => {
    const url = buildAdminOrdersUrl("/admin/zamowienia", { q: "newquery" }, { q: "old", page: 5 });
    assert.equal(url, "/admin/zamowienia?q=newquery");
  });

  await t.test("buildAdminOrdersUrl: same q preserves current page", () => {
    const url = buildAdminOrdersUrl("/admin/zamowienia", { q: "same" }, { q: "same", page: 5 });
    assert.equal(url, "/admin/zamowienia?q=same&page=5");
  });

  await t.test("ADMIN_ORDERS_PAGE_SIZE is 25", () => {
    assert.equal(ADMIN_ORDERS_PAGE_SIZE, 25);
  });
});
