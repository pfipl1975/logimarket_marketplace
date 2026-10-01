import { PartnerRfqDetailPage } from "@/app/_shared/partner/PartnerRfqPages";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";
import { isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function Page({ params }: {
  params: Promise<{ partnerId: string; locale: string; rfqId: string }>;

}) {
  const { partnerId, locale, rfqId } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  const id = parseStrictIdOrNotFound(partnerId);
  return <PartnerRfqDetailPage locale={locale} partnerId={id} rawId={rfqId} />;
}
