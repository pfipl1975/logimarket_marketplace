import { test } from "node:test";
import assert from "node:assert/strict";
import { isDatabaseUnavailableError, getResilientSitemapEntries, getCoreSitemapEntries } from "../../src/lib/seo/sitemap-entries";

test("isDatabaseUnavailableError handles EMAXCONNSESSION", () => {
  const emaxError = new Error("error: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15");
  (emaxError as Error & { code?: string }).code = "XX000";
  assert.equal(isDatabaseUnavailableError(emaxError), true);
});

test("isDatabaseUnavailableError ignores unrelated XX000", () => {
  const unrelatedError = new Error("Some other postgres internal error");
  (unrelatedError as Error & { code?: string }).code = "XX000";
  assert.equal(isDatabaseUnavailableError(unrelatedError), false);
});

test("isDatabaseUnavailableError handles standard connection errors", () => {
  const connError = new Error("network issue");
  (connError as Error & { code?: string }).code = "ECONNREFUSED";
  assert.equal(isDatabaseUnavailableError(connError), true);
  
  const timeoutError = new Error("connection timeout");
  assert.equal(isDatabaseUnavailableError(timeoutError), true);
});

test("getResilientSitemapEntries returns core entries on EMAXCONNSESSION", async () => {
  const failingLoader = async () => {
    const error = new Error("(EMAXCONNSESSION) max clients reached in session mode");
    (error as Error & { code?: string }).code = "XX000";
    throw error;
  };
  
  let warningCount = 0;
  const mockWarn = () => { warningCount++; };
  
  const result = await getResilientSitemapEntries(failingLoader, mockWarn);
  const coreEntries = getCoreSitemapEntries();
  
  // Resilient fallback returns deduplicated/sorted core entries
  assert.equal(result.length, coreEntries.length);
  assert.equal(warningCount, 1);
});

test("getResilientSitemapEntries throws on unrelated XX000", async () => {
  const failingLoader = async () => {
    const error = new Error("Some unrelated constraint violation");
    (error as Error & { code?: string }).code = "XX000";
    throw error;
  };
  
  await assert.rejects(
    async () => getResilientSitemapEntries(failingLoader, () => {}),
    /Some unrelated constraint violation/
  );
});
