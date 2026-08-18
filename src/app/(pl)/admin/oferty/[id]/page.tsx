import { AdminOfferDetailPage } from "@/app/_shared/AdminOfferDetailPage";
import { defaultLocale } from "@/lib/i18n/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminOfferDetailPage locale={defaultLocale} id={id} />;
}
