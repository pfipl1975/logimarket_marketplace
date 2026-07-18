"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive } from "@/lib/navigation/active";
import { cn } from "@/lib/utils";

export type HeaderDesktopNavigationItem = {
  label: string;
  href: string;
  external?: boolean;
  className?: string;
};

type HeaderDesktopNavigationProps = {
  items: HeaderDesktopNavigationItem[];
};

const linkBaseClass = "rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-white/5 hover:text-white sm:px-3";

export function HeaderDesktopNavigation({ items }: HeaderDesktopNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="hidden lg:flex min-w-0 flex-1 items-center gap-1">
      {items.map((item) => {
        const isActive = !item.external && isNavItemActive(pathname, item.href);
        const className = cn(
          linkBaseClass,
          item.className,
          isActive
            ? "bg-white/5 font-semibold text-white"
            : "font-medium text-white/75",
        );

        if (item.external) {
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {item.label}
            </a>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={className}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
