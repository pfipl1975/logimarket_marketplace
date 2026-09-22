import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db";
import { offers, offerMedia } from "@/lib/schema";
import { SupabaseOfferMediaStorage } from "@/lib/storage/adapter";
import { uploadOfferMediaCore } from "@/lib/admin/offer-media-core";
import { changeOfferMediaCore, MediaOperationError, type MediaOperation } from "@/lib/admin/offer-media-management-core";

export interface PartnerMediaDeps {
  db?: typeof defaultDb;
  storage?: {
    put(bucket: string, path: string, buffer: Buffer, mime: string): Promise<{ ok: boolean; path?: string }>;
    delete(bucket: string, path: string): Promise<{ ok: boolean }>;
    download(bucket: string, path: string): Promise<Buffer>;
    getPublicUrl(bucket: string, path: string): string;
  };
}

export function validId(id: number) { return Number.isSafeInteger(id) && id > 0; }

export async function assertPartnerMediaOffer(offerId: number, partnerId: number, deps?: PartnerMediaDeps) {
  if (!validId(offerId) || !validId(partnerId)) throw new MediaOperationError("VALIDATION_ERROR");
  const db = deps?.db ?? defaultDb;
  const [offer] = await db.select({ 
    id: offers.id, 
    partnerId: offers.partnerId, 
    publicationStatus: offers.publicationStatus 
  }).from(offers).where(and(eq(offers.id, offerId), isNull(offers.deletedAt))).limit(1);
  
  if (!offer) throw new MediaOperationError("OFFER_NOT_FOUND");
  if (offer.partnerId !== partnerId) throw new MediaOperationError("UNAUTHORIZED");
  if (offer.publicationStatus !== "draft") throw new MediaOperationError("OFFER_NOT_EDITABLE");
}

export async function readPartnerOfferMedia(offerId: number, partnerId: number, deps?: PartnerMediaDeps) {
  const db = deps?.db ?? defaultDb;
  const storage = deps?.storage ?? new SupabaseOfferMediaStorage();
  await assertPartnerMediaOffer(offerId, partnerId, deps);
  const rows = await db.select().from(offerMedia).where(eq(offerMedia.offerId, offerId)).orderBy(asc(offerMedia.sortOrder), asc(offerMedia.id));
  return rows.map((row) => ({ id: row.id, sortOrder: row.sortOrder, isPrimary: row.isPrimary, altText: row.altText, url: storage.getPublicUrl(row.storageBucket, row.objectPath) }));
}

export async function persistPartnerOfferImage(offerId: number, partnerId: number, bytes: Buffer, deps?: PartnerMediaDeps) {
  if (!validId(offerId) || !validId(partnerId)) return { ok: false as const, code: "VALIDATION_ERROR" };
  const db = deps?.db ?? defaultDb;
  const storage = deps?.storage ?? new SupabaseOfferMediaStorage();
  let uploadedPath: string | undefined;
  try {
    return await db.transaction(async (tx) => {
      const [offer] = await tx.select({ 
        id: offers.id,
        partnerId: offers.partnerId,
        publicationStatus: offers.publicationStatus
      }).from(offers).where(and(eq(offers.id, offerId), isNull(offers.deletedAt))).for("update");
      
      if (!offer) return { ok: false as const, code: "OFFER_NOT_FOUND" };
      if (offer.partnerId !== partnerId) return { ok: false as const, code: "UNAUTHORIZED" };
      if (offer.publicationStatus !== "draft") return { ok: false as const, code: "OFFER_NOT_EDITABLE" };
      
      const rows = await tx.select().from(offerMedia).where(eq(offerMedia.offerId, offerId));
      return uploadOfferMediaCore(offerId, "", bytes, {
        checkOfferExists: async () => true,
        checkDuplicate: async (_, hash) => rows.some((row) => row.checksumSha256 === hash),
        getMediaCount: async () => rows.length,
        insertMedia: async (data) => {
          const sortOrder = rows.length ? Math.max(...rows.map((row) => row.sortOrder)) + 1 : 0;
          const [row] = await tx.insert(offerMedia).values({ ...data, sortOrder, isPrimary: !rows.some((row) => row.isPrimary) }).returning({ id: offerMedia.id });
          return row.id;
        },
        storage: {
          put: async (...args) => {
            const result = await storage.put(...args);
            if (result.ok) uploadedPath = result.path ?? args[1];
            return result;
          },
          delete: async (...args) => {
            const result = await storage.delete(...args);
            if (result.ok) uploadedPath = undefined;
            return result;
          },
        },
      });
    });
  } catch {
    if (uploadedPath) {
      try {
        const [row] = await db.select({ id: offerMedia.id }).from(offerMedia).where(eq(offerMedia.objectPath, uploadedPath)).limit(1);
        if (!row && !(await storage.delete("offer-media", uploadedPath)).ok) return { ok: false as const, code: "DB_ERROR_CLEANUP_FAILED" };
      } catch { return { ok: false as const, code: "DB_ERROR_CLEANUP_FAILED" }; }
    }
    return { ok: false as const, code: "DB_ERROR" };
  }
}

export async function changePartnerOfferMedia(offerId: number, partnerId: number, mediaId: number, operation: MediaOperation, deps?: PartnerMediaDeps) {
  if (!validId(offerId) || !validId(partnerId) || !validId(mediaId)) return { ok: false as const, code: "VALIDATION_ERROR" };
  const db = deps?.db ?? defaultDb;
  const storage = deps?.storage ?? new SupabaseOfferMediaStorage();
  return changeOfferMediaCore(offerId, mediaId, operation, {
    storage,
    restore: (removed, bytes) => db.transaction(async (tx) => {
      await tx.select({ id: offers.id }).from(offers).where(and(eq(offers.id, offerId), isNull(offers.deletedAt))).for("update");
      const [row] = await tx.select().from(offerMedia).where(and(eq(offerMedia.id, removed.id), eq(offerMedia.offerId, offerId)));
      if (!row) return { ok: true };
      try {
        const current = await storage.download(row.storageBucket, row.objectPath);
        return { ok: current.equals(bytes) };
      } catch {
        const res = await storage.put(row.storageBucket, row.objectPath, bytes, row.mimeType);
        return { ok: res.ok };
      }
    }),
    transaction: (work) => db.transaction(async (tx) => {
      const [offer] = await tx.select({ 
        id: offers.id,
        partnerId: offers.partnerId,
        publicationStatus: offers.publicationStatus
      }).from(offers).where(and(eq(offers.id, offerId), isNull(offers.deletedAt))).for("update");
      
      if (!offer) throw new MediaOperationError("OFFER_NOT_FOUND");
      if (offer.partnerId !== partnerId) throw new MediaOperationError("UNAUTHORIZED");
      if (offer.publicationStatus !== "draft") throw new MediaOperationError("OFFER_NOT_EDITABLE");
      
      const rows = await tx.select().from(offerMedia).where(eq(offerMedia.offerId, offerId));
      return work({ rows, apply: async (ordered, deletedId) => {
        await tx.update(offerMedia).set({ isPrimary: false }).where(eq(offerMedia.offerId, offerId));
        if (deletedId !== undefined) await tx.delete(offerMedia).where(and(eq(offerMedia.id, deletedId), eq(offerMedia.offerId, offerId)));
        for (const row of ordered) await tx.update(offerMedia).set({ isPrimary: row.isPrimary, sortOrder: row.sortOrder, updatedAt: new Date() }).where(and(eq(offerMedia.id, row.id), eq(offerMedia.offerId, offerId)));
      } });
    }),
  });
}
