import { notFound } from "next/navigation";
import { getAdminOfferDetail } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { AdminOfferEditForm } from "@/components/admin/AdminOfferEditForm";

interface AdminOfferEditPageProps {
  id: string;
  locale: Locale;
}

export async function AdminOfferEditPage({ id, locale }: AdminOfferEditPageProps) {
  const dictionary = await getDictionary(locale);
  const dict = dictionary.adminOfferEdit;

  const result = await getAdminOfferDetail(id, locale);

  if (!result.ok) {
    if (result.code === "INVALID_ID" || result.code === "NOT_FOUND") {
      notFound();
    }
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <h2 className="text-xl font-semibold text-brand-navy mb-2">{dict.errorTitle}</h2>
        <p className="text-muted-foreground">{dict.errorDescription}</p>
      </div>
    );
  }

  const offer = result.data;

  if (offer.publicationStatus !== "draft" && offer.publicationStatus !== "published" && offer.publicationStatus !== "archived") {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <h2 className="text-xl font-semibold text-brand-navy mb-2">{dict.errorNotEditableTitle}</h2>
        <p className="text-muted-foreground">{dict.errorNotEditableDescription}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">{dict.title} #{offer.id}</h1>
      <AdminOfferEditForm key={offer.updatedAt ?? 'never-updated'} offer={offer} locale={locale} dict={dict} />
    </div>
  );
}
