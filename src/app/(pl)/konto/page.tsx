import type { Metadata } from "next";
import { BuyerAccountPage } from "@/app/_shared/BuyerAccountPage";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary("pl");
  return { title: dict.buyerAccount.title, robots: { index: false, follow: false, nocache: true } };
}

export default async function PolishAccountRoute({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  return <BuyerAccountPage locale="pl" created={created === "1"} />;
}
