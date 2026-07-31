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
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-primary">
          {dictionary.auth?.loginTitle || "Logowanie"}
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 border border-border-industrial rounded-industrial sm:px-10">
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
            }}
          />
        </div>
      </div>
    </div>
  );
}
