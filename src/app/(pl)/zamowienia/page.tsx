import type { Metadata } from "next";
import { BuyerOrdersPage } from "@/app/_shared/BuyerOrdersPage";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary("pl");
  return {
    title: dict.BuyerOrders.title,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default function PolishBuyerOrdersRoute() {
  return <BuyerOrdersPage locale="pl" />;
}