import { test } from "node:test";
import assert from "node:assert";
import { normalizeProjectRef } from "../../scripts/database/runtime-migration-contract";
import { verifyTarget } from "../../scripts/database/verify-runtime-migration-target";

test("normalizeProjectRef: direct db host", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://postgres:PASSWORD@db.abcdefgh.supabase.co:5432/postgres"), "abcdefgh");
});

test("normalizeProjectRef: transaction pooler", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://postgres.abcdefgh:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"), "abcdefgh");
});

test("normalizeProjectRef: session pooler", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://postgres.abcdefgh:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"), "abcdefgh");
});

test("normalizeProjectRef: encoded password", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://postgres.abcdefgh:P%40SSW%3ARD@aws-0.pooler.supabase.com:6543/postgres"), "abcdefgh");
});

test("normalizeProjectRef: password z dwukropkiem", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://postgres.abcdefgh:PASS:WORD@aws-0.pooler.supabase.com:6543/postgres"), "abcdefgh");
});

test("normalizeProjectRef: unknown format", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://localhost:5432/mydb"), null);
});

test("verifyTarget: brak URL", () => {
  assert.throws(() => verifyTarget({}), /Missing DATABASE_URL/);
});

test("verifyTarget: expected DEV ref passes", () => {
  assert.doesNotThrow(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.mydevref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }));
});

test("verifyTarget: forbidden production ref throws", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.myprodref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /URL points to forbidden ref/);
});

test("Target parser has no side effects on import", async () => {
  const mod = await import("../../scripts/database/runtime-migration-contract");
  assert.ok(mod.normalizeProjectRef);
});
