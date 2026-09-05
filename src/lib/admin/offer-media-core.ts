import { db } from "@/lib/db";
import { offers, offerMedia } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { SupabaseOfferMediaStorage } from "@/lib/storage/adapter";
import { validateImageSignature, computeSha256 } from "@/lib/storage/image-validation";
import crypto from "crypto";
import path from "path";

export const MEDIA_BUCKET = "offer-media";
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MiB

export type UploadOfferMediaResult = 
  | { ok: true; mediaId: number }
  | { ok: false; code: "OFFER_NOT_FOUND" | "FILE_TOO_LARGE" | "FILE_EMPTY" | "INVALID_MIME_TYPE" | "DUPLICATE_CONTENT" | "STORAGE_ERROR" | "DB_ERROR" };

export async function uploadOfferMediaCore(
  offerId: number,
  fileName: string,
  buffer: Buffer
): Promise<UploadOfferMediaResult> {
  if (buffer.length === 0) {
    return { ok: false, code: "FILE_EMPTY" };
  }
  if (buffer.length > MAX_UPLOAD_SIZE) {
    return { ok: false, code: "FILE_TOO_LARGE" };
  }

  const validMime = validateImageSignature(buffer);
  if (!validMime) {
    return { ok: false, code: "INVALID_MIME_TYPE" };
  }

  // Check offer existence
  const offerRows = await db
    .select({ id: offers.id })
    .from(offers)
    .where(eq(offers.id, offerId))
    .limit(1);

  if (offerRows.length === 0) {
    return { ok: false, code: "OFFER_NOT_FOUND" };
  }

  const checksum = computeSha256(buffer);

  // Check deduplication invariant
  const existingMedia = await db
    .select({ id: offerMedia.id })
    .from(offerMedia)
    .where(
      and(
        eq(offerMedia.offerId, offerId),
        eq(offerMedia.checksumSha256, checksum)
      )
    )
    .limit(1);

  if (existingMedia.length > 0) {
    return { ok: false, code: "DUPLICATE_CONTENT" };
  }

  // Check existing primary
  const primaryCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offerMedia)
    .where(eq(offerMedia.offerId, offerId));
    
  const isFirst = primaryCount[0]?.count === 0;

  const ext = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, "") || ".bin";
  const uniqueId = crypto.randomUUID();
  const objectPath = `offers/${offerId}/${uniqueId}${ext}`;

  const storage = new SupabaseOfferMediaStorage();
  
  const uploadResult = await storage.put(MEDIA_BUCKET, objectPath, buffer, validMime);
  
  if (!uploadResult.ok) {
    console.error("Storage upload failed:", uploadResult.error);
    return { ok: false, code: "STORAGE_ERROR" };
  }

  try {
    const insertResult = await db.insert(offerMedia).values({
      offerId,
      storageBucket: MEDIA_BUCKET,
      objectPath,
      sourceType: "upload",
      mimeType: validMime,
      sizeBytes: buffer.length,
      checksumSha256: checksum,
      isPrimary: isFirst,
      sortOrder: isFirst ? 0 : primaryCount[0].count,
    }).returning({ id: offerMedia.id });
    
    return { ok: true, mediaId: insertResult[0].id };
  } catch (error) {
    console.error("DB persistence failed after upload, attempting compensating delete:", error);
    // Compensating delete
    await storage.delete(MEDIA_BUCKET, objectPath);
    return { ok: false, code: "DB_ERROR" };
  }
}
