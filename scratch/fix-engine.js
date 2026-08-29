const fs = require('fs');
let content = fs.readFileSync('tests/database/runtime-migration-engine.test.ts', 'utf-8');

content = content.replace(
  'const { state, factory } = fakeRunnerPool(runnerRouter("PREVIOUS"));',
  'const { state, factory } = fakeRunnerPool(runnerRouter("PREVIOUS", PREVIOUS_PRODUCTION_FINGERPRINT));'
);

fs.writeFileSync('tests/database/runtime-migration-engine.test.ts', content);
