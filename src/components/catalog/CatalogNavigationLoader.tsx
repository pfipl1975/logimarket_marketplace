import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath } from "@/lib/i18n/paths";
import { getCachedCategories } from "@/lib/catalog/navigation.server";
import { buildCategoryTree } from "@/lib/catalog/tree";
import { buildLocalizedExplorerTree } from "@/lib/catalog/navigation";
import { CatalogNavigationClient, type MobileNavigationItem } from "./CatalogNavigationClient";
import type { HeaderDesktopNavigationItem } from "@/components/HeaderDesktopNavigation";
import type { Locale } from "@/lib/i18n/types";
import { defaultLocale } from "@/lib/i18n/config";

interface CatalogNavigationLoaderProps {
  locale: Locale;
  desktopItems: HeaderDesktopNavigationItem[];
  mobileItems: MobileNavigationItem[];
  fallbackLabel: string;
}

export async function CatalogNavigationLoader({ 
  locale, 
  desktopItems,
  mobileItems,
  fallbackLabel 
}: CatalogNavigationLoaderProps) {
  try {
    const [categories, dict] = await Promise.all([
      getCachedCategories(),
      getDictionary(locale),
    ]);

    const fallbackDict = locale === defaultLocale ? dict : await getDictionary(defaultLocale);
    
    // We remove the static "Katalog ofert" item from mobile items as it's now handled natively 
    // by CatalogNavigationClient's catalog drill-down launcher
    const filteredMobileItems = mobileItems.filter(item => item.label !== dict.nav.catalog);

    const catalogHref = `${getHomePath(locale) === "/" ? "" : getHomePath(locale)}/katalog`;

    if (!categories || categories.length === 0) {
      return (
        <CatalogNavigationClient 
          tree={[]} 
          desktopItems={desktopItems} 
          mobileItems={filteredMobileItems}
          desktopLabels={{
            trigger: dict.nav.catalog || fallbackLabel,
            catalogMenuOpen: "",
            catalogMenuClose: "",
            catalogMenuSections: "",
            catalogMenuGroups: "",
            catalogMenuCategories: "",
            catalogMenuViewSection: "",
            catalogMenuViewGroup: "",
            catalogMenuEmptyGroups: "",
            catalogMenuEmptyCategories: "",
          }}
          mobileLabels={{
            mobileCatalogTitle: "",
            mobileCatalogClose: "",
            mobileCatalogBack: "",
            mobileCatalogBackToMenu: "",
            mobileCatalogViewCatalog: "",
            mobileCatalogViewCurrent: "",
            mobileCatalogOpenLevel: "",
          }}
          catalogHref={catalogHref}
          menuOpenLabel={dict.nav.menu ?? "Menu"}
          menuCloseLabel={dict.nav.closeMenu ?? "Close menu"}
          mainNavigationLabel={dict.nav.mainNavigation ?? "Main navigation"}
        />
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

    const desktopLabels = {
      trigger: dict.nav.catalog || fallbackLabel,
      catalogMenuOpen: dict.catalog.catalogMenuOpen || "Otwórz katalog",
      catalogMenuClose: dict.catalog.catalogMenuClose || "Zamknij katalog",
      catalogMenuSections: dict.catalog.catalogMenuSections || "Sekcje",
      catalogMenuGroups: dict.catalog.catalogMenuGroups || "Grupy",
      catalogMenuCategories: dict.catalog.catalogMenuCategories || "Kategorie",
      catalogMenuViewSection: dict.catalog.catalogMenuViewSection || "Zobacz całą sekcję",
      catalogMenuViewGroup: dict.catalog.catalogMenuViewGroup || "Zobacz całą grupę",
      catalogMenuEmptyGroups: dict.catalog.catalogMenuEmptyGroups || "",
      catalogMenuEmptyCategories: dict.catalog.catalogMenuEmptyCategories || "",
    };

    const mobileLabels = {
      mobileCatalogTitle: dict.catalog.mobileCatalogTitle || "Katalog",
      mobileCatalogClose: dict.catalog.mobileCatalogClose || "Zamknij katalog",
      mobileCatalogBack: dict.catalog.mobileCatalogBack || "Wróć",
      mobileCatalogBackToMenu: dict.catalog.mobileCatalogBackToMenu || "Wróć do menu",
      mobileCatalogViewCatalog: dict.catalog.mobileCatalogViewCatalog || "Zobacz cały katalog",
      mobileCatalogViewCurrent: dict.catalog.mobileCatalogViewCurrent || "Zobacz wszystkie",
      mobileCatalogOpenLevel: dict.catalog.mobileCatalogOpenLevel || "Rozwiń podkategorię",
    };

    return (
      <CatalogNavigationClient 
        tree={explorerTree} 
        desktopItems={desktopItems} 
        mobileItems={filteredMobileItems}
        desktopLabels={desktopLabels}
        mobileLabels={mobileLabels}
        catalogHref={catalogHref}
        menuOpenLabel={dict.nav.menu ?? "Menu"}
        menuCloseLabel={dict.nav.closeMenu ?? "Close menu"}
        mainNavigationLabel={dict.nav.mainNavigation ?? "Main navigation"}
      />
    );
  } catch (error) {
    console.error("Failed to load CatalogNavigationLoader", error);
    // Silent fallback
    const catalogHref = `${getHomePath(locale) === "/" ? "" : getHomePath(locale)}/katalog`;
    return (
      <CatalogNavigationClient 
        tree={[]} 
        desktopItems={desktopItems} 
        mobileItems={mobileItems}
        desktopLabels={{
          trigger: fallbackLabel,
          catalogMenuOpen: "",
          catalogMenuClose: "",
          catalogMenuSections: "",
          catalogMenuGroups: "",
          catalogMenuCategories: "",
          catalogMenuViewSection: "",
          catalogMenuViewGroup: "",
          catalogMenuEmptyGroups: "",
          catalogMenuEmptyCategories: "",
        }}
        mobileLabels={{
          mobileCatalogTitle: "",
          mobileCatalogClose: "",
          mobileCatalogBack: "",
          mobileCatalogBackToMenu: "",
          mobileCatalogViewCatalog: "",
          mobileCatalogViewCurrent: "",
          mobileCatalogOpenLevel: "",
        }}
        catalogHref={catalogHref}
        menuOpenLabel={"Menu"}
        menuCloseLabel={"Close menu"}
        mainNavigationLabel={"Main navigation"}
      />
    );
  }
}
