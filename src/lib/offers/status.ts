import type { OfferPublicationStatus } from "@/lib/schema";

export const OFFER_PUBLICATION_STATUSES: OfferPublicationStatus[] = [
  "draft",
  "published",
  "hidden",
  "archived",
  "deleted",
];

export function isPublishedOffer(status: OfferPublicationStatus): boolean {
  return status === "published";
}

export function isPublicOfferDetailStatus(status: OfferPublicationStatus): boolean {
  return status === "published" || status === "archived";
}

export function isConversionAllowedStatus(status: OfferPublicationStatus): boolean {
  return status === "published";
}

export function isSitemapEligibleStatus(status: OfferPublicationStatus): boolean {
  return status === "published";
}

export function isArchivedOffer(status: OfferPublicationStatus): boolean {
  return status === "archived";
}
