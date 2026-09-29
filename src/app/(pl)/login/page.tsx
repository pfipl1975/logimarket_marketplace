import { LoginForm } from "@/components/auth/LoginForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { safeAccountNext } from "@/lib/auth/account-paths";

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; authError?: string; passwordUpdated?: string }>;
}) {
  const dictionary = await getDictionary("pl");
  const sp = await searchParams;
  if ((await getCurrentUser()).status === "authenticated") redirect(safeAccountNext(sp.next, "pl"));

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-primary">
          {dictionary.auth?.loginTitle || "Logowanie"}
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 border border-border-industrial rounded-industrial sm:px-10">
          {sp.authError === "1" && <p role="alert" className="mb-4 rounded-industrial border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{dictionary.auth.account.callbackError}</p>}
          {sp.passwordUpdated === "1" && <p role="status" className="mb-4 rounded-industrial border border-brand-teal bg-brand-teal/10 p-3 text-sm text-primary">{dictionary.auth.account.passwordUpdated}</p>}
          <LoginForm
            locale="pl"
            nextUrl={typeof sp?.next === 'string' ? sp.next : null}
            translations={{
              emailLabel: dictionary.auth?.emailLabel || "Email",
              passwordLabel: dictionary.auth?.passwordLabel || "Hasło",
              submitButton: dictionary.auth?.submitButton || "Zaloguj się",
              pendingButton: dictionary.auth?.pendingButton || "Logowanie...",
              invalidCredentials: dictionary.auth?.invalidCredentials || "Nieprawidłowy e-mail lub hasło.",
              unavailableError: dictionary.auth?.unavailableError || "Logowanie jest w tej chwili niedostępne.",
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
