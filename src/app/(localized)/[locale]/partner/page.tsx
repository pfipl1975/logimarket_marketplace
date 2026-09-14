import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { partnerUserMemberships, partners } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

import { isLocale } from '@/lib/i18n/config';

export default async function LocalizedPartnerEntryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'pl') notFound();

  const result = await getCurrentUser();
  if (result.status !== 'authenticated') {
    redirect(`/${locale}/login?next=/${locale}/partner`);
  }

  const memberships = await db
    .select({ partnerId: partnerUserMemberships.partnerId, companyName: partners.companyName })
    .from(partnerUserMemberships)
    .innerJoin(partners, eq(partnerUserMemberships.partnerId, partners.id))
    .where(and(eq(partnerUserMemberships.authUserId, result.user.id), eq(partnerUserMemberships.membershipStatus, 'active')));

  if (memberships.length === 0) {
    return <div className="p-8 text-center text-brand-navy font-bold">No access</div>;
  }

  if (memberships.length === 1) {
    redirect(`/${locale}/partner/${memberships[0].partnerId}/orders`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="grid gap-4 w-full max-w-md">
        {memberships.map((m) => (
          <a key={m.partnerId} href={`/${locale}/partner/${m.partnerId}/orders`} className="block p-4 border border-border-industrial rounded-industrial hover:border-brand-teal transition-colors text-center font-medium text-brand-navy">
            {m.companyName}
          </a>
        ))}
      </div>
    </div>
  );
}
