import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminRfqQuery, buildAdminRfqUrl } from "../../src/lib/admin/rfq-query";

test("Admin RFQ Query Parser", async (t) => {
  await t.test("empty defaults", () => {
    const query = parseAdminRfqQuery(undefined);
    assert.equal(query.q, "");
    assert.equal(query.page, 1);
  });

  await t.test("null defaults", () => {
    const query = parseAdminRfqQuery(null);
    assert.equal(query.q, "");
    assert.equal(query.page, 1);
  });

  await t.test("empty object defaults", () => {
    const query = parseAdminRfqQuery({});
    assert.equal(query.q, "");
    assert.equal(query.page, 1);
  });

  await t.test("invalid string root input", () => {
    const query = parseAdminRfqQuery("invalid");
    assert.equal(query.q, "");
    assert.equal(query.page, 1);
  });

  await t.test("q trim", () => {
    const query = parseAdminRfqQuery({ q: "  test  " });
    assert.equal(query.q, "test");
  });

  await t.test("q max 100", () => {
    const query = parseAdminRfqQuery({ q: "a".repeat(150) });
    assert.equal(query.q, "a".repeat(100));
  });

  await t.test("q array -> ignored (Next.js multi-param behavior)", () => {
    const query = parseAdminRfqQuery({ q: ["a", "b"] });
    assert.equal(query.q, "");
  });

  await t.test("page array -> 1 (Next.js multi-param behavior)", () => {
    const query = parseAdminRfqQuery({ page: ["2", "3"] });
    assert.equal(query.page, 1);
  });

  await t.test("page 1 valid", () => {
    const query = parseAdminRfqQuery({ page: "1" });
    assert.equal(query.page, 1);
  });

  await t.test("page 25 valid", () => {
    const query = parseAdminRfqQuery({ page: "25" });
    assert.equal(query.page, 25);
  });

  await t.test("page 0 invalid", () => {
    const query = parseAdminRfqQuery({ page: "0" });
    assert.equal(query.page, 1);
  });

  await t.test("page -1 invalid", () => {
    const query = parseAdminRfqQuery({ page: "-1" });
    assert.equal(query.page, 1);
  });

  await t.test("page 1.0 invalid", () => {
    const query = parseAdminRfqQuery({ page: "1.0" });
    assert.equal(query.page, 1);
  });

  await t.test("page 1e3 invalid", () => {
    const query = parseAdminRfqQuery({ page: "1e3" });
    assert.equal(query.page, 1);
  });

  await t.test("page +1 invalid", () => {
    const query = parseAdminRfqQuery({ page: "+1" });
    assert.equal(query.page, 1);
  });

  await t.test("page ' 1 ' invalid", () => {
    const query = parseAdminRfqQuery({ page: " 1 " });
    assert.equal(query.page, 1);
  });

  await t.test("page 01 invalid", () => {
    const query = parseAdminRfqQuery({ page: "01" });
    assert.equal(query.page, 1);
  });

  await t.test("unsafe integer invalid", () => {
    const query = parseAdminRfqQuery({ page: "9007199254740992" });
    assert.equal(query.page, 1);
  });

  await t.test("empty string invalid page", () => {
    const query = parseAdminRfqQuery({ page: "" });
    assert.equal(query.page, 1);
  });
});

test("Admin RFQ URL Builder", async (t) => {
  await t.test("URL builder omits page=1", () => {
    const url = buildAdminRfqUrl("/admin", {}, { q: "", page: 1 });
    assert.equal(url, "/admin");
  });

  await t.test("pagination preserves q", () => {
    const url = buildAdminRfqUrl("/admin", { page: 2 }, { q: "test", page: 1 });
    assert.equal(url, "/admin?q=test&page=2");
  });

  await t.test("q change resets page", () => {
    const url = buildAdminRfqUrl("/admin", { q: "new" }, { q: "old", page: 5 });
    assert.equal(url, "/admin?q=new");
  });

  await t.test("q update same value preserves page", () => {
    const url = buildAdminRfqUrl("/admin", { q: "same" }, { q: "same", page: 5 });
    assert.equal(url, "/admin?q=same&page=5");
  });
});
