import {
  PARTNER_FACING_OFFER_TYPES,
  type PartnerFacingOfferType,
  deriveOfferStorageForCreateCore,
  resolveTechnicalModelToPartnerOfferTypeCore,
  resolveEditTargetStorageCore,
  type OfferStoragePair
} from "@/lib/offers/offer-type-mapping";

export const ADMIN_OFFER_TYPES = PARTNER_FACING_OFFER_TYPES;
export type AdminOfferType = PartnerFacingOfferType;
export type { OfferStoragePair };

export function isAdminOfferType(value: unknown): value is AdminOfferType {
  return typeof value === "string" && (ADMIN_OFFER_TYPES as readonly string[]).includes(value);
}

export function deriveOfferStorageForCreate(adminOfferType: AdminOfferType): OfferStoragePair {
  return deriveOfferStorageForCreateCore(adminOfferType);
}

export function resolveTechnicalModelToAdminOfferType(
  offerModel: unknown,
  conversionType: unknown
): AdminOfferType | null {
  return resolveTechnicalModelToPartnerOfferTypeCore(offerModel, conversionType);
}

export function resolveAdminEditTargetStorage(
  currentOfferModel: unknown,
  currentConversionType: unknown,
  submittedAdminOfferType: AdminOfferType
): OfferStoragePair {
  return resolveEditTargetStorageCore(currentOfferModel, currentConversionType, submittedAdminOfferType);
}
