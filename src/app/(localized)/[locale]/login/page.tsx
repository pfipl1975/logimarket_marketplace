import { LoginForm } from "@/components/auth/LoginForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type Locale, isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { safeAccountNext } from "@/lib/auth/account-paths";

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function LocalizedLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; authError?: string; passwordUpdated?: string }>;
}) {
  const p = await params;
  if (!isLocale(p.locale) || p.locale === "pl") {
    notFound();
  }

  const dictionary = await getDictionary(p.locale);
  const sp = await searchParams;
  if ((await getCurrentUser()).status === "authenticated") redirect(safeAccountNext(sp.next, p.locale));

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-primary">
          {dictionary.auth?.loginTitle || "Log in"}
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 border border-border-industrial rounded-industrial sm:px-10">
          {sp.authError === "1" && <p role="alert" className="mb-4 rounded-industrial border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{dictionary.auth.account.callbackError}</p>}
          {sp.passwordUpdated === "1" && <p role="status" className="mb-4 rounded-industrial border border-brand-teal bg-brand-teal/10 p-3 text-sm text-primary">{dictionary.auth.account.passwordUpdated}</p>}
          <LoginForm
            locale={p.locale}
            nextUrl={typeof sp?.next === 'string' ? sp.next : null}
            translations={{
              emailLabel: dictionary.auth?.emailLabel || "Email",
              passwordLabel: dictionary.auth?.passwordLabel || "Password",
              submitButton: dictionary.auth?.submitButton || "Sign in",
              pendingButton: dictionary.auth?.pendingButton || "Signing in...",
              invalidCredentials: dictionary.auth?.invalidCredentials || "Invalid email or password.",
              unavailableError: dictionary.auth?.unavailableError || "Authentication is currently unavailable.",
              noAccount: dictionary.auth.account.noAccount,
              registerLink: dictionary.auth.account.registerLink,
              forgotPrompt: dictionary.auth.account.forgotPrompt,
              forgotLink: dictionary.auth.account.forgotLink,
            }}
          />
        </div>
      </div>
    </div>
  );
}
