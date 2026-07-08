import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import { CartButton } from "@/components/CartButton";
import { MobileNavigation, type MobileNavigationItem } from "@/components/MobileNavigation";
import type { Locale } from "@/lib/i18n/config";
import { getHomePath, getGlossaryPath } from "@/lib/i18n/paths";
import { getSolutionsIndexPath } from "@/lib/landing/links";
import type { Dictionary } from "@/lib/i18n/types";

interface SiteHeaderProps {
  locale: Locale;
  languageLinks: Record<Locale, string>;
  navLabels: Dictionary["nav"];
}

export function SiteHeader({
  locale,
  languageLinks,
  navLabels,
}: SiteHeaderProps) {
  const homeHref = getHomePath(locale);
  const portalLinks = [
    { label: navLabels.portal, href: "https://logimarket.pl" },
    { label: navLabels.blog, href: "https://logimarket.pl/blog" },
  ];

  const catalogHref = locale === "pl" ? "/katalog" : `/${locale}/katalog`;
  const glossaryHref = getGlossaryPath(locale);
  const solutionsHref = getSolutionsIndexPath(locale);

  const mobileNavItems: MobileNavigationItem[] = [
    { label: navLabels.portal, href: "https://logimarket.pl", external: true },
    { label: navLabels.blog, href: "https://logimarket.pl/blog", external: true },
    ...(glossaryHref ? [{ label: navLabels.glossary, href: glossaryHref }] : []),
    { label: navLabels.solutions, href: solutionsHref },
    { label: navLabels.catalog, href: catalogHref },
  ];

  return (
    <header className="sticky top-0 z-40 bg-brand-navy text-white shadow-lg">
      <div className="bg-brand-navy">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-3 py-3 sm:px-4 md:gap-8 md:px-6 md:py-4">
          <Link href={homeHref} className="flex shrink-0 items-center" aria-label="LogiMarket B2B Marketplace">
            <Logo variant="light" compact markOnly />
          </Link>

          <div className="min-w-0 flex-1 border-l border-white/15 pl-4 md:pl-8">
            <p className="text-xs font-bold uppercase tracking-wider text-white sm:text-sm md:text-base lg:text-lg xl:text-xl">
              {navLabels.constructionNotice ?? "MARKETPLACE W BUDOWIE / MARKETPLACE UNDER CONSTRUCTION"}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-brand-navy">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-4 md:px-6">
          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex min-w-0 flex-1 items-center gap-1">
            {portalLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                className="rounded-md px-2.5 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white sm:px-3">
                {link.label}
              </a>
            ))}
            {glossaryHref && (
              <Link href={glossaryHref}
                className="rounded-md px-2.5 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white sm:px-3">
                {navLabels.glossary}
              </Link>
            )}
            <Link
              href={solutionsHref}
              className="rounded-md px-2.5 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white sm:px-3">
              {navLabels.solutions}
            </Link>
            <Link href={catalogHref} className="ml-1 rounded-md bg-white/5 px-3 py-2 text-sm font-semibold text-white">
              {navLabels.catalog}
            </Link>
          </nav>

          {/* Mobile Navigation Burger Button & Dropdown */}
          <MobileNavigation
            items={mobileNavItems}
            menuOpenLabel={navLabels.menu ?? "Menu"}
            menuCloseLabel={navLabels.closeMenu ?? "Close menu"}
            mainNavigationLabel={navLabels.mainNavigation ?? "Main navigation"}
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
