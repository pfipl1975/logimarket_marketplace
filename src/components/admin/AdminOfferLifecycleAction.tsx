"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeAdminOfferPublicationState } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/types";
import type { OfferPublicationStatus } from "@/lib/schema";

export interface AdminOfferLifecycleActionProps {
  offerId: number;
  currentStatus: OfferPublicationStatus | "unknown";
  isPublishEligible?: boolean;
  dict: Dictionary["adminOffers"] & Dictionary["adminOfferDetail"];
}

export function AdminOfferLifecycleAction({
  offerId,
  currentStatus,
  isPublishEligible = false,
  dict,
}: AdminOfferLifecycleActionProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showReturnReason, setShowReturnReason] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (currentStatus !== "draft" && currentStatus !== "published" && currentStatus !== "pending_review") {
    return null;
  }

  const handlePublish = async () => {
    if (!isPublishEligible) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await changeAdminOfferPublicationState({
        offerId: String(offerId),
        expectedStatus: currentStatus,
        targetStatus: "published",
      });

      if (result.ok) {
        setMessage({ text: dict.publishedSuccess, isError: false });
        if (result.changed) router.refresh();
      } else {
        const errorText = getErrorText(result.code, result.reason);
        setMessage({ text: errorText, isError: true });
      }
    } catch {
      setMessage({ text: dict.systemError, isError: true });
    } finally {
      setPending(false);
    }
  };

  const handleArchive = async () => {
    setPending(true);
    setMessage(null);
    try {
      const result = await changeAdminOfferPublicationState({
        offerId: String(offerId),
        expectedStatus: "published",
        targetStatus: "archived",
      });

      if (result.ok) {
        setMessage({ text: dict.archivedSuccess, isError: false });
        setShowArchiveConfirm(false);
        if (result.changed) router.refresh();
      } else {
        const errorText = getErrorText(result.code, result.reason);
        setMessage({ text: errorText, isError: true });
        setShowArchiveConfirm(false);
      }
    } catch {
      setMessage({ text: dict.systemError, isError: true });
      setShowArchiveConfirm(false);
    } finally {
      setPending(false);
    }
  };

  const handleReturnToDraft = async () => {
    const reason = rejectionReason.trim();
    if (reason.length < 1 || reason.length > 1000) {
      setMessage({ text: dict.rejectionReasonRequired, isError: true });
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const result = await changeAdminOfferPublicationState({
        offerId: String(offerId), expectedStatus: "pending_review",
        targetStatus: "draft", rejectionReason: reason,
      });
      if (result.ok) {
        setMessage({ text: dict.returnedForCorrectionSuccess, isError: false });
        setRejectionReason("");
        setShowReturnReason(false);
        if (result.changed) router.refresh();
      } else {
        setMessage({ text: getErrorText(result.code, result.reason), isError: true });
      }
    } catch {
      setMessage({ text: dict.systemError, isError: true });
    } finally {
      setPending(false);
    }
  };

  const getErrorText = (code: string, reason?: string) => {
    if (code === "OFFER_INVALID_INPUT") return dict.rejectionReasonRequired;
    if (code === "OFFER_TRANSITION_CONFLICT") return dict.transitionConflict;
    if (code === "OFFER_INVALID_TRANSITION") return dict.invalidTransition;
    if (code === "OFFER_PUBLISH_NOT_ELIGIBLE") {
      if (reason === "OFFER_INACTIVE") return dict.offerInactive;
      if (reason === "TITLE_INVALID") return dict.eligibilityTitleInvalid;
      if (reason === "MODEL_UNKNOWN") return dict.eligibilityModelUnknown;
      if (reason === "ECOMMERCE_PRICE_INVALID") return dict.eligibilityPriceInvalid;
      if (reason === "OUTBOUND_URL_INVALID") return dict.eligibilityOutboundInvalid;
      if (reason === "SELLER_NOT_READY") return dict.eligibilitySellerNotReady;
      return dict.publishRejected;
    }
    return dict.systemError;
  };

  return (
    <div className="flex flex-col gap-2">
      {currentStatus === "pending_review" && (
        <div className="flex gap-2">
          <button
            onClick={handlePublish}
            disabled={pending || !isPublishEligible}
            className="inline-flex justify-center items-center px-4 py-2 bg-brand-teal text-primary-foreground text-sm font-medium rounded-industrial hover:bg-brand-teal/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? (dict.publishing || "...") : (dict.publish || "Publikuj")}
          </button>
          <button
            type="button"
            onClick={() => { setShowReturnReason((value) => !value); setMessage(null); }}
            disabled={pending}
            aria-expanded={showReturnReason}
            className="inline-flex justify-center items-center px-4 py-2 border border-input text-foreground bg-background text-sm font-medium rounded-industrial hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {dict.actionReturnToDraft}
          </button>
        </div>
      )}
      {currentStatus === "pending_review" && showReturnReason && (
        <div className="border border-border-industrial bg-card p-4 space-y-3">
          <label htmlFor="moderation-return-reason" className="block text-sm font-medium text-brand-navy">
            {dict.rejectionReasonLabel}
          </label>
          <textarea
            id="moderation-return-reason"
            rows={4}
            maxLength={1000}
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            disabled={pending}
            placeholder={dict.rejectionReasonPlaceholder}
            aria-required="true"
            className="block w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
          <p className="text-xs text-muted-foreground">{dict.rejectionReasonHelp} ({rejectionReason.length}/1000)</p>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowReturnReason(false); setMessage(null); }}
              disabled={pending}
              className="border border-input px-3 py-2 text-sm disabled:opacity-50"
            >{dict.cancel}</button>
            <button
              type="button"
              onClick={handleReturnToDraft}
              disabled={pending || rejectionReason.trim().length === 0}
              className="bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >{dict.actionConfirmReturnToDraft}</button>
          </div>
        </div>
      )}

      {currentStatus === "draft" && (
        <button
          onClick={handlePublish}
          disabled={pending || !isPublishEligible}
          className="inline-flex justify-center items-center px-4 py-2 bg-brand-teal text-primary-foreground text-sm font-medium rounded-industrial hover:bg-brand-teal/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? dict.publishing : dict.publish}
        </button>
      )}

      {currentStatus === "published" && !showArchiveConfirm && (
        <button
          onClick={() => setShowArchiveConfirm(true)}
          disabled={pending}
          className="inline-flex justify-center items-center px-4 py-2 border border-destructive text-destructive bg-destructive/5 text-sm font-medium rounded-industrial hover:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {dict.archive}
        </button>
      )}

      {currentStatus === "published" && showArchiveConfirm && (
        <div className="flex flex-col gap-3 p-3 bg-card border border-border-industrial rounded-industrial shadow-sm">
          <p className="text-sm text-card-foreground">{dict.archiveConfirm}</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowArchiveConfirm(false)}
              disabled={pending}
              className="px-3 py-1.5 border border-input bg-background text-sm font-medium rounded-industrial hover:bg-muted transition-colors disabled:opacity-50"
            >
              {dict.cancel}
            </button>
            <button
              onClick={handleArchive}
              disabled={pending}
              className="px-3 py-1.5 bg-destructive text-destructive-foreground text-sm font-medium rounded-industrial hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {pending ? dict.archiving : dict.confirm}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`text-sm ${
            message.isError ? "text-destructive" : "text-brand-teal"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
