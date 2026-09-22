import { PartnerOfferCreatePage } from "@/app/_shared/PartnerOfferCreatePage";
import { requirePartnerMembership } from "@/lib/auth/partner-membership";
import { notFound } from "next/navigation";
import { type Locale, isLocale } from "@/lib/i18n/config";

export default async function PartnerOfferCreateLocalizedRoute({
  params,
}: {
  params: Promise<{ locale: string; partnerId: string }>;
}) {
  const { locale, partnerId: partnerIdParam } = await params;
  if (!isLocale(locale)) notFound();

  const partnerId = Number(partnerIdParam);
  if (!Number.isSafeInteger(partnerId) || partnerId <= 0) {
    notFound();
  }

  await requirePartnerMembership(partnerId);

  return <PartnerOfferCreatePage partnerId={partnerId} locale={locale as Locale} />;
}
