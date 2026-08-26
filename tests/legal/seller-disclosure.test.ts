import { describe, test } from 'node:test';
import assert from 'node:assert';
import { buildSellerDisclosure } from '../../src/lib/legal/seller-disclosure';

describe('Seller Disclosure Completeness Logic', () => {
  const defaultRegisteredOffice = {
    addressLine1: 'Main St 10',
    addressLine2: 'Apt 1',
    postalCode: '00-001',
    city: 'Warsaw',
    region: 'Mazowieckie',
    countryCode: 'PL'
  };

  const defaultTaxIdentifiers = [{ type: 'VAT', value: 'PL1234567890', countryCode: 'PL' }];

  test('returns complete when all required fields are present', () => {
    const disclosure = buildSellerDisclosure(
      1,
      'Test Company Sp. z o.o.',
      'contact@test.com',
      defaultRegisteredOffice,
      defaultTaxIdentifiers
    );
    assert.strictEqual(disclosure.completeness.complete, true);
    assert.strictEqual(disclosure.completeness.missing.length, 0);
  });

  test('returns incomplete when legal_name is missing', () => {
    const disclosure = buildSellerDisclosure(
      1,
      null, // Missing SellerLegalIdentity name
      'contact@test.com',
      defaultRegisteredOffice,
      defaultTaxIdentifiers
    );
    assert.strictEqual(disclosure.completeness.complete, false);
    assert.deepStrictEqual(disclosure.completeness.missing, ['legal_name']);
    // verify it resolves to null, not invented
    assert.strictEqual(disclosure.legalName, null);
  });

  test('returns incomplete when business_email is missing', () => {
    const disclosure = buildSellerDisclosure(
      1,
      'Company Name',
      '   ', // Whitespace-only values treated missing
      defaultRegisteredOffice,
      defaultTaxIdentifiers
    );
    assert.strictEqual(disclosure.completeness.complete, false);
    assert.deepStrictEqual(disclosure.completeness.missing, ['business_email']);
    assert.strictEqual(disclosure.businessEmail, null);
  });

  test('returns incomplete when registered_address_line1 is missing', () => {
    const disclosure = buildSellerDisclosure(
      1,
      'Company',
      'a@b.com',
      { ...defaultRegisteredOffice, addressLine1: '   ' },
      defaultTaxIdentifiers
    );
    assert.strictEqual(disclosure.completeness.complete, false);
    assert.deepStrictEqual(disclosure.completeness.missing, ['registered_address_line1']);
  });

  test('returns incomplete when registered_postal_code is missing', () => {
    const disclosure = buildSellerDisclosure(
      1,
      'Company',
      'a@b.com',
      { ...defaultRegisteredOffice, postalCode: null },
      defaultTaxIdentifiers
    );
    assert.strictEqual(disclosure.completeness.complete, false);
    assert.deepStrictEqual(disclosure.completeness.missing, ['registered_postal_code']);
  });

  test('returns incomplete when registered_city is missing', () => {
    const disclosure = buildSellerDisclosure(
      1,
      'Company',
      'a@b.com',
      { ...defaultRegisteredOffice, city: '' },
      defaultTaxIdentifiers
    );
    assert.strictEqual(disclosure.completeness.complete, false);
    assert.deepStrictEqual(disclosure.completeness.missing, ['registered_city']);
  });

  test('returns incomplete when registered_country_code is missing', () => {
    const disclosure = buildSellerDisclosure(
      1,
      'Company',
      'a@b.com',
      { ...defaultRegisteredOffice, countryCode: null },
      defaultTaxIdentifiers
    );
    assert.strictEqual(disclosure.completeness.complete, false);
    assert.deepStrictEqual(disclosure.completeness.missing, ['registered_country_code']);
  });

  test('returns incomplete when tax_identifier is missing', () => {
    const disclosure = buildSellerDisclosure(
      1,
      'Company',
      'a@b.com',
      defaultRegisteredOffice,
      []
    );
    assert.strictEqual(disclosure.completeness.complete, false);
    assert.deepStrictEqual(disclosure.completeness.missing, ['tax_identifier']);
  });

  test('addressLine2 and region absent does NOT block completeness', () => {
    const disclosure = buildSellerDisclosure(
      1,
      'Company',
      'a@b.com',
      { ...defaultRegisteredOffice, addressLine2: null, region: '  ' },
      defaultTaxIdentifiers
    );
    assert.strictEqual(disclosure.completeness.complete, true);
    assert.strictEqual(disclosure.registeredOffice.addressLine2, null);
    assert.strictEqual(disclosure.registeredOffice.region, null);
  });

  test('multiple tax identifiers preserved deterministically', () => {
    const multipleTaxIds = [
      { type: 'VAT', value: 'PL1234567890', countryCode: 'PL' },
      { type: 'KRS', value: '0000123456', countryCode: 'PL' }
    ];
    const disclosure = buildSellerDisclosure(
      1,
      'Company',
      'a@b.com',
      defaultRegisteredOffice,
      multipleTaxIds
    );
    assert.strictEqual(disclosure.completeness.complete, true);
    assert.strictEqual(disclosure.taxIdentifiers.length, 2);
    assert.strictEqual(disclosure.taxIdentifiers[1].type, 'KRS');
  });

  test('public DTO contains no verification metadata', () => {
    const disclosure = buildSellerDisclosure(
      1,
      'Company',
      'a@b.com',
      defaultRegisteredOffice,
      defaultTaxIdentifiers
    );

    // Check that properties don't exist on the type or object
    const obj = disclosure as Record<string, unknown>;
    assert.strictEqual(obj.verificationSource, undefined);
    assert.strictEqual(obj.verificationReference, undefined);
    assert.strictEqual(obj.verifiedAt, undefined);
  });
});
