export const MarketplaceEvents = {
  E2_BUYER_INTENT: "e2_buyer_intent",
  E3_RECEIPT_ACKNOWLEDGED: "e3_receipt_acknowledged",
  E6_ROUTED_TO_SELLER: "e6_routed_to_seller",
  E7_SELLER_ACCEPTED: "e7_seller_accepted",
} as const;

export type SellerDecisionStatus =
  | "pending_seller_review"
  | "seller_accepted"
  | "seller_rejected"
  | "expired";

export interface SellerAcceptanceDecision {
  decisionStatus: SellerDecisionStatus;
  resolvedAt: Date | null;
  acceptedAt: Date | null;
}

/**
 * Contract-formation acceptance (E7) requires ALL three conditions:
 *   1. decisionStatus = "seller_accepted"
 *   2. resolvedAt is not null
 *   3. acceptedAt is not null
 *
 * Seller silence cannot produce E7.
 * Timeout/expiry cannot produce E7.
 * "expired" status does NOT mean seller_rejected.
 * "cancelled" does NOT mean seller_rejected.
 */
export function isExplicitSellerAcceptance(decision: SellerAcceptanceDecision): boolean {
  return (
    decision.decisionStatus === "seller_accepted" &&
    decision.resolvedAt !== null &&
    decision.acceptedAt !== null
  );
}

/** E3 (LogiMarket receipt acknowledgment) is NOT seller acceptance. */
export function isReceiptAcknowledgment(event: string): boolean {
  return event === MarketplaceEvents.E3_RECEIPT_ACKNOWLEDGED;
}

/** E6 (seller routing) is NOT seller acceptance. */
export function isSellerRouting(event: string): boolean {
  return event === MarketplaceEvents.E6_ROUTED_TO_SELLER;
}

/**
 * Seller silence CANNOT constitute acceptance.
 * Always returns false — this is a domain invariant.
 */
export function canSilenceBeAcceptance(): false {
  return false;
}
