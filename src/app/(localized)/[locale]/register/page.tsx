import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountLifecyclePage } from "@/app/_shared/AccountLifecyclePage";
import { isLocale } from "@/lib/i18n/config";
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  const { next } = await searchParams;
  return <AccountLifecyclePage kind="register" locale={locale} next={next ?? null} />;
}
