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

export default async function PolishBuyerOrdersRoute({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const { submitted } = await searchParams;
  return <BuyerOrdersPage locale="pl" submitted={submitted === "1"} />;
}
