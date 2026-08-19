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

export default async function Page({
  params,
}: {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}) {
  const { locale, id } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <AdminOfferEditPage
      id={id}
      locale={locale}
    />
  );
}
