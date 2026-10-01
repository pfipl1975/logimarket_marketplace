import { PartnerRfqListPage } from "@/app/_shared/partner/PartnerRfqPages";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";

export const dynamic = "force-dynamic";
export default async function Page({ params, searchParams }: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;

}) {
  const { partnerId } = await params;
  const id = parseStrictIdOrNotFound(partnerId);
  return <PartnerRfqListPage locale={"pl"} partnerId={id} searchParams={await searchParams} />;
}
