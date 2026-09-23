import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import { CartButton } from "@/components/CartButton";
import { CatalogNavigationLoader } from "@/components/catalog/CatalogNavigationLoader";
import { CatalogSearchSuggestions } from "@/components/search/CatalogSearchSuggestions";
import type { HeaderDesktopNavigationItem } from "@/components/HeaderDesktopNavigation";
import type { MobileNavigationItem } from "@/components/catalog/CatalogNavigationClient";
import type { Locale } from "@/lib/i18n/config";
import { getHomePath, getGlossaryPath } from "@/lib/i18n/paths";
import { getSolutionsIndexPath } from "@/lib/landing/links";
import type { Dictionary } from "@/lib/i18n/types";
import { PublicLogoutForm } from "@/components/auth/PublicLogoutForm";

interface SiteHeaderProps {
  locale: Locale;
  languageLinks: Record<Locale, string>;
  navLabels: Dictionary["nav"];
  searchLabels: Dictionary["search"];
}

export async function SiteHeader({
  locale,
  languageLinks,
  navLabels,
  searchLabels,
}: SiteHeaderProps) {
  const homeHref = getHomePath(locale);
  const portalLinks = [
    { label: navLabels.portal, href: "https://logimarket.pl" },
    { label: navLabels.blog, href: "https://logimarket.pl/blog" },
  ];

  const catalogHref = locale === "pl" ? "/katalog" : `/${locale}/katalog`;
  const buyerOrdersHref = locale === "pl" ? "/zamowienia" : "/" + locale + "/orders";
  const glossaryHref = getGlossaryPath(locale);
  const solutionsHref = getSolutionsIndexPath(locale);

  const { getCurrentUser } = await import("@/lib/auth/session");
  const { hasAnyActivePartnerMembership } = await import("@/lib/auth/partner-membership");
  
  const userResult = await getCurrentUser();
  const isAuth = userResult.status === "authenticated";
  
  let hasPartnerPanel = false;
  if (isAuth) {
    hasPartnerPanel = await hasAnyActivePartnerMembership(userResult.user!.id);
  }

  const { getPublicAuthNavigationState } = await import("@/lib/auth/public-auth-navigation");
  const navState = getPublicAuthNavigationState(isAuth, hasPartnerPanel, locale);

  const desktopNavItems: HeaderDesktopNavigationItem[] = [
    ...portalLinks.map((link) => ({ ...link, external: true })),
    ...(glossaryHref ? [{ label: navLabels.glossary, href: glossaryHref }] : []),
    { label: navLabels.solutions, href: solutionsHref },
  ];

  const mobileNavItems: MobileNavigationItem[] = [
    { label: navLabels.portal, href: "https://logimarket.pl", external: true },
    { label: navLabels.blog, href: "https://logimarket.pl/blog", external: true },
    ...(glossaryHref ? [{ label: navLabels.glossary, href: glossaryHref }] : []),
    { label: navLabels.solutions, href: solutionsHref },
  ];

  // We don't push auth items to primary nav arrays anymore.
  // They are handled by dedicated desktop and mobile UI components.

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-navy text-white shadow-sm">
      <div className="bg-brand-navy">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-1 sm:px-4 md:px-6">
          <Link
            href={homeHref}
            className="flex shrink-0 items-center rounded-md focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy"
            aria-label="LogiMarket B2B Marketplace"
          >
            <Logo
              variant="light"
              compact
              markOnly
              className="!h-10 !w-10 !shadow-none sm:!h-11 sm:!w-11 lg:!h-12 lg:!w-12 xl:!h-12 xl:!w-12 2xl:!h-12 2xl:!w-12"
            />
          </Link>

          <div className="min-w-0 flex-1 border-l border-white/15 pl-3 md:pl-4">
            <p className="text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] text-white/70 sm:text-xs">
              {navLabels.constructionNotice ?? "MARKETPLACE W BUDOWIE / MARKETPLACE UNDER CONSTRUCTION"}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-brand-navy">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-3 py-1.5 sm:px-4 md:px-6 relative xl:gap-3 2xl:gap-4">
          <CatalogNavigationLoader
            locale={locale}
            desktopItems={desktopNavItems}
            mobileItems={mobileNavItems}
            fallbackLabel={navLabels.catalog}
            menuOpenLabel={navLabels.menu ?? "Menu"}
            menuCloseLabel={navLabels.closeMenu ?? navLabels.menu ?? "Menu"}
            mainNavigationLabel={navLabels.mainNavigation ?? navLabels.menu ?? "Menu"}
            searchLabels={searchLabels}
            mobileAuthNode={
              <div key="mobile-auth" className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-2">
                {navState.showLogin && navLabels.login && (
                  <Link key="mobile-login" href={navState.loginUrl} className="flex min-h-[44px] w-full items-center rounded-md px-3 py-2.5 text-sm transition-colors text-white/90 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal">
                    {navLabels.login}
                  </Link>
                )}
                {isAuth && navLabels.myOrders && (
                  <Link key="mobile-orders" href={buyerOrdersHref} className="flex min-h-[44px] w-full items-center rounded-md px-3 py-2.5 text-sm transition-colors text-white/90 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal">
                    {navLabels.myOrders}
                  </Link>
                )}
                {navState.showPartnerPanel && navLabels.partnerPanel && (
                  <Link key="mobile-partner" href={navState.partnerUrl} className="flex min-h-[44px] w-full items-center rounded-md px-3 py-2.5 text-sm transition-colors text-white/90 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal">
                    {navLabels.partnerPanel}
                  </Link>
                )}
                {navState.showLogout && navLabels.logout && (
                  <PublicLogoutForm key="mobile-logout" locale={locale} label={navLabels.logout} variant="mobile" />
                )}
              </div>
            }
          />

          <div className="hidden lg:block flex-1 min-w-[200px] max-w-[420px]">
            <CatalogSearchSuggestions
              locale={locale}
              labels={searchLabels}
              variant="desktop"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:gap-3 ml-auto">
            {navState.showLogin && navLabels.login && (
              <Link href={navState.loginUrl} className="hidden min-[1600px]:flex shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-white/10 hover:text-white text-white/80 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy">
                {navLabels.login}
              </Link>
            )}
            {isAuth && navLabels.myOrders && (
              <Link href={buyerOrdersHref} className="hidden min-[1600px]:flex shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-white/10 hover:text-white text-white/80 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy">
                {navLabels.myOrders}
              </Link>
            )}
            {navState.showPartnerPanel && navLabels.partnerPanel && (
              <Link href={navState.partnerUrl} className="hidden min-[1600px]:flex shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-white/10 hover:text-white text-white/80 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy">
                {navLabels.partnerPanel}
              </Link>
            )}
            {navState.showLogout && navLabels.logout && (
              <div className="hidden min-[1600px]:block shrink-0">
                <PublicLogoutForm locale={locale} label={navLabels.logout} variant="desktop" />
              </div>
            )}
            <LanguageSwitcher
              currentLocale={locale}
              links={languageLinks}
              ariaLabel={navLabels.languageSwitcherAria}
            />
            <CartButton label={navLabels.cart} />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-brand-navy lg:hidden">
        <div className="mx-auto w-full max-w-7xl px-3 pb-2 pt-1 sm:px-4 md:px-6">
          <CatalogSearchSuggestions
            locale={locale}
            labels={searchLabels}
            variant="mobile"
          />
        </div>
      </div>
    </header>
  );
}
