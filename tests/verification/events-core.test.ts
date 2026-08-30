import { test, describe } from "node:test";
import assert from "node:assert";
import {
  buildLegalIdentitySnapshot,
  buildRegistryIdentifierSnapshot,
  buildTaxIdentifierSnapshot,
  validateEventOwnership,
} from "../../src/lib/verification/events-core";

describe("CURRENT EVENT OWNERSHIP VALIDATION", () => {
  test("Legal Identity Partner 42 must reject Tax event", () => {
    const eventObj = { subjectType: "tax_identifier", taxIdentifierId: 42 };
    assert.strictEqual(validateEventOwnership("legal_identity", 42, eventObj), false);
  });

  test("Legal Identity Partner 42 must reject Registry event", () => {
    const eventObj = { subjectType: "registry_identifier", registryIdentifierId: 42 };
    assert.strictEqual(validateEventOwnership("legal_identity", 42, eventObj), false);
  });

  test("Legal Identity Partner 42 must reject Legal event for Partner 99", () => {
    const eventObj = { subjectType: "legal_identity", legalIdentityPartnerId: 99 };
    assert.strictEqual(validateEventOwnership("legal_identity", 42, eventObj), false);
  });

  test("Legal Identity Partner 42 must accept Legal event for Partner 42", () => {
    const eventObj = { subjectType: "legal_identity", legalIdentityPartnerId: 42 };
    assert.strictEqual(validateEventOwnership("legal_identity", 42, eventObj), true);
  });

  test("Tax identifier must accept only an event whose subjectType=tax_identifier and taxIdentifierId=<same id>", () => {
    assert.strictEqual(validateEventOwnership("tax_identifier", 1, { subjectType: "tax_identifier", taxIdentifierId: 1 }), true);
    assert.strictEqual(validateEventOwnership("tax_identifier", 1, { subjectType: "tax_identifier", taxIdentifierId: 2 }), false);
    assert.strictEqual(validateEventOwnership("tax_identifier", 1, { subjectType: "legal_identity", legalIdentityPartnerId: 1 }), false);
  });

  test("Registry identifier must accept only an event whose subjectType=registry_identifier and registryIdentifierId=<same id>", () => {
    assert.strictEqual(validateEventOwnership("registry_identifier", 1, { subjectType: "registry_identifier", registryIdentifierId: 1 }), true);
    assert.strictEqual(validateEventOwnership("registry_identifier", 1, { subjectType: "registry_identifier", registryIdentifierId: 2 }), false);
    assert.strictEqual(validateEventOwnership("registry_identifier", 1, { subjectType: "legal_identity", legalIdentityPartnerId: 1 }), false);
  });
});

describe("STRICT SNAPSHOT BUILDERS", () => {
  test("Legal builder projects only canonical fields and enforces strict schema", () => {
    const row = {
      legalName: "Test Name",
      jurisdictionCountry: "PL",
      contactEmail: "foo@bar.com",
      companyName: "Foo Bar",
      websiteUrl: "foo.com",
      logoUrl: "logo.jpg"
    };

    const snapshot = buildLegalIdentitySnapshot(row);
    assert.strictEqual(snapshot.legalName, "Test Name");
    assert.strictEqual(snapshot.jurisdictionCountry, "PL");

    // Ensure contactEmail, companyName, websiteUrl, logoUrl are omitted
    assert.strictEqual("contactEmail" in snapshot, false);
    assert.strictEqual("companyName" in snapshot, false);
    assert.strictEqual("websiteUrl" in snapshot, false);
    assert.strictEqual("logoUrl" in snapshot, false);
  });

  test("Tax builder omits non-canonical and PII fields", () => {
    const snapshot = buildTaxIdentifierSnapshot({
      identifierType: "VAT",
      countryCode: "PL",
      identifierValue: "PL1234567890",
      contactEmail: "private@example.com",
      legalName: "Excluded company name",
    });

    assert.deepStrictEqual(snapshot, {
      identifierType: "VAT",
      countryCode: "PL",
      identifierValue: "PL1234567890",
    });
    assert.strictEqual("contactEmail" in snapshot, false);
    assert.strictEqual("legalName" in snapshot, false);
  });

  test("Registry builder omits non-canonical and PII fields", () => {
    const snapshot = buildRegistryIdentifierSnapshot({
      registryType: "KRS",
      jurisdictionCountry: "PL",
      registryValue: "0000123456",
      contactEmail: "private@example.com",
      registeredAddressLine1: "Excluded address",
    });

    assert.deepStrictEqual(snapshot, {
      registryType: "KRS",
      jurisdictionCountry: "PL",
      registryValue: "0000123456",
    });
    assert.strictEqual("contactEmail" in snapshot, false);
    assert.strictEqual("registeredAddressLine1" in snapshot, false);
  });
});
