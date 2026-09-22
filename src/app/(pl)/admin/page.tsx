import { Metadata } from "next";
import { AdminDashboardPage } from "@/app/_shared/AdminDashboardPage";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary("pl");
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

export default function AdminRootPl() {
  return (
    <AdminDashboardPage 
      locale="pl" 
      routes={{
        partners: "/admin/partnerzy",
        offers: "/admin/oferty",
        rfq: "/admin/zapytania",
        rfqDetail: (id: number) => `/admin/zapytania/${id}`,
      }}
    />
  );
}
