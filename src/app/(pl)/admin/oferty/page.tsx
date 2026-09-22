import { getDictionary } from "@/lib/i18n/dictionaries";
import { AdminOffersPage } from "@/app/_shared/AdminOffersPage";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const dictionary = await getDictionary("pl");
  return {
    title: dictionary.adminOffers.metaTitle,
    description: dictionary.adminOffers.metaDescription,
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
  const dictionary = await getDictionary("pl");
  const params = await searchParams;

  return (
    <AdminOffersPage
      locale="pl"
      searchParams={params}
      dict={dictionary.adminOffers}
      basePath="/admin/oferty"
    />
  );
}
