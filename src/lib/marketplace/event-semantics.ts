export const MarketplaceEvents = {
  E2_BUYER_INTENT: "e2_buyer_intent",
  E3_RECEIPT_ACKNOWLEDGED: "e3_receipt_acknowledged",
  E6_ROUTED_TO_SELLER: "e6_routed_to_seller",
  E7_SELLER_ACCEPTED: "e7_seller_accepted",
} as const;

export function isSellerAcceptanceEvent(event: string): boolean {
  return event === MarketplaceEvents.E7_SELLER_ACCEPTED;
}

export function isRejectionEvent(status: string): boolean {
  return status === "seller_rejected" || status === "cancelled";
}

export function canSilenceBeAcceptance(): boolean {
  return false;
}
