import { AdminOfferEditPage } from "@/app/_shared/AdminOfferEditPage";
import { defaultLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function Page({ params }: { params: { id: string } }) {
  return <AdminOfferEditPage id={params.id} locale={defaultLocale} />;
}
