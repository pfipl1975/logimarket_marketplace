import { test } from "node:test";
import assert from "node:assert";
import { verifyTarget } from "../../scripts/database/verify-runtime-migration-target";

test("verifyTarget throws on missing URL", () => {
  assert.throws(() => verifyTarget({}), /Missing DATABASE_URL/);
});

test("verifyTarget throws on wrong ref", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgres://db.wrong.supabase.co",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "right",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "prod",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /URL does not point to expected ref/);
});

test("verifyTarget passes correctly", () => {
  assert.doesNotThrow(() => verifyTarget({
    DATABASE_URL: "postgres://db.right.supabase.co",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "right",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "prod",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }));
});
