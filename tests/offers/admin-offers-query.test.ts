import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminOffersQuery, buildAdminOffersUrl } from "../../src/lib/admin/offers-query";

test("Admin Offers Query Parser and Builder", async (t) => {
  await t.test("defaults to safe values when empty", () => {
    const q = parseAdminOffersQuery({});
    assert.deepEqual(q, {
      q: "",
      status: null,
      model: null,
      partner: null,
      category: null,
      page: 1,
    });
  });

  await t.test("q trimming and max length", () => {
    const q1 = parseAdminOffersQuery({ q: "   hello   " });
    assert.equal(q1.q, "hello");

    const longString = "a".repeat(150);
    const q2 = parseAdminOffersQuery({ q: longString });
    assert.equal(q2.q.length, 100);
    assert.equal(q2.q, "a".repeat(100));
  });

  await t.test("ignores arrays and takes first or null safely", () => {
    // Current implementation uses getSingleString which takes first element
    const q = parseAdminOffersQuery({ status: ["draft", "published"] });
    assert.equal(q.status, "draft");
  });

  await t.test("parses correct models", () => {
    const q1 = parseAdminOffersQuery({ model: "rfq" });
    assert.equal(q1.model, "rfq");
    const q2 = parseAdminOffersQuery({ model: "ecommerce" });
    assert.equal(q2.model, "ecommerce");
    const q3 = parseAdminOffersQuery({ model: "outbound" });
    assert.equal(q3.model, "outbound");
    const q4 = parseAdminOffersQuery({ model: "unknown" });
    assert.equal(q4.model, "unknown");
  });

  await t.test("rejects incorrect models", () => {
    const q = parseAdminOffersQuery({ model: "invalid_model" });
    assert.equal(q.model, null);
  });

  await t.test("parses correct statuses", () => {
    const q = parseAdminOffersQuery({ status: "published" });
    assert.equal(q.status, "published");
  });

  await t.test("rejects incorrect statuses", () => {
    const q = parseAdminOffersQuery({ status: "deleted" }); // Not allowed in this sprint
    assert.equal(q.status, null);
  });

  await t.test("partner and category must be positive safe integers", () => {
    const q1 = parseAdminOffersQuery({ partner: "123", category: "456" });
    assert.equal(q1.partner, 123);
    assert.equal(q1.category, 456);

    const q2 = parseAdminOffersQuery({ partner: "-1", category: "abc" });
    assert.equal(q2.partner, null);
    assert.equal(q2.category, null);
  });

  await t.test("page must be positive safe integer or fallback to 1", () => {
    const q1 = parseAdminOffersQuery({ page: "3" });
    assert.equal(q1.page, 3);

    const q2 = parseAdminOffersQuery({ page: "-5" });
    assert.equal(q2.page, 1);

    const q3 = parseAdminOffersQuery({ page: "0" });
    assert.equal(q3.page, 1);
  });

  await t.test("url builder omits page=1 and empty values", () => {
    const current = parseAdminOffersQuery({});
    const url = buildAdminOffersUrl("/base", { page: 1, q: "" }, current);
    assert.equal(url, "/base");

    const url2 = buildAdminOffersUrl("/base", { page: 2 }, current);
    assert.equal(url2, "/base?page=2");
  });

  await t.test("pagination preserving filters and filter change resets page", () => {
    const current = parseAdminOffersQuery({ status: "draft", page: "3" });
    
    // Zmiana tylko strony -> zachowuje filtry
    const url1 = buildAdminOffersUrl("/base", { page: 4 }, current);
    assert.equal(url1, "/base?status=draft&page=4");

    // Zmiana filtra (status) -> reset do page 1
    const url2 = buildAdminOffersUrl("/base", { status: "published" }, current);
    assert.equal(url2, "/base?status=published"); // page 1 is omitted
  });
});
