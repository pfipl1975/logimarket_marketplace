import { resolveCanonicalOfferModel } from "@/lib/offers/model";
import { isConversionAllowedStatus } from "@/lib/offers/status";
import type { OfferPublicationStatus } from "@/lib/schema";
import { isValidCheckoutQuantity, parseDecimalToMinorUnits } from "./money";

/**
 * Raw offer row as fetched from the DB during checkout.
 * Only fields needed for eligibility checking.
 */
export interface CheckoutOfferRow {
  id: number;
  title: string;
  isActive: boolean;
  publicationStatus: OfferPublicationStatus;
  /** Raw DB value: "rfq" | "marketplace" */
  offerModel: string;
  /** Raw DB value: "inbound" | "outbound" */
  conversionType: string;
  priceOnRequest: boolean;
  /** Normalized price string from DB: ROUND(price_brutto, 2)::text — null if DB column is null */
  normalizedPrice: string | null;
}

/**
 * Raw cart row as locked from the DB during checkout.
 */
export interface CheckoutCartRow {
  id: number;
  offerId: number;
  quantity: number;
}

export type CheckoutLineFailureReason =
  | "OFFER_MISSING"
  | "OFFER_INACTIVE"
  | "OFFER_NOT_CONVERSION_ALLOWED"
  | "OFFER_NOT_ECOMMERCE"
  | "PRICE_ON_REQUEST"
  | "PRICE_MISSING"
  | "PRICE_INVALID"
  | "QUANTITY_INVALID";

/**
 * Result of eligibility validation for a single cart line.
 */
export type LineEligibilityResult =
  | { ok: true; offerId: number; title: string; quantity: number; unitPriceMinor: bigint }
  | { ok: false; reason: CheckoutLineFailureReason };

/**
 * Validates a single checkout cart line against the fetched offer.
 *
 * Checks in order (sprint §6):
 *   1. Offer must exist in offer map
 *   2. offer.isActive === true
 *   3. isConversionAllowedStatus (published)
 *   4. canonical model === "ecommerce"
 *   5. priceOnRequest === false
 *   6. valid authoritative price (not null, not zero, not negative)
 *   7. quantity is valid (safe integer, 1..999)
 *
 * Returns ok:false with internal reason (never exposed to client).
 */
export function validateCheckoutLine(
  cartRow: CheckoutCartRow,
  offerMap: Map<number, CheckoutOfferRow>
): LineEligibilityResult {
  const offer = offerMap.get(cartRow.offerId);

  if (!offer) {
    return { ok: false, reason: "OFFER_MISSING" };
  }

  if (!offer.isActive) {
    return { ok: false, reason: "OFFER_INACTIVE" };
  }

  if (!isConversionAllowedStatus(offer.publicationStatus)) {
    return { ok: false, reason: "OFFER_NOT_CONVERSION_ALLOWED" };
  }

  const canonicalModel = resolveCanonicalOfferModel(offer.offerModel, offer.conversionType);
  if (canonicalModel !== "ecommerce") {
    return { ok: false, reason: "OFFER_NOT_ECOMMERCE" };
  }

  if (offer.priceOnRequest) {
    return { ok: false, reason: "PRICE_ON_REQUEST" };
  }

  if (!offer.normalizedPrice) {
    return { ok: false, reason: "PRICE_MISSING" };
  }

  let unitPriceMinor: bigint;
  try {
    unitPriceMinor = parseDecimalToMinorUnits(offer.normalizedPrice);
  } catch {
    return { ok: false, reason: "PRICE_INVALID" };
  }

  if (!isValidCheckoutQuantity(cartRow.quantity)) {
    return { ok: false, reason: "QUANTITY_INVALID" };
  }

  return {
    ok: true,
    offerId: offer.id,
    title: offer.title,
    quantity: cartRow.quantity,
    unitPriceMinor,
  };
}
