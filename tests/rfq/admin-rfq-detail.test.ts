import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminRfqDetailId } from "../../src/lib/admin/rfq-detail-read-model-core";

test("Admin RFQ Detail ID Parser", async (t) => {
  await t.test("valid id '1' -> 1", () => {
    assert.equal(parseAdminRfqDetailId("1"), 1);
  });

  await t.test("valid id '999' -> 999", () => {
    assert.equal(parseAdminRfqDetailId("999"), 999);
  });

  await t.test("valid large id -> safe integer", () => {
    assert.equal(parseAdminRfqDetailId("9007199254740991"), 9007199254740991);
  });

  await t.test("'0' -> null", () => {
    assert.equal(parseAdminRfqDetailId("0"), null);
  });

  await t.test("'-1' -> null", () => {
    assert.equal(parseAdminRfqDetailId("-1"), null);
  });

  await t.test("'1.5' -> null (float)", () => {
    assert.equal(parseAdminRfqDetailId("1.5"), null);
  });

  await t.test("'01' -> null (leading zero)", () => {
    assert.equal(parseAdminRfqDetailId("01"), null);
  });

  await t.test("'1e3' -> null (scientific)", () => {
    assert.equal(parseAdminRfqDetailId("1e3"), null);
  });

  await t.test("'+1' -> null (explicit plus)", () => {
    assert.equal(parseAdminRfqDetailId("+1"), null);
  });

  await t.test("' 1 ' -> null (spaces)", () => {
    assert.equal(parseAdminRfqDetailId(" 1 "), null);
  });

  await t.test("unsafe integer -> null", () => {
    assert.equal(parseAdminRfqDetailId("9007199254740992"), null);
  });

  await t.test("empty string -> null", () => {
    assert.equal(parseAdminRfqDetailId(""), null);
  });

  await t.test("non-string number -> null", () => {
    assert.equal(parseAdminRfqDetailId(42), null);
  });

  await t.test("non-string null -> null", () => {
    assert.equal(parseAdminRfqDetailId(null), null);
  });

  await t.test("undefined -> null", () => {
    assert.equal(parseAdminRfqDetailId(undefined), null);
  });

  await t.test("object -> null", () => {
    assert.equal(parseAdminRfqDetailId({}), null);
  });

  await t.test("array -> null", () => {
    assert.equal(parseAdminRfqDetailId(["1"]), null);
  });

  await t.test("'abc' -> null", () => {
    assert.equal(parseAdminRfqDetailId("abc"), null);
  });
});

test("Admin RFQ Detail Read Model — getAdminRfqDetail auth-first contract", async () => {
  const fs = await import("node:fs");
  const actionsPath = process.cwd() + "/src/app/actions.ts";
  const src = fs.readFileSync(actionsPath, "utf-8");

  const fnStart = src.indexOf("export async function getAdminRfqDetail");
  assert.ok(fnStart !== -1, "getAdminRfqDetail not found in actions.ts");

  const requireAdminIdx = src.indexOf("await requireAdmin()", fnStart);
  assert.ok(requireAdminIdx !== -1, "requireAdmin() missing in getAdminRfqDetail");

  const parseIdIdx = src.indexOf("parseAdminRfqDetailId", fnStart);
  assert.ok(parseIdIdx !== -1, "parseAdminRfqDetailId not called in getAdminRfqDetail");

  assert.ok(requireAdminIdx < parseIdIdx, "requireAdmin() must execute before ID parsing");
});

test("Admin RFQ Detail — PII not present in list read model", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("src/lib/admin/rfq-read-model-core.ts", "utf-8");

  // AdminRfqListItemDto must NOT include PII
  const dtoStart = src.indexOf("AdminRfqListItemDto");
  assert.ok(dtoStart !== -1, "AdminRfqListItemDto not found");

  const dtoBlock = src.substring(dtoStart, src.indexOf("}", dtoStart) + 100);
  assert.ok(!dtoBlock.includes("contactName"), "contactName must NOT be in AdminRfqListItemDto");
  assert.ok(!dtoBlock.includes("email"), "email must NOT be in AdminRfqListItemDto");
  assert.ok(!dtoBlock.includes("phone"), "phone must NOT be in AdminRfqListItemDto");
  assert.ok(!dtoBlock.includes("message"), "message must NOT be in AdminRfqListItemDto");

  // List read model must NOT select or carry PII fields at all
  assert.ok(!src.includes("schema.rfqLeads.contactName"), "list read model must not select contactName");
  assert.ok(!src.includes("schema.rfqLeads.email"), "list read model must not select email");
  assert.ok(!src.includes("schema.rfqLeads.phone"), "list read model must not select phone");
  assert.ok(!src.includes("schema.rfqLeads.message"), "list read model must not select message");

  // Detail DTO lives in the detail read model core and MUST include all PII
  const detailSrc = fs.readFileSync("src/lib/admin/rfq-detail-read-model-core.ts", "utf-8");
  const detailDtoStart = detailSrc.indexOf("AdminRfqDetailDto");
  assert.ok(detailDtoStart !== -1, "AdminRfqDetailDto not found in detail read model core");

  const detailBlock = detailSrc.substring(detailDtoStart, detailSrc.indexOf("}", detailDtoStart) + 400);
  assert.ok(detailBlock.includes("contactName"), "contactName must be in AdminRfqDetailDto");
  assert.ok(detailBlock.includes("email"), "email must be in AdminRfqDetailDto");
  assert.ok(detailBlock.includes("phone"), "phone must be in AdminRfqDetailDto");
  assert.ok(detailBlock.includes("message"), "message must be in AdminRfqDetailDto");
});

test("Admin RFQ Detail — AdminRfqTable has no inline PII", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("src/components/admin/AdminRfqTable.tsx", "utf-8");

  assert.ok(!src.includes("contactName"), "Table must not render contactName");
  assert.ok(!src.includes("email"), "Table must not render email");
  assert.ok(!src.includes("phone"), "Table must not render phone");
  assert.ok(!src.includes("message"), "Table must not render message");
  assert.ok(!src.includes("AdminRfqStatusControl"), "Table must not use AdminRfqStatusControl (mutation control)");

  // Table must have detail link to the detail page
  assert.ok(src.includes("zapytania") || src.includes("detailPathPrefix"), "Table must reference detail route path");
});

test("Admin RFQ Detail — status control has explicit Apply flow (not immediate onChange)", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("src/components/admin/AdminRfqStatusControl.tsx", "utf-8");

  // Must have Apply button
  assert.ok(src.includes("workflowApply"), "Must render workflowApply key (Apply button)");

  // Must NOT mutate immediately on onChange
  const onChangeIdx = src.indexOf("onChange");
  if (onChangeIdx !== -1) {
    const onChangeBlock = src.substring(onChangeIdx, onChangeIdx + 200);
    assert.ok(!onChangeBlock.includes("mutateRfqStatus"), "Must not call mutateRfqStatus directly in onChange");
  }

  // Must have close confirmation block
  assert.ok(src.includes("closeConfirmMessage"), "Must render closeConfirmMessage");
  assert.ok(src.includes("closeConfirmApply"), "Must render closeConfirmApply button");
  assert.ok(src.includes("closeConfirmCancel"), "Must render closeConfirmCancel button");

  // Must NOT use window.confirm
  assert.ok(!src.includes("window.confirm"), "Must not use window.confirm");
});
