import { AdminPartnerCreatePage } from '@/app/_shared/AdminPartnerCreatePage';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary('pl');
  return {
    title: dictionary.adminPartnerCreate.metaTitle,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function PolishAdminPartnerCreateRoute({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string | string[] }>;
}) {
  const { applicationId } = await searchParams;
  if (applicationId !== undefined && (typeof applicationId !== 'string' || !applicationId)) notFound();
  return <AdminPartnerCreatePage locale="pl" applicationId={applicationId} />;
}

