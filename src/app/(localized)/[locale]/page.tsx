import { notFound, redirect } from "next/navigation";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { HomePage } from "@/app/_shared/HomePage";
import { generateHomeMetadata } from "@/lib/seo/metadata";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { JsonLdScript, createHomeJsonLd } from "@/lib/seo/json-ld";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { buildCategoryOfferQueryHref, resolveCategoryOfferSort, resolveHomeOfferQueryState, type CategorySearchParams } from "@/lib/catalog/query";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<CategorySearchParams>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return {};
  }
  return generateHomeMetadata(locale as Locale);
}

export default async function LocalizedPage({
  params,
  searchParams,
}: PageProps) {
  const [{ locale: rawLocale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as CategorySearchParams),
  ]);
  const homeState = resolveHomeOfferQueryState(resolvedSearchParams);

  if (!isLocale(rawLocale)) {
    notFound();
  }

  if (rawLocale === defaultLocale) {
    redirect(buildCategoryOfferQueryHref("/", homeState, {}));
  }

  if (!resolveCategoryOfferSort(resolvedSearchParams.sort).isCanonical) {
    redirect(buildCategoryOfferQueryHref(`/${rawLocale}`, homeState, {}));
  }

  const dict = await getDictionary(rawLocale);

  return (
    <>
      <JsonLdScript data={createHomeJsonLd(rawLocale, dict)} />
      <HomePage locale={rawLocale} {...homeState} />
    </>
  );
}
