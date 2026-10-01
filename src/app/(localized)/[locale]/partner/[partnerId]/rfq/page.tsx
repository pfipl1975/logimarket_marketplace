import { PartnerRfqListPage } from "@/app/_shared/partner/PartnerRfqPages";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";
import { isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function Page({ params, searchParams }: {
  params: Promise<{ partnerId: string; locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;

}) {
  const { partnerId, locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  const id = parseStrictIdOrNotFound(partnerId);
  return <PartnerRfqListPage locale={locale} partnerId={id} searchParams={await searchParams} />;
}
