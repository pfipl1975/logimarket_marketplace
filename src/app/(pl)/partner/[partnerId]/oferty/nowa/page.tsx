import { PartnerOfferCreatePage } from "@/app/_shared/PartnerOfferCreatePage";
import { requirePartnerMembership } from "@/lib/auth/partner-membership";
import { notFound } from "next/navigation";

export default async function PartnerOfferCreatePLRoute({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId: partnerIdParam } = await params;
  const partnerId = Number(partnerIdParam);
  if (!Number.isSafeInteger(partnerId) || partnerId <= 0) {
    notFound();
  }

  await requirePartnerMembership(partnerId);

  return <PartnerOfferCreatePage partnerId={partnerId} locale="pl" />;
}
