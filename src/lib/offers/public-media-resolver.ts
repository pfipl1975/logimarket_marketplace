import { getCanonicalOfferMediaPublicUrl } from "@/lib/storage/adapter";

export function resolvePublicOfferImage(
  legacyImageUrl: string | null,
  primaryMediaStorageBucket?: string | null,
  primaryMediaObjectPath?: string | null
): string | null {
  if (primaryMediaStorageBucket && primaryMediaObjectPath) {
    const canonical = getCanonicalOfferMediaPublicUrl(primaryMediaStorageBucket, primaryMediaObjectPath);
    if (canonical) {
      return canonical;
    }
  }
  return legacyImageUrl || null;
}
