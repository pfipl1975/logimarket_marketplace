"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import type { Category } from "@/lib/schema";
import type { Dictionary } from "@/lib/i18n/types";

interface CategoryFilterProps {
  categories: Category[];
  catalogLabels: Pick<Dictionary["catalog"], "allCategories" | "categoriesAria">;
  categoryLabels: Record<string, string>;
  basePath: string;
}

export function CategoryFilter({ categories, catalogLabels, categoryLabels, basePath }: CategoryFilterProps) {
  const searchParams = useSearchParams();
  const active = searchParams.get("kategoria") || "";
  const items = [{ name: catalogLabels.allCategories, slug: "" }, ...categories];

  return (
    <nav aria-label={catalogLabels.categoriesAria} className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = active === item.slug;
        const href = item.slug ? `${basePath}?kategoria=${item.slug}` : basePath;
        const label = item.slug
          ? getLocalizedCategoryLabel(categoryLabels, item.slug, item.name)
          : item.name;
        return (
          <Link key={item.slug || "all"} href={href}
            className={isActive
              ? "rounded-full bg-brand-navy px-4 py-2 text-sm font-medium text-white shadow-sm"
              : "rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-all hover:border-brand-teal hover:text-brand-teal"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
