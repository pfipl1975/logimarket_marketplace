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

  let partnerName = 'Partner Portal';
  const partnerResult = await db.select({ companyName: partners.companyName }).from(partners).where(eq(partners.id, parsedPartnerId)).limit(1);
  if (partnerResult.length > 0) {
    partnerName = partnerResult[0].companyName;
  }

  const dict = await getDictionary(locale);
  const ordersHref = `/${locale}/partner/${partnerId}/orders`;

  return (
    <PartnerWorkspaceShell partnerId={partnerId} partnerName={partnerName} dict={dict.PartnerWorkspace} ordersHref={ordersHref}>
      {children}
    </PartnerWorkspaceShell>
  );
}
