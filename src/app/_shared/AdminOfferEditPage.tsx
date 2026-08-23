import { notFound } from "next/navigation";
import {
  getAdminOfferDetail,
  getAdminOfferAttributesEdit,
} from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { AdminOfferEditForm } from "@/components/admin/AdminOfferEditForm";
import { AdminOfferTechnicalAttributesForm } from "@/components/admin/AdminOfferTechnicalAttributesForm";

interface AdminOfferEditPageProps {
  id: string;
  locale: Locale;
}

export async function AdminOfferEditPage({
  id,
  locale,
}: AdminOfferEditPageProps) {
  const dictionary = await getDictionary(locale);
  const dict = dictionary.adminOfferEdit;

  const result = await getAdminOfferDetail(id, locale);

  if (!result.ok) {
    if (result.code === "INVALID_ID" || result.code === "NOT_FOUND") {
      notFound();
    }
    return (
      <div className="rounded-lg bg-red-50 p-6">
        <h2 className="text-xl font-semibold text-red-700">
          {dict.errorTitle}
        </h2>
        <p className="mt-2 text-sm text-red-600">{dict.errorDescription}</p>
      </div>
    );
  }

  const offer = result.data;
  const canEdit = ["draft", "published", "archived"].includes(
    offer.publicationStatus,
  );

  if (!canEdit) {
    return (
      <div className="rounded-lg bg-amber-50 p-6">
        <h2 className="text-xl font-semibold text-amber-700">
          {dict.errorNotEditableTitle}
        </h2>
        <p className="mt-2 text-sm text-amber-600">
          {dict.errorNotEditableDescription}
        </p>
      </div>
    );
  }

  const attrsRes = await getAdminOfferAttributesEdit(offer.id, locale);
  const attrsModel = attrsRes.ok ? attrsRes : null;
  const attrDict =
    ((dict as Record<string, unknown>).technicalAttributesForm as Record<
      string,
      string
    >) || {};

  return (
    <div className="space-y-6 pb-24">
      <AdminOfferEditForm
        key={offer.updatedAt ?? "never-updated"}
        offer={offer}
        locale={locale}
        dict={dict}
      />

      {attrsModel && attrsModel.attributes.length > 0 && (
        <AdminOfferTechnicalAttributesForm
          key={`attrs-${attrsModel.expectedUpdatedAt}`}
          offerId={attrsModel.offerId}
          expectedUpdatedAt={attrsModel.expectedUpdatedAt}
          attributes={attrsModel.attributes}
          labels={{
            title: attrDict.title,
            description: attrDict.description,
            save: attrDict.save,
            saving: attrDict.saving,
            success: attrDict.success,
            error: attrDict.error,
            conflict: attrDict.conflict,
            empty: attrDict.empty,
            required: attrDict.required,
            clear: attrDict.clear,
            orphanWarning: attrDict.orphanWarning,
            inactiveWarning: attrDict.inactiveWarning,
            provenanceLocked: attrDict.provenanceLocked,
            trueLabel: attrDict.trueLabel,
            falseLabel: attrDict.falseLabel,
            unsetLabel: attrDict.unsetLabel,
            inactiveOptionLabel: attrDict.inactiveOptionLabel,
          }}
        />
      )}
    </div>
  );
}
