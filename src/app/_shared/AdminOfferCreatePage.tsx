import { getAdminCreateOptions } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { AdminOfferCreateForm } from "@/components/admin/AdminOfferCreateForm";
import { resolveCategoryName } from "@/lib/i18n/category-labels";

interface AdminOfferCreatePageProps {
  locale: Locale;
}

export async function AdminOfferCreatePage({ locale }: AdminOfferCreatePageProps) {
  const dictionary = await getDictionary(locale);
  const plDictionary = await getDictionary("pl");
  const dict = dictionary.adminOffers;

  const result = await getAdminCreateOptions();

  if (!result.ok) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <h2 className="text-xl font-semibold text-brand-navy mb-2">{dict.createLoadErrorTitle}</h2>
        <p className="text-muted-foreground">{dict.createLoadErrorDescription}</p>
      </div>
    );
  }

  const mappedOptions = {
    ...result.data,
    categories: result.data.categories.map((c) => ({
      ...c,
      name: resolveCategoryName({
        slug: c.slug,
        dbName: c.name,
        localeBySlug: dictionary.categories?.bySlug,
        fallbackBySlug: plDictionary.categories?.bySlug,
      }),
    })),
  };

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold text-brand-navy">{dict.createTitle}</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {dict.createDescription}
        </p>
      </div>
      <AdminOfferCreateForm options={mappedOptions} locale={locale} dict={dict} />
    </div>
  );
}
