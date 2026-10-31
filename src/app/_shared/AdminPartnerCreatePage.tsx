import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { AdminPartnerCreateForm } from '@/components/admin/AdminPartnerCreateForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApplication } from '@/lib/partner-applications/service';

export async function AdminPartnerCreatePage({
  locale,
  applicationId,
}: {
  locale: Locale;
  applicationId?: string;
}) {
  const dictionary = await getDictionary(locale);
  const dict = dictionary.adminPartnerCreate;
  const source = applicationId ? (await getApplication(applicationId))?.application : null;
  if (applicationId && (!source || source.status !== 'accepted_for_onboarding')) notFound();
  const applicationsBase = locale === 'pl' ? '/admin/partner-applications' : `/${locale}/admin/partner-applications`;
  const applicationHref = source ? `${applicationsBase}?${new URLSearchParams({ id: source.id })}` : null;

  const cancelUrl = applicationHref ?? (locale === 'pl' ? '/admin/partnerzy' : `/${locale}/admin/partners`);
  const successRedirectBase = locale === 'pl' ? '/admin/partnerzy' : `/${locale}/admin/partners`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-brand-navy">{dict.title}</h1>
      </div>
      {applicationHref && <div role="note" className="space-y-2 border-l-4 border-brand-teal bg-white p-4">
        <p className="font-medium text-brand-navy">{dictionary.partnerApplications.unverified}</p>
        <Link href={applicationHref} className="inline-flex min-h-11 items-center font-semibold text-brand-teal underline underline-offset-4">{dictionary.partnerApplications.details}</Link>
      </div>}
      <AdminPartnerCreateForm
        dict={dict}
        cancelUrl={cancelUrl}
        successRedirectBase={successRedirectBase}
        prefill={source ? {
          companyName: source.companyName,
          contactEmail: source.contactEmail,
          jurisdictionCountry: source.countryCode,
          registeredCountryCode: source.countryCode,
          taxIdValue: source.taxIdentifier ?? "",
        } : undefined}
      />
    </div>
  );
}

