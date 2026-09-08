import test from "node:test";
import assert from "node:assert/strict";
import { planStagingCleanup, STAGING_ORPHAN_MIN_AGE_MS } from "../../src/lib/storage/staging-cleanup";
import { executeStagingCleanup } from "../../src/lib/storage/staging-cleanup-executor";

const MOCK_NOW = new Date("2026-01-02T12:00:00Z").getTime();

test("Staging Orphan Cleanup Lifecycle", async (t) => {
  await t.test("A. fresh staging object -> NOT eligible", () => {
    const objs = [{ path: "offers/123/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d", created_at: new Date(MOCK_NOW - 1000).toISOString() }];
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    assert.equal(plan.eligible.length, 0);
    assert.equal(plan.tooFresh, 1);
  });

  await t.test("B. old staging object -> eligible", () => {
    const objs = [{ path: "offers/123/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() }];
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    assert.equal(plan.eligible.length, 1);
  });

  await t.test("C. malformed path -> REPORT_ONLY", () => {
    const objs = [
      { path: "offers/123/made-up-not-uuid", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() },
      { path: "otherfile.txt", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() }
    ];
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    assert.equal(plan.eligible.length, 0);
    assert.equal(plan.malformed.length, 2);
  });

  await t.test("D. dry-run -> zero delete calls", async () => {
    let deleteCalled = false;
    const storageMock = {
      listObjects: async () => ([{ path: "offers/123/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() }]),
      deleteObjects: async () => { deleteCalled = true; return { successCount: 0, failedPaths: [] }; }
    };
    const result = await executeStagingCleanup(storageMock, { nowMs: MOCK_NOW, dryRun: true });
    assert.equal(result.isDryRun, true);
    assert.equal(deleteCalled, false);
    assert.equal(result.plan.eligible.length, 1);
  });

  await t.test("E. bounded execution", async () => {
    const objs = Array.from({ length: 5 }).map((_, i) => {
      const uuid = i.toString(16).padStart(12, "0");
      return {
        path: `offers/123/1a2b3c4d-e0f1-4a3b-8c4d-${uuid}`,
        created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString()
      };
    });
    let deletedPathsSent: string[] = [];
    const storageMock = {
      listObjects: async () => objs,
      deleteObjects: async (paths: string[]) => { deletedPathsSent = paths; return { successCount: 3, failedPaths: [] }; }
    };
    const result = await executeStagingCleanup(storageMock, { nowMs: MOCK_NOW, dryRun: false, maxObjects: 3 });
    assert.equal(result.plan.eligible.length, 3);
    assert.deepEqual(deletedPathsSent, result.plan.eligible);
  });

  await t.test("F. deterministic ordering -> oldest first -> stable tie-break", () => {
    const time1 = new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 2000).toISOString();
    const time2 = new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString();
    const objs = [
      { path: "offers/1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0b", created_at: time1 },
      { path: "offers/2/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0a", created_at: time1 },
      { path: "offers/3/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0c", created_at: time2 }
    ];
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    assert.equal(plan.eligible[0], "offers/1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0b");
    assert.equal(plan.eligible[1], "offers/2/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0a");
    assert.equal(plan.eligible[2], "offers/3/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0c");
  });

  await t.test("G. failure reporting", async () => {
    const objs = [
      { path: "offers/1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0b", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() }
    ];
    const storageMock = {
      listObjects: async () => objs,
      deleteObjects: async () => ({ successCount: 0, failedPaths: ["offers/1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0b"] })
    };
    const result = await executeStagingCleanup(storageMock, { nowMs: MOCK_NOW, dryRun: false });
    assert.equal(result.plan.eligible.length, 1);
    assert.equal(result.deleteResult?.failedPaths.length, 1);
  });

  await t.test("H. empty bucket -> safe PASS", async () => {
    let deleteCalled = false;
    const storageMock = {
    listObjects: async () => [],
      deleteObjects: async () => { deleteCalled = true; return { successCount: 0, failedPaths: [] }; }
    };
    const result = await executeStagingCleanup(storageMock, { nowMs: MOCK_NOW, dryRun: false });
    assert.equal(result.plan.totalScanned, 0);
    assert.equal(deleteCalled, false);
  });

  await t.test("I. mixed fresh + stale -> only stale candidate", () => {
    const objs = [
      { path: "offers/1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0b", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() },
      { path: "offers/2/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0a", created_at: new Date(MOCK_NOW - 1000).toISOString() }
    ];
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    assert.equal(plan.eligible.length, 1);
    assert.equal(plan.tooFresh, 1);
  });

  await t.test("J. rerun idempotent", async () => {
    let deleteCalled = false;
    const storageMock = {
      listObjects: async () => [],
      deleteObjects: async () => { deleteCalled = true; return { successCount: 0, failedPaths: [] }; }
    };
    const result = await executeStagingCleanup(storageMock, { nowMs: MOCK_NOW, dryRun: false });
    assert.equal(result.plan.eligible.length, 0);
    assert.equal(deleteCalled, false);
  });

  await t.test("K. request above hard cap -> cap enforced", () => {
    const objs = Array.from({ length: 3000 }).map((_, uuidIndex) => ({
      path: `offers/123/1a2b3c4d-e0f1-4a3b-8c4d-${uuidIndex.toString(16).padStart(12, "0")}`,
      created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString()
    }));
    const plan = planStagingCleanup(objs, MOCK_NOW, 5000);
    // MAX_STAGING_CLEANUP_OBJECTS_PER_RUN is 1000
    assert.equal(plan.eligible.length, 1000);
  });

  await t.test("L. invalid maxObjects -> safe", () => {
    const objs = [{ path: "offers/123/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() }];
    const plan1 = planStagingCleanup(objs, MOCK_NOW, 0);
    assert.equal(plan1.eligible.length, 0);
    const plan2 = planStagingCleanup(objs, MOCK_NOW, -1);
    assert.equal(plan2.eligible.length, 0);
    const plan3 = planStagingCleanup(objs, MOCK_NOW, NaN);
    assert.equal(plan3.eligible.length, 0);
    const plan4 = planStagingCleanup(objs, MOCK_NOW, Infinity);
    assert.equal(plan4.eligible.length, 1);// because Infinity > 1000, but Math.min(Infinity, 1000) ==1000
  });

  await t.test("M. strict path validation -> all invalid examples rejected", () => {
    const time = new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString();
    const invalidPaths = [
      "offers/123/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0dX0x", // wrong length
      "offers/123/1a2b3c4d-e0f1-4a3b-xxxx-5e6f7a8b9c0d",  // invalid hex
      "offers/123/1a2b3c4de0f1-4a3b-8c4d-5e6f7a8b9c0d",   // wrong hyphen positions
      "offers/0/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d",     // offerId 0
      "offers/-1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d",    // negative offerId
      "offers/abc/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d",   // non-numeric offerId
      "offers/123/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d/extra", // extra path segment
      "offers/123", // missing uuid
      "/offers/123/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d" // leading slash
    ];
    const objs = invalidPaths.map(path => ({ path, created_at: time }));
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    assert.equal(plan.eligible.length, 0);
    assert.equal(plan.malformed.length, invalidPaths.length);
  });
});

