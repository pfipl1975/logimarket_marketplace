"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeAdminSellerEligibility } from "@/app/actions";

type Dictionary = {
  currentStatus: string;
  targetStatusLabel: string;
  reasonLabel: string;
  saveStatus: string;
  statuses: {
    pending: string;
    eligible: string;
    ineligible: string;
    suspended: string;
    none: string;
  };
  errors: {
    invalidInput: string;
    conflict: string;
    reasonRequired: string;
    systemError: string;
    partnerNotFound: string;
  };
  pendingMessage: string;
};

interface Props {
  partnerId: number;
  eligibility: {
    eligibilityStatus: string;
    reason: string | null;
  } | null;
  dictionary: Dictionary;
}

export function AdminSellerEligibilityControl({ partnerId, eligibility, dictionary }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentStatus = eligibility?.eligibilityStatus ?? "none";
  
  const [targetStatus, setTargetStatus] = useState<string>(
    eligibility ? eligibility.eligibilityStatus : "pending"
  );
  
  const [reason, setReason] = useState<string>(
    eligibility?.reason ?? ""
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSuspended = targetStatus === "suspended";
  const isIneligible = targetStatus === "ineligible";
  const showReason = isSuspended || isIneligible;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const result = await changeAdminSellerEligibility({
        partnerId: partnerId.toString(),
        expectedStatus: currentStatus,
        targetStatus,
        reason: showReason ? reason : null,
      });

      if (!result.ok) {
        if (result.code === "ELIGIBILITY_CONFLICT") {
          setErrorMsg(dictionary.errors.conflict);
        } else if (result.code === "ELIGIBILITY_REASON_REQUIRED") {
          setErrorMsg(dictionary.errors.reasonRequired);
        } else if (result.code === "ELIGIBILITY_INVALID_INPUT") {
          setErrorMsg(dictionary.errors.invalidInput);
        } else if (result.code === "PARTNER_NOT_FOUND") {
          setErrorMsg(dictionary.errors.partnerNotFound);
        } else {
          setErrorMsg(dictionary.errors.systemError);
        }
        return;
      }

      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-border-industrial">
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-industrial text-sm">
          {errorMsg}
        </div>
      )}
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
            {dictionary.targetStatusLabel}
          </label>
          <select
            value={targetStatus}
            onChange={(e) => setTargetStatus(e.target.value)}
            disabled={isPending}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
          >
            <option value="pending">{dictionary.statuses.pending}</option>
            <option value="eligible">{dictionary.statuses.eligible}</option>
            <option value="ineligible">{dictionary.statuses.ineligible}</option>
            <option value="suspended">{dictionary.statuses.suspended}</option>
          </select>
        </div>

        {showReason && (
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider flex items-center gap-1">
              {dictionary.reasonLabel}
              {isSuspended && <span className="text-red-500">*</span>}
              {isIneligible && <span className="text-text-muted opacity-60">(opcjonalnie)</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              maxLength={2000}
              required={isSuspended}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-border-industrial rounded-industrial text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50 min-h-[40px] max-h-32"
            />
          </div>
        )}

        <div className="sm:col-span-2 lg:col-span-1 flex items-center">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto h-10 px-6 bg-brand-blue text-white rounded-industrial text-sm font-semibold hover:bg-brand-blue/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 whitespace-nowrap"
          >
            {isPending ? dictionary.pendingMessage : dictionary.saveStatus}
          </button>
        </div>
      </div>
    </form>
  );
}
