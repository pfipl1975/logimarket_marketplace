import { AdminRfqPage } from "@/app/_shared/AdminRfqPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";

interface PageProps {
  params: { locale: Locale };
  searchParams: unknown;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const dictionary = await getDictionary(params.locale);
  const dict = dictionary.adminRfq;
  return {
    title: dict.metaTitle,
    description: dict.metaDescription,
  };
}

export default async function Page({
  params,
  searchParams,
}: PageProps) {
  return <AdminRfqPage locale={params.locale} searchParams={searchParams} />;
}
