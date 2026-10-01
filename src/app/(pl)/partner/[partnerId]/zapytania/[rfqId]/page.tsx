import { PartnerRfqDetailPage } from "@/app/_shared/partner/PartnerRfqPages";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";

export const dynamic = "force-dynamic";
export default async function Page({ params }: {
  params: Promise<{ partnerId: string; rfqId: string }>;

}) {
  const { partnerId, rfqId } = await params;
  const id = parseStrictIdOrNotFound(partnerId);
  return <PartnerRfqDetailPage locale={"pl"} partnerId={id} rawId={rfqId} />;
}
