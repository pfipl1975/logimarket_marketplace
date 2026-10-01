import { AdminMarketplaceOrderDetailPage } from "@/app/_shared/AdminMarketplaceOrderDetailPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { adminOrders } = await getDictionary("pl");
  return { title: adminOrders.metaTitle, description: adminOrders.metaDescription, robots: { index: false, follow: false, nocache: true } };
}
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <AdminMarketplaceOrderDetailPage locale="pl" orderId={orderId} />;
}
