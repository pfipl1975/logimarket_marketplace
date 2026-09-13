import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../../src/app/api/internal/cron/seller-expiration/route.js";

test("cron route authentication and gating", async () => {
  const originalEnv = { ...process.env };
  
  try {
    // 1. Missing secret
    process.env.CRON_SECRET = "";
    let req = new Request("https://example.com", { headers: { "Authorization": "Bearer missing" } });
    let res = await GET(req);
    assert.equal(res.status, 401);

    // 2. Invalid secret
    process.env.CRON_SECRET = "valid_secret";
    req = new Request("https://example.com", { headers: { "Authorization": "Bearer invalid" } });
    res = await GET(req);
    assert.equal(res.status, 401);

    // 3. Disabled flag
    req = new Request("https://example.com", { headers: { "Authorization": "Bearer valid_secret" } });
    process.env.VERCEL_ENV = "production";
    process.env.SELLER_EXPIRATION_CRON_ENABLED = "false";
    res = await GET(req);
    assert.equal(res.status, 200);
    let data = await res.json();
    assert.equal(data.status, "disabled_by_gate");

    // 4. Non-production
    process.env.VERCEL_ENV = "preview";
    process.env.SELLER_EXPIRATION_CRON_ENABLED = "true";
    res = await GET(req);
    assert.equal(res.status, 200);
    data = await res.json();
    assert.equal(data.status, "disabled_by_gate");

  } finally {
    process.env = originalEnv;
  }
});
