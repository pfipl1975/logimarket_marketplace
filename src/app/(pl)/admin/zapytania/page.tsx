import { AdminRfqPage } from "@/app/_shared/AdminRfqPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary("pl");
  const dict = dictionary.adminRfq;
  return {
    title: dict.metaTitle,
    description: dict.metaDescription,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<unknown>;
}) {
  const resolvedSearchParams = await searchParams;
  return <AdminRfqPage locale="pl" searchParams={resolvedSearchParams} />;
}
