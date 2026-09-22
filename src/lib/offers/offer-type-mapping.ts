export const PARTNER_FACING_OFFER_TYPES = [
  "rfq",
  "marketplace",
  "external_partner"
] as const;

export type PartnerFacingOfferType = typeof PARTNER_FACING_OFFER_TYPES[number];

export function isPartnerFacingOfferType(value: unknown): value is PartnerFacingOfferType {
  return typeof value === "string" && (PARTNER_FACING_OFFER_TYPES as readonly string[]).includes(value);
}

export interface OfferStoragePair {
  offerModel: "rfq" | "marketplace";
  conversionType: "inbound" | "outbound";
}

export function deriveOfferStorageForCreateCore(partnerOfferType: PartnerFacingOfferType): OfferStoragePair {
  switch (partnerOfferType) {
    case "rfq":
      return { offerModel: "rfq", conversionType: "inbound" };
    case "marketplace":
      return { offerModel: "marketplace", conversionType: "inbound" };
    case "external_partner":
      return { offerModel: "marketplace", conversionType: "outbound" };
  }
}

export function resolveTechnicalModelToPartnerOfferTypeCore(
  offerModel: unknown,
  conversionType: unknown
): PartnerFacingOfferType | null {
  if (offerModel === "rfq" && conversionType === "inbound") return "rfq";
  if (offerModel === "marketplace" && conversionType === "inbound") return "marketplace";
  if (offerModel === "rfq" && conversionType === "outbound") return "external_partner";
  if (offerModel === "marketplace" && conversionType === "outbound") return "external_partner";
  return null;
}

export function resolveEditTargetStorageCore(
  currentOfferModel: unknown,
  currentConversionType: unknown,
  submittedType: PartnerFacingOfferType
): OfferStoragePair {
  if (
    currentOfferModel === "rfq" &&
    currentConversionType === "outbound" &&
    submittedType === "external_partner"
  ) {
    return { offerModel: "rfq", conversionType: "outbound" };
  }

  return deriveOfferStorageForCreateCore(submittedType);
}
