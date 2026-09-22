"use client";

import { useTransition } from "react";
import { submitPartnerOfferAction } from "@/app/actions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function PartnerOfferSubmitButton({
  partnerId,
  offerId,
  locale,
  label,
  confirmMessage,
  successMessage,
  errorMessage,
}: {
  partnerId: number;
  offerId: number;
  locale: string;
  label: string;
  confirmMessage: string;
  successMessage: string;
  errorMessage: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    if (!window.confirm(confirmMessage)) return;

    startTransition(async () => {
      const result = await submitPartnerOfferAction(partnerId, offerId, locale);
      if (result.ok) {
        alert(successMessage);
        router.refresh();
      } else {
        alert(errorMessage + (("reason" in result ? result.reason : undefined) ? ` (${("reason" in result ? result.reason : undefined)})` : ""));
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={isPending}
      className="inline-flex items-center justify-center bg-brand-teal px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
      {label}
    </button>
  );
}

