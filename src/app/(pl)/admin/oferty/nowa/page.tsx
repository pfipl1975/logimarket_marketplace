import { AdminOfferCreatePage } from "@/app/_shared/AdminOfferCreatePage";
import { defaultLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function PlNewOfferPage() {
  return <AdminOfferCreatePage locale={defaultLocale} />;
}
