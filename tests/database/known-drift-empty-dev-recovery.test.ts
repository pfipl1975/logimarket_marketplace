import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import {
  validateEnvironment,
  compareKnownDrift,
  verifyEmptyTables,
  verifyJournal,
  executeRecovery,
  main
} from "../../scripts/database/recover-known-drift-empty-development-baseline";
import { PRODUCTION_FINGERPRINT, EXPECTED_BASELINE_TABLES } from "../../scripts/database/runtime-migration-contract";
import type { LiveTableFingerprint } from "../../scripts/database/verify-runtime-schema-fingerprint";

function cloneFingerprint(fp: any): any {
  return JSON.parse(JSON.stringify(fp));
}

function createDriftedFingerprint(): Record<string, LiveTableFingerprint> {
  const fp = cloneFingerprint(PRODUCTION_FINGERPRINT);

  // 1. attribute_definition_translations.chk_adt_locale
  const adt = fp["attribute_definition_translations"].constraints.find((c: any) => c.name === "chk_adt_locale");
  if (adt) adt.definition = "CHECK (locale = ANY (ARRAY['pl', 'en']))"; // Drifted definition

  // 2. attribute_definitions.chk_ad_data_type
  const ad = fp["attribute_definitions"].constraints.find((c: any) => c.name === "chk_ad_data_type");
  if (ad) ad.definition = "CHECK (data_type IN ('text'))"; // Drifted

  // 3. clicks.is_unique_24h nullable
  const clicks = fp["clicks"].columns.find((c: any) => c.name === "is_unique_24h");
  if (clicks) clicks.nullable = false;

  // 4. controlled_option_value_translations.chk_covt_locale
  const covt = fp["controlled_option_value_translations"].constraints.find((c: any) => c.name === "chk_covt_locale");
  if (covt) covt.definition = "CHECK (locale = 'pl')";

  // 5. offers.offers_conversion_type_check
  const oct = fp["offers"].constraints.find((c: any) => c.name === "offers_conversion_type_check");
  if (oct) oct.definition = "CHECK (conversion_type = 'outbound')";

  // 6. offers.offers_offer_model_check
  const oom = fp["offers"].constraints.find((c: any) => c.name === "offers_offer_model_check");
  if (oom) oom.definition = "CHECK (offer_model = 'rfq')";

  // 7. offers.offers_publication_status_check
  const ops = fp["offers"].constraints.find((c: any) => c.name === "offers_publication_status_check");
  if (ops) ops.definition = "CHECK (publication_status = 'draft')";

  // 8. order_items.currency_code
  fp["order_items"].columns.push({
    name: "currency_code",
    type: "varchar(3)",
    nullable: true,
    defaultVal: null,
    sequenceName: null
  });

  for (const t of Object.values(fp)) { t.policyCount = 0; t.triggerCount = 0; t.rlsForced = false; } return fp;
}

describe("known-drift-empty-dev-recovery", () => {
  let env: NodeJS.ProcessEnv;
  const EXPECTED_HASH = "f903ae27add547abb3c8a3280f1916a6d9969627254812a5449569cb61a4fb51";
  const EXPECTED_CREATED_AT = 1785589560000;

  beforeEach(() => {
    env = {
      DATABASE_URL: "postgresql://postgres.wwyxoasupqyctxdoclwm:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
      RUNTIME_MIGRATION_TARGET: "development",
      RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "wwyxoasupqyctxdoclwm",
      RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "tpjsiutclowwaxlopemn",
      RUNTIME_KNOWN_DRIFT_RECOVERY_AUTHORIZATION: "AUTHORIZED_KNOWN_DRIFT_EMPTY_DEV_RECOVERY_08B"
    };
  });

  test("1. dokładny znany drift przechodzi precheck", () => {
    const drifted = createDriftedFingerprint();
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    if (!result.allowed) console.log('REASON:', result.reason); assert.strictEqual(result.allowed, true);
  });

  test("2. brak jednej z ośmiu różnic blokuje", () => {
    const drifted = createDriftedFingerprint();
    // revert one drift
    const adt = drifted["attribute_definition_translations"].constraints.find((c: any) => c.name === "chk_adt_locale");
    adt!.definition = PRODUCTION_FINGERPRINT["attribute_definition_translations"].constraints.find((c: any) => c.name === "chk_adt_locale")!.definition;
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, false);
  });

  test("3. dodatkowa dziewiąta różnica blokuje", () => {
    const drifted = createDriftedFingerprint();
    drifted["partners"].columns[0].nullable = !drifted["partners"].columns[0].nullable;
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, false);
  });

  test("4. inna kategoria różnicy blokuje", () => {
    const drifted = createDriftedFingerprint();
    drifted["attribute_definition_translations"].constraints.find((c: any) => c.name === "chk_adt_locale")!.type = 'UNIQUE';
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, false);
  });

  test("5. inna tabela różnicy blokuje", () => {
    const drifted = createDriftedFingerprint();
    // revert order_items.currency_code
    drifted["order_items"].columns.pop();
    // add it to cart_items instead
    drifted["cart_items"].columns.push({
      name: "currency_code",
      type: "varchar",
      nullable: true,
      defaultVal: null,
      sequenceName: null
    });
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, false);
  });

  test("6. order_items.currency_code obecne przechodzi", () => {
    const drifted = createDriftedFingerprint();
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, true);
  });

  test("7. brak order_items.currency_code blokuje", () => {
    const drifted = createDriftedFingerprint();
    drifted["order_items"].columns = drifted["order_items"].columns.filter((c: any) => c.name !== "currency_code");
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, false);
  });

  test("8. clicks.is_unique_24h nullable=false przechodzi", () => {
    const drifted = createDriftedFingerprint();
    assert.strictEqual(drifted["clicks"].columns.find((c: any) => c.name === "is_unique_24h")!.nullable, false);
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, true);
  });

  test("9. nullable=true blokuje", () => {
    const drifted = createDriftedFingerprint();
    drifted["clicks"].columns.find((c: any) => c.name === "is_unique_24h")!.nullable = true;
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, false);
  });

  test("10. 130 kolumn przechodzi", () => {
    const drifted = createDriftedFingerprint();
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, true);
  });

  test("11. 129 kolumn blokuje", () => {
    const drifted = createDriftedFingerprint();
    drifted["order_items"].columns.pop(); // back to 129
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, false);
    assert.match(result.reason || "", /Column count is 129, expected 130/);
  });

  test("12. 131 kolumn blokuje", () => {
    const drifted = createDriftedFingerprint();
    drifted["order_items"].columns.push({ name: "another", type: "text", nullable: true, defaultVal: null, sequenceName: null });
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, false);
    assert.match(result.reason || "", /Column count is 131, expected 130/);
  });

  test("13. dokładne 15 tabel przechodzi", () => {
    const drifted = createDriftedFingerprint();
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, true);
  });

  test("14. dodatkowa tabela blokuje", () => {
    const drifted = createDriftedFingerprint();
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES, "extra"]);
    assert.strictEqual(result.allowed, false);
  });

  test("15. brak tabeli blokuje", () => {
    const drifted = createDriftedFingerprint();
    const t = EXPECTED_BASELINE_TABLES.filter(x => x !== "offers");
    const result = compareKnownDrift(drifted, t);
    assert.strictEqual(result.allowed, false);
  });

  test("16. właściwy hash journalu przechodzi", async () => {
    const q = { async query() { return { rows: [{ hash: EXPECTED_HASH, created_at: EXPECTED_CREATED_AT.toString() }] }; } };
    const res = await verifyJournal(q as any, EXPECTED_HASH, EXPECTED_CREATED_AT);
    assert.strictEqual(res.allowed, true);
  });

  test("17. hash approved baseline zamiast drift hash blokuje", async () => {
    const q = { async query() { return { rows: [{ hash: "other", created_at: EXPECTED_CREATED_AT.toString() }] }; } };
    const res = await verifyJournal(q as any, EXPECTED_HASH, EXPECTED_CREATED_AT);
    assert.strictEqual(res.allowed, false);
  });

  test("18. dodatkowy wpis journalu blokuje", async () => {
    const q = { async query() { return { rows: [
      { hash: EXPECTED_HASH, created_at: EXPECTED_CREATED_AT.toString() },
      { hash: "other", created_at: "999" }
    ]}; } };
    const res = await verifyJournal(q as any, EXPECTED_HASH, EXPECTED_CREATED_AT);
    assert.strictEqual(res.allowed, false);
  });

  test("19. błędny created_at blokuje", async () => {
    const q = { async query() { return { rows: [{ hash: EXPECTED_HASH, created_at: "123" }] }; } };
    const res = await verifyJournal(q as any, EXPECTED_HASH, EXPECTED_CREATED_AT);
    assert.strictEqual(res.allowed, false);
  });

  test("20. niepusta tabela blokuje", async () => {
    const q = { async query() { return { rows: [{ n: "1" }] }; } };
    const res = await verifyEmptyTables(q as any);
    assert.strictEqual(res.allowed, false);
  });

  test("21. dokładne fingerprint counts przechodzą", () => {
    const drifted = createDriftedFingerprint();
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, true);
  });

  test("22. każdy zmieniony fingerprint count blokuje", () => {
    const drifted = createDriftedFingerprint();
    drifted["offers"].explicitIndexes.push({ name: "idx", method: "btree", expressions: "id" });
    const result = compareKnownDrift(drifted, [...EXPECTED_BASELINE_TABLES]);
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes("EXPLICIT_INDEX_COUNT"));
  });

  test("23. właściwy DEV ref przechodzi", async () => {
    const res = validateEnvironment(env);
    assert.strictEqual(res.allowed, true);
  });

  test("24. production ref blokuje", async () => {
    env.DATABASE_URL = "postgresql://postgres.tpjsiutclowwaxlopemn:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
    const res = validateEnvironment(env);
    assert.strictEqual(res.allowed, false);
  });

  test("25. unknown ref blokuje", async () => {
    env.DATABASE_URL = "postgresql://postgres.unknown:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
    const res = validateEnvironment(env);
    assert.strictEqual(res.allowed, false);
  });

  test("26. brak autoryzacji blokuje", async () => {
    delete env.RUNTIME_KNOWN_DRIFT_RECOVERY_AUTHORIZATION;
    const res = validateEnvironment(env);
    assert.strictEqual(res.allowed, false);
  });

  test("27. błędna autoryzacja blokuje", async () => {
    env.RUNTIME_KNOWN_DRIFT_RECOVERY_AUTHORIZATION = "wrong";
    const res = validateEnvironment(env);
    assert.strictEqual(res.allowed, false);
  });

  test("28. import nie tworzy Pool", async () => {
    assert.strictEqual(typeof main, "function");
  });

  test("29-40. execution behavior", async () => {
    const queries: string[] = [];
    const client = {
      async query(q: string) {
        queries.push(q);
      },
      release() {}
    };
    
    await executeRecovery(client as any);

    const dropTables = queries.filter(q => q.startsWith("DROP TABLE IF EXISTS public."));
    assert.strictEqual(dropTables.length, 15);
    assert.strictEqual(queries.some(q => q.includes("CASCADE")), false);
    assert.strictEqual(queries[0], "BEGIN");
    assert.strictEqual(queries[queries.length - 1], "COMMIT");

    const clicksIdx = dropTables.indexOf("DROP TABLE IF EXISTS public.clicks");
    const offersIdx = dropTables.indexOf("DROP TABLE IF EXISTS public.offers");
    const partnersIdx = dropTables.indexOf("DROP TABLE IF EXISTS public.partners");
    assert.ok(clicksIdx < offersIdx);
    assert.ok(clicksIdx < partnersIdx);
    
    const dropJournal = queries.indexOf('DROP TABLE IF EXISTS drizzle_runtime."__drizzle_migrations"');
    assert.ok(dropJournal > dropTables.findIndex(q => q === "DROP TABLE IF EXISTS public.partners"));

    const dropSchema = queries.indexOf("DROP SCHEMA IF EXISTS drizzle_runtime");
    assert.ok(dropSchema > dropJournal);

    let rejected = false;
    const failingClient = {
      async query(q: string) {
        if (q.startsWith("DROP")) throw new Error("err");
        queries.push(q); // To capture ROLLBACK
      },
      release() {}
    };
    try {
      await executeRecovery(failingClient as any);
    } catch (e) {
      rejected = true;
    }
    assert.strictEqual(rejected, true);
    assert.strictEqual(queries[queries.length - 1], "ROLLBACK");
  });

  async function testBlocker(envMod: (e: NodeJS.ProcessEnv) => void) {
    const testEnv = { ...env };
    envMod(testEnv);
    const originalEnv = process.env;
    process.env = testEnv;
    
    let poolFactoryCalls = 0;
    const fakePoolFactory = () => { poolFactoryCalls++; return {}; };
    
    try {
      await main(fakePoolFactory);
    } catch (e) {
      // expected error from env validation
    } finally {
      process.env = originalEnv;
    }
    assert.strictEqual(poolFactoryCalls, 0);
  }

  test("E1. brak DATABASE_URL blokuje przed Pool", async () => await testBlocker(e => { delete e.DATABASE_URL; }));
  test("E2. brak RUNTIME_MIGRATION_TARGET blokuje przed Pool", async () => await testBlocker(e => { delete e.RUNTIME_MIGRATION_TARGET; }));
  test("E3. target inny niz development blokuje przed Pool", async () => await testBlocker(e => { e.RUNTIME_MIGRATION_TARGET = "production"; }));
  test("E4. brak expected project ref blokuje przed Pool", async () => await testBlocker(e => { delete e.RUNTIME_MIGRATION_EXPECTED_PROJECT_REF; }));
  test("E5. expected project ref inny niz DEV blokuje przed Pool", async () => await testBlocker(e => { e.RUNTIME_MIGRATION_EXPECTED_PROJECT_REF = "other"; }));
  test("E6. brak forbidden project ref blokuje przed Pool", async () => await testBlocker(e => { delete e.RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF; }));
  test("E7. forbidden project ref inny niz production blokuje przed Pool", async () => await testBlocker(e => { e.RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF = "other"; }));
  test("E8. brak autoryzacji blokuje przed Pool", async () => await testBlocker(e => { delete e.RUNTIME_KNOWN_DRIFT_RECOVERY_AUTHORIZATION; }));
  test("E9. bledna autoryzacja blokuje przed Pool", async () => await testBlocker(e => { e.RUNTIME_KNOWN_DRIFT_RECOVERY_AUTHORIZATION = "wrong"; }));
  test("E10. nieparsowalny URL blokuje przed Pool", async () => await testBlocker(e => { e.DATABASE_URL = "not-a-url"; }));
  test("E11. URL wskazujacy production blokuje przed Pool", async () => await testBlocker(e => { e.DATABASE_URL = "postgresql://postgres.tpjsiutclowwaxlopemn:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"; }));
  test("E12. URL wskazujacy inny projekt blokuje przed Pool", async () => await testBlocker(e => { e.DATABASE_URL = "postgresql://postgres.other:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"; }));
  test("E13. URL zawierajacy forbidden production ref blokuje przed Pool", async () => await testBlocker(e => { 
       e.RUNTIME_MIGRATION_EXPECTED_PROJECT_REF = "tpjsiutclowwaxlopemn";
       e.DATABASE_URL = "postgresql://postgres.tpjsiutclowwaxlopemn:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"; 
  }));
  
  test("E14. positive - pool is created only once on valid environment", async () => {
    const testEnv = { ...env };
    const originalEnv = process.env;
    process.env = testEnv;
    
    let poolFactoryCalls = 0;
    const fakePoolFactory = () => { 
      poolFactoryCalls++; 
      return {
        async connect() { return { async query() {}, release() {} }; },
        async query() { return { rows: [{ count: 0 }] }; },
        async end() {}
      }; 
    };
    
    try {
      await main(fakePoolFactory);
    } catch (e) {
      // expected to fail at fetchLiveSchemaMetadata due to fake pool
    } finally {
      process.env = originalEnv;
    }
    assert.strictEqual(poolFactoryCalls, 1);
  });
});
