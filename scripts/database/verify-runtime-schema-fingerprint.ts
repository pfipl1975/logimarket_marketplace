/**
 * verify-runtime-schema-fingerprint.ts
 *
 * Pure comparison functions + metadata provider for runtime schema fingerprinting.
 *
 * IMPORT SIDE-EFFECTS: NONE.
 * This module does NOT read DATABASE_URL, create pg.Pool, execute queries,
 * run main(), or log anything at import time.
 */

import {
  EXPECTED_BASELINE_TABLES,
  PRODUCTION_FINGERPRINT,
  ColumnContract,
  ConstraintContract,
  IndexContract,
} from "./runtime-migration-contract";

// ---------------------------------------------------------------------------
// Local fingerprint types — the production Gate 05 contract (TableContract)
// stays untouched; live-metadata-only fields are declared locally here.
// ---------------------------------------------------------------------------

/** Either side of a fingerprint comparison (expected or observed). */
export type TableFingerprintSide = {
  columns: ColumnContract[];
  constraints: ConstraintContract[];
  explicitIndexes: IndexContract[];
  rlsEnabled: boolean;
  rlsForced?: boolean;
  policyCount?: number;
  triggerCount?: number;
};

/** Fully populated fingerprint built from live pg_catalog metadata. */
export type LiveTableFingerprint = {
  columns: ColumnContract[];
  constraints: ConstraintContract[];
  explicitIndexes: IndexContract[];
  rlsEnabled: boolean;
  rlsForced: boolean;
  policyCount: number;
  triggerCount: number;
};

// ---------------------------------------------------------------------------
// Shared queryable interface — injected by callers, never constructed here
// ---------------------------------------------------------------------------

export type Queryable = {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
};

// ---------------------------------------------------------------------------
// Target classification
// ---------------------------------------------------------------------------

export type RuntimeTargetState = "EMPTY" | "EXACT_EXISTING" | "PARTIAL_OR_DRIFTED";

export type RuntimeTargetResult = {
  state: RuntimeTargetState;
  publicTableCount: number;
  differences: string[];
};

// ---------------------------------------------------------------------------
// Fingerprint match result
// ---------------------------------------------------------------------------

export type FingerprintMatchResult = {
  isExactMatch: boolean;
  tableCount: number;
  unexpectedTables: string[];
  missingTables: string[];
  driftReasons: string[];
};

// ---------------------------------------------------------------------------
// Pure normalisation helpers
// ---------------------------------------------------------------------------

export function normalizePostgresType(t: string): string {
  return t
    .trim()
    .toLowerCase()
    .replace(/^character varying(\(\d+\))?$/, (_, p) => p ? `varchar${p}` : "varchar")
    .replace(/^character\s+varying(\(\d+\))?$/, (_, p) => p ? `varchar${p}` : "varchar")
    .replace(/^integer$/, "int4")
    .replace(/^bigint$/, "int8")
    .replace(/^boolean$/, "bool")
    .replace(/^double precision$/, "float8");
}

export function normalizeDefaultExpression(d: string | null): string | null {
  if (d === null) return null;
  return d.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeConstraintDefinition(def: string | null | undefined): string {
  if (!def) return "";
  return def.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeIndexDefinition(expr: string): string {
  return expr.trim().replace(/\s+/g, " ").toLowerCase();
}

// ---------------------------------------------------------------------------
// Compare two TableContract fingerprints
// ---------------------------------------------------------------------------

function compareTableContract(
  tableName: string,
  expected: TableFingerprintSide,
  got: TableFingerprintSide,
  reasons: string[]
): void {
  // RLS
  if (expected.rlsEnabled !== got.rlsEnabled) {
    reasons.push(
      `Table ${tableName} RLS mismatch: expected ${expected.rlsEnabled}, got ${got.rlsEnabled}`
    );
  }
  if ((expected.rlsForced ?? false) !== (got.rlsForced ?? false)) {
    reasons.push(
      `Table ${tableName} RLS forced mismatch: expected ${expected.rlsForced}, got ${got.rlsForced}`
    );
  }

  // Policy / trigger counts
  const expPolicies = expected.policyCount ?? 0;
  const gotPolicies = got.policyCount ?? 0;
  if (expPolicies !== gotPolicies) {
    reasons.push(`Table ${tableName} policy count: expected ${expPolicies}, got ${gotPolicies}`);
  }
  const expTriggers = expected.triggerCount ?? 0;
  const gotTriggers = got.triggerCount ?? 0;
  if (expTriggers !== gotTriggers) {
    reasons.push(`Table ${tableName} trigger count: expected ${expTriggers}, got ${gotTriggers}`);
  }

  // Columns
  if (expected.columns.length !== got.columns.length) {
    reasons.push(
      `Table ${tableName} column count mismatch: expected ${expected.columns.length}, got ${got.columns.length}`
    );
  } else {
    for (let i = 0; i < expected.columns.length; i++) {
      const ec = expected.columns[i];
      const gc = got.columns[i];
      if (!gc) {
        reasons.push(`Table ${tableName} missing column at index ${i}`);
        continue;
      }
      if (ec.name !== gc.name) {
        reasons.push(`Table ${tableName} col[${i}] name: expected ${ec.name}, got ${gc.name}`);
      }
      if (normalizePostgresType(ec.type) !== normalizePostgresType(gc.type)) {
        reasons.push(
          `Table ${tableName}.${ec.name} type: expected ${ec.type}, got ${gc.type}`
        );
      }
      if (ec.nullable !== gc.nullable) {
        reasons.push(
          `Table ${tableName}.${ec.name} nullable: expected ${ec.nullable}, got ${gc.nullable}`
        );
      }
      if (normalizeDefaultExpression(ec.defaultVal) !== normalizeDefaultExpression(gc.defaultVal)) {
        reasons.push(
          `Table ${tableName}.${ec.name} default: expected ${ec.defaultVal}, got ${gc.defaultVal}`
        );
      }
      if ((ec.sequenceName ?? null) !== (gc.sequenceName ?? null)) {
        reasons.push(
          `Table ${tableName}.${ec.name} sequence: expected ${ec.sequenceName}, got ${gc.sequenceName}`
        );
      }
    }
  }

  // Constraints — compare by name + type + definition
  if (expected.constraints.length !== got.constraints.length) {
    reasons.push(
      `Table ${tableName} constraints count mismatch: expected ${expected.constraints.length}, got ${got.constraints.length}`
    );
  } else {
    const sortedExpected = [...expected.constraints].sort((a, b) => a.name.localeCompare(b.name));
    const sortedGot = [...got.constraints].sort((a, b) => a.name.localeCompare(b.name));
    for (let i = 0; i < sortedExpected.length; i++) {
      const ec = sortedExpected[i];
      const gc = sortedGot[i];
      if (ec.name !== gc.name) {
        reasons.push(
          `Table ${tableName} constraint name mismatch: expected ${ec.name}, got ${gc.name}`
        );
      }
      if (ec.type !== gc.type) {
        reasons.push(
          `Table ${tableName} constraint ${ec.name} type: expected ${ec.type}, got ${gc.type}`
        );
      }
      if (
        normalizeConstraintDefinition(ec.definition) !==
        normalizeConstraintDefinition(gc.definition)
      ) {
        reasons.push(
          `Table ${tableName} constraint ${ec.name} definition mismatch`
        );
      }
    }
  }

  // Indexes
  if (expected.explicitIndexes.length !== got.explicitIndexes.length) {
    reasons.push(
      `Table ${tableName} explicit indexes count mismatch: expected ${expected.explicitIndexes.length}, got ${got.explicitIndexes.length}`
    );
  } else {
    const sortedExpIdx = [...expected.explicitIndexes].sort((a, b) => a.name.localeCompare(b.name));
    const sortedGotIdx = [...got.explicitIndexes].sort((a, b) => a.name.localeCompare(b.name));
    for (let i = 0; i < sortedExpIdx.length; i++) {
      const ei = sortedExpIdx[i];
      const gi = sortedGotIdx[i];
      if (ei.name !== gi.name) {
        reasons.push(
          `Table ${tableName} index name mismatch: expected ${ei.name}, got ${gi.name}`
        );
      }
      if (normalizeIndexDefinition(ei.expressions) !== normalizeIndexDefinition(gi.expressions)) {
        reasons.push(
          `Table ${tableName} index ${ei.name} expressions mismatch`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// compareRuntimeFingerprint — public API for both tests and runner
// ---------------------------------------------------------------------------

export function compareRuntimeFingerprint(
  actual: Record<string, TableFingerprintSide>,
  allPublicTables: string[]
): FingerprintMatchResult {
  const result: FingerprintMatchResult = {
    isExactMatch: true,
    tableCount: allPublicTables.length,
    unexpectedTables: [],
    missingTables: [],
    driftReasons: [],
  };

  for (const t of allPublicTables) {
    if (!EXPECTED_BASELINE_TABLES.includes(t)) {
      result.unexpectedTables.push(t);
    }
  }

  for (const expected of EXPECTED_BASELINE_TABLES) {
    if (!allPublicTables.includes(expected)) {
      result.missingTables.push(expected);
    }
  }

  if (result.unexpectedTables.length > 0 || result.missingTables.length > 0) {
    result.isExactMatch = false;
    result.driftReasons.push(
      `Table mismatch. Missing: ${result.missingTables.length}, Unexpected: ${result.unexpectedTables.length}`
    );
    return result;
  }

  // Deep per-table comparison
  for (const tableName of EXPECTED_BASELINE_TABLES) {
    const exp = PRODUCTION_FINGERPRINT[tableName];
    const got = actual[tableName];

    if (!got) {
      result.isExactMatch = false;
      result.driftReasons.push(`Table ${tableName} is missing in actual schema metadata`);
      continue;
    }

    const tableReasons: string[] = [];
    compareTableContract(tableName, exp, got, tableReasons);
    if (tableReasons.length > 0) {
      result.isExactMatch = false;
      result.driftReasons.push(...tableReasons);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// classifyRuntimeTarget — pure classification, no DB calls
// ---------------------------------------------------------------------------

export function classifyRuntimeTarget(
  actual: Record<string, TableFingerprintSide>,
  allPublicTables: string[]
): RuntimeTargetResult {
  const publicTableCount = allPublicTables.length;

  if (publicTableCount === 0) {
    return { state: "EMPTY", publicTableCount, differences: [] };
  }

  const match = compareRuntimeFingerprint(actual, allPublicTables);

  if (match.isExactMatch) {
    return { state: "EXACT_EXISTING", publicTableCount, differences: [] };
  }

  return {
    state: "PARTIAL_OR_DRIFTED",
    publicTableCount,
    differences: match.driftReasons,
  };
}

// ---------------------------------------------------------------------------
// Metadata provider — fetches pg_catalog / information_schema metadata only.
// Accepts an injected Queryable; never constructs pg.Pool itself.
// Never reads business rows.
// ---------------------------------------------------------------------------

export async function fetchLiveSchemaMetadata(
  q: Queryable
): Promise<{ fingerprint: Record<string, LiveTableFingerprint>; publicTables: string[] }> {
  // 1. All user tables in public schema
  const tableResult = await q.query(`
    SELECT c.relname AS table_name,
           c.relrowsecurity AS rls_enabled,
           c.relforcerowsecurity AS rls_forced
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relkind = 'r'
    ORDER  BY c.relname
  `);

  const tableRows = tableResult.rows as {
    table_name: string;
    rls_enabled: boolean;
    rls_forced: boolean;
  }[];
  const publicTables = tableRows.map((r) => r.table_name);

  // 2. Policy counts per table
  const policyResult = await q.query(`
    SELECT c.relname AS table_name, COUNT(p.polname) AS policy_count
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    LEFT   JOIN pg_policy p ON p.polrelid = c.oid
    WHERE  n.nspname = 'public' AND c.relkind = 'r'
    GROUP  BY c.relname
  `);
  const policyCounts = Object.fromEntries(
    (policyResult.rows as { table_name: string; policy_count: string }[]).map((r) => [
      r.table_name,
      parseInt(r.policy_count, 10),
    ])
  );

  // 3. Trigger counts per table
  const triggerResult = await q.query(`
    SELECT c.relname AS table_name, COUNT(t.tgname) AS trigger_count
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    LEFT   JOIN pg_trigger t ON t.tgrelid = c.oid AND NOT t.tgisinternal
    WHERE  n.nspname = 'public' AND c.relkind = 'r'
    GROUP  BY c.relname
  `);
  const triggerCounts = Object.fromEntries(
    (triggerResult.rows as { table_name: string; trigger_count: string }[]).map((r) => [
      r.table_name,
      parseInt(r.trigger_count, 10),
    ])
  );

  // 4. Columns
  const colResult = await q.query(`
    SELECT a.attrelid::regclass::text AS table_name,
           a.attname AS column_name,
           a.attnum AS ordinal_position,
           format_type(a.atttypid, a.atttypmod) AS data_type,
           NOT a.attnotnull AS is_nullable,
           pg_get_expr(d.adbin, d.adrelid) AS column_default,
           seq.relname AS sequence_name
    FROM   pg_attribute a
    JOIN   pg_class c ON c.oid = a.attrelid
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    LEFT   JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    LEFT   JOIN pg_depend dep ON dep.objid = (
             SELECT s.oid FROM pg_class s WHERE s.relkind = 'S'
               AND EXISTS (
                 SELECT 1 FROM pg_depend
                 WHERE objid = s.oid AND refobjid = a.attrelid AND refobjsubid = a.attnum
                   AND deptype = 'a'
               )
             LIMIT 1
           ) AND dep.deptype = 'a' AND dep.refobjid = a.attrelid AND dep.refobjsubid = a.attnum
    LEFT   JOIN pg_class seq ON seq.oid = dep.objid AND seq.relkind = 'S'
    WHERE  n.nspname = 'public'
      AND  c.relkind = 'r'
      AND  a.attnum > 0
      AND  NOT a.attisdropped
    ORDER  BY a.attrelid::regclass::text, a.attnum
  `);

  type ColRow = {
    table_name: string;
    column_name: string;
    ordinal_position: number;
    data_type: string;
    is_nullable: boolean;
    column_default: string | null;
    sequence_name: string | null;
  };

  // 5. Constraints
  const conResult = await q.query(`
    SELECT c.relname AS table_name,
           con.conname AS constraint_name,
           CASE con.contype
             WHEN 'p' THEN 'PRIMARY KEY'
             WHEN 'f' THEN 'FOREIGN KEY'
             WHEN 'u' THEN 'UNIQUE'
             WHEN 'c' THEN 'CHECK'
           END AS constraint_type,
           pg_get_constraintdef(con.oid) AS constraint_def
    FROM   pg_constraint con
    JOIN   pg_class c ON c.oid = con.conrelid
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relkind = 'r'
      AND  con.contype IN ('p','f','u','c')
    ORDER  BY c.relname, con.conname
  `);

  type ConRow = {
    table_name: string;
    constraint_name: string;
    constraint_type: string;
    constraint_def: string;
  };

  // 6. Explicit non-constraint indexes
  const idxResult = await q.query(`
    SELECT t.relname AS table_name,
           i.relname AS index_name,
           am.amname AS index_method,
           pg_get_expr(ix.indexprs, ix.indrelid, true) AS index_expressions_expr,
           (SELECT string_agg(a.attname, ', ' ORDER BY x.pos)
            FROM unnest(ix.indkey) WITH ORDINALITY AS x(attnum, pos)
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
            WHERE a.attnum > 0) AS index_columns
    FROM   pg_index ix
    JOIN   pg_class t ON t.oid = ix.indrelid
    JOIN   pg_class i ON i.oid = ix.indexrelid
    JOIN   pg_namespace n ON n.oid = t.relnamespace
    JOIN   pg_am am ON am.oid = i.relam
    WHERE  n.nspname = 'public'
      AND  t.relkind = 'r'
      AND  NOT ix.indisprimary
      AND  NOT ix.indisunique
      AND  NOT EXISTS (
             SELECT 1 FROM pg_constraint con
             WHERE con.conindid = ix.indexrelid
           )
    ORDER  BY t.relname, i.relname
  `);

  type IdxRow = {
    table_name: string;
    index_name: string;
    index_method: string;
    index_expressions_expr: string | null;
    index_columns: string | null;
  };

  // Build fingerprint map
  const fingerprint: Record<string, LiveTableFingerprint> = {};

  for (const trow of tableRows) {
    fingerprint[trow.table_name] = {
      columns: [],
      constraints: [],
      explicitIndexes: [],
      rlsEnabled: trow.rls_enabled,
      rlsForced: trow.rls_forced,
      policyCount: policyCounts[trow.table_name] ?? 0,
      triggerCount: triggerCounts[trow.table_name] ?? 0,
    };
  }

  for (const row of colResult.rows as ColRow[]) {
    const tableName = row.table_name.replace(/^public\./, "");
    if (!fingerprint[tableName]) continue;
    fingerprint[tableName].columns.push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable,
      defaultVal: row.column_default,
      sequenceName: row.sequence_name,
    });
  }

  for (const row of conResult.rows as ConRow[]) {
    if (!fingerprint[row.table_name]) continue;
    fingerprint[row.table_name].constraints.push({
      name: row.constraint_name,
      type: row.constraint_type as ConstraintContract["type"],
      definition: row.constraint_def,
    });
  }

  for (const row of idxResult.rows as IdxRow[]) {
    if (!fingerprint[row.table_name]) continue;
    const expressions = row.index_columns ?? row.index_expressions_expr ?? "";
    fingerprint[row.table_name].explicitIndexes.push({
      name: row.index_name,
      method: row.index_method,
      expressions,
    });
  }

  return { fingerprint, publicTables };
}
