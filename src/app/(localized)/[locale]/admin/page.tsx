import { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDashboardPage } from "@/app/_shared/AdminDashboardPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const p = await params;
  if (!isLocale(p.locale) || p.locale === "pl") {
    notFound();
  }
  const dictionary = await getDictionary(p.locale as Locale);
  return {
    title: dictionary.adminDashboard.metaTitle,
    description: dictionary.adminDashboard.metaDescription,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function AdminRootLocalized({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const p = await params;
  if (!isLocale(p.locale) || p.locale === "pl") {
    notFound();
  }

  return (
    <AdminDashboardPage 
      locale={p.locale} 
      routes={{
        partners: `/${p.locale}/admin/partners`,
        offers: `/${p.locale}/admin/offers`,
        rfq: `/${p.locale}/admin/rfq`,
        rfqDetail: (id: number) => `/${p.locale}/admin/rfq/${id}`,
      }}
    />
  );
}
