import { describe, it, expect, vi } from "vitest";
import { planStagingCleanup, STAGING_ORPHAN_MIN_AGE_MS } from "../../src/lib/storage/staging-cleanup";
import { executeStagingCleanup } from "../../src/lib/storage/staging-cleanup-executor";

const MOCK_NOW = new Date("2026-01-02T12:00:00Z").getTime();

describe("Staging Orphan Cleanup Lifecycle", () => {
  it("A. fresh staging object -> NOT eligible", () => {
    const objs = [{ path: "offers/123/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d", created_at: new Date(MOCK_NOW - 1000).toISOString() }];
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    expect(plan.eligible.length).toBe(0);
    expect(plan.tooFresh).toBe(1);
  });

  it("B. old staging object -> eligible", () => {
    const objs = [{ path: "offers/123/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() }];
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    expect(plan.eligible.length).toBe(1);
  });

  it("C. old malformed path -> REPORT_ONLY", () => {
    const objs = [
      { path: "offers/123/made-up-not-uuid", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() },
      { path: "otherfile.txt", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() }
    ];
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    expect(plan.eligible.length).toBe(0);
    expect(plan.malformed.length).toBe(2);
  });

  it("D. dry-run -> zero delete calls", async () => {
    const storageMock = {
      listObjects: vi.fn().mockResolvedValue([{ path: "offers/123/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0d", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() }]),
      deleteObjects: vi.fn().mockResolvedValue({ successCount: 0, failedPaths: [] })
    };
    const result = await executeStagingCleanup(storageMock, { nowMs: MOCK_NOW, dryRun: true });
    expect(result.isDryRun).toBe(true);
    expect(storageMock.deleteObjects).toHaveBeenCalledTimes(0);
    expect(result.plan.eligible.length).toBe(1);
  });

  it("E. candidate count > max batch -> only MAX_OBJECTS_PER_RUN planned/executed", async () => {
    const objs = Array.from({ length: 5 }).map((_, i) => {
      let uuid = i.toString(16).padStart(12, "0");
      return {
        path: `offers/123/1a2b3c4d-e0f1-4a3b-8c4d-${uuid}`,
        created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString()
      };
    });
    const storageMock = {
      listObjects: vi.fn().mockResolvedValue(objs),
      deleteObjects: vi.fn().mockResolvedValue({ successCount: 3, failedPaths: [] })
    };
    const result = await executeStagingCleanup(storageMock, { nowMs: MOCK_NOW, dryRun: false, maxObjects: 3 });
    expect(result.plan.eligible.length).toBe(3);
    expect(storageMock.deleteObjects).toHaveBeenCalledWith(result.plan.eligible);
  });

  it("F. deterministic ordering -> oldest first -> stable tie-break", () => {
    const time1 = new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 2000).toISOString();
    const time2 = new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString();
    const objs = [
      { path: "offers/1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0b", created_at: time1 },
      { path: "offers/2/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0a", created_at: time1 },
      { path: "offers/3/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0c", created_at: time2 }
    ];
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    expect(plan.eligible[0]).toBe("offers/1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0b");
    expect(plan.eligible[1]).toBe("offers/2/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0a");
    expect(plan.eligible[2]).toBe("offers/3/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0c");
  });

  it("G. delete failure for one object -> bounded failure reporting", async () => {
    const objs = [
      { path: "offers/1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0b", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() }
    ];
    const storageMock = {
      listObjects: vi.fn().mockResolvedValue(objs),
      deleteObjects: vi.fn().mockResolvedValue({ successCount: 0, failedPaths: ["offers/1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0b"] })
    };
    const result = await executeStagingCleanup(storageMock, { nowMs: MOCK_NOW, dryRun: false });
    expect(result.plan.eligible.length).toBe(1);
    expect(result.deleteResult?.failedPaths.length).toBe(1);
  });

  it("H. empty bucket -> safe PASS", async () => {
    const storageMock = {
      listObjects: vi.fn().mockResolvedValue([]),
      deleteObjects: vi.fn().mockResolvedValue({ successCount: 0, failedPaths: [] })
    };
    const result = await executeStagingCleanup(storageMock, { nowMs: MOCK_NOW, dryRun: false });
    expect(result.plan.totalScanned).toBe(0);
    expect(storageMock.deleteObjects).toHaveBeenCalledTimes(0);
  });

  it("I. mixed fresh + stale -> only stale candidate", () => {
    const objs = [
      { path: "offers/1/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0b", created_at: new Date(MOCK_NOW - STAGING_ORPHAN_MIN_AGE_MS - 1000).toISOString() },
      { path: "offers/2/1a2b3c4d-e0f1-4a3b-8c4d-5e6f7a8b9c0a", created_at: new Date(MOCK_NOW - 1000).toISOString() }
    ];
    const plan = planStagingCleanup(objs, MOCK_NOW, 100);
    expect(plan.eligible.length).toBe(1);
    expect(plan.tooFresh).toBe(1);
  });

  it("J. rerun after successful delete -> naturally idempotent", async () => {
    const storageMock = {
      listObjects: vi.fn().mockResolvedValue([]),
      deleteObjects: vi.fn().mockResolvedValue({ successCount: 0, failedPaths: [] })
    };
    const result = await executeStagingCleanup(storageMock, { nowMs: MOCK_NOW, dryRun: false });
    expect(result.plan.eligible.length).toBe(0);
    expect(storageMock.deleteObjects).toHaveBeenCalledTimes(0);
  });
});

