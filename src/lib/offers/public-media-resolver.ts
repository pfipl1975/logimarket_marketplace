import { getCanonicalOfferMediaPublicUrl } from "@/lib/storage/adapter";

const PUBLIC_OFFER_MEDIA_BUCKET = "offer-media";

export type PublicOfferMediaSource = {
  id: number;
  storageBucket: string | null;
  objectPath: string | null;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type PublicOfferMediaItem = {
  id: number | "legacy";
  url: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
};

function resolveCanonicalPublicMediaUrl(
  storageBucket?: string | null,
  objectPath?: string | null,
): string | null {
  const normalizedPath = objectPath?.trim();
  if (storageBucket !== PUBLIC_OFFER_MEDIA_BUCKET || !normalizedPath) {
    return null;
  }

  return getCanonicalOfferMediaPublicUrl(
    PUBLIC_OFFER_MEDIA_BUCKET,
    normalizedPath,
  ) || null;
}

export function resolvePublicOfferImage(
  legacyImageUrl: string | null,
  primaryMediaStorageBucket?: string | null,
  primaryMediaObjectPath?: string | null
): string | null {
  const canonical = resolveCanonicalPublicMediaUrl(
    primaryMediaStorageBucket,
    primaryMediaObjectPath,
  );
  if (canonical) {
    return canonical;
  }

  const normalizedLegacyUrl = legacyImageUrl?.trim();
  return normalizedLegacyUrl || null;
}

export function resolvePublicOfferGallery(
  legacyImageUrl: string | null,
  offerTitle: string,
  media: PublicOfferMediaSource[],
): PublicOfferMediaItem[] {
  const canonicalMedia = [...media]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
    .flatMap((item) => {
      const url = resolveCanonicalPublicMediaUrl(
        item.storageBucket,
        item.objectPath,
      );
      return url ? [{ item, url }] : [];
    });

  if (canonicalMedia.length > 0) {
    return canonicalMedia.map(({ item, url }, index) => ({
      id: item.id,
      url,
      altText: item.altText?.trim() || `${offerTitle} — ${index + 1}`,
      isPrimary: item.isPrimary,
      sortOrder: item.sortOrder,
    }));
  }

  const normalizedLegacyUrl = legacyImageUrl?.trim();
  return normalizedLegacyUrl
    ? [{
        id: "legacy",
        url: normalizedLegacyUrl,
        altText: `${offerTitle} — 1`,
        isPrimary: true,
        sortOrder: 0,
      }]
    : [];
}

export function selectInitialPublicOfferMedia(
  media: PublicOfferMediaItem[],
): PublicOfferMediaItem | null {
  return media.find((item) => item.isPrimary) ?? media[0] ?? null;
}
