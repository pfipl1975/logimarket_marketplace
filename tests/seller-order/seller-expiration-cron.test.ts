import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createSellerExpirationCronHandler } from "../../src/lib/cron/seller-expiration-cron.js";

test("cron route authentication and gating", async () => {
  const originalEnv = { ...process.env };
  
  let batchCalls = 0;
  let batchArg = 0;
  const mockBatch = async (limit: number) => {
    batchCalls++;
    batchArg = limit;
    return { ok: true, count: 5 };
  };
  const handler = createSellerExpirationCronHandler(mockBatch);

  try {
    // 1. Missing secret
    process.env.CRON_SECRET = "";
    let req = new Request("https://example.com", { headers: { "Authorization": "Bearer missing" } });
    let res = await handler(req);
    assert.equal(res.status, 401);
    assert.equal(batchCalls, 0);

    // 2. Missing auth
    process.env.CRON_SECRET = "valid_secret";
    req = new Request("https://example.com");
    res = await handler(req);
    assert.equal(res.status, 401);
    assert.equal(batchCalls, 0);

    // 3. Invalid auth
    req = new Request("https://example.com", { headers: { "Authorization": "Bearer invalid" } });
    res = await handler(req);
    assert.equal(res.status, 401);
    assert.equal(batchCalls, 0);

    // 4. valid auth + flag absent
    req = new Request("https://example.com", { headers: { "Authorization": "Bearer valid_secret" } });
    process.env.VERCEL_ENV = "production";
    delete process.env.SELLER_EXPIRATION_CRON_ENABLED;
    res = await handler(req);
    assert.equal(res.status, 200);
    let data = await res.json();
    assert.equal(data.status, "disabled_by_gate");
    assert.equal(batchCalls, 0);

    // 5. valid auth + flag != exact true
    process.env.SELLER_EXPIRATION_CRON_ENABLED = "1";
    res = await handler(req);
    assert.equal(res.status, 200);
    assert.equal(batchCalls, 0);

    // 6. valid auth + non-production + exact true
    process.env.VERCEL_ENV = "preview";
    process.env.SELLER_EXPIRATION_CRON_ENABLED = "true";
    res = await handler(req);
    assert.equal(res.status, 200);
    assert.equal(batchCalls, 0);

    // 7. valid auth + prod + exact true
    process.env.VERCEL_ENV = "production";
    process.env.SELLER_EXPIRATION_CRON_ENABLED = "true";
    res = await handler(req);
    assert.equal(res.status, 200);
    data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.count, 5);
    assert.equal(batchCalls, 1);
    assert.equal(batchArg, 100);

    // Proving request cannot override limits or ids
    // Passing query params shouldn't change the limit 100.
    req = new Request("https://example.com?limit=500&sellerOrderId=123", { headers: { "Authorization": "Bearer valid_secret" } });
    await handler(req);
    assert.equal(batchCalls, 2);
    assert.equal(batchArg, 100);

  } finally {
    process.env = originalEnv;
  }
});
