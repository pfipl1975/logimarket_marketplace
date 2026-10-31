import { notFound, redirect } from "next/navigation";
import { PartnerDashboardPage } from "@/app/_shared/partner/PartnerDashboardPage";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildPartnerDashboardModel } from "@/lib/partner-dashboard/model-core";
import { getPartnerOrdersList } from "@/lib/partner-orders/read-model";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";
import { requirePartnerMembership } from "@/lib/auth/partner-membership";

export default async function LocalizedPartnerDashboardRoute({
  params,
}: {
  params: Promise<{ locale: string; partnerId: string }>;
}) {
  const { locale, partnerId } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();

  const parsedPartnerId = parseStrictIdOrNotFound(partnerId);
  const { PartnerWorkspace: dict } = await getDictionary(locale);
  const result = await getPartnerOrdersList(parsedPartnerId);

  if (!result.ok && result.code === "UNAUTHORIZED") {
    // Membership-only accounts see the existing draft workspace; no order data is rendered.
    try { await requirePartnerMembership(parsedPartnerId); } catch { notFound(); }
    redirect(`/${locale}/partner/${parsedPartnerId}/offers`);
  }

  const model = result.ok
    ? buildPartnerDashboardModel(result.items, result.items[0]?.serverNow ?? new Date())
    : { ok: false as const };
  const ordersHref = `/${locale}/partner/${parsedPartnerId}/orders`;

  return (
    <PartnerDashboardPage
      ordersHref={ordersHref}
      orderDetailBaseHref={ordersHref}
      locale={locale}
      model={model}
      dict={dict}
    />
  );
}
