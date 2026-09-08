export type StagingObjectClassification = "eligible" | "too_fresh" | "malformed";

export interface StagingObject {
  path: string;
  created_at: string;
}

export interface CleanupPlan {
  eligible: string[];
  tooFresh: number;
  malformed: string[];
  totalScanned: number;
  oldestEligibleTimestamp?: string;
  newestEligibleTimestamp?: string;
}

export const STAGING_ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000; // 24h
export const MAX_STAGING_CLEANUP_OBJECTS_PER_RUN = 1000;

export function classifyStagingObject(
  obj: StagingObject,
  nowMs: number,
  minAgeMs: number = STAGING_ORPHAN_MIN_AGE_MS
): StagingObjectClassification {
  const parts = obj.path.split("/");

  // Strict path validation: offers/<positive integer offerId>/<UUID>
  if (parts.length !== 3) return "malformed";
  if (parts[0] !== "offers") return "malformed";

  const offerId = Number(parts[1]);
  if (!Number.isInteger(offerId) || offerId <= 0) return "malformed";
  if (!/^[1-9]\d*$/.test(parts[1])) return "malformed";

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(parts[2])) return "malformed";

  const createdAt = new Date(obj.created_at).getTime();
  if (isNaN(createdAt)) return "malformed";

  const safeMinAgeMs = Math.max(minAgeMs, STAGING_ORPHAN_MIN_AGE_MS);
  const age = nowMs - createdAt;
  if (age >= safeMinAgeMs) return "eligible";

  return "too_fresh";
}

export function planStagingCleanup(
  objects: StagingObject[],
  nowMs: number,
  maxObjects: number,
  minAgeMs: number = STAGING_ORPHAN_MIN_AGE_MS
): CleanupPlan {
  let sofdMaxObjects = maxObjects;
  if (!sofdMaxObjects || sofdMaxObjects <= 0 || isNaN(sofdMaxObjects)) {
    sofdMaxObjects = 0;
  }

  const actualMax = Math.min(sofdMaxObjects, MAX_STAGING_CLEANUP_OBJECTS_PER_RUN);

  let tooFresh = 0;
  const malformed: string[] = [];
  const eligibleObjects: StagingObject[] = [];

  for (const obj of objects) {
    const classification = classifyStagingObject(obj, nowMs, minAgeMs);
    if (classification === "malformed") {
      malformed.push(obj.path);
    } else if (classification === "too_fresh") {
      tooFresh++;
    } else {
      eligibleObjects.push(obj);
    }
  }

  eligibleObjects.sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.path.localeCompare(b.path);
  });

  const boundedEligible = eligibleObjects.slice(0, actualMax);

  return {
    eligible: boundedEligible.map(o => o.path),
    tooFresh,
    malformed,
    totalScanned: objects.length,
    oldestEligibleTimestamp: boundedEligible.length > 0 ? boundedEligible[0].created_at : undefined,
    newestEligibleTimestamp: boundedEligible.length > 0 ? boundedEligible[boundedEligible.length - 1].created_at : undefined,
  };
}

