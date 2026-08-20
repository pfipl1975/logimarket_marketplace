import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminRfqQuery, buildAdminRfqUrl } from "../../src/lib/admin/rfq-query";

test("Admin RFQ Query Parser", async (t) => {
  await t.test("empty defaults", () => {
    const query = parseAdminRfqQuery(undefined);
    assert.equal(query.q, "");
    assert.equal(query.status, null);
    assert.equal(query.page, 1);
  });

  await t.test("null defaults", () => {
    const query = parseAdminRfqQuery(null);
    assert.equal(query.q, "");
    assert.equal(query.status, null);
    assert.equal(query.page, 1);
  });

  await t.test("empty object defaults", () => {
    const query = parseAdminRfqQuery({});
    assert.equal(query.q, "");
    assert.equal(query.status, null);
    assert.equal(query.page, 1);
  });

  await t.test("invalid string root input", () => {
    const query = parseAdminRfqQuery("invalid");
    assert.equal(query.q, "");
    assert.equal(query.status, null);
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

  // Status filter tests
  await t.test("no status -> null", () => {
    const query = parseAdminRfqQuery({ q: "abc" });
    assert.equal(query.status, null);
  });

  await t.test("status=new -> new", () => {
    const query = parseAdminRfqQuery({ status: "new" });
    assert.equal(query.status, "new");
  });

  await t.test("status=in_progress -> in_progress", () => {
    const query = parseAdminRfqQuery({ status: "in_progress" });
    assert.equal(query.status, "in_progress");
  });

  await t.test("status=responded -> responded", () => {
    const query = parseAdminRfqQuery({ status: "responded" });
    assert.equal(query.status, "responded");
  });

  await t.test("status=closed -> closed", () => {
    const query = parseAdminRfqQuery({ status: "closed" });
    assert.equal(query.status, "closed");
  });

  await t.test("invalid status -> null", () => {
    const query = parseAdminRfqQuery({ status: "pending" });
    assert.equal(query.status, null);
  });

  await t.test("status array -> null (Next.js multi-param behavior)", () => {
    const query = parseAdminRfqQuery({ status: ["new", "closed"] });
    assert.equal(query.status, null);
  });

  // PII fields must not be parsed into query
  await t.test("contactName ignored", () => {
    const query = parseAdminRfqQuery({ contactName: "john" });
    assert.equal((query as Record<string, unknown>).contactName, undefined);
  });

  await t.test("email ignored", () => {
    const query = parseAdminRfqQuery({ email: "test@test.com" });
    assert.equal((query as Record<string, unknown>).email, undefined);
  });

  await t.test("phone ignored", () => {
    const query = parseAdminRfqQuery({ phone: "+48123" });
    assert.equal((query as Record<string, unknown>).phone, undefined);
  });

  await t.test("message ignored", () => {
    const query = parseAdminRfqQuery({ message: "hello" });
    assert.equal((query as Record<string, unknown>).message, undefined);
  });
});

test("Admin RFQ URL Builder", async (t) => {
  await t.test("URL builder omits page=1", () => {
    const url = buildAdminRfqUrl("/admin", {}, { q: "", status: null, page: 1 });
    assert.equal(url, "/admin");
  });

  await t.test("pagination preserves q", () => {
    const url = buildAdminRfqUrl("/admin", { page: 2 }, { q: "test", status: null, page: 1 });
    assert.equal(url, "/admin?q=test&page=2");
  });

  await t.test("pagination preserves status", () => {
    const url = buildAdminRfqUrl("/admin", { page: 2 }, { q: "", status: "new", page: 1 });
    assert.equal(url, "/admin?status=new&page=2");
  });

  await t.test("pagination preserves q and status", () => {
    const url = buildAdminRfqUrl("/admin", { page: 2 }, { q: "test", status: "new", page: 1 });
    assert.equal(url, "/admin?q=test&status=new&page=2");
  });

  await t.test("q change resets page", () => {
    const url = buildAdminRfqUrl("/admin", { q: "new" }, { q: "old", status: null, page: 5 });
    assert.equal(url, "/admin?q=new");
  });

  await t.test("status change resets page", () => {
    const url = buildAdminRfqUrl("/admin", { status: "closed" }, { q: "", status: "new", page: 5 });
    assert.equal(url, "/admin?status=closed");
  });

  await t.test("q update same value preserves page", () => {
    const url = buildAdminRfqUrl("/admin", { q: "same" }, { q: "same", status: null, page: 5 });
    assert.equal(url, "/admin?q=same&page=5");
  });

  await t.test("status update same value preserves page", () => {
    const url = buildAdminRfqUrl("/admin", { status: "new" }, { q: "", status: "new", page: 5 });
    assert.equal(url, "/admin?status=new&page=5");
  });

  await t.test("null status omitted from URL", () => {
    const url = buildAdminRfqUrl("/admin", { status: null }, { q: "test", status: "new", page: 1 });
    assert.equal(url, "/admin?q=test");
  });
});
