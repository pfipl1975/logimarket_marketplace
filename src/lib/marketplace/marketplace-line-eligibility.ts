import { resolveCanonicalOfferModel } from "@/lib/offers/model";
import { isConversionAllowedStatus } from "@/lib/offers/status";
import type { AuthoritativeMarketplaceLine } from "./order-orchestration-types";

export type MarketplaceLineEligibilityResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Pure eligibility evaluator for a single authoritative marketplace line.
 *
 * Reuses the canonical resolver — does NOT duplicate its mapping logic.
 * All fields must already be server-authoritative; no client input accepted.
 *
 * Fails closed unless ALL of:
 *   - canonical model resolves to "ecommerce"
 *   - offer is active
 *   - publication status is conversion-allowed
 *   - priceOnRequest is false
 *   - quantity is a positive safe integer
 *   - partnerId is a positive safe integer
 */
export function evaluateMarketplaceLineEligibility(
  line: AuthoritativeMarketplaceLine,
): MarketplaceLineEligibilityResult {
  if (!Number.isSafeInteger(line.partnerId) || line.partnerId <= 0) {
    return { ok: false, reason: "INVALID_PARTNER_ID" };
  }

  if (!line.isActive) {
    return { ok: false, reason: "OFFER_INACTIVE" };
  }

  if (!isConversionAllowedStatus(line.publicationStatus)) {
    return { ok: false, reason: "OFFER_NOT_CONVERSION_ALLOWED" };
  }

  // Delegate to the canonical resolver — do NOT duplicate its mapping.
  const canonical = resolveCanonicalOfferModel(line.offerModel, line.conversionType);
  if (canonical !== "ecommerce") {
    return { ok: false, reason: "OFFER_NOT_ECOMMERCE" };
  }

  if (line.priceOnRequest) {
    return { ok: false, reason: "PRICE_ON_REQUEST" };
  }

  if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
    return { ok: false, reason: "INVALID_QUANTITY" };
  }

  return { ok: true };
}
