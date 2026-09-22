"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PartnerWorkspaceNavigationProps = {
  dashboardHref: string;
  ordersHref: string;
  offersHref: string;
  labels: {
    navigationLabel: string;
    dashboard: string;
    orders: string;
    offers: string;
  };
};

function normalizePath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function PartnerWorkspaceNavigation({
  dashboardHref,
  ordersHref,
  offersHref,
  labels,
}: PartnerWorkspaceNavigationProps) {
  const pathname = normalizePath(usePathname());
  const normalizedDashboardHref = normalizePath(dashboardHref);
  const normalizedOrdersHref = normalizePath(ordersHref);
  const normalizedOffersHref = normalizePath(offersHref);
  const isDashboardActive = pathname === normalizedDashboardHref;
  const isOrdersActive =
    pathname === normalizedOrdersHref ||
    pathname.startsWith(`${normalizedOrdersHref}/`);
  const isOffersActive =
    pathname === normalizedOffersHref ||
    pathname.startsWith(`${normalizedOffersHref}/`);

  const linkBase =
    "flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy sm:px-4";
  const activeClass = "border-brand-teal bg-white/10 text-white";
  const inactiveClass =
    "border-transparent text-white/75 hover:border-white/30 hover:bg-white/5 hover:text-white";

  return (
    <nav
      aria-label={labels.navigationLabel}
      className="grid min-w-0 flex-1 grid-cols-3 items-stretch gap-1"
    >
      <Link
        href={dashboardHref}
        aria-current={isDashboardActive ? "page" : undefined}
        className={`${linkBase} ${isDashboardActive ? activeClass : inactiveClass}`}
      >
        {labels.dashboard}
      </Link>
      <Link
        href={ordersHref}
        aria-current={isOrdersActive ? "page" : undefined}
        className={`${linkBase} ${isOrdersActive ? activeClass : inactiveClass}`}
      >
        {labels.orders}
      </Link>
      <Link
        href={offersHref}
        aria-current={isOffersActive ? "page" : undefined}
        className={`${linkBase} justify-center text-center ${isOffersActive ? activeClass : inactiveClass}`}
      >
        {labels.offers}
      </Link>
    </nav>
  );
}
