export type MediaOperation = "primary" | "previous" | "next" | "delete";
export interface ManagedMedia {
  id: number; offerId: number; sortOrder: number; isPrimary: boolean;
  storageBucket: string; objectPath: string; mimeType: string;
}
export class MediaOperationError extends Error {
  constructor(public readonly code: string) { super(code); }
}
export function planMediaChange(rows: ManagedMedia[], offerId: number, mediaId: number, operation: MediaOperation) {
  if (!["primary", "previous", "next", "delete"].includes(operation) || !Number.isSafeInteger(mediaId)) throw new MediaOperationError("VALIDATION_ERROR");
  const ordered = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const index = ordered.findIndex((row) => row.id === mediaId && row.offerId === offerId);
  if (index < 0 || ordered.some((row) => row.offerId !== offerId)) throw new MediaOperationError("MEDIA_NOT_FOUND");
  const selected = ordered[index];
  if (operation === "delete") ordered.splice(index, 1);
  if (operation === "previous" || operation === "next") {
    const next = index + (operation === "previous" ? -1 : 1);
    if (next >= 0 && next < ordered.length) [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
  }
  const primaryId = operation === "primary" ? mediaId : ordered.find((row) => row.isPrimary)?.id ?? ordered[0]?.id;
  return { selected, rows: ordered.map((row, sortOrder) => ({ ...row, sortOrder, isPrimary: row.id === primaryId })) };
}

export interface MediaManagementDependencies {
  transaction<T>(work: (tx: {
    rows: ManagedMedia[];
    apply(rows: ManagedMedia[], deletedId?: number): Promise<void>;
  }) => Promise<T>): Promise<T>;
  storage: {
    download(bucket: string, path: string): Promise<Buffer>;
    delete(bucket: string, path: string): Promise<{ ok: boolean }>;
    put(bucket: string, path: string, body: Buffer, mime: string): Promise<{ ok: boolean }>;
  };
  restore?(row: ManagedMedia, bytes: Buffer): Promise<{ ok: boolean }>;
}
export async function changeOfferMediaCore(offerId: number, mediaId: number, operation: MediaOperation, deps: MediaManagementDependencies) {
  let removed: { row: ManagedMedia; bytes: Buffer } | undefined;
  try {
    await deps.transaction(async (tx) => {
      const plan = planMediaChange(tx.rows, offerId, mediaId, operation);
      let backup: Buffer | undefined;
      if (operation === "delete") {
        try { backup = await deps.storage.download(plan.selected.storageBucket, plan.selected.objectPath); }
        catch { throw new MediaOperationError("STORAGE_ERROR"); }
      }
      // DB changes are uncommitted until storage deletion succeeds.
      await tx.apply(plan.rows, operation === "delete" ? mediaId : undefined);
      if (backup) {
        // A failed response does not prove that Storage kept the object.
        removed = { row: plan.selected, bytes: backup };
        const result = await deps.storage.delete(plan.selected.storageBucket, plan.selected.objectPath);
        if (!result.ok) throw new MediaOperationError("STORAGE_ERROR");
      }
    });
    return { ok: true as const };
  } catch (error) {
    if (removed) {
      try {
        const restored = deps.restore
          ? await deps.restore(removed.row, removed.bytes)
          : await deps.storage.put(removed.row.storageBucket, removed.row.objectPath, removed.bytes, removed.row.mimeType);
        if (!restored.ok) return { ok: false as const, code: "DB_ERROR_CLEANUP_FAILED" };
      } catch { return { ok: false as const, code: "DB_ERROR_CLEANUP_FAILED" }; }
    }
    return { ok: false as const, code: error instanceof MediaOperationError ? error.code : "DB_ERROR" };
  }
}
