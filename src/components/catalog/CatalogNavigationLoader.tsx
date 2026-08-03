import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath } from "@/lib/i18n/paths";
import { getCachedCategories } from "@/lib/catalog/navigation.server";
import { buildCategoryTree } from "@/lib/catalog/tree";
import { buildLocalizedExplorerTree, type CatalogExplorerNode } from "@/lib/catalog/navigation";
import { CatalogNavigationClient, type MobileNavigationItem } from "./CatalogNavigationClient";
import { reportCatalogNavigationLoadError } from "@/lib/catalog/catalog-navigation-error-reporting";
import type { HeaderDesktopNavigationItem } from "@/components/HeaderDesktopNavigation";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import { defaultLocale } from "@/lib/i18n/config";

interface CatalogNavigationLoaderProps {
  locale: Locale;
  desktopItems: HeaderDesktopNavigationItem[];
  mobileItems: MobileNavigationItem[];
  fallbackLabel: string;
  menuOpenLabel: string;
  menuCloseLabel: string;
  mainNavigationLabel: string;
  searchLabels: Dictionary["search"];
}

export async function CatalogNavigationLoader({ 
  locale, 
  desktopItems,
  mobileItems,
  fallbackLabel,
  menuOpenLabel,
  menuCloseLabel,
  mainNavigationLabel,
  searchLabels
}: CatalogNavigationLoaderProps) {
  let tree: CatalogExplorerNode[] = [];
  let desktopLabels = {
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
  };
  let mobileLabels = {
    mobileCatalogTitle: "",
    mobileCatalogClose: "",
    mobileCatalogBack: "",
    mobileCatalogBackToMenu: "",
    mobileCatalogViewCatalog: "",
    mobileCatalogViewCurrent: "",
    mobileCatalogOpenLevel: "",
  };

  const catalogHref = `${getHomePath(locale) === "/" ? "" : getHomePath(locale)}/katalog`;

  try {
    const [categories, dict] = await Promise.all([
      getCachedCategories(),
      getDictionary(locale),
    ]);

    const fallbackDict = locale === defaultLocale ? dict : await getDictionary(defaultLocale);
    
    // Update trigger even if categories are empty, if dictionary is available
    if (dict?.nav?.catalog) {
      desktopLabels.trigger = dict.nav.catalog;
    }

    if (categories && categories.length > 0) {
      const categoryTree = buildCategoryTree(categories);
      const categoryFilterBasePath = getHomePath(locale);

      const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
      const fallbackBySlug = fallbackDict.categories?.bySlug as Record<string, string> | undefined;

      tree = buildLocalizedExplorerTree(
        categoryTree,
        categoryFilterBasePath,
        localeBySlug,
        fallbackBySlug
      );

      desktopLabels = {
        trigger: dict.nav.catalog || fallbackLabel,
        catalogMenuOpen: dict.catalog.catalogMenuOpen,
        catalogMenuClose: dict.catalog.catalogMenuClose,
        catalogMenuSections: dict.catalog.catalogMenuSections,
        catalogMenuGroups: dict.catalog.catalogMenuGroups,
        catalogMenuCategories: dict.catalog.catalogMenuCategories,
        catalogMenuViewSection: dict.catalog.catalogMenuViewSection,
        catalogMenuViewGroup: dict.catalog.catalogMenuViewGroup,
        catalogMenuEmptyGroups: dict.catalog.catalogMenuEmptyGroups || "",
        catalogMenuEmptyCategories: dict.catalog.catalogMenuEmptyCategories || "",
      };

      mobileLabels = {
        mobileCatalogTitle: dict.catalog.mobileCatalogTitle,
        mobileCatalogClose: dict.catalog.mobileCatalogClose,
        mobileCatalogBack: dict.catalog.mobileCatalogBack,
        mobileCatalogBackToMenu: dict.catalog.mobileCatalogBackToMenu,
        mobileCatalogViewCatalog: dict.catalog.mobileCatalogViewCatalog,
        mobileCatalogViewCurrent: dict.catalog.mobileCatalogViewCurrent,
        mobileCatalogOpenLevel: dict.catalog.mobileCatalogOpenLevel,
      };
    }
  } catch (error) {
    reportCatalogNavigationLoadError(error);
    // Silent fallback will be used because variables retain initial values
  }

  return (
    <CatalogNavigationClient
      tree={tree}
      desktopItems={desktopItems}
      mobileItems={mobileItems}
      desktopLabels={desktopLabels}
      mobileLabels={mobileLabels}
      catalogHref={catalogHref}
      menuOpenLabel={menuOpenLabel}
      menuCloseLabel={menuCloseLabel}
      mainNavigationLabel={mainNavigationLabel}
      searchLabels={searchLabels}
      locale={locale}
    />
  );
}
