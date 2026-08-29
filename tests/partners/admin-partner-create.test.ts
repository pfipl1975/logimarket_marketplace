import test from 'node:test';
import assert from 'node:assert';
import { adminPartnerCreateSchema, parseAdminPartnerCreateInput } from '@/lib/admin/partners-create';

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

test('PARTNER_VALIDATION_01', () => {
  const result = parseAdminPartnerCreateInput({ contactEmail: 'admin@acme.test' });
  assert.deepStrictEqual(result, { ok: false, code: 'MISSING_COMPANY_NAME' });
});

test('PARTNER_VALIDATION_02', () => {
  const result = parseAdminPartnerCreateInput({ companyName: null, contactEmail: 'admin@acme.test' });
  assert.deepStrictEqual(result, { ok: false, code: 'MISSING_COMPANY_NAME' });
});

test('PARTNER_VALIDATION_03', () => {
  const result = parseAdminPartnerCreateInput({ companyName: 123, contactEmail: 'admin@acme.test' });
  assert.deepStrictEqual(result, { ok: false, code: 'MISSING_COMPANY_NAME' });
});

test('PARTNER_VALIDATION_04', () => {
  const result = parseAdminPartnerCreateInput({ companyName: 'Acme Corp' });
  assert.deepStrictEqual(result, { ok: false, code: 'MISSING_EMAIL' });
});

test('PARTNER_VALIDATION_05', () => {
  const result = parseAdminPartnerCreateInput({ companyName: 'Acme Corp', contactEmail: null });
  assert.deepStrictEqual(result, { ok: false, code: 'MISSING_EMAIL' });
});

test('PARTNER_VALIDATION_06', () => {
  const result = parseAdminPartnerCreateInput({ companyName: 'Acme Corp', contactEmail: 'not-an-email' });
  assert.deepStrictEqual(result, { ok: false, code: 'INVALID_EMAIL' });
});

test('PARTNER_VALIDATION_07', () => {
  const result = parseAdminPartnerCreateInput({ companyName: 'a'.repeat(256), contactEmail: 'admin@acme.test' });
  assert.deepStrictEqual(result, { ok: false, code: 'COMPANY_NAME_TOO_LONG' });
});

test('PARTNER_VALIDATION_08', () => {
  const result = parseAdminPartnerCreateInput({ companyName: 'Acme Corp', contactEmail: 'a'.repeat(91) + '@acme.test' });
  assert.deepStrictEqual(result, { ok: false, code: 'EMAIL_TOO_LONG' });
});

test('PARTNER_VALIDATION_09', () => {
  const result = parseAdminPartnerCreateInput({ companyName: 'Acme Corp', contactEmail: 'admin@acme.test', websiteUrl: 'not-a-url' });
  assert.deepStrictEqual(result, { ok: false, code: 'INVALID_WEBSITE' });
});

test('PARTNER_VALIDATION_10', () => {
  const result = parseAdminPartnerCreateInput(null);
  assert.deepStrictEqual(result, { ok: false, code: 'INVALID_INPUT' });
});

test('PARTNER_VALIDATION_11', () => {
  const result = parseAdminPartnerCreateInput('primitive');
  assert.deepStrictEqual(result, { ok: false, code: 'INVALID_INPUT' });
});

test('PARTNER_VALIDATION_12', () => {
  const result = parseAdminPartnerCreateInput(null);
  assert.strictEqual(JSON.stringify(result), '{"ok":false,"code":"INVALID_INPUT"}');
});

test('PARTNER_VALIDATION_13', () => {
  const allowed = [
    "INVALID_INPUT",
    "MISSING_COMPANY_NAME",
    "COMPANY_NAME_TOO_LONG",
    "MISSING_EMAIL",
    "EMAIL_TOO_LONG",
    "INVALID_EMAIL",
    "INVALID_WEBSITE"
  ];
  const r1 = parseAdminPartnerCreateInput(null);
  const r2 = parseAdminPartnerCreateInput({ contactEmail: 'x' });
  const r3 = parseAdminPartnerCreateInput({ companyName: 'x' });
  const r4 = parseAdminPartnerCreateInput({ companyName: 'x', contactEmail: 'x' });
  const r5 = parseAdminPartnerCreateInput({ companyName: 'a'.repeat(300), contactEmail: 'x@x.com' });
  const r6 = parseAdminPartnerCreateInput({ companyName: 'x', contactEmail: 'x'.repeat(200) + '@x.com' });
  const r7 = parseAdminPartnerCreateInput({ companyName: 'x', contactEmail: 'x@x.com', websiteUrl: 'x' });

  [r1, r2, r3, r4, r5, r6, r7].forEach(res => {
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.ok(allowed.includes(res.code));
  });
});
