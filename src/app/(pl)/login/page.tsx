import { LoginForm } from "@/components/auth/LoginForm";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const dictionary = await getDictionary("pl");
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {dictionary.auth?.loginTitle || "Logowanie"}
          </h2>
        </div>
        <LoginForm
          locale="pl"
          nextUrl={sp?.next}
          translations={{
            emailLabel: dictionary.auth?.emailLabel || "Email",
            passwordLabel: dictionary.auth?.passwordLabel || "Hasło",
            submitButton: dictionary.auth?.submitButton || "Zaloguj się",
            pendingButton: dictionary.auth?.pendingButton || "Logowanie...",
            loginError: dictionary.auth?.loginError || "Nieprawidłowe dane logowania.",
          }}
        />
      </div>
    </div>
  );
}
