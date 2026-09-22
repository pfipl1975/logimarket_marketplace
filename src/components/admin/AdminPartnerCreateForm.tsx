"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { createAdminPartner } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/types";
import type { AdminPartnerCreateValidationCode } from "@/lib/admin/partners-create";

type CreateDictionary = NonNullable<Dictionary["adminPartnerCreate"]>;
type FieldErrors = Record<string, string>;

const inputClassName =
  "h-11 w-full rounded-industrial border border-border-industrial bg-white px-3 text-sm text-brand-navy outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/25 disabled:cursor-not-allowed disabled:bg-brand-light-gray/60 disabled:opacity-70";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-sm text-red-700">{message}</p>;
}

export function AdminPartnerCreateForm({
  dict,
  cancelUrl,
  successRedirectBase,
}: {
  dict: CreateDictionary;
  cancelUrl: string;
  successRedirectBase: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const submitLock = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const validationMessage = (code: AdminPartnerCreateValidationCode) => {
    if (code === "INVALID_EMAIL") return dict.invalidEmail;
    if (code === "INVALID_WEBSITE") return dict.invalidWebsite;
    if (code === "INVALID_JURISDICTION_COUNTRY" || code === "INVALID_REGISTERED_COUNTRY" || code === "INVALID_COUNTRY_CODE") return dict.invalidCountry;
    if (code === "INVALID_PL_TAX_ID" || code === "MISSING_PL_TAX_ID") return dict.invalidTaxId;
    if (code === "INVALID_PL_VAT_ID") return dict.invalidVatId;
    if (code === "INVALID_PL_COMMERCIAL_REGISTER") return dict.invalidCommercialRegister;
    if (code === "INVALID_PL_STATISTICAL_ID") return dict.invalidStatisticalId;
    if (code === "UNKNOWN_IDENTIFIER_TYPE") return dict.unknownIdentifierType;
    if (code === "DUPLICATE_IDENTIFIER_TYPE") return dict.duplicateIdentifier;
    if (code === "IDENTIFIER_COUNTRY_MISMATCH") return dict.identifierCountryMismatch;
    if (code.startsWith("MISSING_")) return dict.requiredField;
    return dict.invalidField;
  };

  const validationField = (code: AdminPartnerCreateValidationCode, serverField: string | null) => {
    if (code === "INVALID_PL_TAX_ID" || code === "MISSING_PL_TAX_ID") return "taxIdValue";
    if (code === "INVALID_PL_VAT_ID") return "vatIdValue";
    if (code === "INVALID_PL_COMMERCIAL_REGISTER") return "commercialRegisterValue";
    if (code === "INVALID_PL_STATISTICAL_ID") return "statisticalIdValue";
    if (serverField?.startsWith("taxIdentifiers")) return "taxIdValue";
    if (serverField?.startsWith("registryIdentifiers")) return "commercialRegisterValue";
    return serverField;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || submitLock.current) return;

    submitLock.current = true;
    setErrorMsg(null);
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    const text = (name: string) => formData.get(name)?.toString() ?? "";
    const jurisdictionCountry = text("jurisdictionCountry").trim().toUpperCase();

    const taxIdentifiers = [
      text("taxIdValue").trim()
        ? { identifierType: "tax_id", identifierValue: text("taxIdValue"), countryCode: jurisdictionCountry }
        : null,
      text("vatIdValue").trim()
        ? { identifierType: "vat_id", identifierValue: text("vatIdValue"), countryCode: jurisdictionCountry }
        : null,
    ].filter((value): value is NonNullable<typeof value> => value !== null);

    const registryIdentifiers = [
      text("commercialRegisterValue").trim()
        ? { registryType: "commercial_register", registryValue: text("commercialRegisterValue"), jurisdictionCountry }
        : null,
      text("statisticalIdValue").trim()
        ? { registryType: "statistical_id", registryValue: text("statisticalIdValue"), jurisdictionCountry }
        : null,
    ].filter((value): value is NonNullable<typeof value> => value !== null);

    startTransition(async () => {
      try {
        const result = await createAdminPartner({
          companyName: text("companyName"),
          contactEmail: text("contactEmail"),
          websiteUrl: text("websiteUrl"),
          legalName: text("legalName"),
          jurisdictionCountry,
          registeredAddressLine1: text("registeredAddressLine1"),
          registeredAddressLine2: text("registeredAddressLine2"),
          registeredPostalCode: text("registeredPostalCode"),
          registeredCity: text("registeredCity"),
          registeredRegion: text("registeredRegion"),
          registeredCountryCode: text("registeredCountryCode"),
          taxIdentifiers,
          registryIdentifiers,
        });

        if (result.ok) {
          router.push(`${successRedirectBase}/${result.partnerId}?created=1`);
          return;
        }

        if (result.reason === "PARTNER_INVALID_INPUT") {
          const field = validationField(result.code, result.field);
          const message = validationMessage(result.code);
          if (field) {
            setFieldErrors({ [field]: message });
            requestAnimationFrame(() => formRef.current?.elements.namedItem(field) instanceof HTMLElement && (formRef.current.elements.namedItem(field) as HTMLElement).focus());
          } else {
            setErrorMsg(message);
          }
        } else {
          setErrorMsg(dict.errorDescription);
        }
      } catch {
        setErrorMsg(dict.errorDescription);
      } finally {
        submitLock.current = false;
      }
    });
  };

  const fieldProps = (name: string) => ({
    "aria-invalid": Boolean(fieldErrors[name]),
    "aria-describedby": fieldErrors[name] ? `${name}-error` : undefined,
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="border border-border-industrial bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-brand-navy">{dict.progressLabel}</span>
          <span className="text-muted-foreground">{dict.progressValue}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden bg-brand-light-gray" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={1} aria-label={dict.progressLabel}>
          <div className="h-full w-1/5 bg-brand-teal" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{dict.readinessNotice}</p>
      </div>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-medium">{dict.errorTitle}</p><p className="text-sm">{errorMsg}</p></div>
        </div>
      )}

      <fieldset disabled={isPending} className="space-y-6">
        <Section number="1" title={dict.partnerSection} description={dict.partnerSectionDescription}>
          <Field label={dict.companyNameLabel} name="companyName" required error={fieldErrors.companyName}>
            <input id="companyName" name="companyName" required maxLength={255} autoComplete="organization" className={inputClassName} {...fieldProps("companyName")} />
          </Field>
          <Field label={dict.contactEmailLabel} name="contactEmail" required error={fieldErrors.contactEmail}>
            <input id="contactEmail" name="contactEmail" type="email" required maxLength={100} autoComplete="email" className={inputClassName} {...fieldProps("contactEmail")} />
          </Field>
          <Field label={dict.websiteUrlLabel} name="websiteUrl" error={fieldErrors.websiteUrl} wide>
            <input id="websiteUrl" name="websiteUrl" type="url" autoComplete="url" placeholder="https://" className={inputClassName} {...fieldProps("websiteUrl")} />
          </Field>
        </Section>

        <Section number="2" title={dict.legalSection} description={dict.legalSectionDescription}>
          <Field label={dict.legalNameLabel} name="legalName" required error={fieldErrors.legalName}>
            <input id="legalName" name="legalName" required maxLength={255} autoComplete="organization" className={inputClassName} {...fieldProps("legalName")} />
          </Field>
          <Field label={dict.jurisdictionCountryLabel} name="jurisdictionCountry" required error={fieldErrors.jurisdictionCountry}>
            <input id="jurisdictionCountry" name="jurisdictionCountry" required maxLength={2} defaultValue="PL" autoComplete="country" className={inputClassName} {...fieldProps("jurisdictionCountry")} />
          </Field>
        </Section>

        <Section number="3" title={dict.addressSection} description={dict.addressSectionDescription}>
          <Field label={dict.registeredAddressLine1Label} name="registeredAddressLine1" required error={fieldErrors.registeredAddressLine1}>
            <input id="registeredAddressLine1" name="registeredAddressLine1" required maxLength={255} autoComplete="address-line1" className={inputClassName} {...fieldProps("registeredAddressLine1")} />
          </Field>
          <Field label={dict.registeredAddressLine2Label} name="registeredAddressLine2" error={fieldErrors.registeredAddressLine2}>
            <input id="registeredAddressLine2" name="registeredAddressLine2" maxLength={255} autoComplete="address-line2" className={inputClassName} {...fieldProps("registeredAddressLine2")} />
          </Field>
          <Field label={dict.registeredPostalCodeLabel} name="registeredPostalCode" required error={fieldErrors.registeredPostalCode}>
            <input id="registeredPostalCode" name="registeredPostalCode" required maxLength={32} autoComplete="postal-code" className={inputClassName} {...fieldProps("registeredPostalCode")} />
          </Field>
          <Field label={dict.registeredCityLabel} name="registeredCity" required error={fieldErrors.registeredCity}>
            <input id="registeredCity" name="registeredCity" required maxLength={120} autoComplete="address-level2" className={inputClassName} {...fieldProps("registeredCity")} />
          </Field>
          <Field label={dict.registeredRegionLabel} name="registeredRegion" error={fieldErrors.registeredRegion}>
            <input id="registeredRegion" name="registeredRegion" maxLength={120} autoComplete="address-level1" className={inputClassName} {...fieldProps("registeredRegion")} />
          </Field>
          <Field label={dict.registeredCountryCodeLabel} name="registeredCountryCode" required error={fieldErrors.registeredCountryCode}>
            <input id="registeredCountryCode" name="registeredCountryCode" required maxLength={2} defaultValue="PL" autoComplete="country" className={inputClassName} {...fieldProps("registeredCountryCode")} />
          </Field>
        </Section>

        <Section number="4" title={dict.taxSection} description={dict.taxSectionDescription}>
          <Field label={dict.taxIdLabel} name="taxIdValue" error={fieldErrors.taxIdValue} hint={dict.taxIdHint}>
            <input id="taxIdValue" name="taxIdValue" inputMode="numeric" maxLength={100} className={inputClassName} {...fieldProps("taxIdValue")} />
          </Field>
          <Field label={dict.vatIdLabel} name="vatIdValue" error={fieldErrors.vatIdValue} hint={dict.vatIdHint}>
            <input id="vatIdValue" name="vatIdValue" maxLength={100} className={inputClassName} {...fieldProps("vatIdValue")} />
          </Field>
        </Section>

        <Section number="5" title={dict.registrySection} description={dict.registrySectionDescription}>
          <Field label={dict.commercialRegisterLabel} name="commercialRegisterValue" error={fieldErrors.commercialRegisterValue} hint={dict.commercialRegisterHint}>
            <input id="commercialRegisterValue" name="commercialRegisterValue" maxLength={100} className={inputClassName} {...fieldProps("commercialRegisterValue")} />
          </Field>
          <Field label={dict.statisticalIdLabel} name="statisticalIdValue" error={fieldErrors.statisticalIdValue} hint={dict.statisticalIdHint}>
            <input id="statisticalIdValue" name="statisticalIdValue" maxLength={100} className={inputClassName} {...fieldProps("statisticalIdValue")} />
          </Field>
        </Section>

        <div className="flex flex-col-reverse gap-3 border-t border-border-industrial pt-6 sm:flex-row sm:items-center sm:justify-end">
          <Link href={cancelUrl} aria-disabled={isPending} onClick={(event) => isPending && event.preventDefault()} className="inline-flex h-11 items-center justify-center border border-border-industrial bg-white px-6 text-sm font-medium text-brand-navy transition hover:bg-brand-light-gray focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2">
            {dict.cancelButton}
          </Link>
          <button type="submit" disabled={isPending} className="inline-flex h-11 min-w-52 items-center justify-center bg-brand-navy px-6 text-sm font-medium text-white transition hover:bg-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? dict.creating : dict.submitButton}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function Section({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="border border-border-industrial bg-white shadow-soft">
      <div className="flex items-start gap-3 border-b border-border-industrial bg-brand-light-gray/40 px-5 py-4 sm:px-6">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-brand-navy text-sm font-semibold text-white">{number}</span>
        <div><h2 className="font-semibold text-brand-navy">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      </div>
      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">{children}</div>
    </section>
  );
}

function Field({ label, name, required, error, hint, wide, children }: { label: string; name: string; required?: boolean; error?: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-brand-navy">{label}{required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}
