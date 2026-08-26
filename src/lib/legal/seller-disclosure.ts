import 'server-only';

export type TaxIdentifierDto = {
  type: string;
  value: string;
  countryCode: string;
};

export type RegisteredOfficeDto = {
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  region: string | null;
  countryCode: string | null;
};

export type ResponsibilitiesDto = {
  invoiceIssuer: "seller";
  fulfillmentResponsibleParty: "seller";
  complaintsResponsibleParty: "seller";
  logiMarketRole: "intermediary";
};

export type SellerDisclosureMissingField =
  | "legal_name"
  | "business_email"
  | "registered_address_line1"
  | "registered_postal_code"
  | "registered_city"
  | "registered_country_code"
  | "tax_identifier";

export type CompletenessDiagnostic = {
  complete: boolean;
  missing: SellerDisclosureMissingField[];
};

export type SellerDisclosureDto = {
  partnerId: number;
  legalName: string | null;
  businessEmail: string | null;
  registeredOffice: RegisteredOfficeDto;
  taxIdentifiers: TaxIdentifierDto[];
  responsibilities: ResponsibilitiesDto;
  completeness: CompletenessDiagnostic;
};

function normalizeString(val: string | null | undefined): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function evaluateCompleteness(
  legalName: string | null,
  businessEmail: string | null,
  registeredOffice: RegisteredOfficeDto,
  taxIdentifiers: TaxIdentifierDto[]
): CompletenessDiagnostic {
  const missing: SellerDisclosureMissingField[] = [];

  if (!legalName) missing.push("legal_name");
  if (!businessEmail) missing.push("business_email");

  if (!registeredOffice.addressLine1) missing.push("registered_address_line1");
  if (!registeredOffice.postalCode) missing.push("registered_postal_code");
  if (!registeredOffice.city) missing.push("registered_city");
  if (!registeredOffice.countryCode) missing.push("registered_country_code");

  if (!taxIdentifiers || taxIdentifiers.length === 0) {
    missing.push("tax_identifier");
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

export function buildSellerDisclosure(
  partnerId: number,
  rawLegalName: string | null | undefined,
  rawBusinessEmail: string | null | undefined,
  rawRegisteredOffice: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    city?: string | null;
    region?: string | null;
    countryCode?: string | null;
  },
  rawTaxIdentifiers: { type: string; value: string; countryCode: string }[]
): SellerDisclosureDto {

  const legalName = normalizeString(rawLegalName);
  const businessEmail = normalizeString(rawBusinessEmail);

  const registeredOffice: RegisteredOfficeDto = {
    addressLine1: normalizeString(rawRegisteredOffice.addressLine1),
    addressLine2: normalizeString(rawRegisteredOffice.addressLine2),
    postalCode: normalizeString(rawRegisteredOffice.postalCode),
    city: normalizeString(rawRegisteredOffice.city),
    region: normalizeString(rawRegisteredOffice.region),
    countryCode: normalizeString(rawRegisteredOffice.countryCode),
  };

  const taxIdentifiers: TaxIdentifierDto[] = (rawTaxIdentifiers || []).map(t => ({
    type: normalizeString(t.type) || '',
    value: normalizeString(t.value) || '',
    countryCode: normalizeString(t.countryCode) || ''
  })).filter(t => t.type && t.value && t.countryCode);

  return {
    partnerId,
    legalName,
    businessEmail,
    registeredOffice,
    taxIdentifiers,
    responsibilities: {
      invoiceIssuer: "seller",
      fulfillmentResponsibleParty: "seller",
      complaintsResponsibleParty: "seller",
      logiMarketRole: "intermediary",
    },
    completeness: evaluateCompleteness(legalName, businessEmail, registeredOffice, taxIdentifiers),
  };
}
