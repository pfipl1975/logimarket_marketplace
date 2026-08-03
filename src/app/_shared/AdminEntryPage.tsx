import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import Link from "next/link";

export function AdminEntryPage({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary["admin"];
}) {
  const homePath = locale === "pl" ? "/" : `/${locale}`;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200 flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full border border-teal-900/50 bg-neutral-900 p-8 sm:p-12 shadow-2xl">
        <header className="mb-8 border-b border-teal-900/30 pb-6">
          <p className="text-teal-500 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-2">
            {dictionary.eyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
            {dictionary.title}
          </h1>
        </header>

        <div className="space-y-6 text-neutral-300">
          <p className="text-base sm:text-lg leading-relaxed">
            {dictionary.description}
          </p>
          
          <div className="bg-neutral-950 p-5 sm:p-6 border-l-4 border-teal-700">
            <p className="text-sm leading-relaxed text-neutral-400">
              {dictionary.scopeDescription}
            </p>
          </div>
        </div>

        <footer className="mt-12 pt-6 border-t border-teal-900/30">
          <Link 
            href={homePath}
            className="inline-flex items-center justify-center px-6 py-3 bg-teal-800 hover:bg-teal-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
          >
            {dictionary.backToMarketplace}
          </Link>
        </footer>
      </div>
    </main>
  );
}
