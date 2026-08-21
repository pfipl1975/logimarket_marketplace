import { getAdminCreateOptions } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { AdminOfferCreateForm } from "@/components/admin/AdminOfferCreateForm";

interface AdminOfferCreatePageProps {
  locale: Locale;
}

export async function AdminOfferCreatePage({ locale }: AdminOfferCreatePageProps) {
  const dictionary = await getDictionary(locale);
  const dict = dictionary.adminOffers;

  const result = await getAdminCreateOptions();

  if (!result.ok) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <h2 className="text-xl font-semibold text-brand-navy mb-2">Error</h2>
        <p className="text-muted-foreground">System error occurred while loading form options.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">{dict.createTitle}</h1>
      <AdminOfferCreateForm options={result.data} locale={locale} dict={dict} />
    </div>
  );
}
