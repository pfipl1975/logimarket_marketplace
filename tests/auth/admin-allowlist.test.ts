import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAdminUserIds,
  isAdminUserId,
} from "../../src/lib/auth/admin-allowlist";
import { AuthConfigurationError } from "../../src/lib/auth/authorization-errors";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
const UUID_C = "33333333-3333-4333-8333-333333333333";

test("parseAdminUserIds", async (t) => {
  await t.test("MISSING_ENV_RETURNS_EMPTY_SET", () => {
    const ids = parseAdminUserIds(undefined);
    assert.equal(ids.size, 0);
  });

  await t.test("EMPTY_STRING_RETURNS_EMPTY_SET", () => {
    const ids = parseAdminUserIds("");
    assert.equal(ids.size, 0);
  });

  await t.test("SINGLE_UUID", () => {
    const ids = parseAdminUserIds(UUID_A);
    assert.equal(ids.size, 1);
    assert.equal(ids.has(UUID_A), true);
  });

  await t.test("MULTIPLE_UUIDS_WITH_WHITESPACE", () => {
    const ids = parseAdminUserIds(` ${UUID_A} ,  ${UUID_B}  , ${UUID_C} `);
    assert.equal(ids.size, 3);
    assert.equal(ids.has(UUID_A), true);
    assert.equal(ids.has(UUID_B), true);
    assert.equal(ids.has(UUID_C), true);
  });

  await t.test("DEDUPLICATES_REPEATED_UUIDS", () => {
    const ids = parseAdminUserIds(`${UUID_A},${UUID_A},${UUID_B}`);
    assert.equal(ids.size, 2);
  });

  await t.test("EMPTY_ELEMENTS_BETWEEN_COMMAS_ARE_IGNORED", () => {
    const ids = parseAdminUserIds(`${UUID_A},,,${UUID_B},`);
    assert.equal(ids.size, 2);
    assert.equal(ids.has(UUID_A), true);
    assert.equal(ids.has(UUID_B), true);
  });

  await t.test("INVALID_UUID_THROWS_AUTH_CONFIGURATION_ERROR", () => {
    assert.throws(
      () => parseAdminUserIds(`${UUID_A},not-a-uuid`),
      (error: unknown) =>
        error instanceof AuthConfigurationError &&
        error.code === "AUTH_CONFIGURATION_INVALID"
    );
  });

  await t.test("EMAIL_IS_NOT_ACCEPTED_AS_ADMIN_IDENTIFIER", () => {
    assert.throws(
      () => parseAdminUserIds("admin@example.com"),
      AuthConfigurationError
    );
  });
});

test("isAdminUserId", async (t) => {
  await t.test("EXACT_UUID_MATCH", () => {
    const ids = parseAdminUserIds(`${UUID_A},${UUID_B}`);
    assert.equal(isAdminUserId(UUID_A, ids), true);
    assert.equal(isAdminUserId(UUID_B, ids), true);
  });

  await t.test("SIMILAR_BUT_DIFFERENT_UUID_IS_NOT_ADMIN", () => {
    const ids = parseAdminUserIds(UUID_A);
    assert.equal(
      isAdminUserId("11111111-1111-4111-8111-111111111112", ids),
      false
    );
  });

  await t.test("EMPTY_ALLOWLIST_MATCHES_NOTHING", () => {
    const ids = parseAdminUserIds(undefined);
    assert.equal(isAdminUserId(UUID_A, ids), false);
  });

  await t.test("NO_EMAIL_BASED_MATCHING", () => {
    const ids = parseAdminUserIds(UUID_A);
    assert.equal(isAdminUserId("admin@example.com", ids), false);
  });
});
