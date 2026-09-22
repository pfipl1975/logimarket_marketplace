import test from "node:test";
import assert from "node:assert/strict";
import { AuthApiError } from "@supabase/supabase-js";
import { classifySessionError } from "../../src/lib/auth/session";

test("classifySessionError", async (t) => {
  await t.test("NO_ERROR_AND_NO_USER", () => {
    assert.equal(classifySessionError(null), "unauthenticated");
  });

  await t.test("AUTH_SESSION_MISSING", () => {
    assert.equal(classifySessionError({ name: "AuthSessionMissingError" }), "unauthenticated");
  });

  await t.test("SESSION_NOT_FOUND", () => {
    const error = new AuthApiError("Session not found", 400, "session_not_found");
    assert.equal(classifySessionError(error), "unauthenticated");
  });

  await t.test("SESSION_EXPIRED", () => {
    const error = new AuthApiError("Session expired", 401, "session_expired");
    assert.equal(classifySessionError(error), "unauthenticated");
  });

  await t.test("BAD_JWT", () => {
    const error = new AuthApiError("Bad JWT", 401, "bad_jwt");
    assert.equal(classifySessionError(error), "unauthenticated");
  });

  await t.test("NETWORK_ERROR", () => {
    assert.equal(classifySessionError({ name: "FetchError", message: "Network failure" }), "unavailable");
  });

  await t.test("REQUEST_TIMEOUT", () => {
    const error = new AuthApiError("Request timeout", 408, "request_timeout");
    assert.equal(classifySessionError(error), "unavailable");
  });

  await t.test("UNEXPECTED_FAILURE", () => {
    const error = new AuthApiError("Unexpected failure", 500, "unexpected_failure");
    assert.equal(classifySessionError(error), "unavailable");
  });

  await t.test("GENERIC_403_WITHOUT_SESSION_CODE", () => {
    const error = new AuthApiError("Access denied", 403, "some_other_code");
    assert.equal(classifySessionError(error), "unavailable");
  });

  await t.test("UNKNOWN_ERROR", () => {
    assert.equal(classifySessionError(new Error("Unknown error")), "unavailable");
    assert.equal(classifySessionError({ status: 401 }), "unavailable");
    assert.equal(classifySessionError({}), "unavailable");
    assert.equal(classifySessionError(undefined), "unauthenticated");
  });
});
