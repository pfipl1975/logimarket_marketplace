import { defaultLocale } from "@/lib/i18n/config";
import { CatalogPage } from "@/app/_shared/CatalogPage";
import { generateCatalogMetadata } from "@/lib/seo/metadata";
import { getCategories } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { resolveCategoryName } from "@/lib/i18n/category-labels";
import { absoluteUrl } from "@/lib/seo/urls";
import { buildCategoryTree } from "@/lib/catalog/tree";
import { createCatalogItemListJsonLd, JsonLdScript } from "@/lib/seo/json-ld";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateCatalogMetadata(defaultLocale);
}

export default async function Page() {
  const dict = await getDictionary(defaultLocale);
  const allCategories = await getCategories();

  const itemListSources = (() => {
    if (allCategories.length === 0) return [];
    const categoryTree = buildCategoryTree(allCategories);
    const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
    return categoryTree.map((section) => ({
      name: resolveCategoryName({
        slug: section.slug,
        dbName: section.name,
        localeBySlug,
        fallbackBySlug: undefined,
      }),
      url: absoluteUrl(`/katalog/c-${section.slug}`),
    }));
  })();

  const itemListJsonLd = itemListSources.length > 0
    ? createCatalogItemListJsonLd(itemListSources)
    : null;

  return (
    <>
      {itemListJsonLd && <JsonLdScript data={itemListJsonLd} />}
      <CatalogPage locale={defaultLocale} />
    </>
  );
}
