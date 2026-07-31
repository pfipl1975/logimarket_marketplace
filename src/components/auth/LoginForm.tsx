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
    loginError: string;
  };
  locale: string;
}) {
  const [state, formAction, isPending] = useActionState(loginUser, {
    code: "IDLE",
    success: false,
  } as LoginActionResult);

  return (
    <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={nextUrl || ""} />
        <input type="hidden" name="locale" value={locale} />
        
        {state.code !== "IDLE" && (
          <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-[2px]" role="alert">
            {state.code === "INVALID_CREDENTIALS" ? translations.loginError : "Uwierzytelnienie tymczasowo niedostępne"}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            {translations.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="px-3 py-2 border border-gray-300 rounded-[2px] text-sm focus:outline-none focus:ring-1 focus:ring-[#f64c1e] focus:border-[#f64c1e]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            {translations.passwordLabel}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="px-3 py-2 border border-gray-300 rounded-[2px] text-sm focus:outline-none focus:ring-1 focus:ring-[#f64c1e] focus:border-[#f64c1e]"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-[2px] text-sm font-medium text-white bg-[#f64c1e] hover:bg-[#d94118] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f64c1e] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? translations.pendingButton : translations.submitButton}
        </button>
    </form>
  );
}
