"use client";

import { useState } from "react";
import { changeAdminOfferPublicationState } from "@/app/actions";
import type { OfferPublicationStatus } from "@/lib/schema";

export interface AdminOfferLifecycleActionProps {
  offerId: number;
  currentStatus: OfferPublicationStatus;
  dict: {
    publish: string;
    publishing: string;
    archive: string;
    archiving: string;
    archiveConfirm: string;
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
  dict,
}: AdminOfferLifecycleActionProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (currentStatus === "archived") {
    return null;
  }

  const handlePublish = async () => {
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
    if (!window.confirm(dict.archiveConfirm)) {
      return;
    }

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
    <div className="flex flex-col gap-1 items-end">
      {currentStatus === "draft" && (
        <button
          onClick={handlePublish}
          disabled={pending}
          className="text-xs font-semibold bg-[#147487] text-white px-2 py-1 rounded hover:bg-[#105d6c] disabled:opacity-50"
        >
          {pending ? dict.publishing : dict.publish}
        </button>
      )}

      {currentStatus === "published" && (
        <button
          onClick={handleArchive}
          disabled={pending}
          className="text-xs font-semibold border border-red-200 text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100 disabled:opacity-50"
        >
          {pending ? dict.archiving : dict.archive}
        </button>
      )}

      {message && (
        <p
          className={`text-[10px] mt-1 ${
            message.isError ? "text-red-600" : "text-green-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
