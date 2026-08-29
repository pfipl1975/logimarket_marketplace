const fs = require('fs');
let content = fs.readFileSync('tests/database/seller-registered-address-runtime-migration.test.ts', 'utf-8');

const regexAssert = `
    const addColMatches = [...sql.matchAll(/\\bADD\\s+COLUMN\\b/gi)];
    assert.strictEqual(addColMatches.length, 6, "Exactly 6 ADD COLUMN statements allowed");
`;
content = content.replace('// Exact 6 columns', regexAssert + '\n    // Exact 6 columns');
fs.writeFileSync('tests/database/seller-registered-address-runtime-migration.test.ts', content);
