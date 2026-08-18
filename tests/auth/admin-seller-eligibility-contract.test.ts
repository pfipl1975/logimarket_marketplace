import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

test("Admin Seller Eligibility Contract", async (t) => {
  const actionPath = join(process.cwd(), "src/app/actions.ts");

  await t.test("changeAdminSellerEligibility calls requireAdmin() and preserves parser code", () => {
    assert.ok(existsSync(actionPath));
    const content = readFileSync(actionPath, "utf-8");
    
    // Zbudujmy regex na funkcję changeAdminSellerEligibility by wyodrębnić jej treść
    const actionMatch = content.match(/export async function changeAdminSellerEligibility\([\s\S]*?\}[\r\n]+(?=export|$)/);
    assert.ok(actionMatch, "changeAdminSellerEligibility function not found");
    const actionContent = actionMatch[0];

    assert.match(actionContent, /await requireAdmin\(\)/, "must call requireAdmin()");
    
    // Potwierdzenie że nie ma sztywno przypisanego ELIGIBILITY_INVALID_INPUT jeżeli inputRes.ok jest false
    assert.doesNotMatch(actionContent, /code:\s*"ELIGIBILITY_INVALID_INPUT"/, "must not hardcode ELIGIBILITY_INVALID_INPUT when returning parser error");
    assert.match(actionContent, /return inputRes;/, "must return original inputRes on parser error");
  });
});