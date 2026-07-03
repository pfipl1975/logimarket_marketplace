import { notFound } from "next/navigation";
import { defaultLocale } from "@/lib/i18n/config";
import { CategoryPage } from "@/app/_shared/CategoryPage";
import { getCategoryBySlug, getCategoryOffersCount } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ categorySlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  if (!categorySlug.startsWith("c-")) notFound();

  const dbSlug = categorySlug.slice(2);
  const [category, dict] = await Promise.all([
    getCategoryBySlug(dbSlug),
    getDictionary(defaultLocale),
  ]);

  if (!category) {
    notFound();
  }

  const categoryLabels = dict.categories.bySlug as Record<string, string>;
  const categoryLabel = getLocalizedCategoryLabel(categoryLabels, category.slug, category.name);
  const count = await getCategoryOffersCount(dbSlug);

  return {
    title: `${categoryLabel} | LogiMarket.pl`,
    description: `Oferty B2B w kategorii ${categoryLabel} na platformie LogiMarket.pl.`,
    robots: {
      index: count > 0,
      follow: true,
    },
  };
}

export default async function Page({ params }: Props) {
  const { categorySlug } = await params;
  if (!categorySlug.startsWith("c-")) notFound();

  const dbSlug = categorySlug.slice(2);
  return <CategoryPage locale={defaultLocale} categorySlug={dbSlug} />;
}
