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


interface SiteHeaderProps {
  locale: Locale;
  languageLinks: Record<Locale, string>;
  navLabels: Dictionary["nav"];
  searchLabels: Dictionary["search"];
}

export function SiteHeader({
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
  const glossaryHref = getGlossaryPath(locale);
  const solutionsHref = getSolutionsIndexPath(locale);

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

  return (
    <header className="sticky top-0 z-40 bg-brand-navy text-white shadow-lg">
      <div className="bg-brand-navy">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-3 py-1.5 sm:px-4 sm:py-2 md:gap-6 md:px-6 md:py-2">
          <Link href={homeHref} className="flex shrink-0 items-center" aria-label="LogiMarket B2B Marketplace">
            <Logo variant="light" compact markOnly />
          </Link>

          <div className="min-w-0 flex-1 border-l border-white/15 pl-4 md:pl-6">
            <p className="text-xs font-bold uppercase leading-tight tracking-wider text-white sm:text-sm md:text-base lg:text-lg xl:text-xl">
              {navLabels.constructionNotice ?? "MARKETPLACE W BUDOWIE / MARKETPLACE UNDER CONSTRUCTION"}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-brand-navy">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-1.5 sm:px-4 md:px-6 relative">
          <CatalogNavigationLoader
            locale={locale}
            desktopItems={desktopNavItems}
            mobileItems={mobileNavItems}
            fallbackLabel={navLabels.catalog}
            menuOpenLabel={navLabels.menu ?? "Menu"}
            menuCloseLabel={navLabels.closeMenu ?? navLabels.menu ?? "Menu"}
            mainNavigationLabel={navLabels.mainNavigation ?? navLabels.menu ?? "Menu"}
            searchLabels={searchLabels}
          />

          <CatalogSearchSuggestions
            locale={locale}
            labels={searchLabels}
            variant="desktop"
          />

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher
              currentLocale={locale}
              links={languageLinks}
              ariaLabel={navLabels.languageSwitcherAria}
            />
            <CartButton label={navLabels.cart} />
          </div>
        </div>
      </div>
    </header>
  );
}
