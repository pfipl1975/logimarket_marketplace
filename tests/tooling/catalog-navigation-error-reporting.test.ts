import { test } from "node:test";
import assert from "node:assert/strict";
import { 
  isIntentionalOfflineCatalogError, 
  reportCatalogNavigationLoadError 
} from "../../src/lib/catalog/catalog-navigation-error-reporting";

test("isIntentionalOfflineCatalogError - exact nested cause + offline flag = true", () => {
  const rootError = new Error("Connection failed");
  const cause1 = new Error("Database error");
  const cause2 = new Error("ECONNREFUSED");
  Object.assign(cause2, { code: "ECONNREFUSED", address: "127.0.0.1", port: 1 });
  Object.assign(cause1, { cause: cause2 });
  Object.assign(rootError, { cause: cause1 });

  assert.equal(isIntentionalOfflineCatalogError(rootError, true), true);
});

test("isIntentionalOfflineCatalogError - exact nested cause without offline flag = false", () => {
  const err = new Error("ECONNREFUSED");
  Object.assign(err, { code: "ECONNREFUSED", address: "127.0.0.1", port: 1 });

  assert.equal(isIntentionalOfflineCatalogError(err, false), false);
});

test("isIntentionalOfflineCatalogError - ECONNREFUSED with different port = false", () => {
  const err = new Error("ECONNREFUSED");
  Object.assign(err, { code: "ECONNREFUSED", address: "127.0.0.1", port: 5432 });

  assert.equal(isIntentionalOfflineCatalogError(err, true), false);
});

test("isIntentionalOfflineCatalogError - ECONNREFUSED with different address = false", () => {
  const err = new Error("ECONNREFUSED");
  Object.assign(err, { code: "ECONNREFUSED", address: "192.168.1.1", port: 1 });

  assert.equal(isIntentionalOfflineCatalogError(err, true), false);
});

test("isIntentionalOfflineCatalogError - different error code = false", () => {
  const err = new Error("ETIMEDOUT");
  Object.assign(err, { code: "ETIMEDOUT", address: "127.0.0.1", port: 1 });

  assert.equal(isIntentionalOfflineCatalogError(err, true), false);
});

test("isIntentionalOfflineCatalogError - normal Error without cause = false", () => {
  const err = new Error("Just an error");
  assert.equal(isIntentionalOfflineCatalogError(err, true), false);
});

test("isIntentionalOfflineCatalogError - circular cause does not throw", () => {
  const err1 = new Error("Error 1");
  const err2 = new Error("Error 2");
  Object.assign(err1, { cause: err2 });
  Object.assign(err2, { cause: err1 });

  assert.doesNotThrow(() => {
    assert.equal(isIntentionalOfflineCatalogError(err1, true), false);
  });
});

test("reportCatalogNavigationLoadError - sentinel in offline mode does not call console.error", () => {
  const originalError = console.error;
  let callCount = 0;
  console.error = () => { callCount++; };
  
  try {
    const originalEnv = process.env.LOGIMARKET_OFFLINE_BUILD;
    process.env.LOGIMARKET_OFFLINE_BUILD = "1";
    
    const err = new Error("ECONNREFUSED");
    Object.assign(err, { code: "ECONNREFUSED", address: "127.0.0.1", port: 1 });

    reportCatalogNavigationLoadError(err);
    assert.equal(callCount, 0);

    if (originalEnv === undefined) {
      delete process.env.LOGIMARKET_OFFLINE_BUILD;
    } else {
      process.env.LOGIMARKET_OFFLINE_BUILD = originalEnv;
    }
  } finally {
    console.error = originalError;
  }
});

test("reportCatalogNavigationLoadError - sentinel without offline mode calls console.error exactly once", () => {
  const originalError = console.error;
  let callCount = 0;
  console.error = () => { callCount++; };
  
  try {
    const originalEnv = process.env.LOGIMARKET_OFFLINE_BUILD;
    process.env.LOGIMARKET_OFFLINE_BUILD = "0";
    
    const err = new Error("ECONNREFUSED");
    Object.assign(err, { code: "ECONNREFUSED", address: "127.0.0.1", port: 1 });

    reportCatalogNavigationLoadError(err);
    assert.equal(callCount, 1);

    if (originalEnv === undefined) {
      delete process.env.LOGIMARKET_OFFLINE_BUILD;
    } else {
      process.env.LOGIMARKET_OFFLINE_BUILD = originalEnv;
    }
  } finally {
    console.error = originalError;
  }
});

test("reportCatalogNavigationLoadError - other error in offline mode calls console.error exactly once", () => {
  const originalError = console.error;
  let callCount = 0;
  console.error = () => { callCount++; };
  
  try {
    const originalEnv = process.env.LOGIMARKET_OFFLINE_BUILD;
    process.env.LOGIMARKET_OFFLINE_BUILD = "1";
    
    const err = new Error("ETIMEDOUT");
    
    reportCatalogNavigationLoadError(err);
    assert.equal(callCount, 1);

    if (originalEnv === undefined) {
      delete process.env.LOGIMARKET_OFFLINE_BUILD;
    } else {
      process.env.LOGIMARKET_OFFLINE_BUILD = originalEnv;
    }
  } finally {
    console.error = originalError;
  }
});
