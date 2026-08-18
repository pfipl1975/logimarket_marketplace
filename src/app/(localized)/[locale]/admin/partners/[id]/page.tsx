import { AdminPartnerDetailPage } from "@/app/_shared/AdminPartnerDetailPage";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
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
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return <AdminPartnerDetailPage locale={locale as Locale} id={id} />;
}
