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
  menuOpenLabel: string;
  menuCloseLabel: string;
  mainNavigationLabel: string;
}

export async function CatalogNavigationLoader({ 
  locale, 
  desktopItems,
  mobileItems,
  fallbackLabel,
  menuOpenLabel,
  menuCloseLabel,
  mainNavigationLabel
}: CatalogNavigationLoaderProps) {
  try {
    const [categories, dict] = await Promise.all([
      getCachedCategories(),
      getDictionary(locale),
    ]);

    const fallbackDict = locale === defaultLocale ? dict : await getDictionary(defaultLocale);
    


    const catalogHref = `${getHomePath(locale) === "/" ? "" : getHomePath(locale)}/katalog`;

    if (!categories || categories.length === 0) {
      return (
        <CatalogNavigationClient 
          tree={[]} 
          desktopItems={desktopItems} 
          mobileItems={mobileItems}
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
          menuOpenLabel={menuOpenLabel}
          menuCloseLabel={menuCloseLabel}
          mainNavigationLabel={mainNavigationLabel}
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

    const mobileLabels = {
      mobileCatalogTitle: dict.catalog.mobileCatalogTitle,
      mobileCatalogClose: dict.catalog.mobileCatalogClose,
      mobileCatalogBack: dict.catalog.mobileCatalogBack,
      mobileCatalogBackToMenu: dict.catalog.mobileCatalogBackToMenu,
      mobileCatalogViewCatalog: dict.catalog.mobileCatalogViewCatalog,
      mobileCatalogViewCurrent: dict.catalog.mobileCatalogViewCurrent,
      mobileCatalogOpenLevel: dict.catalog.mobileCatalogOpenLevel,
    };

    return (
      <CatalogNavigationClient 
        tree={explorerTree} 
        desktopItems={desktopItems} 
        mobileItems={mobileItems}
        desktopLabels={desktopLabels}
        mobileLabels={mobileLabels}
        catalogHref={catalogHref}
        menuOpenLabel={menuOpenLabel}
        menuCloseLabel={menuCloseLabel}
        mainNavigationLabel={mainNavigationLabel}
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
        menuOpenLabel={menuOpenLabel}
        menuCloseLabel={menuCloseLabel}
        mainNavigationLabel={mainNavigationLabel}
      />
    );
  }
}
