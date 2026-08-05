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
 * Matrix (both legacy values must be known before classification):
 *   rfq         + inbound  → rfq
 *   rfq         + outbound → outbound
 *   marketplace + inbound  → ecommerce
 *   marketplace + outbound → outbound
 *
 * Outbound takes precedence only between valid, known legacy offer
 * models ("rfq", "marketplace"); it never bypasses offer model
 * validation. Any unknown or missing value resolves to the controlled
 * "unknown" state.
 */
export function resolveCanonicalOfferModel(
  offerModel: string | null | undefined,
  conversionType: string | null | undefined
): CanonicalOfferModelResolution {
  if (offerModel !== "rfq" && offerModel !== "marketplace") {
    return "unknown";
  }

  if (conversionType === "outbound") {
    return "outbound";
  }

  if (conversionType !== "inbound") {
    return "unknown";
  }

  return offerModel === "marketplace" ? "ecommerce" : "rfq";
}
