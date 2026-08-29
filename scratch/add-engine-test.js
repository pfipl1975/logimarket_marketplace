const fs = require('fs');
let content = fs.readFileSync('tests/database/runtime-migration-engine.test.ts', 'utf-8');

const driftTest = `
test("RUNNER_POST0003_STAYS_POST0003_BLOCK: post-check fails if POST_0003 migration doesn't reach POST_0004", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; }; // Does not change schema
  
  // Use runnerRouter("PREVIOUS") which simulates MIGRATABLE_POST_0003
  const { state, factory } = fakeRunnerPool(runnerRouter("PREVIOUS"));
  const env = Object.assign(emptyEnv(), {
    DB_WRITES_ALLOWED_TO_DEV: "YES",
    ENVIRONMENT_OVERRIDE: "DEV"
  });

  await assert.rejects(
    async () => runMigrations(
      env,
      factory,
      fakeMigrate as never,
      (() => [
        { folderMillis: 1785589560000, hash: "" },
        { folderMillis: 1785590000000, hash: "" },
        { folderMillis: 1785590500000, hash: "" },
        { folderMillis: 1785591000000, hash: "" },
        { folderMillis: 1785591500000, hash: "" }
      ]) as never,
      (() => ({
        text: "{}",
        parsed: {
          entries: [
            { tag: "0000_production_runtime_baseline", when: 1785589560000 },
            { tag: "0001_rfq_workflow_hardening", when: 1785590000000 },
            { tag: "0002_seller_identity_56b1", when: 1785590500000 },
            { tag: "0003_prod_legacy_offer_reconciliation", when: 1785591000000 },
            { tag: "0004_seller_registered_address", when: 1785591500000 }
          ]
        }
      })) as never,
      (() => Buffer.from("")) as never
    ),
    /post-check failed/
  );
  
  assert.strictEqual(migrateCallCount, 1, "migrateFn must be called exactly once");
  assert.ok(state.ended, "pool must be closed");
});
`;

content = content.replace(/test\("RUNNER_POSTCHECK_DRIFT_TEST[\s\S]*?}\);/, match => match + '\n' + driftTest);
fs.writeFileSync('tests/database/runtime-migration-engine.test.ts', content);
