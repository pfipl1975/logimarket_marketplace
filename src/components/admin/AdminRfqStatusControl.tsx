"use client";

import { useTransition, useState } from "react";
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

  const allowedTransitions = getAllowedRfqStatusTransitions(currentStatus);

  if (currentStatus === "closed") {
    return (
      <div className="inline-flex items-center">
        <span className="bg-brand-light-gray/50 text-muted-foreground px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">
          {dict[`status_${currentStatus}`] || currentStatus}
        </span>
      </div>
    );
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetStatus = e.target.value as RfqStatus;
    if (!targetStatus || targetStatus === currentStatus) return;

    setError(null);
    startTransition(async () => {
      const result = await mutateRfqStatus({
        rfqId,
        expectedStatus: currentStatus,
        targetStatus,
      });

      if (!result.ok) {
        if (result.code === "CONFLICT") {
          setError(dict.statusConflictError);
        } else {
          setError(dict.statusGenericError);
        }
      } else {
        setError(null);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <select
          disabled={isPending}
          value={currentStatus}
          onChange={handleStatusChange}
          className="bg-brand-light-gray hover:bg-brand-light-gray/80 px-2 py-1 pr-8 rounded text-xs font-medium uppercase tracking-wider cursor-pointer border-0 outline-none focus:ring-2 focus:ring-brand-teal appearance-none disabled:opacity-50"
        >
          <option value={currentStatus}>{dict[`status_${currentStatus}`] || currentStatus}</option>
          {allowedTransitions.map((status) => (
            <option key={status} value={status}>
              {dict[`status_${status}`] || status}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-navy">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>
      {error && <span className="text-[10px] text-red-600 max-w-[120px] whitespace-normal leading-tight">{error}</span>}
      {isPending && <span className="text-[10px] text-brand-teal animate-pulse">{dict.statusUpdating}</span>}
    </div>
  );
}
