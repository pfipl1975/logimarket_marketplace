import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import Link from "next/link";
import { AdminLogoutForm } from "@/components/auth/AdminLogoutForm";

export function AdminEntryPage({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary["admin"];
}) {
  const homePath = locale === "pl" ? "/" : `/${locale}`;

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full border border-border-industrial bg-card text-card-foreground p-8 sm:p-12 rounded-industrial">
        <header className="mb-8 border-b border-border-industrial pb-6">
          <p className="text-accent text-xs sm:text-sm font-semibold tracking-widest uppercase mb-2">
            {dictionary.eyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-primary">
            {dictionary.title}
          </h1>
        </header>

        <div className="space-y-6 text-muted-foreground">
          <p className="text-base sm:text-lg leading-relaxed">
            {dictionary.description}
          </p>
          
          <div className="bg-secondary p-5 sm:p-6 border-l-4 border-accent">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {dictionary.scopeDescription}
            </p>
          </div>
        </div>

        <footer className="mt-12 pt-6 border-t border-border-industrial flex flex-col sm:flex-row gap-4">
          <Link 
            href={homePath}
            className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-accent text-primary-foreground rounded-button text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            {dictionary.backToMarketplace}
          </Link>
          <AdminLogoutForm
            locale={locale}
            labels={{
              logoutButton: dictionary.logoutButton,
              logoutPending: dictionary.logoutPending,
              logoutUnavailable: dictionary.logoutUnavailable
            }}
          />
        </footer>
      </div>
    </main>
  );
}
