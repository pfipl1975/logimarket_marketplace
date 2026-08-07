"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminNavigationProps {
  variant: "mobile" | "desktop";
  dashboardPath: string;
  offersPath: string;
  partnersPath: string;
  rfqPath: string;
  ordersPath: string;
  labels: {
    navigationLabel: string;
    dashboardNav: string;
    offersNav: string;
    partnersNav: string;
    rfqNav: string;
    ordersNav: string;
    taxonomyNav: string;
    plannedLabel: string;
  };
}

export function AdminNavigation({
  variant,
  dashboardPath,
  offersPath,
  partnersPath,
  rfqPath,
  ordersPath,
  labels,
}: AdminNavigationProps) {
  const pathname = usePathname();

  const isDashboardActive = pathname === dashboardPath;
  const isOffersActive = pathname === offersPath || pathname.startsWith(`${offersPath}/`);
  const isPartnersActive = pathname === partnersPath || pathname.startsWith(`${partnersPath}/`);
  const isRfqActive = pathname === rfqPath || pathname.startsWith(`${rfqPath}/`);
  const isOrdersActive = pathname === ordersPath || pathname.startsWith(`${ordersPath}/`);

  const linkClassBase = "px-4 rounded-industrial transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring flex justify-between items-center";
  const linkClassSize = variant === "mobile" ? "py-2" : "py-3";
  const activeClass = "bg-brand-teal text-primary-foreground font-medium";
  const inactiveClass = "text-muted-foreground hover:text-primary-foreground hover:bg-white/5";

  const disabledClass = `px-4 ${linkClassSize} text-muted-foreground/60 flex justify-between items-center`;

  return (
    <nav className="flex flex-col gap-2" aria-label={labels.navigationLabel}>
      <Link
        href={dashboardPath}
        className={`${linkClassBase} ${linkClassSize} ${isDashboardActive ? activeClass : inactiveClass}`}
        aria-current={isDashboardActive ? "page" : undefined}
      >
        {labels.dashboardNav}
      </Link>

      <Link
        href={offersPath}
        className={`${linkClassBase} ${linkClassSize} ${isOffersActive ? activeClass : inactiveClass}`}
        aria-current={isOffersActive ? "page" : undefined}
      >
        {labels.offersNav}
      </Link>

      <Link
        href={partnersPath}
        className={`${linkClassBase} ${linkClassSize} ${isPartnersActive ? activeClass : inactiveClass}`}
        aria-current={isPartnersActive ? "page" : undefined}
      >
        {labels.partnersNav}
      </Link>

      <Link
        href={rfqPath}
        className={`${linkClassBase} ${linkClassSize} ${isRfqActive ? activeClass : inactiveClass}`}
        aria-current={isRfqActive ? "page" : undefined}
      >
        {labels.rfqNav}
      </Link>
      <Link
        href={ordersPath}
        className={`${linkClassBase} ${linkClassSize} ${isOrdersActive ? activeClass : inactiveClass}`}
        aria-current={isOrdersActive ? "page" : undefined}
      >
        {labels.ordersNav}
      </Link>
      <span aria-disabled="true" className={disabledClass}>
        {labels.taxonomyNav} <span className="text-xs uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">{labels.plannedLabel}</span>
      </span>
    </nav>
  );
}
