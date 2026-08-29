import test from "node:test";
import assert from "node:assert";
import {
  validateSellerSourceForSnapshot,
  type SellerSourceInput,
} from "@/lib/marketplace/seller-snapshot";

function createValidSellerInput(): SellerSourceInput {
  return {
    partnerId: 10,
    legalName: "Test Seller",
    jurisdictionCountry: "PL",
    eligibilityStatus: "eligible",
    firmContactEmail: "test@example.com",
    registeredAddressLine1: "Test Street 1",
    taxIdentifierType: "VAT",
    taxIdentifierValue: "123",
    registryIdentifierType: null,
    registryIdentifierValue: null,
    contractModel: "partner_marketplace",
    sellerOfRecord: "PARTNER",
    goodsInvoiceResponsibility: "PARTNER",
    deliveryResponsibility: "PARTNER",
    complaintResponsibility: "PARTNER",
    returnResponsibility: "PARTNER",
    refundFinancialLiability: "PARTNER",
  };
}

test("SELLER_01_MISSING_LEGAL_IDENTITY_REJECTED", () => {
  const input = createValidSellerInput();
  input.legalName = null;
  const res = validateSellerSourceForSnapshot(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_LEGAL_NAME");
});

test("SELLER_02_INCOMPLETE_REGISTERED_ADDRESS_REJECTED", () => {
  const input = createValidSellerInput();
  input.registeredAddressLine1 = "";
  const res = validateSellerSourceForSnapshot(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "INCOMPLETE_REGISTERED_ADDRESS");
});

test("SELLER_03_MISSING_FIRM_EMAIL_REJECTED", () => {
  const input = createValidSellerInput();
  input.firmContactEmail = null;
  const res = validateSellerSourceForSnapshot(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_FIRM_EMAIL");
});

test("SELLER_04_PENDING_NOT_MARKETPLACE_READY", () => {
  const input = createValidSellerInput();
  input.eligibilityStatus = "pending";
  const res = validateSellerSourceForSnapshot(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "SELLER_NOT_ELIGIBLE");
});

test("SELLER_05_INELIGIBLE_REJECTED", () => {
  const input = createValidSellerInput();
  input.eligibilityStatus = "ineligible";
  const res = validateSellerSourceForSnapshot(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "SELLER_NOT_ELIGIBLE");
});

test("SELLER_06_SUSPENDED_REJECTED", () => {
  const input = createValidSellerInput();
  input.eligibilityStatus = "suspended";
  const res = validateSellerSourceForSnapshot(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "SELLER_NOT_ELIGIBLE");
});

test("SELLER_07_MISSING_REQUIRED_POLICY_INPUT_REJECTED", () => {
  const input = createValidSellerInput();
  input.deliveryResponsibility = null;
  const res = validateSellerSourceForSnapshot(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "MISSING_REQUIRED_POLICY_INPUT");
});

test("SELLER_08_PARTIAL_TAX_PAIR_REJECTED", () => {
  const input = createValidSellerInput();
  input.taxIdentifierType = "VAT";
  input.taxIdentifierValue = null;
  const res = validateSellerSourceForSnapshot(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "PARTIAL_TAX_PAIR");
});

test("SELLER_09_PARTIAL_REGISTRY_PAIR_REJECTED", () => {
  const input = createValidSellerInput();
  input.registryIdentifierType = "KRS";
  input.registryIdentifierValue = null;
  const res = validateSellerSourceForSnapshot(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "PARTIAL_REGISTRY_PAIR");
});
