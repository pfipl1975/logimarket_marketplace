"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { mutateRfqStatus } from "@/app/actions";
import type { RfqStatus } from "@/lib/schema";
import { getAllowedRfqStatusTransitions } from "@/lib/rfq/workflow";

interface AdminRfqStatusControlProps {
  rfqId: number;
  currentStatus: RfqStatus;
  dict: Record<string, string>;
}

export function AdminRfqStatusControl({ rfqId, currentStatus, dict }: AdminRfqStatusControlProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<RfqStatus | "">("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const router = useRouter();

  const allowedTransitions = getAllowedRfqStatusTransitions(currentStatus);

  if (currentStatus === "closed") {
    return (
      <div className="inline-flex items-center">
        <span className="bg-brand-light-gray/50 text-muted-foreground px-3 py-1.5 rounded text-sm font-medium uppercase tracking-wider">
          {dict[`status_${currentStatus}`] ?? currentStatus}
        </span>
      </div>
    );
  }

  const handleApply = () => {
    if (!selectedTarget || selectedTarget === currentStatus) return;

    if (selectedTarget === "closed") {
      setShowCloseConfirm(true);
      return;
    }

    executeTransition(selectedTarget);
  };

  const executeTransition = (target: RfqStatus) => {
    setError(null);
    setShowCloseConfirm(false);
    startTransition(async () => {
      const result = await mutateRfqStatus({
        rfqId,
        expectedStatus: currentStatus,
        targetStatus: target,
      });

      if (!result.ok) {
        if (result.code === "CONFLICT") {
          setError(dict.statusConflictError);
          router.refresh();
        } else {
          setError(dict.statusGenericError);
        }
      } else {
        setSelectedTarget("");
        setError(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`rfq-status-select-${rfqId}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {dict.workflowSelectLabel}
        </label>
        <div className="flex flex-row gap-2 items-start flex-wrap">
          <select
            id={`rfq-status-select-${rfqId}`}
            disabled={isPending}
            value={selectedTarget}
            onChange={(e) => {
              setSelectedTarget(e.target.value as RfqStatus | "");
              setShowCloseConfirm(false);
              setError(null);
            }}
            className="bg-brand-light-gray hover:bg-brand-light-gray/80 px-3 py-2 pr-8 rounded-industrial text-sm font-medium cursor-pointer border border-border-industrial outline-none focus:ring-2 focus:ring-brand-teal appearance-none disabled:opacity-50 min-w-[160px]"
          >
            <option value="">{dict.workflowSelectPlaceholder}</option>
            {allowedTransitions.map((status) => (
              <option key={status} value={status}>
                {dict[`status_${status}`] ?? status}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={isPending || !selectedTarget}
            onClick={handleApply}
            className="px-4 py-2 bg-brand-navy hover:bg-brand-teal text-white rounded-industrial text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-teal disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? dict.statusUpdating : dict.workflowApply}
          </button>
        </div>
      </div>

      {/* Inline close confirmation block */}
      {showCloseConfirm && (
        <div className="border border-orange-200 bg-orange-50 rounded-industrial p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-orange-800">{dict.closeConfirmMessage}</p>
          <div className="flex flex-row gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => executeTransition("closed")}
              className="px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white rounded-industrial text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500 disabled:opacity-50"
            >
              {dict.closeConfirmApply}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowCloseConfirm(false);
                setSelectedTarget("");
              }}
              className="px-4 py-2 bg-white border border-border-industrial text-brand-navy hover:bg-brand-light-gray rounded-industrial text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-teal"
            >
              {dict.closeConfirmCancel}
            </button>
          </div>
        </div>
      )}

      {error && (
        <span className="text-sm text-red-600">{error}</span>
      )}
    </div>
  );
}
