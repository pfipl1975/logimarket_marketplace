import { AdminPartnerDetailPage } from "@/app/_shared/AdminPartnerDetailPage";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return <AdminPartnerDetailPage locale={defaultLocale} id={id} created={query.created === "1"} />;
}
