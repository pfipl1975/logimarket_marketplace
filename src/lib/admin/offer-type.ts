export type AdminOfferType =
  | "rfq"
  | "marketplace"
  | "external_partner";

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
    default:
      return { offerModel: "unknown" as any, conversionType: "unknown" as any };
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
