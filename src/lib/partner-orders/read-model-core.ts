export type PartnerOrderEffectiveStatus =
  | "pending_decision"
  | "accepted"
  | "rejected"
  | "expired"
  | "fulfillment_in_progress"
  | "fulfilled"
  | "cancelled"
  | "invalid_order_state";

export function deriveEffectiveStatus(
  persistedOrderStatus: string,
  decisionStatus: string | null,
  routedAt: Date | null,
  expiresAt: Date | null,
  serverNow: Date
): { effectiveStatus: PartnerOrderEffectiveStatus; decisionWindowOpen: boolean } {
  if (
    persistedOrderStatus === "submitted" &&
    decisionStatus === "pending_seller_review" &&
    routedAt !== null &&
    expiresAt !== null
  ) {
    if (serverNow.getTime() >= expiresAt.getTime()) {
      return { effectiveStatus: "expired", decisionWindowOpen: false };
    }
    return { effectiveStatus: "pending_decision", decisionWindowOpen: true };
  }

  if (persistedOrderStatus === "submitted" || decisionStatus === "pending_seller_review") {
    return { effectiveStatus: "invalid_order_state", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "seller_accepted" && decisionStatus === "seller_accepted") {
    return { effectiveStatus: "accepted", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "seller_rejected" && decisionStatus === "seller_rejected") {
    return { effectiveStatus: "rejected", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "expired" && decisionStatus === "expired") {
    return { effectiveStatus: "expired", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "fulfillment_in_progress") {
    if (decisionStatus === "seller_accepted") {
      return { effectiveStatus: "fulfillment_in_progress", decisionWindowOpen: false };
    }
    return { effectiveStatus: "invalid_order_state", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "fulfilled") {
    if (decisionStatus === "seller_accepted") {
      return { effectiveStatus: "fulfilled", decisionWindowOpen: false };
    }
    return { effectiveStatus: "invalid_order_state", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "cancelled") {
    return { effectiveStatus: "cancelled", decisionWindowOpen: false };
  }

  return { effectiveStatus: "invalid_order_state", decisionWindowOpen: false };
}
