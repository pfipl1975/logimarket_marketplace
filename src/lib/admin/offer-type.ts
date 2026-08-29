export const ADMIN_OFFER_TYPES = [
  "rfq",
  "marketplace",
  "external_partner"
] as const;

export type AdminOfferType = typeof ADMIN_OFFER_TYPES[number];

export function isAdminOfferType(value: unknown): value is AdminOfferType {
  return typeof value === "string" && (ADMIN_OFFER_TYPES as readonly string[]).includes(value);
}

export interface OfferStoragePair {
  offerModel: "rfq" | "marketplace";
  conversionType: "inbound" | "outbound";
}

export function deriveOfferStorageForCreate(adminOfferType: AdminOfferType): OfferStoragePair {
  switch (adminOfferType) {
    case "rfq":
      return { offerModel: "rfq", conversionType: "inbound" };
    case "marketplace":
      return { offerModel: "marketplace", conversionType: "inbound" };
    case "external_partner":
      return { offerModel: "marketplace", conversionType: "outbound" };
  }
}

export function resolveTechnicalModelToAdminOfferType(
  offerModel: unknown,
  conversionType: unknown
): AdminOfferType | null {
  if (offerModel === "rfq" && conversionType === "inbound") return "rfq";
  if (offerModel === "marketplace" && conversionType === "inbound") return "marketplace";
  if (offerModel === "rfq" && conversionType === "outbound") return "external_partner";
  if (offerModel === "marketplace" && conversionType === "outbound") return "external_partner";
  return null;
}

export function resolveAdminEditTargetStorage(
  currentOfferModel: unknown,
  currentConversionType: unknown,
  submittedAdminOfferType: AdminOfferType
): OfferStoragePair {
  if (
    currentOfferModel === "rfq" &&
    currentConversionType === "outbound" &&
    submittedAdminOfferType === "external_partner"
  ) {
    return { offerModel: "rfq", conversionType: "outbound" };
  }

  return deriveOfferStorageForCreate(submittedAdminOfferType);
}
