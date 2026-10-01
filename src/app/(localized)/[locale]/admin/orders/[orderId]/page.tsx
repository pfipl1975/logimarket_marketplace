import { notFound } from "next/navigation";
import { AdminMarketplaceOrderDetailPage } from "@/app/_shared/AdminMarketplaceOrderDetailPage";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string; orderId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  const { adminOrders } = await getDictionary(locale);
  return { title: adminOrders.metaTitle, description: adminOrders.metaDescription, robots: { index: false, follow: false, nocache: true } };
}
export default async function Page({ params }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  return <AdminMarketplaceOrderDetailPage locale={locale} orderId={orderId} />;
}
