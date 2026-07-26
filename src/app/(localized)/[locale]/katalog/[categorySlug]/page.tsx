import { notFound, redirect } from "next/navigation";
import { locales, defaultLocale } from "@/lib/i18n/config";
import {
  resolveCategoryPage,
  buildCategoryPaginationHref,
} from "@/lib/catalog/pagination";
import { CategoryPage } from "@/app/_shared/CategoryPage";
import { getCategoryBySlug, getCategoryOffersCount } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  resolveCategoryName,
  resolveCategoryIntro,
} from "@/lib/i18n/category-labels";
import { absoluteUrl } from "@/lib/seo/urls";
import {
  resolveCategoryOfferFilters,
  resolveOfferListingView,
  hasActiveCategoryOfferFilters,
  type CategorySearchParams,
} from "@/lib/catalog/query";
import type { Locale } from "@/lib/i18n/types";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string; categorySlug: string }>;
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

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ locale, categorySlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as CategorySearchParams),
  ]);
  if (!locales.includes(locale as Locale)) {
    return createSafeNoIndexMetadata();
  }
  if (!categorySlug.startsWith("c-")) {
    return createSafeNoIndexMetadata();
  }

  try {
    const dbSlug = categorySlug.slice(2);
    const [category, dict] = await Promise.all([
      getCategoryBySlug(dbSlug),
      getDictionary(locale as Locale),
    ]);

    const fallbackDict =
      locale === defaultLocale ? dict : await getDictionary(defaultLocale);

    if (!category) {
      return createSafeNoIndexMetadata();
    }

    const localeBySlug = dict.categories?.bySlug as
      Record<string, string> | undefined;
    const fallbackBySlug = fallbackDict.categories?.bySlug as
      Record<string, string> | undefined;
    const localeIntrosBySlug = dict.categories?.introsBySlug as
      Record<string, string> | undefined;
    const fallbackIntrosBySlug = fallbackDict.categories?.introsBySlug as
      Record<string, string> | undefined;

    const categoryLabel = resolveCategoryName({
      slug: category.slug,
      dbName: category.name,
      localeBySlug,
      fallbackBySlug,
    });

    const categoryIntro = resolveCategoryIntro({
      slug: category.slug,
      localeIntrosBySlug,
      fallbackIntrosBySlug,
      fallbackIntro: "",
    });

    const count = await getCategoryOffersCount(dbSlug);

    const view = resolveOfferListingView(resolvedSearchParams.view);
    const filters = resolveCategoryOfferFilters(resolvedSearchParams);
    const hasActiveFilters =
      hasActiveCategoryOfferFilters(filters) || view !== "grid";

    const resolvedPage = resolveCategoryPage(resolvedSearchParams.page);
    const isCleanPaginated =
      !hasActiveFilters && resolvedPage.page > 1 && resolvedPage.isCanonical;

    const pageSuffix =
      isCleanPaginated && dict.catalog?.paginationPage
        ? ` - ${dict.catalog.paginationPage.replace("{page}", String(resolvedPage.page))}`
        : "";

    const qs = isCleanPaginated ? `?page=${resolvedPage.page}` : "";

    const canonicalPath =
      locale === defaultLocale
        ? `/katalog/${categorySlug}`
        : `/${locale}/katalog/${categorySlug}`;

    return {
      title: `${categoryLabel}${pageSuffix} | LogiMarket`,
      description:
        categoryIntro ||
        `B2B offers in ${categoryLabel} on the LogiMarket platform.`,
      robots: {
        index: count > 0,
        follow: true,
      },
      alternates: {
        canonical: absoluteUrl(`${canonicalPath}${qs}`),
        languages: {
          pl: absoluteUrl(`/katalog/${categorySlug}${qs}`),
          en: absoluteUrl(`/en/katalog/${categorySlug}${qs}`),
          de: absoluteUrl(`/de/katalog/${categorySlug}${qs}`),
          fr: absoluteUrl(`/fr/katalog/${categorySlug}${qs}`),
          uk: absoluteUrl(`/uk/katalog/${categorySlug}${qs}`),
          es: absoluteUrl(`/es/katalog/${categorySlug}${qs}`),
          zh: absoluteUrl(`/zh/katalog/${categorySlug}${qs}`),
          "x-default": absoluteUrl(`/katalog/${categorySlug}${qs}`),
        },
      },
    };
  } catch {
    return createSafeNoIndexMetadata();
  }
}

export default async function Page({ params, searchParams }: Props) {
  const [{ locale, categorySlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as CategorySearchParams),
  ]);
  if (!locales.includes(locale as Locale)) notFound();
  if (!categorySlug.startsWith("c-")) notFound();

  const dbSlug = categorySlug.slice(2);
  const view = resolveOfferListingView(resolvedSearchParams.view);
  const filters = resolveCategoryOfferFilters(resolvedSearchParams);

  const resolvedPage = resolveCategoryPage(resolvedSearchParams.page);

  if (!resolvedPage.isCanonical) {
    const basePath = `/${locale}/katalog/${categorySlug}`;
    redirect(
      buildCategoryPaginationHref(
        basePath,
        { view, filters },
        resolvedPage.page,
      ),
    );
  }

  return (
    <CategoryPage
      locale={locale as Locale}
      categorySlug={dbSlug}
      view={view}
      filters={filters}
      currentPage={resolvedPage.page}
    />
  );
}
