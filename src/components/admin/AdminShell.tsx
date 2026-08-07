import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import Logo from "@/components/Logo";
import { AdminLogoutForm } from "@/components/auth/AdminLogoutForm";
import Link from "next/link";
import { AdminNavigation } from "./AdminNavigation";

export async function AdminShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const dictionary = await getDictionary(locale);
  const adminDict = dictionary.admin;
  
  const homePath = locale === "pl" ? "/" : `/${locale}`;
  const dashboardPath = locale === "pl" ? "/admin" : `/${locale}/admin`;
  const offersPath = locale === "pl" ? "/admin/oferty" : `/${locale}/admin/offers`;

  const navLabels = {
    navigationLabel: adminDict.navigationLabel,
    dashboardNav: adminDict.dashboardNav,
    offersNav: adminDict.offersNav,
    partnersNav: adminDict.partnersNav,
    rfqNav: adminDict.rfqNav,
    ordersNav: adminDict.ordersNav,
    taxonomyNav: adminDict.taxonomyNav,
    plannedLabel: adminDict.plannedLabel,
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-brand-light-gray font-sans">
      {/* Mobile Sidebar/Nav */}
      <div className="md:hidden bg-brand-navy text-primary-foreground p-4">
        <div className="flex items-center justify-between mb-4">
          <Logo variant="light" compact className="h-8" />
          <div className="text-right">
            <span className="block text-xs font-bold uppercase tracking-wider text-accent">{adminDict.secureAreaLabel}</span>
            <span className="block text-xs text-muted-foreground">{adminDict.readOnlyLabel}</span>
          </div>
        </div>
        <details className="group">
          <summary className="cursor-pointer font-medium py-2 border-b border-border-industrial/20 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {adminDict.navigationLabel}
          </summary>
          <div className="mt-4">
            <AdminNavigation
              variant="mobile"
              dashboardPath={dashboardPath}
              offersPath={offersPath}
              labels={navLabels}
            />
          </div>
        </details>
        <div className="mt-6 pt-4 border-t border-border-industrial/20 flex flex-col gap-4">
          <Link href={homePath} className="text-sm hover:text-accent transition-colors">
            &larr; {adminDict.backToMarketplace}
          </Link>
          <AdminLogoutForm
            locale={locale}
            labels={{
              logoutButton: adminDict.logoutButton,
              logoutPending: adminDict.logoutPending,
              logoutUnavailable: adminDict.logoutUnavailable
            }}
          />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-brand-navy text-primary-foreground border-r border-border-industrial shrink-0">
        <div className="p-6 border-b border-border-industrial/20">
          <Logo variant="light" className="mb-4 w-full h-auto" />
          <div className="mt-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-accent">{adminDict.secureAreaLabel}</span>
            <span className="block text-xs text-muted-foreground mt-1">{adminDict.readOnlyLabel}</span>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <AdminNavigation
            variant="desktop"
            dashboardPath={dashboardPath}
            offersPath={offersPath}
            labels={navLabels}
          />
        </div>

        <div className="p-6 border-t border-border-industrial/20 flex flex-col gap-4">
          <Link href={homePath} className="text-sm text-muted-foreground hover:text-accent transition-colors focus:outline-none focus-visible:underline">
            &larr; {adminDict.backToMarketplace}
          </Link>
          <AdminLogoutForm
            locale={locale}
            labels={{
              logoutButton: adminDict.logoutButton,
              logoutPending: adminDict.logoutPending,
              logoutUnavailable: adminDict.logoutUnavailable
            }}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-brand-light-gray overflow-y-auto">
        <div className="flex-1 p-6 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
