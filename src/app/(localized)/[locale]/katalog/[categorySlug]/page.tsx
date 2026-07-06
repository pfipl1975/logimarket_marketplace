import { notFound } from "next/navigation";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { CategoryPage } from "@/app/_shared/CategoryPage";
import { getCategoryBySlug, getCategoryOffersCount } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { resolveCategoryName, resolveCategoryIntro } from "@/lib/i18n/category-labels";
import { absoluteUrl } from "@/lib/seo/urls";
import type { Locale } from "@/lib/i18n/types";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string; categorySlug: string }>;
  searchParams?: Promise<{ view?: string }>;
};

type OfferListingView = "grid" | "list";

function resolveOfferListingView(view: string | undefined): OfferListingView {
  return view === "list" ? "list" : "grid";
}

function createSafeNoIndexMetadata(): Metadata {
  return {
    title: "LogiMarket",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, categorySlug } = await params;
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

    const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
    const fallbackBySlug = fallbackDict.categories?.bySlug as Record<string, string> | undefined;
    const localeIntrosBySlug = dict.categories?.introsBySlug as Record<string, string> | undefined;
    const fallbackIntrosBySlug = fallbackDict.categories?.introsBySlug as Record<string, string> | undefined;

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

    const canonicalPath =
      locale === defaultLocale
        ? `/katalog/${categorySlug}`
        : `/${locale}/katalog/${categorySlug}`;

    return {
      title: `${categoryLabel} | LogiMarket`,
      description: categoryIntro || `B2B offers in ${categoryLabel} on the LogiMarket platform.`,
      robots: {
        index: count > 0,
        follow: true,
      },
      alternates: {
        canonical: absoluteUrl(canonicalPath),
        languages: {
          pl: absoluteUrl(`/katalog/${categorySlug}`),
          en: absoluteUrl(`/en/katalog/${categorySlug}`),
          de: absoluteUrl(`/de/katalog/${categorySlug}`),
          fr: absoluteUrl(`/fr/katalog/${categorySlug}`),
          uk: absoluteUrl(`/uk/katalog/${categorySlug}`),
          es: absoluteUrl(`/es/katalog/${categorySlug}`),
          zh: absoluteUrl(`/zh/katalog/${categorySlug}`),
          "x-default": absoluteUrl(`/katalog/${categorySlug}`),
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
    searchParams ?? Promise.resolve({} as { view?: string }),
  ]);
  if (!locales.includes(locale as Locale)) notFound();
  if (!categorySlug.startsWith("c-")) notFound();

  const dbSlug = categorySlug.slice(2);
  const view = resolveOfferListingView(resolvedSearchParams.view);
  return <CategoryPage locale={locale as Locale} categorySlug={dbSlug} view={view} />;
}
