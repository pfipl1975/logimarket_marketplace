"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mutatePartnerRfqStatus } from "@/app/actions";
import { getAllowedRfqStatusTransitions } from "@/lib/rfq/workflow";
import type { RfqStatus } from "@/lib/schema";
import type { Dictionary } from "@/lib/i18n/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PartnerRfqStatusControl({ partnerId, rfqId, status, dict }: {
  partnerId: number; rfqId: number; status: RfqStatus; dict: Dictionary["PartnerRfq"];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const allowed = getAllowedRfqStatusTransitions(status);
  const labels = { in_progress: dict.startHandling, responded: dict.markResponded, closed: dict.close, new: dict.status_new };

  function apply(targetStatus: RfqStatus) {
    setError(null);
    setUpdated(false);
    startTransition(async () => {
      try {
        const result = await mutatePartnerRfqStatus({ partnerId, rfqId, expectedStatus: status, targetStatus });
        if (!result.ok) {
          setError(result.code === "CONFLICT" ? dict.conflictError : dict.genericError);
          if (result.code === "CONFLICT") router.refresh();
        } else {
          setConfirmOpen(false);
          setUpdated(true);
          router.refresh();
        }
      } catch {
        setError(dict.genericError);
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{dict.externalResponseNotice}</p>
      {status === "closed" ? <p className="text-sm font-medium text-brand-navy">{dict.closedNotice}</p> : null}
      <div className="flex flex-col gap-3">
        {allowed.filter(target => target !== "closed").map(target => (
          <Button key={target} className="h-auto min-h-11 w-full whitespace-normal" disabled={pending} onClick={() => apply(target)}>
            {pending ? dict.updating : labels[target]}
          </Button>
        ))}
        {allowed.includes("closed") ? (
          <Dialog open={confirmOpen} onOpenChange={open => { if (!pending) setConfirmOpen(open); }}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={pending} className="h-auto min-h-11 w-full whitespace-normal">{dict.close}</Button>
            </DialogTrigger>
            <DialogContent closeLabel={dict.cancel} className="max-w-[calc(100%-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{dict.close}</DialogTitle>
                <DialogDescription>{dict.closeConfirm}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 sm:flex-row">
                <DialogClose asChild><Button variant="outline" disabled={pending} className="min-h-11">{dict.cancel}</Button></DialogClose>
                <Button onClick={() => apply("closed")} disabled={pending} className="h-auto min-h-11 whitespace-normal">{pending ? dict.updating : dict.confirmClose}</Button>
              </div>
              {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      {error && !confirmOpen ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {updated ? <p role="status" className="text-sm text-brand-navy">{dict.updated}</p> : null}
    </div>
  );
}
