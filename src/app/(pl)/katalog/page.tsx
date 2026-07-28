import { defaultLocale } from "@/lib/i18n/config";
import { CatalogPage } from "@/app/_shared/CatalogPage";
import { generateCatalogMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateCatalogMetadata(defaultLocale);
}

export default async function Page() {
  return <CatalogPage locale={defaultLocale} />;
}
