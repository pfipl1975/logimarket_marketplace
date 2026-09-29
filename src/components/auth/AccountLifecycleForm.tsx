"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAccount, requestPasswordRecovery, updateAccountPassword } from "@/app/account-actions";
import { accountPath } from "@/lib/auth/account-paths";
import type { AccountActionResult } from "@/lib/auth/account-lifecycle-core";
import type { Dictionary, Locale } from "@/lib/i18n/types";

type Kind = "register" | "forgot-password" | "reset-password";
const initial: AccountActionResult = { code: "IDLE" };
const inputClass = "mt-1 block w-full rounded-industrial border border-border-industrial bg-card px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal";

export function AccountLifecycleForm({ kind, locale, labels, next }: {
  kind: Kind; locale: Locale; labels: Dictionary["auth"]; next: string | null;
}) {
  const action = kind === "register" ? registerAccount : kind === "forgot-password" ? requestPasswordRecovery : updateAccountPassword;
  const [state, formAction, pending] = useActionState(action, initial);
  const copy = labels.account;
  const success = state.code === "CHECK_EMAIL";
  const message = state.code === "CHECK_EMAIL"
    ? kind === "register" ? copy.checkEmailRegister : copy.checkEmailRecovery
    : state.code === "INVALID_EMAIL" ? copy.invalidEmail
    : state.code === "PASSWORD_POLICY" ? copy.passwordPolicy
    : state.code === "MISMATCH" ? copy.mismatch
    : state.code === "INVALID_LINK" ? copy.invalidLink
    : state.code === "AUTH_UNAVAILABLE" ? copy.unavailable : null;

  return (
    <div className="space-y-5">
      <div className="min-h-12" aria-live="polite">
        {message && <p role={success ? "status" : "alert"} className={`rounded-industrial border p-3 text-sm ${success ? "border-brand-teal bg-brand-teal/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{message}</p>}
      </div>
      {!success && <form action={formAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {kind === "register" && <input type="hidden" name="next" value={next ?? ""} />}
        {kind !== "reset-password" && <div>
          <label htmlFor={`${kind}-email`} className="block text-sm font-medium text-primary">{labels.emailLabel}</label>
          <input id={`${kind}-email`} name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} />
        </div>}
        {kind !== "forgot-password" && <>
          <div>
            <label htmlFor={`${kind}-password`} className="block text-sm font-medium text-primary">{kind === "register" ? labels.passwordLabel : copy.newPassword}</label>
            <input id={`${kind}-password`} name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className={inputClass} />
            <p className="mt-1 text-xs text-text-secondary">{copy.passwordHint}</p>
          </div>
          <div>
            <label htmlFor={`${kind}-confirmation`} className="block text-sm font-medium text-primary">{copy.confirmPassword}</label>
            <input id={`${kind}-confirmation`} name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className={inputClass} />
          </div>
        </>}
        <button type="submit" disabled={pending} className="w-full rounded-button bg-brand-navy px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70">
          {pending ? copy.pending : kind === "register" ? copy.registerButton : kind === "forgot-password" ? copy.recoveryButton : copy.resetButton}
        </button>
      </form>}
      <div className="space-y-2 text-center text-sm text-text-secondary">
        {kind === "register" && <p>{copy.hasAccount} <Link className="font-semibold text-brand-teal underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-teal" href={accountPath(locale, "login")}>{copy.loginLink}</Link></p>}
        {kind === "forgot-password" && <p><Link className="font-semibold text-brand-teal underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-teal" href={accountPath(locale, "login")}>{copy.loginLink}</Link></p>}
        {kind === "reset-password" && <p><Link className="font-semibold text-brand-teal underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-teal" href={accountPath(locale, "forgot-password")}>{copy.newRecoveryLink}</Link></p>}
      </div>
    </div>
  );
}
