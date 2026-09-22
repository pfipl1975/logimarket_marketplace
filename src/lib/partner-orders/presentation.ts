import type { PartnerOrderEffectiveStatus } from "@/lib/partner-orders/read-model";

export type PartnerOrderCountdownLabels = {
  timeExpired: string;
  h: string;
  m: string;
};

export function formatPartnerOrderRemainingTime(
  expiresAt: Date | null,
  serverNow: Date,
  labels: PartnerOrderCountdownLabels
): string | null {
  if (!expiresAt) return null;
  const differenceMs = expiresAt.getTime() - serverNow.getTime();
  if (differenceMs <= 0) return labels.timeExpired;

  const hours = Math.floor(differenceMs / (1000 * 60 * 60));
  const minutes = Math.floor((differenceMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}${labels.h} ${minutes}${labels.m}`;
}

export type PartnerOrderStatusLabels = {
  statusPending: string;
  statusAccepted: string;
  statusFulfillmentInProgress: string;
  statusFulfilled: string;
  statusRejected: string;
  statusExpired: string;
  statusCancelled: string;
};

export function getPartnerOrderStatusLabel(
  status: PartnerOrderEffectiveStatus,
  labels: PartnerOrderStatusLabels
): string | null {
  switch (status) {
    case "pending_decision":
      return labels.statusPending;
    case "accepted":
      return labels.statusAccepted;
    case "fulfillment_in_progress":
      return labels.statusFulfillmentInProgress;
    case "fulfilled":
      return labels.statusFulfilled;
    case "rejected":
      return labels.statusRejected;
    case "expired":
      return labels.statusExpired;
    case "cancelled":
      return labels.statusCancelled;
    case "invalid_order_state":
      return null;
  }
}
