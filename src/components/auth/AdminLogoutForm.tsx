"use client";

import { useActionState } from "react";
import { logoutUser } from "@/app/actions";
import type { Locale } from "@/lib/i18n/config";

type AdminLogoutFormProps = {
  locale: Locale;
  redirectTo: string;
  labels: {
    logoutButton: string;
    logoutPending: string;
    logoutUnavailable: string;
  };
};

export function AdminLogoutForm({
  locale,
  redirectTo,
  labels,
}: AdminLogoutFormProps) {
  const [state, formAction, isPending] = useActionState(logoutUser, null);

  return (
    <form action={formAction} className="inline-block">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border-industrial rounded-button text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? labels.logoutPending : labels.logoutButton}
      </button>
      {state?.code === "AUTH_UNAVAILABLE" && (
        <p className="text-sm text-destructive mt-2">{labels.logoutUnavailable}</p>
      )}
    </form>
  );
}
