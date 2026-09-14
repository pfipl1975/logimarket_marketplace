import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { partnerUserMemberships, partners } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function LocalizedPartnerEntryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'pl') notFound();
  const { PartnerWorkspace: dict } = await getDictionary(locale);

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
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <h1 className="text-2xl font-bold text-brand-navy mb-4">{dict.noAccess}</h1>
        <p className="text-muted-foreground">{dict.noAccessDesc}</p>
      </div>
    );
  }

  if (memberships.length === 1) {
    redirect(`/${locale}/partner/${memberships[0].partnerId}/orders`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">{dict.selectProfile}</h1>
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
