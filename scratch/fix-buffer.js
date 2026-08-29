const fs = require('fs');
let content = fs.readFileSync('tests/database/runtime-migration-engine.test.ts', 'utf-8');

content = content.replace(
  /Buffer\.from\(""\)/g,
  'Buffer.from("SELECT 1;")'
);

fs.writeFileSync('tests/database/runtime-migration-engine.test.ts', content);
