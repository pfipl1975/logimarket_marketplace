import { notFound } from "next/navigation";
import { AdminOfferEditPage } from "@/app/_shared/AdminOfferEditPage";
import { isLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function Page({ params }: { params: { id: string; locale: string } }) {
  if (!isLocale(params.locale)) {
    notFound();
  }
  return <AdminOfferEditPage id={params.id} locale={params.locale} />;
}
