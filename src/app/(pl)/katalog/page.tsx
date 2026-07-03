import { defaultLocale } from "@/lib/i18n/config";
import { CatalogPage } from "@/app/_shared/CatalogPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(defaultLocale);
  return {
    title: `${dict.nav.catalog} | LogiMarket.pl`,
    description: dict.meta.description,
  };
}

export default async function Page() {
  return <CatalogPage locale={defaultLocale} />;
}
