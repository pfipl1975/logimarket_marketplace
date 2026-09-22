import { test } from "node:test";
import assert from "node:assert";
import { normalizeProjectRef } from "../../scripts/database/runtime-migration-contract";
import { verifyTarget as verifyRuntimeTarget } from "../../scripts/database/verify-runtime-migration-target";

function verifyTarget(env: Partial<NodeJS.ProcessEnv>) {
  return verifyRuntimeTarget({ NODE_ENV: "test", ...env });
}

test("normalizeProjectRef: direct db host", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://test:test@db.testprojectref.supabase.co:5432/testdb"), "testprojectref");
});

test("normalizeProjectRef: transaction pooler", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://postgres.testprojectref:test@pooler.example.invalid:6543/testdb"), "testprojectref");
});

test("normalizeProjectRef: session pooler", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://postgres.testprojectref:test@pooler.example.invalid:5432/testdb"), "testprojectref");
});

test("normalizeProjectRef: encoded password", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://postgres.testprojectref:dummy%40test%3Afake@pooler.example.invalid:6543/testdb"), "testprojectref");
});

test("normalizeProjectRef: password z dwukropkiem", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://postgres.testprojectref:dummy:test@pooler.example.invalid:6543/testdb"), "testprojectref");
});

test("normalizeProjectRef: localhost support", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://test:test@localhost:5432/testdb"), "localhost");
  assert.strictEqual(normalizeProjectRef("postgresql://dummy:fake@localhost:5432/testdb"), "localhost");
});

test("normalizeProjectRef: 127.0.0.1 support", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://test:test@127.0.0.1:5432/testdb"), "localhost");
  assert.strictEqual(normalizeProjectRef("postgresql://dummy:fake@127.0.0.1:5432/testdb"), "localhost");
});

test("normalizeProjectRef: arbitrary non-Supabase remote host returns null", () => {
  assert.strictEqual(normalizeProjectRef("postgresql://test:test@remote.example.invalid:5432/testdb"), null);
  assert.strictEqual(normalizeProjectRef("postgresql://dummy:fake@internal.example.invalid:5432/testdb"), null);
  assert.strictEqual(normalizeProjectRef("postgresql://test:test@db.not-supabase.example.invalid:5432/testdb"), null);
});

test("verifyTarget: brak URL", () => {
  assert.throws(() => verifyTarget({}), /Missing DATABASE_URL/);
});

test("verifyTarget PASS: development + exact DEV token + expected DEV ref", () => {
  assert.doesNotThrow(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testdevref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }));
});

test("verifyTarget PASS: production + exact PROD token + expected PROD ref", () => {
  assert.doesNotThrow(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testprodref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_TARGET: "production",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_PROD_RUNTIME_0000_TO_0003"
  }));
});

test("verifyTarget FAIL: production + obsolete 0000_TO_0002 token", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testprodref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_TARGET: "production",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_PROD_RUNTIME_0000_TO_0002"
  }), /Invalid write authorization for production target/);
});

test("verifyTarget FAIL: production + DEV token", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testprodref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_TARGET: "production",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /Invalid write authorization for production target/);
});

test("verifyTarget FAIL: development + PROD token", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testdevref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_PROD_RUNTIME_0000_TO_0003"
  }), /Invalid write authorization for development target/);
});

test("verifyTarget FAIL: production + missing token", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testprodref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_TARGET: "production"
  }), /Missing exact write authorization/);
});

test("verifyTarget FAIL: production + wrong token", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testprodref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_TARGET: "production",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "WRONG_TOKEN"
  }), /Invalid write authorization for production target/);
});

test("verifyTarget FAIL: unknown target", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testdevref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_TARGET: "staging",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /Target is unknown or unsupported/);
});

test("verifyTarget FAIL: expected ref mismatch", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testotherref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /URL does not point to expected ref/);
});

test("verifyTarget FAIL: forbidden ref", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testprodref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /URL points to forbidden ref/);
});

test("verifyTarget FAIL: expected ref equals forbidden ref", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "postgresql://test:test@db.testdevref.supabase.co:5432/testdb",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /Expected ref equals forbidden ref/);
});

test("verifyTarget FAIL: malformed/unparseable DATABASE_URL", () => {
  assert.throws(() => verifyTarget({
    DATABASE_URL: "not-a-valid-db-url",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "testdevref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "testprodref",
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE"
  }), /Could not parse project ref from DATABASE_URL/);
});

test("Target parser has no side effects on import", async () => {
  const mod = await import("../../scripts/database/runtime-migration-contract");
  assert.ok(mod.normalizeProjectRef);
});
