import { AdminPartnerAgreementsPage } from "@/app/_shared/AdminPartnerAgreementsPage";
import { isLocale, Locale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Partner Agreements | LogiMarket Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) {
    notFound();
  }
  return <AdminPartnerAgreementsPage locale={params.locale as Locale} />;
}
