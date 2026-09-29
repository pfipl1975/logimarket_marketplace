import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { deriveBuyerProfileReadiness, isCanonicalNipUniqueViolation, parseBuyerOnboardingInput } from "../../src/lib/buyer-account/core";
import { accountLandingPath, accountLoginPath, buyerAccountPath, buyerOrdersPath } from "../../src/lib/buyer-account/paths";

const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"] as const;

const validInput = {
  legalName: "  Example   Company Sp. z o.o.  ", nip: "123-456-32-18",
  street: "Główna", buildingNumber: "12A", unitNumber: " ", postalCode: "00-001", city: "Warszawa",
  firstName: "Anna", lastName: "Kowalska", contactEmail: "CONTACT@example.com", phone: "+48 501 234 567",
};

test("first-company declaration validates required profile data and leaves optional unit empty", () => {
  assert.deepEqual(parseBuyerOnboardingInput(validInput), {
    ok: true, value: { ...validInput, legalName: "Example Company Sp. z o.o.", nip: "1234563218", unitNumber: null, contactEmail: "contact@example.com" },
  });
  for (const [field, value, code] of [
    ["legalName", " ", "INVALID_LEGAL_NAME"], ["nip", "1234563219", "INVALID_NIP"],
    ["street", " ", "INVALID_STREET"], ["buildingNumber", " ", "INVALID_BUILDING_NUMBER"],
    ["unitNumber", "x".repeat(31), "INVALID_UNIT_NUMBER"], ["postalCode", "00001", "INVALID_POSTAL_CODE"],
    ["city", " ", "INVALID_CITY"], ["firstName", " ", "INVALID_FIRST_NAME"],
    ["lastName", " ", "INVALID_LAST_NAME"], ["contactEmail", "bad", "INVALID_CONTACT_EMAIL"],
    ["phone", "123", "INVALID_PHONE"],
  ] as const) {
    assert.deepEqual(parseBuyerOnboardingInput({ ...validInput, [field]: value }), { ok: false, code }, field);
  }
});

test("profile completeness is derived from membership-scoped master data, not verification status", () => {
  const complete = {
    legalName: "Example Company", nip: "1234563218", jurisdictionCountry: "PL",
    address: { street: "Główna", buildingNumber: "12A", postalCode: "00-001", city: "Warszawa", countryCode: "PL" },
    contact: { firstName: "Anna", lastName: "Kowalska", contactEmail: "contact@example.com", phone: "+48 501 234 567" },
  };
  assert.deepEqual(deriveBuyerProfileReadiness(complete), { profileComplete: true, missingFields: [] });
  assert.equal(deriveBuyerProfileReadiness({ ...complete, address: null }).profileComplete, false);
  assert.equal(deriveBuyerProfileReadiness({ ...complete, contact: null }).profileComplete, false);
  for (const field of ["street", "buildingNumber", "postalCode", "city"] as const) {
    assert.ok(deriveBuyerProfileReadiness({ ...complete, address: { ...complete.address, [field]: "" } }).missingFields.includes(field));
  }
  for (const field of ["firstName", "lastName", "contactEmail", "phone"] as const) {
    assert.ok(deriveBuyerProfileReadiness({ ...complete, contact: { ...complete.contact, [field]: "" } }).missingFields.includes(field));
  }
});

test("only exact canonical NIP 23505 maps to safe duplicate domain result", () => {
  assert.equal(isCanonicalNipUniqueViolation({ cause: { code: "23505", constraint: "uq_buyer_tax_identifiers_active_canonical" } }), true);
  assert.equal(isCanonicalNipUniqueViolation({ code: "23505", constraint: "uq_buyer_tax_identifier_identity" }), false);
  assert.equal(isCanonicalNipUniqueViolation({ code: "23503", constraint: "uq_buyer_tax_identifiers_active_canonical" }), false);
});

test("account paths and generic landing preserve only safe contextual destinations", () => {
  for (const locale of locales) {
    const prefix = locale === "pl" ? "" : `/${locale}`;
    assert.equal(buyerAccountPath(locale), locale === "pl" ? "/konto" : `${prefix}/account`);
    assert.equal(buyerOrdersPath(locale), locale === "pl" ? "/zamowienia" : `${prefix}/orders`);
    assert.equal(new URL(`https://example.test${accountLoginPath(locale)}`).searchParams.get("next"), buyerAccountPath(locale));
    assert.equal(accountLandingPath(null, locale), buyerAccountPath(locale));
    assert.equal(accountLandingPath("/partner", locale), "/partner");
    assert.equal(accountLandingPath(buyerOrdersPath(locale), locale), buyerOrdersPath(locale));
    for (const unsafe of ["https://evil.example", "//evil.example", "/%2f%2fevil.example", "/%5c%5cevil.example", "/login?next=/partner", "/auth/callback?code=secret"]) {
      assert.equal(accountLandingPath(unsafe, locale), buyerAccountPath(locale));
    }
  }
});

test("account routes are private and all seven dictionaries include account copy", async () => {
  for (const route of ["(pl)/konto/page.tsx", "(localized)/[locale]/account/page.tsx"]) {
    const source = await fs.readFile(path.join(process.cwd(), "src/app", route), "utf8");
    assert.match(source, /index: false, follow: false, nocache: true/);
  }
  for (const locale of locales) {
    const dict = JSON.parse(await fs.readFile(path.join(process.cwd(), "src/messages", `${locale}.json`), "utf8"));
    assert.ok(dict.nav.myAccount);
    for (const key of ["title", "signedInAs", "emptyTitle", "emptyDescription", "legalName", "nip", "street", "buildingNumber", "unitNumber", "postalCode", "city", "firstName", "lastName", "contactEmail", "phone", "profileComplete", "profileIncomplete", "declaredIdentity", "duplicateNip", "role", "status", "statusPending", "submit", "invalidNip", "ordersLink", "securityDescription"]) {
      assert.ok(dict.buyerAccount[key], `${locale}.buyerAccount.${key}`);
    }
  }
});

test("Buyer account writes cannot mark declarations verified or assign unrelated roles", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "src/lib/buyer-account/service.ts"), "utf8");
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /database\.transaction/);
  assert.match(source, /verificationStatus: "pending"/);
  assert.match(source, /trustedByVerificationEventId: null/);
  assert.match(source, /currentVerificationEventId: null/);
  assert.match(source, /membershipRole: "organization_admin"/);
  assert.match(source, /buyerOrganizationAddresses/);
  assert.match(source, /buyerUserProfiles/);
  assert.doesNotMatch(source, /buyerOrganizationVerificationEvents|partnerUserMemberships|adminAllowlist/);
});
