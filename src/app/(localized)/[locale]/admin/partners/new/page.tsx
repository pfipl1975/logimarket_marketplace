import { AdminPartnerCreatePage } from '@/app/_shared/AdminPartnerCreatePage';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type Locale, isLocale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  
  if (!isLocale(locale) || locale === 'pl') {
    return {};
  }
  
  const dictionary = await getDictionary(locale as Locale);
  return {
    title: dictionary.adminPartnerCreate?.metaTitle || 'Add Partner',
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function LocalizedAdminPartnerCreateRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  if (!isLocale(locale) || locale === 'pl') {
    notFound();
  }

  return <AdminPartnerCreatePage locale={locale as Locale} />;
}

