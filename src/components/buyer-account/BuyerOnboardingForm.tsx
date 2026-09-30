"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitFirstBuyerOrganization, type BuyerOnboardingActionState } from "@/app/buyer-account-actions";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";

const initialState: BuyerOnboardingActionState = { code: "IDLE" };
type Labels = Dictionary["buyerAccount"];
type FieldName = "legalName" | "nip" | "street" | "buildingNumber" | "unitNumber" | "postalCode" | "city" | "firstName" | "lastName" | "contactEmail" | "phone";

const fieldErrorCode: Record<FieldName, BuyerOnboardingActionState["code"]> = {
  legalName: "INVALID_LEGAL_NAME", nip: "INVALID_NIP", street: "INVALID_STREET",
  buildingNumber: "INVALID_BUILDING_NUMBER", unitNumber: "INVALID_UNIT_NUMBER",
  postalCode: "INVALID_POSTAL_CODE", city: "INVALID_CITY", firstName: "INVALID_FIRST_NAME",
  lastName: "INVALID_LAST_NAME", contactEmail: "INVALID_CONTACT_EMAIL", phone: "INVALID_PHONE",
};

function Field({ name, label, error, required = true, type = "text", maxLength, autoComplete, defaultValue, inputMode }:
  { name: FieldName; label: string; error?: string; required?: boolean; type?: string; maxLength: number; autoComplete?: string; defaultValue?: string; inputMode?: "numeric" | "tel" }) {
  const id = `buyer-${name}`;
  return <div className="min-w-0">
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-brand-navy">{label}</label>
    <input id={id} name={name} type={type} required={required} maxLength={maxLength} autoComplete={autoComplete} defaultValue={defaultValue} inputMode={inputMode}
      aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      className="min-h-11 w-full rounded-md border border-[#9aa8b7] bg-white px-3 py-2 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal" />
    {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
  </div>;
}

function SubmitButton({ labels }: { labels: Labels }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70">
    {pending ? labels.submitting : labels.submit}
  </button>;
}

export function BuyerOnboardingForm({ locale, labels, authEmail, next }: { locale: Locale; labels: Labels; authEmail: string | null; next: string }) {
  const [state, formAction] = useActionState(submitFirstBuyerOrganization, initialState);
  const fieldMessages: Record<FieldName, string> = {
    legalName: labels.invalidLegalName, nip: labels.invalidNip, street: labels.invalidStreet,
    buildingNumber: labels.invalidBuildingNumber, unitNumber: labels.invalidUnitNumber,
    postalCode: labels.invalidPostalCode, city: labels.invalidCity, firstName: labels.invalidFirstName,
    lastName: labels.invalidLastName, contactEmail: labels.invalidContactEmail, phone: labels.invalidPhone,
  };
  const fieldError = (name: FieldName) => state.code === fieldErrorCode[name] ? fieldMessages[name] : undefined;
  const error = state.code === "AUTH_REQUIRED" ? labels.authRequired
    : state.code === "ALREADY_HAS_ORGANIZATION" ? labels.alreadyExists
    : state.code === "BUYER_ORGANIZATION_NIP_ALREADY_EXISTS" ? labels.duplicateNip
    : state.code === "UNAVAILABLE" ? labels.unavailable : null;

  return <form action={formAction} className="mt-6 space-y-7" aria-label={labels.emptyTitle}>
    <input type="hidden" name="locale" value={locale} />
    <input type="hidden" name="next" value={next} />
    <fieldset className="space-y-4 border-t border-[#d9dde2] pt-5">
      <legend className="text-base font-semibold text-brand-navy">1/3 · {labels.companyData}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="nip" label={labels.nip} error={fieldError("nip")} maxLength={40} inputMode="numeric" autoComplete="off" />
        <Field name="legalName" label={labels.legalName} error={fieldError("legalName")} maxLength={255} autoComplete="organization" />
      </div>
      <p className="text-sm text-[#2c3e50]">{labels.jurisdiction}: PL</p>
    </fieldset>
    <fieldset className="space-y-4 border-t border-[#d9dde2] pt-5">
      <legend className="text-base font-semibold text-brand-navy">2/3 · {labels.addressData}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="street" label={labels.street} error={fieldError("street")} maxLength={255} autoComplete="address-line1" />
        <Field name="buildingNumber" label={labels.buildingNumber} error={fieldError("buildingNumber")} maxLength={30} />
        <Field name="unitNumber" label={labels.unitNumber} error={fieldError("unitNumber")} maxLength={30} required={false} />
        <Field name="postalCode" label={labels.postalCode} error={fieldError("postalCode")} maxLength={6} autoComplete="postal-code" />
        <Field name="city" label={labels.city} error={fieldError("city")} maxLength={100} autoComplete="address-level2" />
      </div>
      <p className="text-sm text-[#2c3e50]">{labels.jurisdiction}: PL</p>
    </fieldset>
    <fieldset className="space-y-4 border-t border-[#d9dde2] pt-5">
      <legend className="text-base font-semibold text-brand-navy">3/3 · {labels.contactData}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label={labels.firstName} error={fieldError("firstName")} maxLength={100} autoComplete="given-name" />
        <Field name="lastName" label={labels.lastName} error={fieldError("lastName")} maxLength={100} autoComplete="family-name" />
        <Field name="contactEmail" label={labels.contactEmail} error={fieldError("contactEmail")} maxLength={320} type="email" autoComplete="email" defaultValue={authEmail ?? ""} />
        <Field name="phone" label={labels.phone} error={fieldError("phone")} maxLength={32} type="tel" inputMode="tel" autoComplete="tel" />
      </div>
    </fieldset>
    <div aria-live="polite" className="min-h-6 text-sm text-red-700">{error && <p role="alert">{error}</p>}</div>
    <SubmitButton labels={labels} />
  </form>;
}
