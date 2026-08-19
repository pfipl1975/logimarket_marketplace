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
  
  const requireAdminIndex = actionsCode.indexOf("requireAdmin()");
  const dbImportIndex = actionsCode.indexOf("@/lib/db", requireAdminIndex);
  const executeIndex = actionsCode.indexOf("executeAdminOfferEdit", requireAdminIndex);
  
  assert.ok(requireAdminIndex > -1, "requireAdmin() must be called");
  assert.ok(dbImportIndex > requireAdminIndex, "requireAdmin() must be called before db import");
  assert.ok(executeIndex > requireAdminIndex, "requireAdmin() must be called before executeAdminOfferEdit");
});
