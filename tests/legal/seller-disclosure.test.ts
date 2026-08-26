import { describe, test } from 'node:test';
import assert from 'node:assert';
import { evaluateCompleteness } from '../../src/lib/legal/seller-disclosure';

describe('Seller Disclosure Completeness Logic', () => {
  test('returns complete when all required fields are present', () => {
    const result = evaluateCompleteness(
      'Test Company Sp. z o.o.',
      'contact@test.com',
      {
        country: 'PL',
        city: 'Warsaw',
        postalCode: '00-001',
        street: 'Main St',
        building: '10',
        apartment: '1'
      },
      [{ type: 'VAT', value: 'PL1234567890', countryCode: 'PL' }]
    );
    assert.strictEqual(result.complete, true);
    assert.strictEqual(result.missing.length, 0);
  });

  test('returns incomplete when legalName is missing', () => {
    const result = evaluateCompleteness(
      '',
      'contact@test.com',
      {
        country: 'PL',
        city: 'Warsaw',
        postalCode: '00-001',
        street: 'Main St',
        building: '10',
        apartment: null
      },
      [{ type: 'VAT', value: 'PL1234567890', countryCode: 'PL' }]
    );
    assert.strictEqual(result.complete, false);
    assert.deepStrictEqual(result.missing, ['legalName']);
  });

  test('returns incomplete when businessEmail is missing', () => {
    const result = evaluateCompleteness(
      'Company Name',
      '   ',
      {
        country: 'PL',
        city: 'Warsaw',
        postalCode: '00-001',
        street: 'Main St',
        building: '10',
        apartment: null
      },
      [{ type: 'VAT', value: 'PL1234567890', countryCode: 'PL' }]
    );
    assert.strictEqual(result.complete, false);
    assert.deepStrictEqual(result.missing, ['businessEmail']);
  });

  test('returns incomplete when registeredOffice fields are missing', () => {
    const result = evaluateCompleteness(
      'Company',
      'a@b.com',
      {
        country: null,
        city: null,
        postalCode: null,
        street: null,
        building: null,
        apartment: null
      },
      [{ type: 'VAT', value: '123', countryCode: 'PL' }]
    );
    assert.strictEqual(result.complete, false);
    assert.ok(result.missing.includes('registeredOffice.country'));
    assert.ok(result.missing.includes('registeredOffice.city'));
    assert.ok(result.missing.includes('registeredOffice.postalCode'));
    assert.ok(result.missing.includes('registeredOffice.street'));
    assert.ok(result.missing.includes('registeredOffice.building'));
    // Apartment is optional, shouldn't be in missing.
    assert.ok(!result.missing.includes('registeredOffice.apartment'));
  });

  test('returns incomplete when taxIdentifiers are missing', () => {
    const result = evaluateCompleteness(
      'Company',
      'a@b.com',
      {
        country: 'PL',
        city: 'Warsaw',
        postalCode: '00-001',
        street: 'Main St',
        building: '10',
        apartment: null
      },
      []
    );
    assert.strictEqual(result.complete, false);
    assert.deepStrictEqual(result.missing, ['taxIdentifiers']);
  });

  test('returns incomplete with multiple missing fields', () => {
    const result = evaluateCompleteness(
      '',
      null,
      {
        country: 'PL',
        city: null,
        postalCode: '00-001',
        street: null,
        building: '10',
        apartment: null
      },
      []
    );
    assert.strictEqual(result.complete, false);
    assert.deepStrictEqual(result.missing, [
      'legalName',
      'businessEmail',
      'registeredOffice.city',
      'registeredOffice.street',
      'taxIdentifiers'
    ]);
  });
});
