import { notFound, redirect } from "next/navigation";
import { defaultLocale } from "@/lib/i18n/config";
import { resolveCategoryPage, buildCategoryPaginationHref } from "@/lib/catalog/pagination";
import { CategoryPage } from "@/app/_shared/CategoryPage";
import { getCategoryBySlug, getCategoryOffersCount } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { resolveCategoryName, resolveCategoryIntro } from "@/lib/i18n/category-labels";
import { absoluteUrl } from "@/lib/seo/urls";
import {
  resolveCategoryOfferFilters,
  resolveOfferListingView,
  resolveCategoryOfferSort,
  hasActiveCategoryOfferFilters,
  type CategorySearchParams,
} from "@/lib/catalog/query";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ categorySlug: string }>;
  searchParams?: Promise<CategorySearchParams>;
};

function createSafeNoIndexMetadata(): Metadata {
  return {
    title: "LogiMarket",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ categorySlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as CategorySearchParams),
  ]);
  if (!categorySlug.startsWith("c-")) {
    return createSafeNoIndexMetadata();
  }

  try {
    const dbSlug = categorySlug.slice(2);
    const [category, dict] = await Promise.all([
      getCategoryBySlug(dbSlug),
      getDictionary(defaultLocale),
    ]);

    if (!category) {
      return createSafeNoIndexMetadata();
    }

    const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
    const localeIntrosBySlug = dict.categories?.introsBySlug as Record<string, string> | undefined;

    const categoryLabel = resolveCategoryName({
      slug: category.slug,
      dbName: category.name,
      localeBySlug,
      fallbackBySlug: undefined,
    });

    const categoryIntro = resolveCategoryIntro({
      slug: category.slug,
      localeIntrosBySlug,
      fallbackIntrosBySlug: undefined,
      fallbackIntro: "",
    });

    const count = await getCategoryOffersCount(dbSlug);

    const view = resolveOfferListingView(resolvedSearchParams.view);
    const filters = resolveCategoryOfferFilters(resolvedSearchParams);
    const resolvedSort = resolveCategoryOfferSort(resolvedSearchParams.sort);
    const hasActiveFilters = hasActiveCategoryOfferFilters(filters) || view !== "grid" || resolvedSort.sort !== "default";

    const resolvedPage = resolveCategoryPage(resolvedSearchParams.page);
    const isCleanPaginated = !hasActiveFilters && resolvedPage.page > 1 && resolvedPage.isCanonical;

    const pageSuffix = isCleanPaginated && dict.catalog?.paginationPage
      ? ` - ${dict.catalog.paginationPage.replace("{page}", String(resolvedPage.page))}`
      : "";

    const languagePageSuffix = isCleanPaginated ? `?page=${resolvedPage.page}` : "";

    return {
      title: `${categoryLabel}${pageSuffix} | LogiMarket.pl`,
      description: categoryIntro || `Oferty B2B w kategorii ${categoryLabel} na platformie LogiMarket.pl.`,
      robots: {
        index: count > 0,
        follow: true,
      },
      alternates: {
        canonical: absoluteUrl(`/katalog/${categorySlug}${languagePageSuffix}`),
        languages: {
          pl: absoluteUrl(`/katalog/${categorySlug}${languagePageSuffix}`),
          en: absoluteUrl(`/en/katalog/${categorySlug}${languagePageSuffix}`),
          de: absoluteUrl(`/de/katalog/${categorySlug}${languagePageSuffix}`),
          fr: absoluteUrl(`/fr/katalog/${categorySlug}${languagePageSuffix}`),
          uk: absoluteUrl(`/uk/katalog/${categorySlug}${languagePageSuffix}`),
          es: absoluteUrl(`/es/katalog/${categorySlug}${languagePageSuffix}`),
          zh: absoluteUrl(`/zh/katalog/${categorySlug}${languagePageSuffix}`),
          "x-default": absoluteUrl(`/katalog/${categorySlug}${languagePageSuffix}`),
        },
      },
    };
  } catch {
    return createSafeNoIndexMetadata();
  }
}

export default async function Page({ params, searchParams }: Props) {
  const [{ categorySlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as CategorySearchParams),
  ]);
  if (!categorySlug.startsWith("c-")) notFound();

  const dbSlug = categorySlug.slice(2);
  const view = resolveOfferListingView(resolvedSearchParams.view);
  const filters = resolveCategoryOfferFilters(resolvedSearchParams);
  const resolvedSort = resolveCategoryOfferSort(resolvedSearchParams.sort);
  
  const resolvedPage = resolveCategoryPage(resolvedSearchParams.page);

  if (!resolvedPage.isCanonical || !resolvedSort.isCanonical) {
    redirect(buildCategoryPaginationHref(`/katalog/${categorySlug}`, { view, sort: resolvedSort.sort, filters }, resolvedPage.page));
  }

  return (
    <CategoryPage
      locale={defaultLocale}
      categorySlug={dbSlug}
      view={view}
      sort={resolvedSort.sort}
      filters={filters}
      currentPage={resolvedPage.page}
    />
  );
}
