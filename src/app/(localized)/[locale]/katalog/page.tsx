import { notFound } from "next/navigation";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { CatalogPage } from "@/app/_shared/CatalogPage";
import { generateCatalogMetadata } from "@/lib/seo/metadata";
import { getCategories } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { resolveCategoryName } from "@/lib/i18n/category-labels";
import { absoluteUrl } from "@/lib/seo/urls";
import { buildCategoryTree } from "@/lib/catalog/tree";
import { createCatalogItemListJsonLd, JsonLdScript } from "@/lib/seo/json-ld";
import type { Locale } from "@/lib/i18n/types";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return generateCatalogMetadata(locale as Locale);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const dict = await getDictionary(locale as Locale);
  const fallbackDict =
    locale === defaultLocale ? dict : await getDictionary(defaultLocale);
  const allCategories = await getCategories();

  const itemListSources = (() => {
    if (allCategories.length === 0) return [];
    const categoryTree = buildCategoryTree(allCategories);
    const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
    const fallbackBySlug = fallbackDict.categories?.bySlug as Record<string, string> | undefined;
    const categoryFilterBasePath = locale === defaultLocale ? "" : `/${locale}`;

    return categoryTree.map((section) => ({
      name: resolveCategoryName({
        slug: section.slug,
        dbName: section.name,
        localeBySlug,
        fallbackBySlug,
      }),
      url: absoluteUrl(`${categoryFilterBasePath}/katalog/c-${section.slug}`),
    }));
  })();

  const itemListJsonLd = itemListSources.length > 0
    ? createCatalogItemListJsonLd(itemListSources)
    : null;

  return (
    <>
      {itemListJsonLd && <JsonLdScript data={itemListJsonLd} />}
      <CatalogPage locale={locale as Locale} />
    </>
  );
}
