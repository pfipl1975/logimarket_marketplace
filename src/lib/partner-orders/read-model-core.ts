import type { BuyerInvoiceSnapshotInput } from "@/lib/checkout/buyer-order-intent";

export type PartnerOrderEffectiveStatus =
  | "pending_decision"
  | "accepted"
  | "rejected"
  | "expired"
  | "fulfillment_in_progress"
  | "fulfilled"
  | "cancelled"
  | "invalid_order_state";

export type PartnerAcceptanceEvidence = {
  status: string;
  decisionStatus: string | null;
  acceptedAt: Date | null;
  resolvedAt: Date | null;
  decidedByAuthUserId: string | null;
  decisionSource: string | null;
};

/** Disclosure requires the complete canonical E7 evidence, not status alone. */
export function canDisclosePartnerBuyerDetails(evidence: PartnerAcceptanceEvidence): boolean {
  return (
    evidence.decisionStatus === "seller_accepted" &&
    evidence.acceptedAt !== null &&
    evidence.resolvedAt !== null &&
    evidence.decidedByAuthUserId !== null &&
    evidence.decisionSource === "partner_portal" &&
    (evidence.status === "seller_accepted" || evidence.status === "fulfillment_in_progress" || evidence.status === "fulfilled")
  );
}

/** Only immutable invoice rows may be passed here; historical absence is valid. */
export function projectPartnerBuyerInvoiceSnapshot(
  evidence: PartnerAcceptanceEvidence,
  rows: readonly unknown[]
): BuyerInvoiceSnapshotInput | null {
  if (!canDisclosePartnerBuyerDetails(evidence) || rows.length === 0) return null;
  const row = rows[0];
  if (rows.length !== 1 || !row || typeof row !== "object") {
    throw new Error("Buyer invoice snapshot is inconsistent");
  }
  const invoice = row as BuyerInvoiceSnapshotInput;
  const meaningful = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  if (invoice.taxIdentifierType !== "tax_id" || invoice.countryCode !== "PL" ||
      ![invoice.legalName, invoice.taxIdentifierValue, invoice.street, invoice.buildingNumber,
        invoice.postalCode, invoice.city].every(meaningful) ||
      !/^\d{10}$/.test(invoice.taxIdentifierValue) ||
      !/^\d{2}-\d{3}$/.test(invoice.postalCode) ||
      (invoice.unitNumber !== null && !meaningful(invoice.unitNumber))) {
    throw new Error("Buyer invoice snapshot is inconsistent");
  }
  return {
    legalName: invoice.legalName,
    taxIdentifierType: "tax_id",
    taxIdentifierValue: invoice.taxIdentifierValue,
    street: invoice.street,
    buildingNumber: invoice.buildingNumber,
    unitNumber: invoice.unitNumber,
    postalCode: invoice.postalCode,
    city: invoice.city,
    countryCode: "PL",
  };
}

export function formatPartnerInvoiceStreetLine(invoice: BuyerInvoiceSnapshotInput): string {
  return `${invoice.street} ${invoice.buildingNumber}${invoice.unitNumber === null ? "" : `/${invoice.unitNumber}`}`;
}

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
