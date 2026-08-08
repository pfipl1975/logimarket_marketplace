import { isConversionAllowedStatus } from "@/lib/offers/status";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";

export function validatePublicRfqEligibility(offer: {
  isActive: boolean;
  publicationStatus: string;
  offerModel: string | null;
  conversionType: string | null;
}): boolean {
  if (!offer.isActive) return false;
  if (!isConversionAllowedStatus(offer.publicationStatus as any)) return false;
  
  const canonicalModel = resolveCanonicalOfferModel(offer.offerModel, offer.conversionType);
  if (canonicalModel !== "rfq") return false;

  return true;
}
