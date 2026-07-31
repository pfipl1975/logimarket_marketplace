"use client";

import { useActionState } from "react";
import { loginUser } from "@/app/actions";

export function LoginForm({
  translations,
  nextUrl,
  locale,
}: {
  translations: {
    emailLabel: string;
    passwordLabel: string;
    submitButton: string;
    pendingButton: string;
    loginError: string;
  };
  nextUrl?: string;
  locale: string;
}) {
  const [state, formAction, isPending] = useActionState(loginUser, {
    error: null,
    success: false,
  });

  return (
    <div className="w-full max-w-sm mx-auto p-6 bg-white border border-gray-200 rounded-[2px] shadow-sm">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={nextUrl || ""} />
        <input type="hidden" name="locale" value={locale} />
        
        {state?.error && (
          <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-[2px]" role="alert">
            {translations.loginError}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-gray-900">
            {translations.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-[2px] text-sm focus:outline-none focus:ring-1 focus:ring-[#147487] focus:border-[#147487]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-gray-900">
            {translations.passwordLabel}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-[2px] text-sm focus:outline-none focus:ring-1 focus:ring-[#147487] focus:border-[#147487]"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 bg-[#141c2c] hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-[4px] text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? translations.pendingButton : translations.submitButton}
        </button>
      </form>
    </div>
  );
}
