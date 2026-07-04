import { notFound } from "next/navigation";
import { defaultLocale } from "@/lib/i18n/config";
import { CategoryPage } from "@/app/_shared/CategoryPage";
import { getCategoryBySlug, getCategoryOffersCount } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { resolveCategoryName, resolveCategoryIntro } from "@/lib/i18n/category-labels";
import { absoluteUrl } from "@/lib/seo/urls";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ categorySlug: string }>;
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
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

    return {
      title: `${categoryLabel} | LogiMarket.pl`,
      description: categoryIntro || `Oferty B2B w kategorii ${categoryLabel} na platformie LogiMarket.pl.`,
      robots: {
        index: count > 0,
        follow: true,
      },
      alternates: {
        canonical: absoluteUrl(`/katalog/${categorySlug}`),
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

export default async function Page({ params }: Props) {
  const { categorySlug } = await params;
  if (!categorySlug.startsWith("c-")) notFound();

  const dbSlug = categorySlug.slice(2);
  return <CategoryPage locale={defaultLocale} categorySlug={dbSlug} />;
}
