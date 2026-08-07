import { AdminRfqPage } from "@/app/_shared/AdminRfqPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary("pl");
  const dict = dictionary.adminRfq;
  return {
    title: dict.metaTitle,
    description: dict.metaDescription,
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: unknown;
}) {
  return <AdminRfqPage locale="pl" searchParams={searchParams} />;
}
