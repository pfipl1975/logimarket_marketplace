"use client";

import { useActionState } from "react";
import { loginUser, type LoginActionResult } from "@/app/actions";


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
    invalidCredentials?: string;
    unavailableError?: string;
  };
  locale: string;
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
        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-industrial">
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
            className="appearance-none block w-full px-3 py-2 border border-industrial rounded-industrial placeholder-secondary focus:outline-none focus:ring-brand-teal focus:border-brand-teal sm:text-sm"
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
            className="appearance-none block w-full px-3 py-2 border border-industrial rounded-industrial placeholder-secondary focus:outline-none focus:ring-brand-teal focus:border-brand-teal sm:text-sm"
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
    </form>
  );
}
