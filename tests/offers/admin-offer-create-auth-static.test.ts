import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

test("AUTH_CONTRACT_TEST: createAdminOfferDraft enforces requireAdmin()", () => {
  const actionsPath = path.join(__dirname, "../../src/app/actions.ts");
  const actionsCode = fs.readFileSync(actionsPath, "utf-8");
  
  const funcStart = actionsCode.indexOf("export async function createAdminOfferDraft");
  assert.ok(funcStart > -1, "createAdminOfferDraft must be exported");

  const funcBody = actionsCode.substring(funcStart, actionsCode.indexOf("export async function", funcStart + 20) !== -1 ? actionsCode.indexOf("export async function", funcStart + 20) : undefined);
  
  const requireAdminIndex = funcBody.indexOf("requireAdmin()");
  const dbImportIndex = funcBody.indexOf("@/lib/db");
  const executeIndex = funcBody.indexOf("createOfferDraftCore(");
  
  assert.ok(requireAdminIndex > -1, "requireAdmin() must be called inside createAdminOfferDraft");
  assert.ok(dbImportIndex > requireAdminIndex, "requireAdmin() must be called before db import");
  assert.ok(executeIndex > requireAdminIndex, "requireAdmin() must be called before core execution");
});

test("AUTH_CONTRACT_TEST: getAdminCreateOptions enforces requireAdmin()", () => {
  const actionsPath = path.join(__dirname, "../../src/app/actions.ts");
  const actionsCode = fs.readFileSync(actionsPath, "utf-8");
  
  const funcStart = actionsCode.indexOf("export async function getAdminCreateOptions");
  assert.ok(funcStart > -1, "getAdminCreateOptions must be exported");

  const funcBody = actionsCode.substring(funcStart);
  
  const requireAdminIndex = funcBody.indexOf("requireAdmin()");
  const dbImportIndex = funcBody.indexOf("@/lib/db");
  
  assert.ok(requireAdminIndex > -1, "requireAdmin() must be called inside getAdminCreateOptions");
  assert.ok(dbImportIndex > requireAdminIndex, "requireAdmin() must be called before db import");
});
