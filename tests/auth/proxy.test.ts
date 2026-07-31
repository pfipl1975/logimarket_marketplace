import test from "node:test";
import assert from "node:assert/strict";
import { NextResponse } from "next/server";
import { createAuthRedirect } from "../../src/lib/supabase/proxy";

test("proxy auth redirect", async (t) => {
  await t.test("copies cookies and specified headers", () => {
    const baseResponse = new NextResponse();
    baseResponse.cookies.set("sb-auth-token", "xyz");
    baseResponse.headers.set("Cache-Control", "no-store");
    baseResponse.headers.set("Expires", "0");
    baseResponse.headers.set("Pragma", "no-cache");
    baseResponse.headers.set("x-middleware-next", "1"); // Should not be copied

    const url = new URL("http://localhost/login");
    const redirect = createAuthRedirect(url, baseResponse);

    assert.equal(redirect.status, 307);
    assert.equal(redirect.headers.get("Location"), "http://localhost/login");

    assert.equal(redirect.cookies.get("sb-auth-token")?.value, "xyz");
    
    assert.equal(redirect.headers.get("Cache-Control"), "no-store");
    assert.equal(redirect.headers.get("Expires"), "0");
    assert.equal(redirect.headers.get("Pragma"), "no-cache");
    
    assert.equal(redirect.headers.get("x-middleware-next"), null);
  });
});
