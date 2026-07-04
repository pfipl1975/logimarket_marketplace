import { notFound } from "next/navigation";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { CategoryPage } from "@/app/_shared/CategoryPage";
import { getCategoryBySlug, getCategoryOffersCount } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { resolveCategoryName, resolveCategoryIntro } from "@/lib/i18n/category-labels";
import type { Locale } from "@/lib/i18n/types";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string; categorySlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, categorySlug } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  if (!categorySlug.startsWith("c-")) notFound();

  const dbSlug = categorySlug.slice(2);
  const [category, dict] = await Promise.all([
    getCategoryBySlug(dbSlug),
    getDictionary(locale as Locale),
  ]);

  const fallbackDict =
    locale === defaultLocale ? dict : await getDictionary(defaultLocale);

  if (!category) {
    notFound();
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

  return {
    title: `${categoryLabel} | LogiMarket`,
    description: categoryIntro || `B2B offers in ${categoryLabel} on the LogiMarket platform.`,
    robots: {
      index: count > 0,
      follow: true,
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale, categorySlug } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  if (!categorySlug.startsWith("c-")) notFound();

  const dbSlug = categorySlug.slice(2);
  return <CategoryPage locale={locale as Locale} categorySlug={dbSlug} />;
}
