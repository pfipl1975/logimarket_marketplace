/**
 * Canonical business offer model and legacy runtime compatibility.
 *
 * The runtime database still stores the legacy contract:
 *   offer_model:      "rfq" | "marketplace"
 *   conversion_type:  "inbound" | "outbound"
 *
 * Public projections and UI must only use the canonical contract:
 *   "rfq" | "ecommerce" | "outbound" | "unknown"
 *
 * This module is a pure mapping layer: no React, no DB, no logging.
 */

export type CanonicalOfferModel = "rfq" | "ecommerce" | "outbound";

export type LegacyOfferModel = "rfq" | "marketplace";

export type LegacyConversionType = "inbound" | "outbound";

/**
 * Controlled result of legacy → canonical mapping. "unknown" is the
 * fail-safe state for any unknown or inconsistent raw value; it is a
 * valid public state and must never throw.
 */
export type CanonicalOfferModelResolution = CanonicalOfferModel | "unknown";

/**
 * Maps raw legacy (offer_model, conversion_type) pairs to the canonical
 * business offer model.
 *
 * Matrix:
 *   rfq         + inbound  → rfq
 *   rfq         + outbound → outbound
 *   marketplace + inbound  → ecommerce
 *   marketplace + outbound → outbound
 *
 * Outbound takes precedence because external redirection is a separate
 * business model and must stay tracked through /go/[id]. Any unknown or
 * missing value resolves to the controlled "unknown" state.
 */
export function resolveCanonicalOfferModel(
  offerModel: string | null | undefined,
  conversionType: string | null | undefined
): CanonicalOfferModelResolution {
  if (conversionType === "outbound") {
    return "outbound";
  }

  if (conversionType !== "inbound") {
    return "unknown";
  }

  if (offerModel === "marketplace") {
    return "ecommerce";
  }

  if (offerModel === "rfq") {
    return "rfq";
  }

  return "unknown";
}
