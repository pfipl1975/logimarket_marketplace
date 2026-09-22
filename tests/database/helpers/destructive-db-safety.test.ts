import { test, describe } from "node:test";
import type { PoolClient } from "pg";
import assert from "node:assert";
import { validateDestructiveTestEnvironment, verifySqlIdentityBeforeDestructiveDdl, resetDisposableTestDatabase } from "./destructive-db-safety";

describe("validateDestructiveTestEnvironment", () => {
  const validEnv = {
    NODE_ENV: "test",
    ALLOW_DESTRUCTIVE_DB_TESTS: "1",
    TEST_DATABASE_URL: "postgresql://test:test@localhost:5432/logimarket_test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/logimarket_main"
  };

  test("PASS for valid config", () => {
    const result = validateDestructiveTestEnvironment(validEnv);
    assert.deepEqual(result, { type: "PASS", url: validEnv.TEST_DATABASE_URL });
  });

  test("SKIP when TEST_DATABASE_URL is missing", () => {
    const result = validateDestructiveTestEnvironment({ ...validEnv, TEST_DATABASE_URL: undefined });
    assert.equal(result.type, "SKIP");
  });

  test("FAIL when NODE_ENV is not test", () => {
    const result = validateDestructiveTestEnvironment({ ...validEnv, NODE_ENV: "development" });
    assert.equal(result.type, "FAIL");
  });

  test("FAIL when ALLOW_DESTRUCTIVE_DB_TESTS is missing or not 1", () => {
    assert.equal(validateDestructiveTestEnvironment({ ...validEnv, ALLOW_DESTRUCTIVE_DB_TESTS: undefined }).type, "FAIL");
    assert.equal(validateDestructiveTestEnvironment({ ...validEnv, ALLOW_DESTRUCTIVE_DB_TESTS: "true" }).type, "FAIL");
  });

  test("FAIL for non-loopback host", () => {
    assert.equal(validateDestructiveTestEnvironment({ ...validEnv, TEST_DATABASE_URL: "postgresql://test:test@remote.example.invalid:5432/logimarket_test" }).type, "FAIL");
    assert.equal(validateDestructiveTestEnvironment({ ...validEnv, TEST_DATABASE_URL: "postgresql://test:test@database.example.invalid:5432/logimarket_test" }).type, "FAIL");
  });

  test("FAIL for invalid database name", () => {
    assert.equal(validateDestructiveTestEnvironment({ ...validEnv, TEST_DATABASE_URL: "postgresql://test:test@localhost:5432/postgres" }).type, "FAIL");
    assert.equal(validateDestructiveTestEnvironment({ ...validEnv, TEST_DATABASE_URL: "postgresql://test:test@localhost:5432/logimarket" }).type, "FAIL");
    assert.equal(validateDestructiveTestEnvironment({ ...validEnv, TEST_DATABASE_URL: "postgresql://test:test@localhost:5432/foo_test" }).type, "FAIL");
  });

  test("FAIL when TEST_DATABASE_URL is invalid", () => {
    assert.equal(validateDestructiveTestEnvironment({ ...validEnv, TEST_DATABASE_URL: "not-a-url" }).type, "FAIL");
    assert.equal(validateDestructiveTestEnvironment({ ...validEnv, TEST_DATABASE_URL: "mysql://test:test@localhost/logimarket_test" }).type, "FAIL");
  });

  test("FAIL when TEST_DATABASE_URL equals DATABASE_URL", () => {
    const result = validateDestructiveTestEnvironment({
      ...validEnv,
      DATABASE_URL: validEnv.TEST_DATABASE_URL
    });
    assert.equal(result.type, "FAIL");
  });
});

describe("verifySqlIdentityBeforeDestructiveDdl", () => {
  test("PASS when current_database is logimarket_test", async () => {
    const mockClient = {
      query: async () => ({ rows: [{ current_database: "logimarket_test" }] })
    } as unknown as PoolClient;
    await assert.doesNotReject(() => verifySqlIdentityBeforeDestructiveDdl(mockClient));
  });

  test("FAIL when current_database is postgres", async () => {
    const mockClient = {
      query: async () => ({ rows: [{ current_database: "postgres" }] })
    } as unknown as PoolClient;
    await assert.rejects(
      () => verifySqlIdentityBeforeDestructiveDdl(mockClient),
      /SQL identity check failed. Expected database 'logimarket_test', but got 'postgres'. Destructive DDL aborted./
    );
  });
});

describe("resetDisposableTestDatabase", () => {
  const validEnv = {
    NODE_ENV: "test",
    ALLOW_DESTRUCTIVE_DB_TESTS: "1",
    TEST_DATABASE_URL: "postgresql://test:test@localhost:5432/logimarket_test"
  };

  test("UNSAFE_CONFIG_ZERO_DROP_PROOF: unsafe env fails immediately, no DROP executed", async () => {
    const executedQueries: string[] = [];
    const mockClient = {
      query: async (q: string) => {
        executedQueries.push(q);
        return { rows: [{ current_database: "logimarket_test" }] };
      }
    } as unknown as PoolClient;

    await assert.rejects(
      () => resetDisposableTestDatabase(mockClient, { ...validEnv, NODE_ENV: "production" }),
      /Destructive reset aborted/
    );

    assert.equal(executedQueries.length, 0);
  });

  test("SQL_IDENTITY_ZERO_DROP_PROOF: identity mismatch fails after SELECT, no DROP executed", async () => {
    const executedQueries: string[] = [];
    const mockClient = {
      query: async (q: string) => {
        executedQueries.push(q);
        return { rows: [{ current_database: "postgres" }] };
      }
    } as unknown as PoolClient;

    await assert.rejects(
      () => resetDisposableTestDatabase(mockClient, validEnv),
      /SQL identity check failed/
    );

    assert.ok(executedQueries.some(q => q.includes("SELECT current_database();")));
    assert.equal(executedQueries.some(q => q.includes("DROP SCHEMA")), false);
    assert.equal(executedQueries.some(q => q.includes("CREATE SCHEMA")), false);
  });

  test("Valid config and matching identity executes destructive reset", async () => {
    const executedQueries: string[] = [];
    const mockClient = {
      query: async (q: string) => {
        executedQueries.push(q);
        return { rows: [{ current_database: "logimarket_test" }] };
      }
    } as unknown as PoolClient;

    await assert.doesNotReject(() => resetDisposableTestDatabase(mockClient, validEnv));

    assert.ok(executedQueries.some(q => q.includes("SELECT current_database();")));
    assert.ok(executedQueries.some(q => q.includes("DROP SCHEMA IF EXISTS public CASCADE;")));
    assert.ok(executedQueries.some(q => q.includes("DROP SCHEMA IF EXISTS drizzle_runtime CASCADE;")));
    assert.ok(executedQueries.some(q => q.includes("CREATE SCHEMA public;")));
  });
});
