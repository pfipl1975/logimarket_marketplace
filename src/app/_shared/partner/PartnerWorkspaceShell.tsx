import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { getHomePath } from "@/lib/i18n/paths";
import { PublicLogoutForm } from "@/components/auth/PublicLogoutForm";
import { PartnerWorkspaceNavigation } from "./PartnerWorkspaceNavigation";

type PartnerWorkspaceDictionary = Dictionary["PartnerWorkspace"];

export function PartnerWorkspaceShell({
  children,
  locale,
  partnerName,
  dashboardHref,
  ordersHref,
  offersHref,
  dict,
}: {
  children: React.ReactNode;
  locale: Locale;
  partnerName: string;
  dashboardHref: string;
  ordersHref: string;
  offersHref: string;
  dict: PartnerWorkspaceDictionary;
}) {
  const marketplaceHref = getHomePath(locale);

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray font-sans">
      <header className="sticky top-0 z-30 bg-brand-navy text-white shadow-soft">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Link
            href={dashboardHref}
            className="min-w-0 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
          >
            <span className="block text-lg font-bold tracking-tight text-white">
              LogiMarket
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">
              {dict.title}
            </span>
          </Link>

          <div className="order-3 col-span-2 flex min-w-0 flex-col border-t border-white/10 md:order-none md:col-span-1 md:flex-row md:items-stretch md:border-t-0 md:px-4">
            <PartnerWorkspaceNavigation
              dashboardHref={dashboardHref}
              ordersHref={ordersHref}
              offersHref={offersHref}
              labels={{
                navigationLabel: dict.navigationLabel,
                dashboard: dict.dashboard,
                orders: dict.orders,
                offers: dict.offers,
              }}
            />
            <Link
              href={marketplaceHref}
              className="flex min-h-10 items-center gap-2 border-t border-white/10 px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-inset md:ml-auto md:min-h-11 md:border-l md:border-t-0 md:px-4"
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
              <span>{dict.backToMarketplace}</span>
            </Link>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <div className="min-w-0 max-w-28 text-right sm:max-w-48 lg:max-w-64">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-white/50">
                {dict.partnerContext}
              </span>
              <span className="block truncate text-xs font-semibold text-white sm:text-sm" title={partnerName}>
                {partnerName}
              </span>
            </div>
            <PublicLogoutForm locale={locale} label={dict.logout} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      <footer className="mt-auto border-t border-border-industrial bg-white py-5">
        <div className="mx-auto w-full max-w-[1400px] px-4 text-sm text-muted-foreground sm:px-6">
          &copy; {new Date().getFullYear()} LogiMarket. {dict.copyright}
        </div>
      </footer>
    </div>
  );
}
