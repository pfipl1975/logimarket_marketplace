import type { OfferPublicationStatus } from "@/lib/schema";
import { isConversionAllowedStatus } from "@/lib/offers/status";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";

export interface PublicRfqEligibilityOffer {
  isActive: boolean;
  publicationStatus: OfferPublicationStatus;
  offerModel: string | null;
  conversionType: string | null;
}

export function validatePublicRfqEligibility(offer: PublicRfqEligibilityOffer): boolean {
  if (!offer.isActive) return false;
  if (!isConversionAllowedStatus(offer.publicationStatus)) return false;

  const canonicalModel = resolveCanonicalOfferModel(offer.offerModel, offer.conversionType);
  if (canonicalModel !== "rfq") return false;

  return true;
}
