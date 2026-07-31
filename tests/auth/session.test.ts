import test from "node:test";
import assert from "node:assert/strict";
import { classifySessionError } from "../../src/lib/auth/session";

test("classifySessionError", async (t) => {
  await t.test("classifies no error as unauthenticated", () => {
    assert.equal(classifySessionError(null), "unauthenticated");
  });

  await t.test("classifies AuthSessionMissingError as unauthenticated", () => {
    assert.equal(classifySessionError({ name: "AuthSessionMissingError" }), "unauthenticated");
  });

  await t.test("classifies 401 as unauthenticated", () => {
    assert.equal(classifySessionError({ status: 401 }), "unauthenticated");
  });

  await t.test("classifies network error as unavailable", () => {
    assert.equal(classifySessionError({ status: 500 }), "unavailable");
    assert.equal(classifySessionError({ name: "FetchError" }), "unavailable");
  });

  await t.test("classifies unknown auth error as unavailable", () => {
    assert.equal(classifySessionError({ message: "Something went wrong" }), "unavailable");
  });
});
