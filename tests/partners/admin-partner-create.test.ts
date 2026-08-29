import test from 'node:test';
import assert from 'node:assert';
import { adminPartnerCreateSchema } from '@/lib/admin/partners-create';

test('PARTNER_CREATE_01_VALID_REQUIRED_FIELDS', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'Acme Corp',
    contactEmail: 'admin@acme.test',
  });
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.companyName, 'Acme Corp');
    assert.strictEqual(result.data.contactEmail, 'admin@acme.test');
    assert.strictEqual(result.data.websiteUrl, null);
  }
});

test('PARTNER_CREATE_02_VALID_WITH_WEBSITE', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'Acme Corp',
    contactEmail: 'admin@acme.test',
    websiteUrl: 'https://acme.test',
  });
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.websiteUrl, 'https://acme.test');
  }
});

test('PARTNER_CREATE_03_COMPANY_NAME_TRIMMED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: '   Acme Corp   ',
    contactEmail: 'admin@acme.test',
  });
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.companyName, 'Acme Corp');
  }
});

test('PARTNER_CREATE_04_EMAIL_TRIMMED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'Acme Corp',
    contactEmail: ' admin@acme.test  ',
  });
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.contactEmail, 'admin@acme.test');
  }
});

test('PARTNER_CREATE_05_MISSING_COMPANY_REJECTED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    contactEmail: 'admin@acme.test',
  });
  assert.strictEqual(result.success, false);
});

test('PARTNER_CREATE_06_WHITESPACE_COMPANY_REJECTED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: '   ',
    contactEmail: 'admin@acme.test',
  });
  assert.strictEqual(result.success, false);
});

test('PARTNER_CREATE_07_MISSING_EMAIL_REJECTED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'Acme Corp',
  });
  assert.strictEqual(result.success, false);
});

test('PARTNER_CREATE_08_INVALID_EMAIL_REJECTED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'Acme Corp',
    contactEmail: 'not-an-email',
  });
  assert.strictEqual(result.success, false);
});

test('PARTNER_CREATE_09_COMPANY_TOO_LONG_REJECTED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'a'.repeat(256),
    contactEmail: 'admin@acme.test',
  });
  assert.strictEqual(result.success, false);
});

test('PARTNER_CREATE_10_EMAIL_TOO_LONG_REJECTED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'Acme Corp',
    contactEmail: 'a'.repeat(91) + '@acme.test',
  });
  assert.strictEqual(result.success, false);
});

test('PARTNER_CREATE_11_EMPTY_WEBSITE_NORMALIZES_NULL', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'Acme Corp',
    contactEmail: 'admin@acme.test',
    websiteUrl: '   ',
  });
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.websiteUrl, null);
  }
});

test('PARTNER_CREATE_12_INVALID_WEBSITE_REJECTED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'Acme Corp',
    contactEmail: 'admin@acme.test',
    websiteUrl: 'not-a-url',
  });
  assert.strictEqual(result.success, false);
});

test('PARTNER_CREATE_13_HTTPS_WEBSITE_ACCEPTED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'Acme Corp',
    contactEmail: 'admin@acme.test',
    websiteUrl: 'https://acme.test',
  });
  assert.strictEqual(result.success, true);
});

test('PARTNER_CREATE_14_HTTP_WEBSITE_ACCEPTED', () => {
  const result = adminPartnerCreateSchema.safeParse({
    companyName: 'Acme Corp',
    contactEmail: 'admin@acme.test',
    websiteUrl: 'http://acme.test',
  });
  assert.strictEqual(result.success, true);
});

