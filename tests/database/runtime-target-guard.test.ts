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

test("normalizeProjectRef: localhost support", () => {
  assert.strictEqual(normalizeProjectRef("postgres://postgres:postgres@localhost:5432/postgres"), "localhost");
  assert.strictEqual(normalizeProjectRef("postgresql://user:pass@localhost:5432/mydb"), "localhost");
});

test("normalizeProjectRef: 127.0.0.1 support", () => {
  assert.strictEqual(normalizeProjectRef("postgres://postgres:postgres@127.0.0.1:5432/postgres"), "localhost");
  assert.strictEqual(normalizeProjectRef("postgresql://user:pass@127.0.0.1:5432/mydb"), "localhost");
});

test("normalizeProjectRef: arbitrary non-Supabase remote host returns null", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://user:pass@example.com:5432/mydb"), null);
  assert.strictEqual(normalizeProjectRef("postgresql://user:pass@internal-db.corp.net:5432/mydb"), null);
  assert.strictEqual(normalizeProjectRef("postgresql://user:pass@db.not-supabase.io:5432/postgres"), null);
});

test("verifyTarget: brak URL", () => {
  assert.throws(() => verifyTarget({}), /Missing DATABASE_URL/);
});

test("verifyTarget PASS: development + exact DEV token + expected DEV ref", () => {
  assert.doesNotThrow(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.mydevref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }));
});

test("verifyTarget PASS: production + exact PROD token + expected PROD ref", () => {
  assert.doesNotThrow(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.myprodref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_TARGET: "production",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_PROD_RUNTIME_0000_TO_0002"
  }));
});

test("verifyTarget FAIL: production + DEV token", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.myprodref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_TARGET: "production",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /Invalid write authorization for production target/);
});

test("verifyTarget FAIL: development + PROD token", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.mydevref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_PROD_RUNTIME_0000_TO_0002"
  }), /Invalid write authorization for development target/);
});

test("verifyTarget FAIL: production + missing token", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.myprodref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_TARGET: "production"
  }), /Missing exact write authorization/);
});

test("verifyTarget FAIL: production + wrong token", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.myprodref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_TARGET: "production",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "WRONG_TOKEN"
  }), /Invalid write authorization for production target/);
});

test("verifyTarget FAIL: unknown target", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.mydevref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_TARGET: "staging",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /Target is unknown or unsupported/);
});

test("verifyTarget FAIL: expected ref mismatch", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.otherref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /URL does not point to expected ref/);
});

test("verifyTarget FAIL: forbidden ref", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.myprodref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /URL points to forbidden ref/);
});

test("verifyTarget FAIL: expected ref equals forbidden ref", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://postgres:pass@db.mydevref.supabase.co:5432/postgres",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /Expected ref equals forbidden ref/);
});

test("verifyTarget FAIL: malformed/unparseable DATABASE_URL", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "not-a-valid-db-url",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "mydevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "myprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /Could not parse project ref from DATABASE_URL/);
});

test("Target parser has no side effects on import", async () => {
  const mod = await import("../../scripts/database/runtime-migration-contract");
  assert.ok(mod.normalizeProjectRef);
});
