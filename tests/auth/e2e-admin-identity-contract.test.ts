import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { E2E_ADMIN_USER_ID } from "../../scripts/e2e/buyer-trust-fixtures";

// Fail fast when isolated E2E auth, Buyer audit fixtures or the mock server drift.
test("Isolated QA ADMIN identity is consistent across browser, Buyer evidence, Mock GoTrue and CI", () => {
  const expected = "00000000-0000-4000-8000-000000000001";
  assert.equal(E2E_ADMIN_USER_ID, expected);
  assert.match(expected, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

  const authFixture = readFileSync("tests/e2e/fixtures/auth.ts", "utf8");
  assert.match(authFixture, /export const E2E_ADMIN_USER_ID = "([^"]+)"/);
  assert.equal(authFixture.match(/export const E2E_ADMIN_USER_ID = "([^"]+)"/)?.[1], expected);

  const mock = readFileSync("scripts/e2e/mock-gotrue.js", "utf8");
  const allowList = mock.match(/const ALLOWED_USERS = new Set\(\[([\s\S]*?)\]\)/)?.[1];
  assert.ok(allowList, "Missing isolated Mock GoTrue allowlist");
  assert.ok(allowList.includes(`'${expected}'`), "Mock GoTrue must recognize the same QA ADMIN ID");

  const workflow = readFileSync(".github/workflows/ci-browser-e2e.yml", "utf8");
  const configuredIds = [...workflow.matchAll(/^\s+ADMIN_USER_IDS: ([^\n\r]+)$/gm)].map(match => match[1].trim());
  assert.equal(configuredIds.length, 3, "Expected all three CI ADMIN allowlists");
  assert.deepEqual(configuredIds, [expected, expected, expected]);
});
