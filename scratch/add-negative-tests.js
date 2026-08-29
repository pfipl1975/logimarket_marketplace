const fs = require('fs');
let content = fs.readFileSync('tests/database/runtime-migration-classification.test.ts', 'utf-8');

const additionalTests = `
test("TARGET_POST_0004_MINUS_COLUMN", () => {
  const actual = buildSide(PRODUCTION_FINGERPRINT);
  actual["seller_legal_identities"].columns = actual["seller_legal_identities"].columns.filter(c => c.name !== "registered_address_line1");
  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET_POST_0004_WRONG_TYPE", () => {
  const actual = buildSide(PRODUCTION_FINGERPRINT);
  const colIdx = actual["seller_legal_identities"].columns.findIndex(c => c.name === "registered_address_line1");
  actual["seller_legal_identities"].columns[colIdx].type = "character varying(254)";
  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET_POST_0004_WRONG_NULLABILITY", () => {
  const actual = buildSide(PRODUCTION_FINGERPRINT);
  const colIdx = actual["seller_legal_identities"].columns.findIndex(c => c.name === "registered_address_line1");
  actual["seller_legal_identities"].columns[colIdx].nullable = false;
  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET_POST_0004_UNEXPECTED_DEFAULT", () => {
  const actual = buildSide(PRODUCTION_FINGERPRINT);
  const colIdx = actual["seller_legal_identities"].columns.findIndex(c => c.name === "registered_address_line1");
  actual["seller_legal_identities"].columns[colIdx].defaultVal = "'x'::character varying";
  const result = classifyRuntimeTarget(actual, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});
`;

content = content.replace(/test\("TARGET_POST_0004_MINUS_COLUMN", \(\) => {[\s\S]*?}\);/, additionalTests.trim());
fs.writeFileSync('tests/database/runtime-migration-classification.test.ts', content);
