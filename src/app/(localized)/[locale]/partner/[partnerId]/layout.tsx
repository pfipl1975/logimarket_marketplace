import { requirePartnerMembership } from '@/lib/auth/partner-membership';
import { PartnerWorkspaceShell } from '@/app/_shared/partner/PartnerWorkspaceShell';
import { notFound } from 'next/navigation';
import { ForbiddenError, UnauthorizedError } from '@/lib/auth/authorization-errors';
import { db } from '@/lib/db';
import { partners } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { parseStrictIdOrNotFound } from '@/lib/partner-orders/route-params';
import { getDictionary } from '@/lib/i18n/dictionaries';

import { isLocale } from '@/lib/i18n/config';

export default async function LocalizedPartnerLayout({ children, params }: { children: React.ReactNode; params: Promise<{ partnerId: string; locale: string }> }) {
  const { partnerId, locale } = await params;
  if (!isLocale(locale) || locale === 'pl') notFound();

  const parsedPartnerId = parseStrictIdOrNotFound(partnerId);

  try {
    await requirePartnerMembership(parsedPartnerId);
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      notFound();
    }
    throw err;
  }

  const dictionary = await getDictionary(locale);
  let partnerName = dictionary.PartnerWorkspace.title;
  const partnerResult = await db.select({ companyName: partners.companyName }).from(partners).where(eq(partners.id, parsedPartnerId)).limit(1);
  if (partnerResult.length > 0) {
    partnerName = partnerResult[0].companyName;
  }

  const dashboardHref = `/${locale}/partner/${parsedPartnerId}`;
  const ordersHref = `${dashboardHref}/orders`;
  const offersHref = `${dashboardHref}/offers`;

  return (
    <PartnerWorkspaceShell
      locale={locale}
      partnerName={partnerName}
      dict={dictionary.PartnerWorkspace}
      dashboardHref={dashboardHref}
      ordersHref={ordersHref}
      offersHref={offersHref}
    >
      {children}
    </PartnerWorkspaceShell>
  );
}
