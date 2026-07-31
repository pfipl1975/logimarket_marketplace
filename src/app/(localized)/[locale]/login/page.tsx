import { LoginForm } from "@/components/auth/LoginForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type Locale } from "@/lib/i18n/config";

export default async function LocalizedLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const p = await params;
  const dictionary = await getDictionary(p.locale as Locale);
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {dictionary.auth?.loginTitle || "Login"}
          </h2>
        </div>
        <LoginForm
          locale={p.locale}
          nextUrl={sp?.next}
          translations={{
            emailLabel: dictionary.auth?.emailLabel || "Email",
            passwordLabel: dictionary.auth?.passwordLabel || "Password",
            submitButton: dictionary.auth?.submitButton || "Sign in",
            pendingButton: dictionary.auth?.pendingButton || "Signing in...",
            loginError: dictionary.auth?.loginError || "Invalid credentials.",
          }}
        />
      </div>
    </div>
  );
}
