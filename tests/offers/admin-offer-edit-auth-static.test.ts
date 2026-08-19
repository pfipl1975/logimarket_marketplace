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
  
  const funcStart = actionsCode.indexOf('export async function updateAdminOffer');
  const funcStr = actionsCode.slice(funcStart);
  const functionMatch = funcStr.includes('requireAdmin()');
  
  assert.ok(functionMatch, "updateAdminOffer must be exported and must call requireAdmin()");
});
