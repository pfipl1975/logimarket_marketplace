import { test } from "node:test";
import assert from "node:assert/strict";

test("getDb configures pool with max 1 by default", async () => {
  // Save original env
  const originalUrl = process.env.DATABASE_URL;
  const originalMax = process.env.DATABASE_POOL_MAX;

  // Set predictable env
  process.env.DATABASE_URL = "postgres://fake:fake@localhost:5432/fake";
  delete process.env.DATABASE_POOL_MAX;

  try {
    // We isolate the db.ts import so it uses the env we just set
    // Using inline require/import to prevent caching issues across tests
    const dbModule = await import("../../src/lib/db.ts?mock=" + Date.now());
    
    // We need to access the unexported pool or cast the proxy.
    // However, the drizzle instance contains the pg dialect which holds the client/pool.
    const db = dbModule.getDb();
    
    // @ts-expect-error Accessing private instance for unit testing pool config
    const pool = db.session.client;
    
    assert.equal(pool.options.max, 1, "Default pool max should be 1");
    assert.equal(pool.options.idleTimeoutMillis, 5000, "idleTimeoutMillis should be 5000");
    assert.equal(pool.options.connectionTimeoutMillis, 5000, "connectionTimeoutMillis should be 5000");
  } finally {
    // Restore env
    if (originalUrl) process.env.DATABASE_URL = originalUrl;
    else delete process.env.DATABASE_URL;
    
    if (originalMax) process.env.DATABASE_POOL_MAX = originalMax;
    else delete process.env.DATABASE_POOL_MAX;
  }
});
