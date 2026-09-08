import { getCanonicalOfferMediaPublicUrl } from "@/lib/storage/adapter";

export function resolvePublicOfferImage(
  legacyImageUrl: string | null,
  primaryMediaStorageBucket?: string | null,
  primaryMediaObjectPath?: string | null
): string | null {
  if (primaryMediaStorageBucket && primaryMediaObjectPath) {
    return getCanonicalOfferMediaPublicUrl(primaryMediaStorageBucket, primaryMediaObjectPath);
  }
  return legacyImageUrl || null;
}
