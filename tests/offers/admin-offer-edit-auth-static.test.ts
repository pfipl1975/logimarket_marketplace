import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

test("AUTH_CONTRACT_TEST: updateAdminOffer enforces requireAdmin()", () => {
  const actionsPath = path.join(__dirname, "../../src/app/actions.ts");
  const actionsCode = fs.readFileSync(actionsPath, "utf-8");

  // Basic RegExp to ensure updateAdminOffer starts with requireAdmin()
  // This is a static source analysis test because Next.js headers/cache make it
  // difficult to unit-test server actions purely in node:test
  
  const funcStart = actionsCode.indexOf("export async function updateAdminOffer");
  assert.ok(funcStart > -1, "updateAdminOffer must be exported");

  // Get function body roughly
  const funcBody = actionsCode.substring(funcStart);
  
  const requireAdminIndex = funcBody.indexOf("requireAdmin()");
  const dbImportIndex = funcBody.indexOf("@/lib/db");
  const executeIndex = funcBody.indexOf("executeAdminOfferEdit(db");
  
  assert.ok(requireAdminIndex > -1, "requireAdmin() must be called inside updateAdminOffer");
  assert.ok(dbImportIndex > requireAdminIndex, "requireAdmin() must be called before db import");
  assert.ok(executeIndex > requireAdminIndex, "requireAdmin() must be called before executeAdminOfferEdit(db...)");
});
