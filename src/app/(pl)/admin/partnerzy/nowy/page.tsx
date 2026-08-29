import { AdminPartnerCreatePage } from '@/app/_shared/AdminPartnerCreatePage';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Metadata } from 'next';

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

export default function PolishAdminPartnerCreateRoute() {
  return <AdminPartnerCreatePage locale={'pl'} />;
}

