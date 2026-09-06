import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { offers, offerMedia } from "@/lib/schema";
import { SupabaseOfferMediaStorage } from "@/lib/storage/adapter";
import { uploadOfferMediaCore } from "./offer-media-core";
import { changeOfferMediaCore, MediaOperationError, type MediaOperation } from "./offer-media-management-core";

export function validOfferId(id: number) { return Number.isSafeInteger(id) && id > 0; }
export async function assertMediaOffer(id: number) {
  if (!validOfferId(id)) throw new MediaOperationError("VALIDATION_ERROR");
  const [offer] = await db.select({ id: offers.id }).from(offers).where(eq(offers.id, id)).limit(1);
  if (!offer) throw new MediaOperationError("OFFER_NOT_FOUND");
}
export async function readOfferMedia(offerId: number) {
  await assertMediaOffer(offerId);
  const rows = await db.select().from(offerMedia).where(eq(offerMedia.offerId, offerId)).orderBy(asc(offerMedia.sortOrder), asc(offerMedia.id));
  const storage = new SupabaseOfferMediaStorage();
  return rows.map((row) => ({ id: row.id, sortOrder: row.sortOrder, isPrimary: row.isPrimary, altText: row.altText, url: storage.getPublicUrl(row.storageBucket, row.objectPath) }));
}

export async function persistOfferImage(offerId: number, bytes: Buffer, source?: { sourceType: "remote_import"; sourceUrl: string }) {
  if (!validOfferId(offerId)) return { ok: false as const, code: "VALIDATION_ERROR" };
  const storage = new SupabaseOfferMediaStorage();
  let uploadedPath: string | undefined;
  try {
    return await db.transaction(async (tx) => {
      const [offer] = await tx.select({ id: offers.id }).from(offers).where(eq(offers.id, offerId)).for("update");
      if (!offer) return { ok: false as const, code: "OFFER_NOT_FOUND" };
      const rows = await tx.select().from(offerMedia).where(eq(offerMedia.offerId, offerId));
      return uploadOfferMediaCore(offerId, "", bytes, {
        checkOfferExists: async () => true,
        checkDuplicate: async (_, hash) => rows.some((row) => row.checksumSha256 === hash),
        getMediaCount: async () => rows.length,
        insertMedia: async (data) => {
          // The offer lock serializes every MEDIA-03 upload and gallery mutation.
          const sortOrder = rows.length ? Math.max(...rows.map((row) => row.sortOrder)) + 1 : 0;
          const [row] = await tx.insert(offerMedia).values({ ...data, sortOrder, isPrimary: !rows.some((row) => row.isPrimary) }).returning({ id: offerMedia.id });
          return row.id;
        },
        storage: {
          put: async (...args) => {
            const result = await storage.put(...args);
            if (result.ok) uploadedPath = args[1];
            return result;
          },
          delete: async (...args) => {
            const result = await storage.delete(...args);
            if (result.ok) uploadedPath = undefined;
            return result;
          },
        },
      }, source);
    });
  } catch {
    if (uploadedPath) {
      // A lost COMMIT acknowledgement is ambiguous. Do not delete a committed asset.
      try {
        const [row] = await db.select({ id: offerMedia.id }).from(offerMedia).where(eq(offerMedia.objectPath, uploadedPath)).limit(1);
        if (!row && !(await storage.delete("offer-media", uploadedPath)).ok) return { ok: false as const, code: "DB_ERROR_CLEANUP_FAILED" };
      } catch { return { ok: false as const, code: "DB_ERROR_CLEANUP_FAILED" }; }
    }
    return { ok: false as const, code: "DB_ERROR" };
  }
}

export async function changeOfferMedia(offerId: number, mediaId: number, operation: MediaOperation) {
  if (!validOfferId(offerId)) return { ok: false as const, code: "VALIDATION_ERROR" };
  const storage = new SupabaseOfferMediaStorage();
  return changeOfferMediaCore(offerId, mediaId, operation, {
    storage,
    restore: (removed, bytes) => db.transaction(async (tx) => {
      // Resolve ambiguous COMMIT before restoring: never recreate an object whose
      // row was successfully deleted. Serialize recovery with subsequent mutations.
      await tx.select({ id: offers.id }).from(offers).where(eq(offers.id, offerId)).for("update");
      const [row] = await tx.select().from(offerMedia).where(and(eq(offerMedia.id, removed.id), eq(offerMedia.offerId, offerId)));
      if (!row) return { ok: true };
      try {
        const current = await storage.download(row.storageBucket, row.objectPath);
        return { ok: current.equals(bytes) };
      } catch {
        return storage.put(row.storageBucket, row.objectPath, bytes, row.mimeType);
      }
    }),
    transaction: (work) => db.transaction(async (tx) => {
      const [offer] = await tx.select({ id: offers.id }).from(offers).where(eq(offers.id, offerId)).for("update");
      if (!offer) throw new MediaOperationError("OFFER_NOT_FOUND");
      const rows = await tx.select().from(offerMedia).where(eq(offerMedia.offerId, offerId));
      return work({ rows, apply: async (ordered, deletedId) => {
        // Clear first within the same transaction to respect the immediate unique index.
        await tx.update(offerMedia).set({ isPrimary: false }).where(eq(offerMedia.offerId, offerId));
        if (deletedId !== undefined) await tx.delete(offerMedia).where(and(eq(offerMedia.id, deletedId), eq(offerMedia.offerId, offerId)));
        for (const row of ordered) await tx.update(offerMedia).set({ isPrimary: row.isPrimary, sortOrder: row.sortOrder, updatedAt: new Date() }).where(and(eq(offerMedia.id, row.id), eq(offerMedia.offerId, offerId)));
      } });
    }),
  });
}
