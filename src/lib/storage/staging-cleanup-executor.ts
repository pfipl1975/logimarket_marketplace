import { StagingObject, planStagingCleanup, CleanupPlan } from "./staging-cleanup";
export interface StorageAdapter {
  listObjects(): Promise<StagingObject[]>;
  deleteObjects(paths: string[]): Promise<{ successCount: number; failedPaths: string[] }>;
}

export interface CleanupExecutionResult {
  plan: CleanupPlan;
  isDryRun: boolean;
  deleteResult?: {
    successCount: number;
    failedPaths: string[];
  };
}

export async function executeStagingCleanup(
  storage: StorageAdapter,
  options: {
    nowMs?: number;
    maxObjects?: number;
    minAgeMs?: number;
    dryRun?: boolean;
  } = {}
): Promise<CleanupExecutionResult> {
  const nowMs = options.nowMs ?? Date.now();
  const maxObjects = options.maxObjects ?? 100;
  const minAgeMs = options.minAgeMs;
  const isDryRun = options.dryRun ?? true;

  const objects = await storage.listObjects();
  const plan = planStagingCleanup(objects, nowMs, maxObjects, minAgeMs);

  if (isDryRun || plan.eligible.length === 0) {
    return { plan, isDryRun };
  }

  const deleteResult = await storage.deleteObjects(plan.eligible);
  return { plan, isDryRun, deleteResult };
}

