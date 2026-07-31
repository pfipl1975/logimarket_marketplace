import { LoginForm } from "@/components/auth/LoginForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type Locale, isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

export default async function LocalizedLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const p = await params;
  if (!isLocale(p.locale) || p.locale === "pl") {
    notFound();
  }

  const dictionary = await getDictionary(p.locale);
  const sp = await searchParams;

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {dictionary.auth?.loginTitle || "Log in"}
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
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
            }}
          />
        </div>
      </div>
    </div>
  );
}
