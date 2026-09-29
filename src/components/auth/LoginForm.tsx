"use client";

import { useActionState } from "react";
import { loginUser, type LoginActionResult } from "@/app/actions";
import Link from "next/link";
import { accountLinkWithNext, accountPath } from "@/lib/auth/account-paths";
import type { Locale } from "@/lib/i18n/config";

export function LoginForm({ 
  nextUrl,
  translations,
  locale
}: { 
  nextUrl: string | null;
  translations: {
    emailLabel: string;
    passwordLabel: string;
    submitButton: string;
    pendingButton: string;
    invalidCredentials: string;
    unavailableError: string;
    noAccount: string;
    registerLink: string;
    forgotPrompt: string;
    forgotLink: string;
  };
  locale: Locale;
}) {
  const [state, formAction, isPending] = useActionState(loginUser, {
    code: "IDLE",
    success: false,
  } as LoginActionResult);

  let errorMessage = null;
  if (state?.code === "INVALID_CREDENTIALS") {
    errorMessage = translations.invalidCredentials;
  } else if (state?.code === "AUTH_UNAVAILABLE") {
    errorMessage = translations.unavailableError;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {errorMessage && (
        <div role="alert" aria-live="polite" className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-industrial">
          {errorMessage}
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-primary">
          {translations.emailLabel}
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none block w-full px-3 py-2 border border-border-industrial rounded-industrial placeholder-text-secondary focus:outline-none focus:ring-brand-teal focus:border-brand-teal sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-primary">
          {translations.passwordLabel}
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="appearance-none block w-full px-3 py-2 border border-border-industrial rounded-industrial placeholder-text-secondary focus:outline-none focus:ring-brand-teal focus:border-brand-teal sm:text-sm"
          />
        </div>
      </div>

      <input type="hidden" name="next" value={nextUrl || ""} />
      {locale && <input type="hidden" name="locale" value={locale} />}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-button text-sm font-medium text-white bg-brand-navy hover:bg-brand-teal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? translations.pendingButton : translations.submitButton}
        </button>
      </div>
      <div className="space-y-2 text-center text-sm text-text-secondary">
        <p>{translations.noAccount} <Link className="font-semibold text-brand-teal underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-teal" href={accountLinkWithNext(locale, "register", nextUrl)}>{translations.registerLink}</Link></p>
        <p>{translations.forgotPrompt} <Link className="font-semibold text-brand-teal underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-teal" href={accountPath(locale, "forgot-password")}>{translations.forgotLink}</Link></p>
      </div>
    </form>
  );
}
