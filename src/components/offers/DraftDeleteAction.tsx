"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAdminOfferDraft, deletePartnerOfferDraft } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/types";

export function DraftDeleteAction({
  offerId,
  partnerId,
  expectedUpdatedAt,
  returnHref,
  labels,
}: {
  offerId: number;
  partnerId?: number;
  expectedUpdatedAt: string | null;
  returnHref: string;
  labels: Dictionary["draftDeletion"];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  const cancel = () => {
    setConfirming(false);
    setError(null);
    triggerRef.current?.focus();
  };

  const confirmDelete = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const payload = {
        offerId: String(offerId),
        expectedUpdatedAt,
      };
      const result = partnerId === undefined
        ? await deleteAdminOfferDraft(payload)
        : await deletePartnerOfferDraft({ ...payload, partnerId: String(partnerId) });

      if (result.ok) {
        router.replace(returnHref);
        router.refresh();
        return;
      }
      setError(result.code === "OFFER_CONFLICT" || result.code === "OFFER_NOT_DELETABLE"
        ? labels.conflict
        : result.code === "UNAUTHORIZED" || result.code === "OFFER_NOT_FOUND"
          ? labels.forbidden
          : labels.error);
    } catch {
      setError(labels.error);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {!confirming ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => { setError(null); setConfirming(true); }}
          className="inline-flex min-h-10 items-center justify-center border border-destructive px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
        >
          {labels.deleteButton}
        </button>
      ) : (
        <div role="group" aria-label={labels.confirmTitle} className="max-w-sm space-y-3 border border-destructive/40 bg-white p-3">
          <p className="text-sm font-semibold text-brand-navy">{labels.confirmTitle}</p>
          <p className="text-sm text-muted-foreground">{labels.confirmBody}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              ref={cancelRef}
              disabled={pending}
              onClick={cancel}
              className="min-h-10 border border-border-industrial px-3 py-2 text-sm font-medium text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:opacity-50"
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmDelete}
              className="min-h-10 bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:opacity-50"
            >
              {pending ? labels.deleting : labels.confirm}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
