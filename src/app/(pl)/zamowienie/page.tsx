import type { Metadata } from "next";
import { CheckoutPage } from "@/app/_shared/CheckoutPage";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary("pl");
  return { title: dict.checkoutFlow.title, robots: { index: false, follow: false, nocache: true } };
}

export default function PolishCheckoutRoute() {
  return <CheckoutPage locale="pl" />;
}
