const fs = require('fs');
let content = fs.readFileSync('tests/database/runtime-migration-engine.test.ts', 'utf-8');

content = content.replace(
  '{ folderMillis: 1785589560000, hash: "" },',
  '{ folderMillis: 1785589560000, hash: FAKE_HASH },'
).replace(
  '{ folderMillis: 1785590000000, hash: "" },',
  '{ folderMillis: 1785590000000, hash: FAKE_HASH },'
).replace(
  '{ folderMillis: 1785590500000, hash: "" },',
  '{ folderMillis: 1785590500000, hash: FAKE_HASH },'
).replace(
  '{ folderMillis: 1785591000000, hash: "" },',
  '{ folderMillis: 1785591000000, hash: FAKE_HASH },'
).replace(
  '{ folderMillis: 1785591500000, hash: "" }',
  '{ folderMillis: 1785591500000, hash: FAKE_HASH }'
);

fs.writeFileSync('tests/database/runtime-migration-engine.test.ts', content);
