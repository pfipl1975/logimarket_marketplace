import { AdminPartnersPage } from "@/app/_shared/AdminPartnersPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary("pl");
  return {
    title: dictionary.adminPartners.metaTitle,
    description: dictionary.adminPartners.metaDescription,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function PlAdminPartnersRoute({
  searchParams,
}: {
  searchParams: Promise<unknown>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawParams = new URLSearchParams(resolvedSearchParams as Record<string, string>);
  
  return <AdminPartnersPage locale="pl" searchParams={rawParams} />;
}
