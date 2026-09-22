import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { AdminPartnerCreateForm } from '@/components/admin/AdminPartnerCreateForm';

export async function AdminPartnerCreatePage({
  locale,
}: {
  locale: Locale;
}) {
  const dictionary = await getDictionary(locale);
  const dict = dictionary.adminPartnerCreate;


  const cancelUrl = locale === 'pl' ? '/admin/partnerzy' : `/${locale}/admin/partners`;
  const successRedirectBase = locale === 'pl' ? '/admin/partnerzy' : `/${locale}/admin/partners`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-brand-navy">{dict.title}</h1>
      </div>
      
      <AdminPartnerCreateForm 
        dict={dict} 
        cancelUrl={cancelUrl} 
        successRedirectBase={successRedirectBase}
      />
    </div>
  );
}

