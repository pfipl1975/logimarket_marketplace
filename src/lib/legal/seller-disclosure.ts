import 'server-only';

export type TaxIdentifierDto = {
  type: string;
  value: string;
  countryCode: string;
};

export type RegisteredOfficeDto = {
  country: string | null;
  city: string | null;
  postalCode: string | null;
  street: string | null;
  building: string | null;
  apartment: string | null;
};

export type ResponsibilitiesDto = {
  invoiceIssuer: "seller";
  fulfillmentResponsibleParty: "seller";
  complaintsResponsibleParty: "seller";
  logiMarketRole: "intermediary";
};

export type CompletenessDiagnostic = {
  complete: boolean;
  missing: string[];
};

export type SellerDisclosureDto = {
  partnerId: number;
  legalName: string;
  businessEmail: string | null;
  registeredOffice: RegisteredOfficeDto;
  taxIdentifiers: TaxIdentifierDto[];
  responsibilities: ResponsibilitiesDto;
  completeness: CompletenessDiagnostic;
};

export function evaluateCompleteness(
  legalName: string,
  businessEmail: string | null,
  registeredOffice: RegisteredOfficeDto,
  taxIdentifiers: TaxIdentifierDto[]
): CompletenessDiagnostic {
  const missing: string[] = [];

  if (!legalName || legalName.trim().length === 0) {
    missing.push("legalName");
  }

  if (!businessEmail || businessEmail.trim().length === 0) {
    missing.push("businessEmail");
  }

  if (!registeredOffice.country) missing.push("registeredOffice.country");
  if (!registeredOffice.city) missing.push("registeredOffice.city");
  if (!registeredOffice.postalCode) missing.push("registeredOffice.postalCode");
  if (!registeredOffice.street) missing.push("registeredOffice.street");
  if (!registeredOffice.building) missing.push("registeredOffice.building");

  if (!taxIdentifiers || taxIdentifiers.length === 0) {
    missing.push("taxIdentifiers");
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

export function buildSellerDisclosure(
  partnerId: number,
  legalName: string,
  businessEmail: string | null,
  registeredOffice: RegisteredOfficeDto,
  taxIdentifiers: TaxIdentifierDto[]
): SellerDisclosureDto {
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
