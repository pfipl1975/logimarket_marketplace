import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminOffersQuery, buildAdminOffersUrl } from "../../src/lib/admin/offers-query";
import { normalizeAdminOfferPublicationStatus } from "@/lib/admin/offers-read-model-core";

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

  await t.test("rejects arrays for all fields", () => {
    const q = parseAdminOffersQuery({
      q: ["hello", "world"],
      status: ["draft", "published"],
      model: ["rfq", "unknown"],
      partner: ["123", "456"],
      category: ["1", "2"],
      page: ["2", "3"]
    });
    assert.deepEqual(q, {
      q: "",
      status: null,
      model: null,
      partner: null,
      category: null,
      page: 1,
    });
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

  await t.test("empty object defaults", () => {
    const q = parseAdminOffersQuery({});
    assert.equal(q.page, 1);
    assert.equal(q.status, null);
  });

  await t.test("normalizeAdminOfferPublicationStatus", () => {
    assert.equal(normalizeAdminOfferPublicationStatus("draft"), "draft");
    assert.equal(normalizeAdminOfferPublicationStatus("published"), "published");
    assert.equal(normalizeAdminOfferPublicationStatus("hidden"), "hidden");
    assert.equal(normalizeAdminOfferPublicationStatus("archived"), "archived");
    assert.equal(normalizeAdminOfferPublicationStatus("deleted"), "deleted");
    assert.equal(normalizeAdminOfferPublicationStatus("unknown_status"), "unknown");
    assert.equal(normalizeAdminOfferPublicationStatus(""), "unknown");
  });

  await t.test("rejects incorrect statuses", () => {
    const q1 = parseAdminOffersQuery({ status: "deleted" });
    assert.equal(q1.status, "deleted");
    
    const q2 = parseAdminOffersQuery({ status: "hidden" });
    assert.equal(q2.status, "hidden");

    const q3 = parseAdminOffersQuery({ status: "unknown_status" });
    assert.equal(q3.status, null);
  });

  await t.test("partner and category must be positive safe integers", () => {
    const q1 = parseAdminOffersQuery({ partner: "123", category: "456" });
    assert.equal(q1.partner, 123);
    assert.equal(q1.category, 456);

    const q2 = parseAdminOffersQuery({ partner: "-1", category: "abc" });
    assert.equal(q2.partner, null);
    assert.equal(q2.category, null);
  });

  await t.test("rejects invalid formats for numbers", () => {
    const q = parseAdminOffersQuery({
      partner: "1.0",
      category: "1e3",
      page: "+1"
    });
    assert.equal(q.partner, null);
    assert.equal(q.category, null);
    assert.equal(q.page, 1);

    const q2 = parseAdminOffersQuery({
      partner: "01",
      category: " 1 ",
      page: "9007199254740992" // > Number.MAX_SAFE_INTEGER
    });
    assert.equal(q2.partner, null);
    assert.equal(q2.category, null);
    assert.equal(q2.page, 1);
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
