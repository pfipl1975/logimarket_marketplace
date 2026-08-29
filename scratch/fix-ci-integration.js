const fs = require('fs');
let content = fs.readFileSync('tests/database/ci-integration.test.ts', 'utf-8');

// 1. Fix 0004 PROOF
const badProofCode = `
      // 0004 PROOF
      const sellerCols = fingerprint["seller_legal_identities"].columns;
      assert.ok(sellerCols["registered_address_line1"]);
      assert.ok(sellerCols["registered_address_line2"]);
      assert.ok(sellerCols["registered_postal_code"]);
      assert.ok(sellerCols["registered_city"]);
      assert.ok(sellerCols["registered_region"]);
      assert.ok(sellerCols["registered_country_code"]);
`;
const newProofCode = `
      // 0004 PROOF
      const sellerColumnNames = new Set(
        fingerprint["seller_legal_identities"].columns.map((column) => column.name),
      );
      assert.ok(sellerColumnNames.has("registered_address_line1"));
      assert.ok(sellerColumnNames.has("registered_address_line2"));
      assert.ok(sellerColumnNames.has("registered_postal_code"));
      assert.ok(sellerColumnNames.has("registered_city"));
      assert.ok(sellerColumnNames.has("registered_region"));
      assert.ok(sellerColumnNames.has("registered_country_code"));
`;
content = content.replace(badProofCode.trim(), newProofCode.trim());

// 2. Fix diskMigrations.length
content = content.replace(
  'diskMigrations.length,\n          4,\n          "Disk migrations should have 4 files"',
  'diskMigrations.length,\n          5,\n          "Disk migrations should have 5 files"'
);
content = content.replace(
  'diskMigrations.length,\r\n          4,\r\n          "Disk migrations should have 4 files"',
  'diskMigrations.length,\r\n          5,\r\n          "Disk migrations should have 5 files"'
);
// Catch all regex if the above exact match fails due to whitespace
content = content.replace(/diskMigrations\.length,\s*4,\s*"Disk migrations should have 4 files"/, 'diskMigrations.length,\n          5,\n          "Disk migrations should have 5 files"');

// 3. Fix Journal check comments
content = content.replace(/\/\/ Journal check: 4 rows/g, '// Journal check: 5 rows');

// 4. Fix PATH B title
content = content.replace('PATH B: CURRENT POST-0002 -> 0003 ONLY', 'PATH B: CURRENT POST-0002 -> 0003 -> 0004');

fs.writeFileSync('tests/database/ci-integration.test.ts', content);
