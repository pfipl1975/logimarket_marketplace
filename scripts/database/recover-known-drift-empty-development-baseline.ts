/**
 * recover-known-drift-empty-development-baseline.ts
 *
 * One-time defensive recovery tool for a known drifted state on empty DEV.
 *
 * IMPORT SIDE-EFFECTS: NONE.
 */

import {
  normalizeProjectRef,
  EXPECTED_BASELINE_TABLES,
  RUNTIME_JOURNAL_SCHEMA,
  RUNTIME_JOURNAL_TABLE,
  PRODUCTION_FINGERPRINT
} from "./runtime-migration-contract";
import {
  fetchLiveSchemaMetadata,
  Queryable,
  LiveTableFingerprint
} from "./verify-runtime-schema-fingerprint";

export async function checkPreconditions(q: Queryable, env: NodeJS.ProcessEnv): Promise<{ allowed: boolean; reason?: string }> {
  if (env.RUNTIME_KNOWN_DRIFT_RECOVERY_AUTHORIZATION !== "AUTHORIZED_KNOWN_DRIFT_EMPTY_DEV_RECOVERY_08B") {
    return { allowed: false, reason: "Missing or invalid RUNTIME_KNOWN_DRIFT_RECOVERY_AUTHORIZATION" };
  }
  if (env.RUNTIME_MIGRATION_TARGET !== "development") {
    return { allowed: false, reason: "RUNTIME_MIGRATION_TARGET must be development" };
  }

  const expectedRef = env.RUNTIME_MIGRATION_EXPECTED_PROJECT_REF;
  const forbiddenRef = env.RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF;
  const url = env.DATABASE_URL;

  if (!expectedRef) return { allowed: false, reason: "Missing RUNTIME_MIGRATION_EXPECTED_PROJECT_REF" };
  if (!forbiddenRef) return { allowed: false, reason: "Missing RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF" };
  if (!url) return { allowed: false, reason: "Missing DATABASE_URL" };
  if (expectedRef === forbiddenRef) return { allowed: false, reason: "Expected ref equals forbidden ref" };

  const ref = normalizeProjectRef(url);
  if (!ref) return { allowed: false, reason: "Cannot parse project ref from DATABASE_URL" };
  if (ref !== expectedRef) return { allowed: false, reason: "DATABASE_URL does not point to expected DEV project ref" };
  if (ref === forbiddenRef) return { allowed: false, reason: "DATABASE_URL points to forbidden (production) ref" };

  return { allowed: true };
}

export function compareKnownDrift(fingerprint: Record<string, LiveTableFingerprint>, publicTables: string[]): { allowed: boolean; reason?: string } {
  if (publicTables.length !== 15) return { allowed: false, reason: "Table count must be exactly 15" };
  for (const t of EXPECTED_BASELINE_TABLES) {
    if (!publicTables.includes(t)) return { allowed: false, reason: `Missing table: ${t}` };
  }
  for (const t of publicTables) {
    if (!EXPECTED_BASELINE_TABLES.includes(t)) return { allowed: false, reason: `Unexpected table: ${t}` };
  }

  let sequenceCount = 0;
  let sequenceOwnershipCount = 0;
  let primaryKeyCount = 0;
  let foreignKeyCount = 0;
  let uniqueConstraintCount = 0;
  let checkConstraintCount = 0;
  let explicitIndexCount = 0;
  let totalIndexCount = 0;
  let rlsEnabledCount = 0;
  let rlsForcedCount = 0;
  let policyCount = 0;
  let triggerCount = 0;
  let knownDriftColumnCount = 0;

  for (const [tableName, t] of Object.entries(fingerprint)) {
    knownDriftColumnCount += t.columns.length;
    for (const c of t.columns) {
      if (c.sequenceName !== null) sequenceOwnershipCount++;
    }
    for (const c of t.constraints) {
      if (c.type === 'PRIMARY KEY') primaryKeyCount++;
      if (c.type === 'FOREIGN KEY') foreignKeyCount++;
      if (c.type === 'UNIQUE') uniqueConstraintCount++;
      if (c.type === 'CHECK') checkConstraintCount++;
    }
    explicitIndexCount += t.explicitIndexes.length;
    if (t.rlsEnabled) rlsEnabledCount++;
    if (t.rlsForced) rlsForcedCount++;
    policyCount += t.policyCount;
    triggerCount += t.triggerCount;
  }
  
  totalIndexCount = explicitIndexCount + primaryKeyCount + uniqueConstraintCount;
  sequenceCount = sequenceOwnershipCount; // Sequences correspond exactly to sequence columns

  if (knownDriftColumnCount !== 130) return { allowed: false, reason: `Column count is ${knownDriftColumnCount}, expected 130` };
  if (sequenceCount !== 15) return { allowed: false, reason: `SEQUENCE_COUNT ${sequenceCount} !== 15` };
  if (sequenceOwnershipCount !== 15) return { allowed: false, reason: `SEQUENCE_OWNERSHIP_COUNT ${sequenceOwnershipCount} !== 15` };
  if (primaryKeyCount !== 15) return { allowed: false, reason: `PRIMARY_KEY_COUNT ${primaryKeyCount} !== 15` };
  if (foreignKeyCount !== 18) return { allowed: false, reason: `FOREIGN_KEY_COUNT ${foreignKeyCount} !== 18` };
  if (uniqueConstraintCount !== 10) return { allowed: false, reason: `UNIQUE_CONSTRAINT_COUNT ${uniqueConstraintCount} !== 10` };
  if (checkConstraintCount !== 8) return { allowed: false, reason: `CHECK_CONSTRAINT_COUNT ${checkConstraintCount} !== 8` };
  if (explicitIndexCount !== 8) return { allowed: false, reason: `EXPLICIT_INDEX_COUNT ${explicitIndexCount} !== 8` };
  if (totalIndexCount !== 33) return { allowed: false, reason: `TOTAL_INDEX_COUNT ${totalIndexCount} !== 33` };
  if (rlsEnabledCount !== 15) return { allowed: false, reason: `RLS_ENABLED_COUNT ${rlsEnabledCount} !== 15` };
  if (rlsForcedCount !== 0) return { allowed: false, reason: `RLS_FORCED_COUNT ${rlsForcedCount} !== 0` };
  if (policyCount !== 0) return { allowed: false, reason: `POLICY_COUNT ${policyCount} !== 0` };
  if (triggerCount !== 0) return { allowed: false, reason: `TRIGGER_COUNT ${triggerCount} !== 0` };

  const actualDifferences: Array<{ table: string, objType: string, name: string, category: string }> = [];

  for (const tableName of EXPECTED_BASELINE_TABLES) {
    const exp = PRODUCTION_FINGERPRINT[tableName];
    const got = fingerprint[tableName];
    
    for (const ec of exp.columns) {
      const gc = got.columns.find(c => c.name === ec.name);
      if (!gc) {
        actualDifferences.push({ table: tableName, objType: 'column', name: ec.name, category: 'missing' });
      } else {
        if (ec.nullable !== gc.nullable) {
          actualDifferences.push({ table: tableName, objType: 'column', name: ec.name, category: 'nullable mismatch' });
        }
      }
    }
    for (const gc of got.columns) {
      const ec = exp.columns.find(c => c.name === gc.name);
      if (!ec) actualDifferences.push({ table: tableName, objType: 'column', name: gc.name, category: 'extra column' });
    }

    for (const ec of exp.constraints) {
      const gc = got.constraints.find(c => c.name === ec.name && c.type === ec.type);
      if (!gc) {
        actualDifferences.push({ table: tableName, objType: 'constraint', name: ec.name, category: 'missing' });
      } else {
        if (ec.definition.trim().replace(/\s+/g, ' ').toLowerCase() !== gc.definition.trim().replace(/\s+/g, ' ').toLowerCase()) {
           actualDifferences.push({ table: tableName, objType: 'constraint', name: ec.name, category: 'definition mismatch' });
        }
      }
    }
    for (const gc of got.constraints) {
      const ec = exp.constraints.find(c => c.name === gc.name && c.type === gc.type);
      if (!ec) actualDifferences.push({ table: tableName, objType: 'constraint', name: gc.name, category: 'extra constraint' });
    }
  }

  if (actualDifferences.length !== 8) {
    return { allowed: false, reason: `Expected 8 exact differences, got ${actualDifferences.length}` };
  }

  const expectedDifferences = [
    { table: 'attribute_definition_translations', objType: 'constraint', name: 'chk_adt_locale', category: 'definition mismatch' },
    { table: 'attribute_definitions', objType: 'constraint', name: 'chk_ad_data_type', category: 'definition mismatch' },
    { table: 'clicks', objType: 'column', name: 'is_unique_24h', category: 'nullable mismatch' },
    { table: 'controlled_option_value_translations', objType: 'constraint', name: 'chk_covt_locale', category: 'definition mismatch' },
    { table: 'offers', objType: 'constraint', name: 'offers_conversion_type_check', category: 'definition mismatch' },
    { table: 'offers', objType: 'constraint', name: 'offers_offer_model_check', category: 'definition mismatch' },
    { table: 'offers', objType: 'constraint', name: 'offers_publication_status_check', category: 'definition mismatch' },
    { table: 'order_items', objType: 'column', name: 'currency_code', category: 'extra column' }
  ];

  for (const ed of expectedDifferences) {
    const found = actualDifferences.some(ad => ad.table === ed.table && ad.objType === ed.objType && ad.name === ed.name && ad.category === ed.category);
    if (!found) return { allowed: false, reason: `Missing expected difference: ${ed.table} ${ed.objType} ${ed.name} ${ed.category}` };
  }

  const clicksTable = fingerprint['clicks'];
  if (clicksTable) {
    const isUniqueCol = clicksTable.columns.find(c => c.name === 'is_unique_24h');
    if (isUniqueCol && isUniqueCol.nullable !== false) {
      return { allowed: false, reason: `clicks.is_unique_24h nullable expected false, got ${isUniqueCol.nullable}` };
    }
  }

  return { allowed: true };
}

export async function verifyJournal(q: Queryable, expectedHash: string, expectedCreatedAt: number): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const journalResult = await q.query(`SELECT hash, created_at FROM ${RUNTIME_JOURNAL_SCHEMA}."${RUNTIME_JOURNAL_TABLE}" ORDER BY created_at ASC`);
    const journalRows = journalResult.rows as { hash: string; created_at: string }[];
    if (journalRows.length === 0) return { allowed: false, reason: "Journal is empty" };
    if (journalRows.length > 1) return { allowed: false, reason: "Journal has more than 1 entry" };
    const entry = journalRows[0];
    if (entry.hash !== expectedHash) return { allowed: false, reason: `Journal hash mismatch` };
    if (Number(entry.created_at) !== expectedCreatedAt) return { allowed: false, reason: `Journal created_at mismatch` };
  } catch (e: any) {
    return { allowed: false, reason: `Error checking journal: ${e.message}` };
  }
  return { allowed: true };
}

export async function verifyEmptyTables(q: Queryable): Promise<{ allowed: boolean; reason?: string }> {
  for (const tableName of EXPECTED_BASELINE_TABLES) {
    try {
      const countResult = await q.query(`SELECT COUNT(*) AS n FROM public.${tableName}`);
      const n = Number((countResult.rows[0] as { n: string }).n);
      if (n > 0) return { allowed: false, reason: `Table ${tableName} has ${n} row(s)` };
    } catch (e: any) {
      return { allowed: false, reason: `Error checking rows for ${tableName}: ${e.message}` };
    }
  }
  return { allowed: true };
}

const REVERSE_DROP_ORDER: readonly string[] = [
  "clicks",
  "order_items",
  "cart_items",
  "rfq_leads",
  "offer_attribute_option_values",
  "offer_attribute_values",
  "category_attribute_assignments",
  "offers",
  "orders",
  "controlled_option_value_translations",
  "controlled_option_values",
  "attribute_definition_translations",
  "attribute_definitions",
  "categories",
  "partners"
] as const;

export async function executeRecovery(client: Queryable): Promise<void> {
  await client.query("BEGIN");
  try {
    for (const tableName of REVERSE_DROP_ORDER) {
      await client.query(`DROP TABLE IF EXISTS public.${tableName}`);
    }
    await client.query(`DROP TABLE IF EXISTS ${RUNTIME_JOURNAL_SCHEMA}."${RUNTIME_JOURNAL_TABLE}"`);
    await client.query(`DROP SCHEMA IF EXISTS ${RUNTIME_JOURNAL_SCHEMA}`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export type PoolFactory = (connectionString: string) => any;

export async function main(poolFactory?: PoolFactory) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");

  const expectedHash = "f903ae27add547abb3c8a3280f1916a6d9969627254812a5449569cb61a4fb51";
  const expectedCreatedAt = 1785589560000;

  let Pool;
  if (!poolFactory) Pool = require("pg").Pool;
  const pool = poolFactory ? poolFactory(url) : new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 });

  let client;
  try {
    const preCheck = await checkPreconditions(pool, process.env);
    if (!preCheck.allowed) throw new Error(`Precheck failed: ${preCheck.reason}`);
    
    const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(pool);
    const driftCheck = compareKnownDrift(fingerprint, publicTables);
    if (!driftCheck.allowed) throw new Error(`Drift check failed: ${driftCheck.reason}`);

    const emptyCheck = await verifyEmptyTables(pool);
    if (!emptyCheck.allowed) throw new Error(`Empty check failed: ${emptyCheck.reason}`);

    const journalCheck = await verifyJournal(pool, expectedHash, expectedCreatedAt);
    if (!journalCheck.allowed) throw new Error(`Journal check failed: ${journalCheck.reason}`);

    client = await pool.connect();
    await executeRecovery(client);

    const tableResult = await pool.query(`SELECT count(*) as count FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'`);
    if (Number(tableResult.rows[0].count) !== 0) throw new Error("Postcheck failed: public schema is not empty");

    const journalSchemaResult = await pool.query(`SELECT count(*) as count FROM pg_namespace WHERE nspname = '${RUNTIME_JOURNAL_SCHEMA}'`);
    if (Number(journalSchemaResult.rows[0].count) !== 0) throw new Error("Postcheck failed: journal schema still exists");
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Recovery failed:", e.message);
    process.exit(1);
  });
}
