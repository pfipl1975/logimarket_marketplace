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

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminOfferEditPage
      id={id}
      locale={defaultLocale}
    />
  );
}
