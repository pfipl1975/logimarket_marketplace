import test from "node:test";
import assert from "node:assert/strict";
import { NextResponse } from "next/server";
import { createAuthRedirect } from "../../src/lib/supabase/proxy";

test("proxy auth redirect", async (t) => {
  await t.test("copies cookies and specified headers", () => {
    const baseResponse = new NextResponse();
    baseResponse.cookies.set({
      name: "sb-test-auth-token",
      value: "token-value",
      path: "/",
      secure: true,
      sameSite: "lax",
      maxAge: 3600
    });
    baseResponse.headers.set("Cache-Control", "no-store");
    baseResponse.headers.set("Expires", "0");
    baseResponse.headers.set("Pragma", "no-cache");
    baseResponse.headers.set("x-middleware-next", "1"); // Should not be copied

    const url = new URL("http://localhost/login");
    const redirect = createAuthRedirect(url, baseResponse);

    assert.equal(redirect.status, 307);
    assert.equal(redirect.headers.get("Location"), "http://localhost/login");

    const cookie = redirect.cookies.get("sb-test-auth-token");
    assert.equal(cookie?.value, "token-value");
    assert.equal(cookie?.path, "/");
    assert.equal(cookie?.secure, true);
    assert.equal(cookie?.sameSite, "lax");
    assert.equal(cookie?.maxAge, 3600);
    
    assert.equal(redirect.headers.get("Cache-Control"), "no-store");
    assert.equal(redirect.headers.get("Expires"), "0");
    assert.equal(redirect.headers.get("Pragma"), "no-cache");
    
    assert.equal(redirect.headers.get("x-middleware-next"), null);
  });
});
