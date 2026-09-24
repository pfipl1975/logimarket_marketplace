import { AdminPartnerAgreementsPage } from "@/app/_shared/AdminPartnerAgreementsPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Umowy Partnerskie | LogiMarket Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <AdminPartnerAgreementsPage locale="pl" />;
}
