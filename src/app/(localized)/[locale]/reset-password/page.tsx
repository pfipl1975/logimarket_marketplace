import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountLifecyclePage } from "@/app/_shared/AccountLifecyclePage";
import { isLocale } from "@/lib/i18n/config";
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  return <AccountLifecyclePage kind="reset-password" locale={locale} next={null} />;
}
