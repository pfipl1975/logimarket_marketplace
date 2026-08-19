"use strict";
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeAdminOfferPublicationState } from "@/app/actions";

export interface AdminOfferLifecycleActionProps {
  offerId: number;
  currentStatus: string;
  isPublishEligible?: boolean;
  dict: {
    publish: string;
    publishing: string;
    archive: string;
    archiving: string;
    archiveConfirm: string;
    confirm: string;
    cancel: string;
    publishedSuccess: string;
    archivedSuccess: string;
    publishRejected: string;
    offerInactive: string;
    invalidTransition: string;
    transitionConflict: string;
    systemError: string;
  };
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
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (currentStatus !== "draft" && currentStatus !== "published") {
    return null;
  }

  const handlePublish = async () => {
    if (!isPublishEligible) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await changeAdminOfferPublicationState({
        offerId: String(offerId),
        expectedStatus: "draft",
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

  const getErrorText = (code: string, reason?: string) => {
    if (code === "OFFER_TRANSITION_CONFLICT") return dict.transitionConflict;
    if (code === "OFFER_INVALID_TRANSITION") return dict.invalidTransition;
    if (code === "OFFER_PUBLISH_NOT_ELIGIBLE") {
      if (reason === "OFFER_INACTIVE") return dict.offerInactive;
      return dict.publishRejected;
    }
    return dict.systemError;
  };

  return (
    <div className="flex flex-col gap-2">
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
