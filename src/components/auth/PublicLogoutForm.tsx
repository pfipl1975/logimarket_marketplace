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
      <button
        type="submit"
        disabled={isPending}
        className="text-sm font-medium text-white/80 hover:text-white focus:outline-none disabled:opacity-50"
      >
        {label}
      </button>
    </form>
  );
}
