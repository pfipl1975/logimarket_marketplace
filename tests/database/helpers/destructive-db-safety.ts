import type { PoolClient, Pool } from "pg";

export type ConfigEnvironment = {
  TEST_DATABASE_URL?: string;
  DATABASE_URL?: string;
  NODE_ENV?: string;
  ALLOW_DESTRUCTIVE_DB_TESTS?: string;
};

export type DestructiveGuardResult =
  | { type: "PASS"; url: string }
  | { type: "SKIP"; reason: string }
  | { type: "FAIL"; reason: string };

function isLoopback(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

export function validateDestructiveTestEnvironment(
  env: ConfigEnvironment
): DestructiveGuardResult {
  if (!env.TEST_DATABASE_URL) {
    return { type: "SKIP", reason: "TEST_DATABASE_URL is not set." };
  }

  if (env.NODE_ENV !== "test") {
    return { type: "FAIL", reason: "NODE_ENV must be exactly 'test'." };
  }

  if (env.ALLOW_DESTRUCTIVE_DB_TESTS !== "1") {
    return { type: "FAIL", reason: "ALLOW_DESTRUCTIVE_DB_TESTS must be exactly '1'." };
  }

  if (env.DATABASE_URL && env.TEST_DATABASE_URL === env.DATABASE_URL) {
    return { type: "FAIL", reason: "TEST_DATABASE_URL must not equal DATABASE_URL." };
  }

  let parsed: URL;
  try {
    parsed = new URL(env.TEST_DATABASE_URL);
  } catch {
    return { type: "FAIL", reason: "TEST_DATABASE_URL is not a valid URL." };
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return { type: "FAIL", reason: "TEST_DATABASE_URL must be a PostgreSQL URL." };
  }

  if (!isLoopback(parsed.hostname)) {
    return { type: "FAIL", reason: "TEST_DATABASE_URL host must be a loopback address." };
  }

  const dbName = parsed.pathname.replace(/^\//, "");
  if (dbName !== "logimarket_test") {
    return { type: "FAIL", reason: "TEST_DATABASE_URL database name must be exactly 'logimarket_test'." };
  }

  return { type: "PASS", url: env.TEST_DATABASE_URL };
}

export async function verifySqlIdentityBeforeDestructiveDdl(client: Pool | PoolClient): Promise<void> {
  const result = await client.query<{ current_database: string }>("SELECT current_database();");
  const currentDb = result.rows[0]?.current_database;
  if (currentDb !== "logimarket_test") {
    throw new Error(`SQL identity check failed. Expected database 'logimarket_test', but got '${currentDb}'. Destructive DDL aborted.`);
  }
}

export async function assertDestructiveResetAllowed(
  client: Pool | PoolClient,
  safetyEnv: ConfigEnvironment
): Promise<void> {
  const guard = validateDestructiveTestEnvironment(safetyEnv);
  if (guard.type !== "PASS") {
    throw new Error(`Destructive reset aborted: test environment invalidated immediately before DROP SCHEMA. Reason: ${guard.type === "SKIP" ? "SKIP" : guard.reason}`);
  }
  await verifySqlIdentityBeforeDestructiveDdl(client);
}

export async function resetDisposableTestDatabase(
  client: Pool | PoolClient,
  safetyEnv: ConfigEnvironment
): Promise<void> {
  await assertDestructiveResetAllowed(client, safetyEnv);
  
  await client.query(`DROP SCHEMA IF EXISTS public CASCADE;`);
  await client.query(`DROP SCHEMA IF EXISTS drizzle_runtime CASCADE;`);
  await client.query(`CREATE SCHEMA public;`);
  
  // Create Supabase-specific roles required by the baseline migration dump
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
    END
    $$;
  `);
}
