"use client";

import { useActionState } from "react";
import { logoutUser } from "@/app/actions";
import type { Locale } from "@/lib/i18n/config";

type PublicLogoutFormProps = {
  locale: Locale;
  label: string;
};

export function PublicLogoutForm({
  locale,
  label,
}: PublicLogoutFormProps) {
  const [, formAction, isPending] = useActionState(logoutUser, null);

  return (
    <form action={formAction} className="inline-block">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="intent" value="public" />
      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-[36px] items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy disabled:opacity-50"
      >
        {label}
      </button>
    </form>
  );
}
