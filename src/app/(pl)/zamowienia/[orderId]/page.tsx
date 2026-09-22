import type { Metadata } from "next";
import { BuyerOrderDetailPage } from "@/app/_shared/BuyerOrderDetailPage";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary("pl");
  return {
    title: dict.BuyerOrderDetail.title,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PolishBuyerOrderDetailRoute({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <BuyerOrderDetailPage locale="pl" orderIdParam={orderId} />;
}
