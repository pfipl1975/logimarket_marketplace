import { emailSchema } from "@/lib/auth/account-lifecycle-core";
import { isValidPlNip, normalizePlNip } from "@/lib/buyer/buyer-identity-core";

export type BuyerOnboardingInput = {
  legalName: string; nip: string; street: string; buildingNumber: string; unitNumber: string | null;
  postalCode: string; city: string; firstName: string; lastName: string; contactEmail: string; phone: string;
};
export type BuyerOnboardingError =
  | "INVALID_LEGAL_NAME" | "INVALID_NIP" | "INVALID_STREET" | "INVALID_BUILDING_NUMBER"
  | "INVALID_UNIT_NUMBER" | "INVALID_POSTAL_CODE" | "INVALID_CITY" | "INVALID_FIRST_NAME"
  | "INVALID_LAST_NAME" | "INVALID_CONTACT_EMAIL" | "INVALID_PHONE";

function requiredText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= min && normalized.length <= max && !/[\x00-\x1f\x7f]/.test(normalized)
    ? normalized : null;
}

export function validContactPhone(value: string | null | undefined): boolean {
  if (!value || value.length < 7 || value.length > 32 || !/^\+?[0-9][0-9 ()-]*$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function parseBuyerOnboardingInput(
  values: Record<string, unknown>,
): { ok: true; value: BuyerOnboardingInput } | { ok: false; code: BuyerOnboardingError } {
  const legalName = requiredText(values.legalName, 2, 255);
  if (!legalName) return { ok: false, code: "INVALID_LEGAL_NAME" };
  if (typeof values.nip !== "string" || values.nip.length > 40) return { ok: false, code: "INVALID_NIP" };
  const nip = normalizePlNip(values.nip);
  if (!isValidPlNip(nip)) return { ok: false, code: "INVALID_NIP" };
  const street = requiredText(values.street, 2, 255);
  if (!street) return { ok: false, code: "INVALID_STREET" };
  const buildingNumber = requiredText(values.buildingNumber, 1, 30);
  if (!buildingNumber) return { ok: false, code: "INVALID_BUILDING_NUMBER" };
  const unitNumber = values.unitNumber === null || values.unitNumber === undefined || (typeof values.unitNumber === "string" && values.unitNumber.trim() === "")
    ? null : requiredText(values.unitNumber, 1, 30);
  if (unitNumber === null && values.unitNumber !== null && values.unitNumber !== undefined && !(typeof values.unitNumber === "string" && values.unitNumber.trim() === "")) {
    return { ok: false, code: "INVALID_UNIT_NUMBER" };
  }
  const postalCode = typeof values.postalCode === "string" ? values.postalCode.trim() : "";
  if (!/^\d{2}-\d{3}$/.test(postalCode)) return { ok: false, code: "INVALID_POSTAL_CODE" };
  const city = requiredText(values.city, 2, 100);
  if (!city) return { ok: false, code: "INVALID_CITY" };
  const firstName = requiredText(values.firstName, 1, 100);
  if (!firstName) return { ok: false, code: "INVALID_FIRST_NAME" };
  const lastName = requiredText(values.lastName, 1, 100);
  if (!lastName) return { ok: false, code: "INVALID_LAST_NAME" };
  const email = emailSchema.safeParse(values.contactEmail);
  if (!email.success || email.data.length > 320) return { ok: false, code: "INVALID_CONTACT_EMAIL" };
  const phone = typeof values.phone === "string" ? values.phone.trim().replace(/\s+/g, " ") : "";
  if (!validContactPhone(phone)) return { ok: false, code: "INVALID_PHONE" };
  return { ok: true, value: { legalName, nip, street, buildingNumber, unitNumber, postalCode, city, firstName, lastName, contactEmail: email.data, phone } };
}

export type BuyerProfileField = keyof BuyerOnboardingInput;

export function deriveBuyerProfileReadiness(input: {
  legalName: string | null;
  nip: string | null;
  jurisdictionCountry: string | null;
  address: { street: string | null; buildingNumber: string | null; postalCode: string | null; city: string | null; countryCode: string | null } | null;
  contact: { firstName: string | null; lastName: string | null; contactEmail: string | null; phone: string | null } | null;
}): { profileComplete: boolean; missingFields: BuyerProfileField[] } {
  const missingFields: BuyerProfileField[] = [];
  if (!requiredText(input.legalName, 2, 255)) missingFields.push("legalName");
  if (input.jurisdictionCountry !== "PL" || !input.nip || !isValidPlNip(input.nip)) missingFields.push("nip");
  if (!requiredText(input.address?.street, 2, 255) || input.address?.countryCode !== "PL") missingFields.push("street");
  if (!requiredText(input.address?.buildingNumber, 1, 30)) missingFields.push("buildingNumber");
  if (!input.address?.postalCode || !/^\d{2}-\d{3}$/.test(input.address.postalCode)) missingFields.push("postalCode");
  if (!requiredText(input.address?.city, 2, 100)) missingFields.push("city");
  if (!requiredText(input.contact?.firstName, 1, 100)) missingFields.push("firstName");
  if (!requiredText(input.contact?.lastName, 1, 100)) missingFields.push("lastName");
  if (!emailSchema.safeParse(input.contact?.contactEmail).success) missingFields.push("contactEmail");
  if (!validContactPhone(input.contact?.phone)) missingFields.push("phone");
  return { profileComplete: missingFields.length === 0, missingFields };
}

export function isCanonicalNipUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return false;
    const pg = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (pg.code === "23505" && pg.constraint === "uq_buyer_tax_identifiers_active_canonical") return true;
    current = pg.cause;
  }
  return false;
}
