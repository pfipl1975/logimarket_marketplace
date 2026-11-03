import { defaultLocale } from "@/lib/i18n/config";
import { HomePage } from "@/app/_shared/HomePage";
import { generateHomeMetadata } from "@/lib/seo/metadata";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { JsonLdScript, createHomeJsonLd } from "@/lib/seo/json-ld";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildCategoryOfferQueryHref, resolveCategoryOfferSort, resolveHomeOfferQueryState, type CategorySearchParams } from "@/lib/catalog/query";

type PageProps = {
  searchParams?: Promise<CategorySearchParams>;
};

export async function generateMetadata() {
  return generateHomeMetadata(defaultLocale);
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const homeState = resolveHomeOfferQueryState(resolvedSearchParams);
  if (!resolveCategoryOfferSort(resolvedSearchParams.sort).isCanonical) {
    redirect(buildCategoryOfferQueryHref("/", homeState, {}));
  }
  const dict = await getDictionary(defaultLocale);

  return (
    <>
      <JsonLdScript data={createHomeJsonLd(defaultLocale, dict)} />
      <HomePage locale={defaultLocale} {...homeState} />
    </>
  );
}
