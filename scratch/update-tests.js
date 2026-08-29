const fs = require('fs');
let txt = fs.readFileSync('tests/partners/admin-partner-create.test.ts', 'utf8');

txt = txt.replace(
  "import { adminPartnerCreateSchema } from '@/lib/admin/partners-create';",
  "import { adminPartnerCreateSchema, createPartnerCore } from '@/lib/admin/partners-create';"
);

txt += `

test('VALIDATION_RESULT_01_INVALID_EMAIL', async () => {
  const result = await createPartnerCore(null as any, { companyName: 'Acme Corp', contactEmail: 'not-an-email' });
  assert.deepStrictEqual(result, { ok: false, reason: 'PARTNER_INVALID_INPUT', code: 'INVALID_EMAIL' });
});

test('VALIDATION_RESULT_02_INVALID_WEBSITE', async () => {
  const result = await createPartnerCore(null as any, { companyName: 'Acme Corp', contactEmail: 'admin@acme.test', websiteUrl: 'not-a-url' });
  assert.deepStrictEqual(result, { ok: false, reason: 'PARTNER_INVALID_INPUT', code: 'INVALID_WEBSITE' });
});

test('VALIDATION_RESULT_03_MISSING_COMPANY', async () => {
  const result = await createPartnerCore(null as any, { contactEmail: 'admin@acme.test' });
  assert.deepStrictEqual(result, { ok: false, reason: 'PARTNER_INVALID_INPUT', code: 'MISSING_COMPANY_NAME' });
});

test('VALIDATION_RESULT_04_PLAIN_SERIALIZABLE_CONTRACT', async () => {
  const result = await createPartnerCore(null as any, { contactEmail: 'admin@acme.test' });
  assert.strictEqual(JSON.stringify(result), '{"ok":false,"reason":"PARTNER_INVALID_INPUT","code":"MISSING_COMPANY_NAME"}');
});
`;

fs.writeFileSync('tests/partners/admin-partner-create.test.ts', txt);
