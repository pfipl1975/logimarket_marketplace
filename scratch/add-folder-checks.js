const fs = require('fs');
let content = fs.readFileSync('tests/database/runtime-migration-folder.test.ts', 'utf-8');

const additionalChecks = `
  assert.strictEqual(journal.entries.length, 5);
  for (let i = 0; i < 5; i++) {
    assert.strictEqual(journal.entries[i].idx, i, "idx must be sequential");
    if (i > 0) {
      assert.ok(journal.entries[i].when > journal.entries[i - 1].when, "timestamps must be strictly increasing");
    }
  }
`;

content = content.replace('assert.strictEqual(journal.entries.length, 5);', additionalChecks);
fs.writeFileSync('tests/database/runtime-migration-folder.test.ts', content);
