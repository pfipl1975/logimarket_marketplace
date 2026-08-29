import test from "node:test";
import assert from "node:assert";
import {
  validateSellerSourceForSnapshot,
  type SellerSourceInput,
} from "@/lib/marketplace/seller-snapshot";

// ─── Fixture ─────────────────────────────────────────────────────────────────

/**
 * Creates a complete, valid seller source fixture.
 * Policy input fields use neutral placeholders to avoid encoding
 * legally-unauthorized canonical values.
 */
function validSeller(overrides?: Partial<SellerSourceInput>): SellerSourceInput {
  return {
    partnerId: 10,
    sellerDisplayName: "Acme GmbH",
    legalName: "Acme Gesellschaft mbH",
    jurisdictionCountry: "DE",
    eligibilityStatus: "eligible",
    firmContactEmail: "acme@example.com",
    registeredAddressLine1: "Hauptstraße 1",
    registeredAddressLine2: null,
    registeredPostalCode: "10115",
    registeredCity: "Berlin",
    registeredRegion: null,
    registeredCountryCode: "DE",
    taxIdentifierType: "VAT",
    taxIdentifierValue: "DE123456789",
    registryIdentifierType: null,
    registryIdentifierValue: null,
    contractModel: "partner_marketplace",
    sellerOfRecord: "PARTNER",
    goodsInvoiceIssuer: "PARTNER",
    goodsInvoiceResponsibility: "PARTNER",
    deliveryResponsibility: "POLICY_SUPPLIED_DELIVERY",
    complaintResponsibility: "POLICY_SUPPLIED_COMPLAINT",
    returnResponsibility: "POLICY_SUPPLIED_RETURN",
    refundFinancialLiability: "POLICY_SUPPLIED_REFUND",
    sellerRole: "POLICY_SUPPLIED_SELLER_ROLE",
    logimarketPlatformRole: "POLICY_SUPPLIED_PLATFORM_ROLE",
    ...overrides,
  };
}

// ─── Core validity ────────────────────────────────────────────────────────────

test("SELLER_VALID_FULL_INPUT", () => {
  assert.strictEqual(validateSellerSourceForSnapshot(validSeller()).ok, true);
});

// ─── Identity / display name ─────────────────────────────────────────────────

test("SELLER_DISPLAY_NAME_MISSING_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ sellerDisplayName: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_SELLER_DISPLAY_NAME");
});

test("SELLER_DISPLAY_NAME_EMPTY_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ sellerDisplayName: "   " }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_SELLER_DISPLAY_NAME");
});

test("SELLER_01_MISSING_LEGAL_IDENTITY_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ legalName: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_LEGAL_NAME");
});

test("SELLER_LEGAL_IDENTITY_MISSING_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ legalName: "" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_LEGAL_NAME");
});

// ─── Address completeness ────────────────────────────────────────────────────

test("SELLER_02_INCOMPLETE_REGISTERED_ADDRESS_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ registeredAddressLine1: "" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REGISTERED_ADDRESS_LINE1");
});

test("SELLER_ADDRESS_LINE1_MISSING_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ registeredAddressLine1: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REGISTERED_ADDRESS_LINE1");
});

test("SELLER_POSTAL_CODE_MISSING_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ registeredPostalCode: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REGISTERED_POSTAL_CODE");
});

test("SELLER_CITY_MISSING_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ registeredCity: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REGISTERED_CITY");
});

test("SELLER_REGISTERED_COUNTRY_MISSING_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ registeredCountryCode: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REGISTERED_COUNTRY_CODE");
});

test("SELLER_LINE2_AND_REGION_OPTIONAL", () => {
  // Line2 and region are optional — valid without them.
  const res = validateSellerSourceForSnapshot(
    validSeller({ registeredAddressLine2: null, registeredRegion: null }),
  );
  assert.strictEqual(res.ok, true);
});

// ─── Contact ─────────────────────────────────────────────────────────────────

test("SELLER_03_MISSING_FIRM_EMAIL_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ firmContactEmail: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_FIRM_EMAIL");
});

// ─── Eligibility ─────────────────────────────────────────────────────────────

test("SELLER_04_PENDING_NOT_MARKETPLACE_READY", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ eligibilityStatus: "pending" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "SELLER_NOT_ELIGIBLE");
});

test("SELLER_PENDING_REJECTED", () => {
  assert.strictEqual(validateSellerSourceForSnapshot(validSeller({ eligibilityStatus: "pending" })).ok, false);
});

test("SELLER_05_INELIGIBLE_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ eligibilityStatus: "ineligible" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "SELLER_NOT_ELIGIBLE");
});

test("SELLER_INELIGIBLE_REJECTED", () => {
  assert.strictEqual(validateSellerSourceForSnapshot(validSeller({ eligibilityStatus: "ineligible" })).ok, false);
});

test("SELLER_06_SUSPENDED_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ eligibilityStatus: "suspended" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "SELLER_NOT_ELIGIBLE");
});

test("SELLER_SUSPENDED_REJECTED", () => {
  assert.strictEqual(validateSellerSourceForSnapshot(validSeller({ eligibilityStatus: "suspended" })).ok, false);
});

// ─── Identifier pairs ────────────────────────────────────────────────────────

test("SELLER_08_PARTIAL_TAX_PAIR_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ taxIdentifierType: "VAT", taxIdentifierValue: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "PARTIAL_TAX_PAIR");
});

test("SELLER_EMPTY_TAX_PAIR_MEMBER_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ taxIdentifierType: "VAT", taxIdentifierValue: "  " }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "PARTIAL_TAX_PAIR");
});

test("SELLER_09_PARTIAL_REGISTRY_PAIR_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ registryIdentifierType: "KRS", registryIdentifierValue: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "PARTIAL_REGISTRY_PAIR");
});

test("SELLER_EMPTY_REGISTRY_PAIR_MEMBER_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ registryIdentifierType: "KRS", registryIdentifierValue: "" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "PARTIAL_REGISTRY_PAIR");
});

// ─── Goods invoice issuer ────────────────────────────────────────────────────

test("GOODS_INVOICE_ISSUER_PARTNER_ACCEPTED", () => {
  // goodsInvoiceIssuer="PARTNER" must not independently block an otherwise valid seller.
  const res = validateSellerSourceForSnapshot(validSeller({ goodsInvoiceIssuer: "PARTNER" }));
  assert.strictEqual(res.ok, true);
});

test("GOODS_INVOICE_ISSUER_MISSING_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ goodsInvoiceIssuer: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "INVALID_GOODS_INVOICE_ISSUER");
});

// ─── Goods invoice responsibility (independent of issuer) ────────────────────

test("GOODS_INVOICE_RESPONSIBILITY_PARTNER_ACCEPTED", () => {
  // goodsInvoiceResponsibility="PARTNER" must not independently block an otherwise valid seller.
  const res = validateSellerSourceForSnapshot(validSeller({ goodsInvoiceResponsibility: "PARTNER" }));
  assert.strictEqual(res.ok, true);
});

test("GOODS_INVOICE_RESPONSIBILITY_MISSING_REJECTED", () => {
  // Proves goodsInvoiceResponsibility is validated independently of goodsInvoiceIssuer.
  const res = validateSellerSourceForSnapshot(validSeller({ goodsInvoiceResponsibility: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "INVALID_GOODS_INVOICE_RESPONSIBILITY");
});

// ─── Policy inputs: sellerRole / logimarketPlatformRole ──────────────────────

test("SELLER_ROLE_MISSING_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ sellerRole: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REQUIRED_POLICY_INPUT");
});

test("SELLER_ROLE_EMPTY_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ sellerRole: "   " }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REQUIRED_POLICY_INPUT");
});

test("PLATFORM_ROLE_MISSING_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ logimarketPlatformRole: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REQUIRED_POLICY_INPUT");
});

test("PLATFORM_ROLE_EMPTY_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ logimarketPlatformRole: "" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REQUIRED_POLICY_INPUT");
});

// ─── Other policy inputs ─────────────────────────────────────────────────────

test("SELLER_07_MISSING_REQUIRED_POLICY_INPUT_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ deliveryResponsibility: null }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REQUIRED_POLICY_INPUT");
});

test("SELLER_POLICY_INPUT_MISSING_REJECTED", () => {
  const res = validateSellerSourceForSnapshot(validSeller({ returnResponsibility: "" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REQUIRED_POLICY_INPUT");
});
