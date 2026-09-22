import test from "node:test";
import assert from "node:assert/strict";
import { AuthApiError } from "@supabase/supabase-js";
import { classifyLoginError } from "../../src/lib/auth/login-error";

test("classifyLoginError", async (t) => {
  await t.test("invalid_credentials maps to INVALID_CREDENTIALS", () => {
    const error = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
    assert.equal(classifyLoginError(error), "INVALID_CREDENTIALS");
  });

  await t.test("email_not_confirmed maps to INVALID_CREDENTIALS", () => {
    const error = new AuthApiError("Email not confirmed", 400, "email_not_confirmed");
    assert.equal(classifyLoginError(error), "INVALID_CREDENTIALS");
  });

  await t.test("user_banned maps to INVALID_CREDENTIALS", () => {
    const error = new AuthApiError("User is banned", 403, "user_banned");
    assert.equal(classifyLoginError(error), "INVALID_CREDENTIALS");
  });

  await t.test("request_timeout maps to AUTH_UNAVAILABLE", () => {
    const error = new AuthApiError("Request timeout", 408, "request_timeout");
    assert.equal(classifyLoginError(error), "AUTH_UNAVAILABLE");
  });

  await t.test("unexpected_failure maps to AUTH_UNAVAILABLE", () => {
    const error = new AuthApiError("Unexpected failure", 500, "unexpected_failure");
    assert.equal(classifyLoginError(error), "AUTH_UNAVAILABLE");
  });

  await t.test("over_request_rate_limit maps to AUTH_UNAVAILABLE", () => {
    const error = new AuthApiError("Rate limit exceeded", 429, "over_request_rate_limit");
    assert.equal(classifyLoginError(error), "AUTH_UNAVAILABLE");
  });

  await t.test("unknown error maps to AUTH_UNAVAILABLE", () => {
    assert.equal(classifyLoginError(new Error("Network connection lost")), "AUTH_UNAVAILABLE");
    assert.equal(classifyLoginError(null), "AUTH_UNAVAILABLE");
    assert.equal(classifyLoginError({ code: "invalid_credentials" }), "AUTH_UNAVAILABLE"); // Not AuthApiError instance
  });
});
