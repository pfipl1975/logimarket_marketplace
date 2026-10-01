import type { Dictionary } from "@/lib/i18n/types";
import type { PartnerOrderEffectiveStatus } from "./read-model-core";
import { getPartnerOrderStatusLabel } from "./presentation";

export function getPartnerOrderDetailStatusLabel(status: PartnerOrderEffectiveStatus, dict: Dictionary["PartnerWorkspace"]): string {
  return getPartnerOrderStatusLabel(status, dict) ?? dict.statusInvalid;
}

export type PartnerOrderProgressStep = {
  key: "routed" | "pending" | "accepted" | "in_progress" | "fulfilled";
  labelKey: "progressRouted" | "awaitingDecision" | "progressAccepted" | "statusFulfillmentInProgress" | "statusFulfilled";
  current: boolean;
  timestamp: Date | null;
};

/** State progression only: timestamps come exclusively from existing E6/decision evidence. */
export function buildPartnerOrderDetailProgress(order: {
  effectiveStatus: PartnerOrderEffectiveStatus;
  routedAt: Date | null;
  resolvedAt: Date | null;
}): PartnerOrderProgressStep[] {
  const status = order.effectiveStatus;
  if (status !== "pending_decision" && status !== "accepted" && status !== "fulfillment_in_progress" && status !== "fulfilled") return [];
  const steps: PartnerOrderProgressStep[] = [
    { key: "routed", labelKey: "progressRouted", current: false, timestamp: order.routedAt },
  ];
  if (status === "pending_decision") {
    return [...steps, { key: "pending", labelKey: "awaitingDecision", current: true, timestamp: null }];
  }
  steps.push({ key: "accepted", labelKey: "progressAccepted", current: status === "accepted", timestamp: order.resolvedAt });
  if (status === "fulfillment_in_progress" || status === "fulfilled") {
    steps.push({ key: "in_progress", labelKey: "statusFulfillmentInProgress", current: status === "fulfillment_in_progress", timestamp: null });
  }
  if (status === "fulfilled") {
    steps.push({ key: "fulfilled", labelKey: "statusFulfilled", current: true, timestamp: null });
  }
  return steps;
}
