import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath } from "@/lib/i18n/paths";
import { getCachedCategories } from "@/lib/catalog/navigation.server";
import { buildCategoryTree } from "@/lib/catalog/tree";
import { buildLocalizedExplorerTree } from "@/lib/catalog/navigation";
import { CatalogDesktopMegaMenu } from "./CatalogDesktopMegaMenu";
import type { Locale } from "@/lib/i18n/types";
import { defaultLocale } from "@/lib/i18n/config";

interface CatalogDesktopMegaMenuLoaderProps {
  locale: Locale;
}

export async function CatalogDesktopMegaMenuLoader({ locale }: CatalogDesktopMegaMenuLoaderProps) {
  try {
    const [categories, dict] = await Promise.all([
      getCachedCategories(),
      getDictionary(locale),
    ]);

    const fallbackDict = locale === defaultLocale ? dict : await getDictionary(defaultLocale);

    if (!categories || categories.length === 0) {
      return (
        <Link
          href={`${getHomePath(locale) === "/" ? "" : getHomePath(locale)}/katalog`}
          className="rounded-md px-2.5 py-2 text-sm font-medium text-white hover:bg-white/5 transition-colors sm:px-3"
        >
          {dict.nav.catalog}
        </Link>
      );
    }

    const categoryTree = buildCategoryTree(categories);
    const categoryFilterBasePath = getHomePath(locale);
    
    const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
    const fallbackBySlug = fallbackDict.categories?.bySlug as Record<string, string> | undefined;

    const explorerTree = buildLocalizedExplorerTree(
      categoryTree,
      categoryFilterBasePath,
      localeBySlug,
      fallbackBySlug
    );

    const labels = {
      trigger: dict.nav.catalog,
      catalogMenuOpen: dict.catalog.catalogMenuOpen || "Otwórz katalog",
      catalogMenuClose: dict.catalog.catalogMenuClose || "Zamknij katalog",
      catalogMenuSections: dict.catalog.catalogMenuSections || "Sekcje",
      catalogMenuGroups: dict.catalog.catalogMenuGroups || "Grupy",
      catalogMenuCategories: dict.catalog.catalogMenuCategories || "Kategorie",
      catalogMenuViewSection: dict.catalog.catalogMenuViewSection || "Zobacz całą sekcję",
      catalogMenuViewGroup: dict.catalog.catalogMenuViewGroup || "Zobacz całą grupę",
    };

    return <CatalogDesktopMegaMenu tree={explorerTree} labels={labels} />;
  } catch (error) {
    console.error("Failed to load CatalogDesktopMegaMenu", error);
    // Fallback to simple link
    return (
      <Link
        href={`${getHomePath(locale) === "/" ? "" : getHomePath(locale)}/katalog`}
        className="rounded-md px-2.5 py-2 text-sm font-medium text-white hover:bg-white/5 transition-colors sm:px-3"
      >
        Katalog ofert
      </Link>
    );
  }
}
