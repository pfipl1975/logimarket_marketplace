
export type StagingObjectClassification = "eligible" | "too_fresh" | "malformed";

export interface StagingObject {
  path: string; // should be something like "offers/123/uuid" or "uuid" if prefixed. Let us assume it is the full path or relative path from the listing.
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

export const STAGING_ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

export function classifyStagingObject(
  obj: StagingObject, 
  nowMs: number, 
  minAgeMs: number = STAGING_ORPHAN_MIN_AGE_MS
): StagingObjectClassification {
  const parts = obj.path.split("/");
  // Depending on how we list, it might be "offers/123/uuid"
  if (parts.length !== 3 || parts[0] !== "offers" || !/^\d+$/.test(parts[1]) || !/^[0-9a-f-]{36}$/i.test(parts[2])) {
    return "malformed";
  }

  const createdAt = new Date(obj.created_at).getTime();
  if (isNaN(createdAt)) {
    return "malformed";
  }

  const age = nowMs - createdAt;
  if (age >= minAgeMs) {
    return "eligible";
  }

  return "too_fresh";
}

export function planStagingCleanup(
  objects: StagingObject[], 
  nowMs: number, 
  maxObjects: number,
  minAgeMs: number = STAGING_ORPHAN_MIN_AGE_MS
): CleanupPlan {
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

  const boundedEligible = eligibleObjects.slice(0, maxObjects);

  return {
    eligible: boundedEligible.map(o => o.path),
    tooFresh,
    malformed,
    totalScanned: objects.length,
    oldestEligibleTimestamp: boundedEligible.length > 0 ? boundedEligible[0].created_at : undefined,
    newestEligibleTimestamp: boundedEligible.length > 0 ? boundedEligible[boundedEligible.length - 1].created_at : undefined,
  };
}

