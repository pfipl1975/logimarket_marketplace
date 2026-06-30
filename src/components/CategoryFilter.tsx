"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Category } from "@/lib/schema";
import type { Dictionary } from "@/lib/i18n/types";

interface CategoryFilterProps {
  categories: Category[];
  catalogLabels: Pick<Dictionary["catalog"], "allCategories" | "categoriesAria">;
}

export function CategoryFilter({ categories, catalogLabels }: CategoryFilterProps) {
  const searchParams = useSearchParams();
  const active = searchParams.get("kategoria") || "";
  const items = [{ name: catalogLabels.allCategories, slug: "" }, ...categories];

  return (
    <nav aria-label={catalogLabels.categoriesAria} className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = active === item.slug;
        const href = item.slug ? `/?kategoria=${item.slug}` : "/";
        return (
          <Link key={item.slug || "all"} href={href}
            className={isActive
              ? "rounded-full bg-brand-navy px-4 py-2 text-sm font-medium text-white shadow-sm"
              : "rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-all hover:border-brand-teal hover:text-brand-teal"
            }
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
