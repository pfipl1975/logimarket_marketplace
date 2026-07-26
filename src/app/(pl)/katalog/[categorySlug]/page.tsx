import { notFound, redirect } from "next/navigation";
import { defaultLocale } from "@/lib/i18n/config";
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

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
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

    const localeBySlug = dict.categories?.bySlug as
      Record<string, string> | undefined;
    const localeIntrosBySlug = dict.categories?.introsBySlug as
      Record<string, string> | undefined;

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

    return {
      title: `${categoryLabel}${pageSuffix} | LogiMarket.pl`,
      description:
        categoryIntro ||
        `Oferty B2B w kategorii ${categoryLabel} na platformie LogiMarket.pl.`,
      robots: {
        index: count > 0,
        follow: true,
      },
      alternates: {
        canonical: absoluteUrl(`/katalog/${categorySlug}${qs}`),
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
  const [{ categorySlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as CategorySearchParams),
  ]);
  if (!categorySlug.startsWith("c-")) notFound();

  const dbSlug = categorySlug.slice(2);
  const view = resolveOfferListingView(resolvedSearchParams.view);
  const filters = resolveCategoryOfferFilters(resolvedSearchParams);

  const resolvedPage = resolveCategoryPage(resolvedSearchParams.page);

  if (!resolvedPage.isCanonical) {
    redirect(
      buildCategoryPaginationHref(
        `/katalog/${categorySlug}`,
        { view, filters },
        resolvedPage.page,
      ),
    );
  }

  return (
    <CategoryPage
      locale={defaultLocale}
      categorySlug={dbSlug}
      view={view}
      filters={filters}
      currentPage={resolvedPage.page}
    />
  );
}
