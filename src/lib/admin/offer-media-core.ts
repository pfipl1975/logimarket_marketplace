import { validateImageSignature, computeSha256 } from "@/lib/storage/image-validation";
import crypto from "crypto";

export const MEDIA_BUCKET = "offer-media";
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MiB

export type UploadOfferMediaResult =
  | { ok: true; mediaId: number }
  | { ok: false; code: "OFFER_NOT_FOUND" | "FILE_TOO_LARGE" | "FILE_EMPTY" | "INVALID_MIME_TYPE" | "DUPLICATE_CONTENT" | "STORAGE_ERROR" | "DB_ERROR" | "DB_ERROR_CLEANUP_FAILED" };

export interface OfferMediaDependencies {
  checkOfferExists: (offerId: number) => Promise<boolean>;
  checkDuplicate: (offerId: number, checksum: string) => Promise<boolean>;
  getMediaCount: (offerId: number) => Promise<number>;
  insertMedia: (data: {
    offerId: number;
    storageBucket: string;
    objectPath: string;
    sourceType: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string;
    isPrimary: boolean;
    sortOrder: number;
  }) => Promise<number>;
  storage: {
    put: (bucket: string, path: string, buffer: Buffer, mime: string) => Promise<{ ok: boolean; error?: unknown }>;
    delete: (bucket: string, path: string) => Promise<{ ok: boolean; error?: unknown }>;
  };
  generateId?: () => string;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif"
};

export async function uploadOfferMediaCore(
  offerId: number,
  fileName: string,
  buffer: Buffer,
  deps: OfferMediaDependencies
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

  const offerExists = await deps.checkOfferExists(offerId);
  if (!offerExists) {
    return { ok: false, code: "OFFER_NOT_FOUND" };
  }

  const checksum = computeSha256(buffer);

  const isDuplicate = await deps.checkDuplicate(offerId, checksum);
  if (isDuplicate) {
    return { ok: false, code: "DUPLICATE_CONTENT" };
  }

  const count = await deps.getMediaCount(offerId);
  const isFirst = count === 0;

  const ext = MIME_TO_EXT[validMime] || ".bin";
  const uniqueId = deps.generateId ? deps.generateId() : crypto.randomUUID();
  const objectPath = `offers/${offerId}/${uniqueId}${ext}`;

  const uploadResult = await deps.storage.put(MEDIA_BUCKET, objectPath, buffer, validMime);

  if (!uploadResult.ok) {
    console.error(`[MEDIA-02] Storage upload failed for offerId ${offerId}: stage=STORAGE`, uploadResult.error);
    return { ok: false, code: "STORAGE_ERROR" };
  }

  try {
    const mediaId = await deps.insertMedia({
      offerId,
      storageBucket: MEDIA_BUCKET,
      objectPath,
      sourceType: "upload",
      mimeType: validMime,
      sizeBytes: buffer.length,
      checksumSha256: checksum,
      isPrimary: isFirst,
      sortOrder: isFirst ? 0 : count,
    });

    return { ok: true, mediaId };
  } catch (error) {
    console.error(`[MEDIA-02] DB persistence failed for offerId ${offerId}: stage=DB_PERSISTENCE`, error);

    const delResult = await deps.storage.delete(MEDIA_BUCKET, objectPath);
    if (!delResult.ok) {
      console.error(`[MEDIA-02] Compensating delete failed for offerId ${offerId}, objectPath ${objectPath}: stage=CLEANUP_FAILURE. ERROR:`, delResult.error);
      return { ok: false, code: "DB_ERROR_CLEANUP_FAILED" };
    }

    return { ok: false, code: "DB_ERROR" };
  }
}
