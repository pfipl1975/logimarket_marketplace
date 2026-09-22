import { notFound } from "next/navigation";
import { PartnerDashboardPage } from "@/app/_shared/partner/PartnerDashboardPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildPartnerDashboardModel } from "@/lib/partner-dashboard/model-core";
import { getPartnerOrdersList } from "@/lib/partner-orders/read-model";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";

export default async function PartnerDashboardRoute({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const parsedPartnerId = parseStrictIdOrNotFound(partnerId);
  const { PartnerWorkspace: dict } = await getDictionary("pl");
  const result = await getPartnerOrdersList(parsedPartnerId);

  if (!result.ok && result.code === "UNAUTHORIZED") notFound();

  const model = result.ok
    ? buildPartnerDashboardModel(result.items, result.items[0]?.serverNow ?? new Date())
    : { ok: false as const };
  const ordersHref = `/partner/${parsedPartnerId}/zamowienia`;

  return (
    <PartnerDashboardPage
      ordersHref={ordersHref}
      orderDetailBaseHref={ordersHref}
      locale="pl"
      model={model}
      dict={dict}
    />
  );
}
