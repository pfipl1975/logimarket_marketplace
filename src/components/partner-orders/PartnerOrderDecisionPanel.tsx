"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { partnerSellerOrderDecisionAction } from "@/app/actions";
import type { PartnerDecisionUiState } from "@/lib/partner-orders/decision-action-core";
import type { Dictionary } from "@/lib/i18n/types";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function PartnerOrderDecisionPanel({
  sellerOrderId,
  dict,
  canMakeDecision,
}: {
  sellerOrderId: number;
  dict: Dictionary["PartnerWorkspace"];
  canMakeDecision: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<PartnerDecisionUiState, FormData>(
    partnerSellerOrderDecisionAction,
    "idle"
  );
  
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  useEffect(() => {
    if (state === "accepted" || state === "rejected" || state === "expired" || state === "state_changed" || state === "not_allowed") {
      router.refresh();
    }
  }, [state, router]);

  if (!canMakeDecision) {
    return (
      <div className="bg-gray-50 text-gray-800 p-6 rounded-industrial border border-gray-200 flex items-center gap-3 mt-6">
        <AlertCircle className="w-6 h-6 text-gray-600 shrink-0" />
        <span className="font-medium text-sm">{dict.decisionPermissionMissing}</span>
      </div>
    );
  }

  const isTerminal = state === "accepted" || state === "rejected" || state === "expired" || state === "state_changed" || state === "not_allowed";

  if (state === "accepted") {
    return (
      <div className="bg-green-50 text-green-800 p-6 rounded-industrial border border-green-200 flex items-center gap-3 mt-6">
        <CheckCircle2 className="w-6 h-6 text-green-600" />
        <span className="font-medium">{dict.statusAccepted}</span>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="bg-gray-50 text-gray-800 p-6 rounded-industrial border border-gray-200 flex items-center gap-3 mt-6">
        <AlertCircle className="w-6 h-6 text-gray-600" />
        <span className="font-medium">{dict.statusRejected}</span>
      </div>
    );
  }

  const renderError = () => {
    if (state === "idle") return null;
    let message = "";
    switch (state) {
      case "expired": message = dict.decisionExpired; break;
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
      <h2 className="font-semibold text-brand-navy mb-4">{dict.statusPending}</h2>
      {renderError()}
      
      {!isTerminal && !showAcceptConfirm && !showRejectConfirm ? (
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => setShowAcceptConfirm(true)}
            className="flex-1 bg-brand-teal text-white font-medium py-3 px-6 rounded-industrial hover:bg-brand-teal/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal transition-colors"
          >
            {dict.acceptOrder}
          </button>
          <button
            type="button"
            onClick={() => setShowRejectConfirm(true)}
            className="flex-1 bg-white border border-red-200 text-red-600 font-medium py-3 px-6 rounded-industrial hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            {dict.rejectOrder}
          </button>
        </div>
      ) : null}

      {!isTerminal && showAcceptConfirm ? (
        <form action={formAction} className="bg-green-50 border border-green-200 p-4 rounded-industrial">
          <input type="hidden" name="sellerOrderId" value={sellerOrderId} />
          <input type="hidden" name="decision" value="accept" />
          <h3 className="text-green-900 font-bold mb-2">{dict.acceptConfirmTitle}</h3>
          <p className="text-green-900 font-medium mb-4">
            {dict.acceptConfirmText}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-green-600 text-white font-medium py-2 px-4 rounded-industrial hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? dict.decisionSubmitting : dict.confirmAcceptButton}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowAcceptConfirm(false)}
              className="flex-1 bg-white text-gray-700 font-medium py-2 px-4 border border-gray-300 rounded-industrial hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
            >
              {dict.cancelButton}
            </button>
          </div>
        </form>
      ) : null}

      {!isTerminal && showRejectConfirm ? (
        <form action={formAction} className="bg-red-50 border border-red-200 p-4 rounded-industrial">
          <input type="hidden" name="sellerOrderId" value={sellerOrderId} />
          <input type="hidden" name="decision" value="reject" />
          <h3 className="text-red-900 font-bold mb-2">{dict.rejectConfirmTitle}</h3>
          <p className="text-red-900 font-medium mb-4">
            {dict.rejectConfirmText}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-red-600 text-white font-medium py-2 px-4 rounded-industrial hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? dict.decisionSubmitting : dict.confirmRejectButton}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowRejectConfirm(false)}
              className="flex-1 bg-white text-gray-700 font-medium py-2 px-4 border border-gray-300 rounded-industrial hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
            >
              {dict.cancelButton}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
