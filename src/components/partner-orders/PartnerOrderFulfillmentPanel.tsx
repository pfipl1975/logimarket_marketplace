"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { partnerSellerOrderFulfillmentAction } from "@/app/actions";
import type { PartnerFulfillmentUiState } from "@/lib/partner-orders/fulfillment-action-core";
import type { Dictionary } from "@/lib/i18n/types";
import { AlertCircle, Truck, CheckCircle2 } from "lucide-react";

export function PartnerOrderFulfillmentPanel({
  sellerOrderId,
  dict,
  canMakeDecision,
  effectiveStatus,
}: {
  sellerOrderId: number;
  dict: Dictionary["PartnerWorkspace"];
  canMakeDecision: boolean;
  effectiveStatus: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<PartnerFulfillmentUiState, FormData>(
    partnerSellerOrderFulfillmentAction,
    "idle"
  );

  useEffect(() => {
    if (
      state === "fulfillment_in_progress" ||
      state === "fulfilled" ||
      state === "state_changed" ||
      state === "not_allowed"
    ) {
      router.refresh();
    }
  }, [state, router]);

  if (!canMakeDecision) {
    return null;
  }

  if (effectiveStatus !== "accepted" && effectiveStatus !== "fulfillment_in_progress") {
    return null;
  }

  const renderError = () => {
    if (state === "idle") return null;
    let message = "";
    switch (state) {
      case "state_changed": message = dict.decisionStateChanged; break;
      case "not_allowed": message = dict.decisionNotAllowed; break;
      case "invalid_request": message = dict.statusInvalid; break;
      case "system_error": message = dict.decisionError; break;
    }
    if (!message) return null;
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-industrial border border-red-200 mb-4 flex items-center gap-2 text-sm font-medium">
        <AlertCircle className="w-5 h-5 shrink-0" />
        {message}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-industrial border border-border-industrial shadow-soft p-6 mt-6">
      <h2 className="font-semibold text-brand-navy mb-4">
        {effectiveStatus === "accepted" ? dict.statusAccepted : dict.statusFulfillmentInProgress}
      </h2>
      {renderError()}

      {effectiveStatus === "accepted" ? (
        <form action={formAction}>
          <input type="hidden" name="sellerOrderId" value={sellerOrderId} />
          <input type="hidden" name="action" value="start_fulfillment" />
          <button
            type="submit"
            disabled={isPending}
            className="w-full flex justify-center items-center gap-2 bg-brand-teal text-white font-medium py-3 px-6 rounded-industrial hover:bg-brand-teal/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal transition-colors disabled:opacity-50"
          >
            <Truck className="w-5 h-5" />
            {isPending ? dict.statusUpdating : dict.startFulfillment}
          </button>
        </form>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="sellerOrderId" value={sellerOrderId} />
          <input type="hidden" name="action" value="complete_fulfillment" />
          <button
            type="submit"
            disabled={isPending}
            className="w-full flex justify-center items-center gap-2 bg-green-600 text-white font-medium py-3 px-6 rounded-industrial hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            {isPending ? dict.statusUpdating : dict.markFulfilled}
          </button>
        </form>
      )}
    </div>
  );
}
