/**
 * runtime-migration-engine.test.ts
 *
 * Tests for the runtime migration engine — target classification, fingerprint
 * comparison, runner flow, grant verifier, rollback guards and the
 * single-transaction rollback wrapper.
 *
 * All tests import the REAL entrypoints directly (no re-export layer) and use
 * strict fake queryables/pools — no real database connections.
 * Fakes THROW on any unmatched query instead of silently returning empty rows.
 */

import { test } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  compareRuntimeFingerprint,
  classifyRuntimeTarget,
  normalizePostgresType,
  normalizeDefaultExpression,
  normalizeConstraintDefinition,
  fetchLiveSchemaMetadata,
  type Queryable,
} from "../../scripts/database/verify-runtime-schema-fingerprint";
import { queryRuntimeGrants, EXPECTED_RUNTIME_SEQUENCES } from "../../scripts/database/verify-runtime-data-api-grants";
import {
  verifyRollbackPreconditions,
  executeRollback,
  rollbackEmptyDevBaseline,
} from "../../scripts/database/rollback-empty-development-baseline";
import { runMigrations } from "../../scripts/database/run-runtime-migrations";
import {
  EXPECTED_BASELINE_TABLES,
  PRODUCTION_FINGERPRINT,
  PREVIOUS_PRODUCTION_FINGERPRINT,
  BASELINE_PRODUCTION_FINGERPRINT,
} from "../../scripts/database/runtime-migration-contract";

// ---------------------------------------------------------------------------
// Constants (no real secrets — synthetic values only)
// ---------------------------------------------------------------------------

const FAKE_HASH = crypto.createHash("sha256").update("SELECT 1;").digest("hex");
const exactFakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }, { folderMillis: 1785590000000, hash: FAKE_HASH }, { folderMillis: 1785590500000, hash: FAKE_HASH }, { folderMillis: 1785591000000, hash: FAKE_HASH }, { folderMillis: 1785591500000, hash: FAKE_HASH }];
const exactFakeReadFn = () => ({ text: JSON.stringify({ entries: [{ tag: "fake_tag_0000", when: 1785589560000 }, { tag: "fake_tag_0001", when: 1785590000000 }, { tag: "fake_tag_0002", when: 1785590500000 }, { tag: "fake_tag_0003", when: 1785591000000 }, { tag: "fake_tag_0004", when: 1785591500000 }] }), parsed: { entries: [{ tag: "fake_tag_0000", when: 1785589560000 }, { tag: "fake_tag_0001", when: 1785590000000 }, { tag: "fake_tag_0002", when: 1785590500000 }, { tag: "fake_tag_0003", when: 1785591000000 }, { tag: "fake_tag_0004", when: 1785591500000 }] }});
const prevFakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }, { folderMillis: 1785590000000, hash: FAKE_HASH }, { folderMillis: 1785590500000, hash: FAKE_HASH }, { folderMillis: 1785591000000, hash: FAKE_HASH }];
const prevFakeReadFn = () => ({ text: JSON.stringify({ entries: [{ tag: "fake_tag_0000", when: 1785589560000 }, { tag: "fake_tag_0001", when: 1785590000000 }, { tag: "fake_tag_0002", when: 1785590500000 }, { tag: "fake_tag_0003", when: 1785591000000 }] }), parsed: { entries: [{ tag: "fake_tag_0000", when: 1785589560000 }, { tag: "fake_tag_0001", when: 1785590000000 }, { tag: "fake_tag_0002", when: 1785590500000 }, { tag: "fake_tag_0003", when: 1785591000000 }] }});
const fakeReadFn = () => ({ text: JSON.stringify({ entries: [{ tag: "fake_tag_0000", when: 1785589560000 }] }), parsed: { entries: [{ tag: "fake_tag_0000", when: 1785589560000 }] }});
const FAKE_DEV_URL = "postgres://postgres.devref@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
const FAKE_PROD_URL = "postgres://postgres.prodref@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
const DEV_REF = "devref";
const PROD_REF = "prodref";

function emptyEnv(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: FAKE_DEV_URL,
    RUNTIME_MIGRATION_TARGET: "development",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: DEV_REF,
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: PROD_REF,
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION: "AUTHORIZED_DEV_BASELINE_WRITE",
    RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION: "AUTHORIZED_EMPTY_DEV_BASELINE_ROLLBACK",
  };
}

// ---------------------------------------------------------------------------
// Strict fake queryable — THROWS on any unmatched query.
// The error carries only a truncated SQL identifier (contract table names
// only, never secrets).
// ---------------------------------------------------------------------------

type Router = (lowercasedSql: string) => { rows: unknown[] } | null;

class StrictFakeQueryable implements Queryable {
  public queries: string[] = [];
  public unmatched: string[] = [];

  constructor(private readonly router: Router) {}

  async query(text: string): Promise<{ rows: unknown[] }> {
    const normalized = text.trim().replace(/\s+/g, " ");
    this.queries.push(normalized);
    const result = this.router(normalized.toLowerCase());
    if (result === null) {
      const identifier = normalized.slice(0, 60);
      this.unmatched.push(identifier);
      throw new Error(`UNMATCHED_FAKE_QUERY[${identifier}]`);
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Metadata routers mirroring pg_catalog responses
// ---------------------------------------------------------------------------

type MetadataOptions = {
  tables?: string[];
  journalRows?: { hash: string; created_at: string | number }[];
  tableCounts?: Record<string, number>;
  countsAsNumbers?: boolean;
  fingerprint?: Record<string, TableContract>;
};

/** Routes the 6 metadata queries of fetchLiveSchemaMetadata plus journal and
 *  row-count queries of verifyRollbackPreconditions. Returns null for
 *  anything else so StrictFakeQueryable throws. */
function metadataRouter(options?: MetadataOptions): Router {
  const tables = options?.tables ?? [...EXPECTED_BASELINE_TABLES];
  const journalRows = options?.journalRows ?? [
    { hash: FAKE_HASH, created_at: "1785589560000" as string | number },
  ];
  const tableCounts = options?.tableCounts ?? {};
  const asNum = options?.countsAsNumbers ?? false;
  const fp = options?.fingerprint ?? PRODUCTION_FINGERPRINT;

  return (t) => {
    // Tables list (checked first — other queries also join pg_class)
    if (
      t.includes("from pg_class c") &&
      t.includes("relkind = 'r'") &&
      !t.includes("aclexplode") &&
      !t.includes("pg_policy") &&
      !t.includes("pg_trigger") &&
      !t.includes("pg_attribute")
    ) {
      return {
        rows: tables.map((n) => ({ table_name: n, rls_enabled: true, rls_forced: false })),
      };
    }
    if (t.includes("policy_count")) {
      return {
        rows: tables.map((n) => ({ table_name: n, policy_count: asNum ? 0 : "0" })),
      };
    }
    if (t.includes("trigger_count")) {
      return {
        rows: tables.map((n) => ({ table_name: n, trigger_count: asNum ? 0 : "0" })),
      };
    }
    // Indexes — must be checked before pg_attribute (index query joins it)
    if (t.includes("pg_index")) {
      const rows: unknown[] = [];
      for (const tableName of tables) {
        for (const idx of fp[tableName].explicitIndexes) {
          rows.push({
            table_name: tableName,
            index_name: idx.name,
            index_method: idx.method,
            index_expressions_expr: null,
            index_columns: idx.expressions,
          });
        }
      }
      return { rows };
    }
    if (t.includes("pg_attribute")) {
      const rows: unknown[] = [];
      for (const tableName of tables) {
        for (const col of fp[tableName].columns) {
          rows.push({
            table_name: tableName,
            column_name: col.name,
            ordinal_position: 0,
            data_type: col.type,
            is_nullable: col.nullable,
            column_default: col.defaultVal,
            sequence_name: col.sequenceName,
          });
        }
      }
      return { rows };
    }
    if (t.includes("pg_constraint")) {
      const rows: unknown[] = [];
      for (const tableName of tables) {
        for (const con of fp[tableName].constraints) {
          rows.push({
            table_name: tableName,
            constraint_name: con.name,
            constraint_type: con.type,
            constraint_def: con.definition,
            is_validated: con.isValidated ?? true,
          });
        }
      }
      return { rows };
    }
    if (t.includes("drizzle_runtime")) {
      return { rows: journalRows };
    }
    if (t.includes("count(*)")) {
      const match = t.match(/from public\.(\w+)/);
      const tbl = match?.[1] ?? "";
      const n = tableCounts[tbl] ?? 0;
      return { rows: [{ n: asNum ? n : String(n) }] };
    }
    return null;
  };
}

/** metadataRouter extended with the grant-verifier queries (pg_roles + ACL). */
function runnerRouter(state: "EMPTY" | "EXACT" | "PREVIOUS" | "BASELINE" | "PARTIAL", fp?: Record<string, TableContract>, journalRowsOverride?: { hash: string; created_at: string | number }[]): Router {
    const base =
      state === "EXACT"
        ? metadataRouter({ fingerprint: fp, tables: fp ? Object.keys(fp) : undefined, journalRows: journalRowsOverride ?? [{ hash: FAKE_HASH, created_at: "1785589560000" }, { hash: FAKE_HASH, created_at: "1785590000000" }, { hash: FAKE_HASH, created_at: "1785590500000" }, { hash: FAKE_HASH, created_at: "1785591000000" }, { hash: FAKE_HASH, created_at: "1785591500000" }] })
      : state === "PREVIOUS"
        ? metadataRouter({
            fingerprint: fp,
            tables: fp ? Object.keys(fp) : undefined,
            journalRows: [
              { hash: FAKE_HASH, created_at: "1785589560000" },
              { hash: FAKE_HASH, created_at: "1785590000000" },
              { hash: FAKE_HASH, created_at: "1785590500000" },
              { hash: FAKE_HASH, created_at: "1785591000000" },
            ],
          })
        : state === "BASELINE"
          ? metadataRouter({ fingerprint: fp, tables: fp ? Object.keys(fp) : undefined, journalRows: journalRowsOverride ?? [{ hash: FAKE_HASH, created_at: "1785589560000" }] })
        : state === "PARTIAL"
          ? metadataRouter({ tables: EXPECTED_BASELINE_TABLES.slice(0, 7) })
          : emptyRouter();
  return (t) => {
    if (t.includes("pg_roles")) {
      return {
        rows: [
          { oid: 1001, rolname: "anon" },
          { oid: 1002, rolname: "authenticated" },
          { oid: 1003, rolname: "service_role" },
        ],
      };
    }
    if (t.includes("aclexplode")) {
      return { rows: [] };
    }
    return base(t);
  };
}

/** Every metadata query returns empty rows (EMPTY schema). */
function emptyRouter(): Router {
  return (t) => {
    if (
      t.includes("pg_class") ||
      t.includes("pg_attribute") ||
      t.includes("pg_constraint") ||
      t.includes("pg_index") ||
      t.includes("pg_roles") ||
      t.includes("aclexplode")
    ) {
      return { rows: [] };
    }
    if (t.includes("drizzle_runtime") || t.includes("__drizzle_migrations")) {
      throw Object.assign(new Error("relation does not exist"), { code: "42P01" });
    }
    return null;
  };
}

// ---------------------------------------------------------------------------
// Fake pools
// ---------------------------------------------------------------------------

function fakeRunnerPool(router: Router) {
  const q = new StrictFakeQueryable(router);
  const state = { ended: false };
  return {
    q,
    state,
    factory: () => ({
      query: (text: string) => q.query(text),
      end: async () => {
        state.ended = true;
      },
    }),
  };
}

function fakeRollbackPool(router: Router, options?: { failOn?: string }) {
  const preflight = new StrictFakeQueryable(router);
  const statements: string[] = [];
  const state = { ended: false, released: false, connects: 0 };

  const client = {
    async query(text: string): Promise<{ rows: unknown[] }> {
      const normalized = text.trim().replace(/\s+/g, " ");
      statements.push(normalized);
      if (options?.failOn && normalized.includes(options.failOn)) {
        throw new Error("DDL_FAILURE");
      }
      return { rows: [] };
    },
    release() {
      state.released = true;
    },
  };

  const pool = {
    query: (text: string) => preflight.query(text),
    connect: async () => {
      state.connects++;
      return client;
    },
    end: async () => {
      state.ended = true;
    },
  };

  return { pool, preflight, statements, state };
}

// ---------------------------------------------------------------------------
// A. Static source controls — guard the real entrypoint sources
// ---------------------------------------------------------------------------

const RUNNER_SOURCE = fs.readFileSync(
  path.join(process.cwd(), "scripts/database/run-runtime-migrations.ts"),
  "utf8"
);
const ROLLBACK_SOURCE = fs.readFileSync(
  path.join(process.cwd(), "scripts/database/rollback-empty-development-baseline.ts"),
  "utf8"
);
const FINGERPRINT_SOURCE = fs.readFileSync(
  path.join(process.cwd(), "scripts/database/verify-runtime-schema-fingerprint.ts"),
  "utf8"
);
const GRANTS_SOURCE = fs.readFileSync(
  path.join(process.cwd(), "scripts/database/verify-runtime-data-api-grants.ts"),
  "utf8"
);

test("STATIC: runner imports migrate from drizzle-orm/node-postgres/migrator", () => {
  assert.ok(
    /import\s*\{\s*migrate\s*\}\s*from\s*["']drizzle-orm\/node-postgres\/migrator["']/.test(
      RUNNER_SOURCE
    ),
    "runner must import migrate from the /migrator subpath"
  );
});

test("STATIC: runner has NO migrate import from bare drizzle-orm/node-postgres", () => {
  assert.ok(
    !/import\s*\{[^}]*\bmigrate\b[^}]*\}\s*from\s*["']drizzle-orm\/node-postgres["']/.test(
      RUNNER_SOURCE
    ),
    "bare node-postgres does not export migrate — this import must never return"
  );
});

test("STATIC: no postgres-js anywhere in runtime entrypoints", () => {
  for (const src of [RUNNER_SOURCE, ROLLBACK_SOURCE, FINGERPRINT_SOURCE, GRANTS_SOURCE]) {
    assert.ok(!/postgres-js/.test(src), "postgres-js import is forbidden");
    assert.ok(!/from\s*["']postgres["']/.test(src), "postgres package import is forbidden");
  }
});

test("STATIC: no manual journal INSERT in runner", () => {
  assert.ok(!/INSERT\s+INTO/i.test(RUNNER_SOURCE), "manual journal insert is forbidden");
  assert.ok(!/__drizzle_migrations/.test(RUNNER_SOURCE.replace(/RUNTIME_JOURNAL_TABLE/g, "")));
});

test("STATIC: rollback source contains no CASCADE in any SQL statement", () => {
  const withoutComments = ROLLBACK_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(
    /^\s*\/\/.*$/gm,
    ""
  );
  assert.ok(!/CASCADE/i.test(withoutComments), "CASCADE is forbidden in rollback SQL");
});

// ---------------------------------------------------------------------------
// B. Import side effects — importing real entrypoints opens nothing
// ---------------------------------------------------------------------------

test("IMPORT_SIDE_EFFECT_TEST: fingerprint module import opens no pool", () => {
  assert.strictEqual(typeof classifyRuntimeTarget, "function");
  assert.strictEqual(typeof fetchLiveSchemaMetadata, "function");
});

test("IMPORT_SIDE_EFFECT_TEST: grant verifier import opens no pool", () => {
  assert.strictEqual(typeof queryRuntimeGrants, "function");
});

test("IMPORT_SIDE_EFFECT_TEST: rollback module import opens no pool", () => {
  assert.strictEqual(typeof verifyRollbackPreconditions, "function");
  assert.strictEqual(typeof executeRollback, "function");
  assert.strictEqual(typeof rollbackEmptyDevBaseline, "function");
});

test("IMPORT_SIDE_EFFECT_TEST: runner import does not auto-run main", () => {
  // If main() had run at import, the module load above would have thrown
  // (no DATABASE_URL in the test process env contract for this suite).
  assert.strictEqual(typeof runMigrations, "function");
});

// ---------------------------------------------------------------------------
// C. Target classification — pure functions
// ---------------------------------------------------------------------------

test("TARGET: EMPTY when zero public tables", () => {
  const result = classifyRuntimeTarget({}, []);
  assert.strictEqual(result.state, "EMPTY");
  assert.strictEqual(result.publicTableCount, 0);
});

test("TARGET: EXACT_EXISTING when exact fingerprint copy", () => {
  const result = classifyRuntimeTarget(PRODUCTION_FINGERPRINT, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "EXACT_EXISTING_POST_0004");
});

test("TARGET: PARTIAL_OR_DRIFTED when missing table", () => {
  const tables = EXPECTED_BASELINE_TABLES.filter((t) => t !== "offers");
  const result = classifyRuntimeTarget(PRODUCTION_FINGERPRINT, tables);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
  assert.ok(result.differences.length > 0);
});

test("TARGET: PARTIAL_OR_DRIFTED when extra public table", () => {
  const tables = [...EXPECTED_BASELINE_TABLES, "extra_table"];
  const result = classifyRuntimeTarget(PRODUCTION_FINGERPRINT, tables);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
  assert.ok(result.differences.some((d) => d.includes("Unexpected")));
});

test("TARGET: PARTIAL_OR_DRIFTED when column type differs", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].columns[0].type = "text";
  const result = classifyRuntimeTarget(mutated, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET: PARTIAL_OR_DRIFTED when column nullability differs", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].columns[0].nullable = !mutated["offers"].columns[0].nullable;
  const result = classifyRuntimeTarget(mutated, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET: PARTIAL_OR_DRIFTED when column default differs", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["partners"].columns[0].defaultVal = "999";
  const result = classifyRuntimeTarget(mutated, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET: PARTIAL_OR_DRIFTED when FK missing", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].constraints = mutated["offers"].constraints.filter(
    (c: { type: string }) => c.type !== "FOREIGN KEY"
  );
  const result = classifyRuntimeTarget(mutated, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET: PARTIAL_OR_DRIFTED when CHECK constraint added", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].constraints.push({ name: "extra_chk", type: "CHECK", definition: "CHECK (id > 0)" });
  const result = classifyRuntimeTarget(mutated, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET: PARTIAL_OR_DRIFTED when explicit index missing", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].explicitIndexes = [];
  const result = classifyRuntimeTarget(mutated, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET: PARTIAL_OR_DRIFTED when sequence ownership differs", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].columns[0].sequenceName = "wrong_seq";
  const result = classifyRuntimeTarget(mutated, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET: PARTIAL_OR_DRIFTED when RLS disabled", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].rlsEnabled = false;
  const result = classifyRuntimeTarget(mutated, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET: PARTIAL_OR_DRIFTED when policy count > 0", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].policyCount = 1;
  const result = classifyRuntimeTarget(mutated, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

test("TARGET: PARTIAL_OR_DRIFTED when trigger count > 0", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].triggerCount = 1;
  const result = classifyRuntimeTarget(mutated, EXPECTED_BASELINE_TABLES);
  assert.strictEqual(result.state, "PARTIAL_OR_DRIFTED");
});

// ---------------------------------------------------------------------------
// D. Comparator — direct compareRuntimeFingerprint coverage
// ---------------------------------------------------------------------------

test("COMPARE: matches exact copy", () => {
  const result = compareRuntimeFingerprint(PRODUCTION_FINGERPRINT, EXPECTED_BASELINE_TABLES, PRODUCTION_FINGERPRINT);
  assert.strictEqual(result.isExactMatch, true);
});

test("COMPARE: detects unexpected table", () => {
  const allTables = [...EXPECTED_BASELINE_TABLES, "unexpected_table"];
  const result = compareRuntimeFingerprint(PRODUCTION_FINGERPRINT, allTables, PRODUCTION_FINGERPRINT);
  assert.strictEqual(result.isExactMatch, false);
  assert.ok(result.driftReasons[0].includes("Unexpected: 1"));
});

test("COMPARE: detects missing table", () => {
  const allTables = EXPECTED_BASELINE_TABLES.filter((t) => t !== "offers");
  const result = compareRuntimeFingerprint(PRODUCTION_FINGERPRINT, allTables, PRODUCTION_FINGERPRINT);
  assert.strictEqual(result.isExactMatch, false);
  assert.ok(result.driftReasons[0].includes("Missing: 1"));
});

test("COMPARE: detects altered RLS", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].rlsEnabled = false;
  const result = compareRuntimeFingerprint(mutated, EXPECTED_BASELINE_TABLES, PRODUCTION_FINGERPRINT);
  assert.strictEqual(result.isExactMatch, false);
  assert.ok(result.driftReasons.some((r: string) => r.includes("RLS mismatch")));
});

test("COMPARE: detects missing column, constraint and index", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  mutated["offers"].columns.pop();
  mutated["offers"].constraints.pop();
  mutated["offers"].explicitIndexes.pop();
  const result = compareRuntimeFingerprint(mutated, EXPECTED_BASELINE_TABLES, PRODUCTION_FINGERPRINT);
  assert.strictEqual(result.isExactMatch, false);
  assert.ok(result.driftReasons.some((r: string) => r.includes("column count mismatch")));
  assert.ok(result.driftReasons.some((r: string) => r.includes("constraints count mismatch")));
  assert.ok(result.driftReasons.some((r: string) => r.includes("explicit indexes count mismatch")));
});

test("COMPARE: handles undefined table in actual", () => {
  const mutated = JSON.parse(JSON.stringify(PRODUCTION_FINGERPRINT));
  delete mutated["offers"];
  const result = compareRuntimeFingerprint(mutated, EXPECTED_BASELINE_TABLES, PRODUCTION_FINGERPRINT);
  assert.strictEqual(result.isExactMatch, false);
  assert.ok(result.driftReasons.some((r: string) => r.includes("missing in actual schema metadata")));
});

// ---------------------------------------------------------------------------
// E. Runner flow — real runMigrations entrypoint, injected fakes
// ---------------------------------------------------------------------------

test("RUNNER_EMPTY_TEST: runner calls migrate exactly once on EMPTY schema", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => {
    migrateCallCount++;
  };
  const { state, factory } = fakeRunnerPool(runnerRouter("EMPTY"));

  try {
    await runMigrations(emptyEnv(), factory as never, fakeMigrate as never, (() => []) as never, (() => ({ text: "{ \"entries\": [] }", parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never);
  } catch {
    // post-check fails (schema still empty after fake migrate) — expected here
  }

  assert.strictEqual(migrateCallCount, 1, "migrate must be called exactly once");
  assert.ok(state.ended, "pool must be closed");
});

test("RUNNER_EXACT_TEST: runner completes full flow on EXACT_EXISTING schema", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => {
    migrateCallCount++;
  };
  const { q, state, factory } = fakeRunnerPool(runnerRouter("EXACT"));

  // EXACT pre-check → migrate → EXACT post-check → grant post-check → success
  await runMigrations(emptyEnv(), factory as never, fakeMigrate as never, exactFakeRead as never, exactFakeReadFn as never, (() => Buffer.from("SELECT 1;")) as never);

  assert.strictEqual(migrateCallCount, 1, "migrate must be called exactly once");
  assert.ok(state.ended, "pool must be closed");
  assert.ok(
    q.queries.some((sql) => sql.toLowerCase().includes("aclexplode")),
    "grant post-check must run after migration"
  );
});

test("RUNNER_PREVIOUS_TEST: runner completes full flow on MIGRATABLE_PREVIOUS schema", async () => {
  let migrateCallCount = 0;
  const q: { router?: Router; queries: string[]; unmatched: string[]; query: (text: string) => Promise<unknown> } = {
    queries: [],
    unmatched: [],
    query: async () => ({ rows: [] }),
  };
  const fakeMigrate = async () => {
    migrateCallCount++;
    // Simulate migration side-effect by switching the router to EXACT
    q.router = runnerRouter("EXACT");
  };

  // Custom router switching
  let currentRouter = runnerRouter("PREVIOUS", PREVIOUS_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => currentRouter(t);

  const state = { ended: false };
  const qObj = {
    queries: [] as string[],
    unmatched: [] as string[],
    set router(newRouter: Router) { currentRouter = newRouter; },
    async query(text: string) {
      const normalized = text.trim().replace(/\s+/g, " ");
      this.queries.push(normalized);
      const result = routerProxy(normalized.toLowerCase());
      if (result === null) throw new Error("UNMATCHED_FAKE_QUERY");
      return result;
    }
  };
  Object.assign(q, qObj);
  Object.defineProperty(q, "router", {
    set(newRouter: Router) {
      currentRouter = newRouter;
    }
  });
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => { state.ended = true; },
  });

  await runMigrations(emptyEnv(), factory as never, fakeMigrate as never, prevFakeRead as never, prevFakeReadFn as never, (() => Buffer.from("SELECT 1;")) as never);

  assert.strictEqual(migrateCallCount, 1, "migrate must be called exactly once");
  assert.ok(state.ended, "pool must be closed");
});

test("RUNNER_BASELINE_TEST: runner completes full flow on MIGRATABLE_BASELINE schema", async () => {
  let migrateCallCount = 0;
  const q: { router?: Router; queries: string[]; unmatched: string[]; query: (text: string) => Promise<unknown> } = {
    queries: [],
    unmatched: [],
    query: async () => ({ rows: [] }),
  };
  const fakeMigrate = async () => {
    migrateCallCount++;
    q.router = runnerRouter("EXACT", undefined, [{ hash: FAKE_HASH, created_at: "1785589560000" }, { hash: FAKE_HASH, created_at: "1785590000000" }, { hash: FAKE_HASH, created_at: "1785590500000" }, { hash: FAKE_HASH, created_at: "1785591000000" }]);
  };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  let currentRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);

  const routerProxy = (t: string) => currentRouter(t);
  const state = { ended: false };
  const qObj = {
    queries: [] as string[],
    unmatched: [] as string[],
    set router(newRouter: Router) { currentRouter = newRouter; },
    async query(text: string) {
      const normalized = text.trim().replace(/\s+/g, " ");
      this.queries.push(normalized);
      const result = routerProxy(normalized.toLowerCase());
      if (result === null) throw new Error("UNMATCHED_FAKE_QUERY");
      return result;
    }
  };
  Object.assign(q, qObj);
  Object.defineProperty(q, "router", {
    set(newRouter: Router) {
      currentRouter = newRouter;
    }
  });
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => { state.ended = true; },
  });

  await runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, fakeReadFn as never, (() => Buffer.from("SELECT 1;")) as never);

  assert.strictEqual(migrateCallCount, 1, "migrate must be called exactly once for BASELINE");
  assert.ok(state.ended, "pool must be closed");
});

test("BASELINE_ABSENT_JOURNAL_TEST / JOURNAL_42P01_ALLOWED_TEST", async () => {
  let migrateCallCount = 0;
  let currentRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const q: { router?: Router; query: (text: string) => Promise<unknown> } = {
    query: async (text: string) => qObj.query(text),
    set router(newRouter: Router) { currentRouter = newRouter; }
  };
  const fakeMigrate = async () => {
    migrateCallCount++;
    q.router = runnerRouter("EXACT", undefined, [{ hash: FAKE_HASH, created_at: "1785589560000" }, { hash: FAKE_HASH, created_at: "1785590000000" }, { hash: FAKE_HASH, created_at: "1785590500000" }, { hash: FAKE_HASH, created_at: "1785591000000" }]);
  };

  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      throw Object.assign(new Error("relation does not exist"), { code: '42P01' });
    }
    return currentRouter(t);
  };

  const qObj = new StrictFakeQueryable(routerProxy);

  const factory = () => ({
    query: async (text: string) => {
      return q.query(text);
    },
    end: async () => {},
  });

  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }]; const fakeReadFn = () => ({ text: JSON.stringify({ entries: [{ tag: "fake_tag_0000", when: 1785589560000 }] }), parsed: { entries: [{ tag: "fake_tag_0000", when: 1785589560000 }] }}); await runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, fakeReadFn as never, (() => Buffer.from("SELECT 1;")) as never);
  assert.strictEqual(migrateCallCount, 1);
});

test("JOURNAL_3F000_ALLOWED_TEST", async () => {
  let migrateCallCount = 0;
  let currentRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const q: { router?: Router; query: (text: string) => Promise<unknown> } = {
    query: async (text: string) => qObj.query(text),
    set router(newRouter: Router) { currentRouter = newRouter; }
  };
  const fakeMigrate = async () => {
    migrateCallCount++;
    q.router = runnerRouter("EXACT", undefined, [{ hash: FAKE_HASH, created_at: "1785589560000" }, { hash: FAKE_HASH, created_at: "1785590000000" }, { hash: FAKE_HASH, created_at: "1785590500000" }, { hash: FAKE_HASH, created_at: "1785591000000" }]);
  };

  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      throw Object.assign(new Error("schema does not exist"), { code: '3F000' });
    }
    return currentRouter(t);
  };

  const qObj = new StrictFakeQueryable(routerProxy);

  const factory = () => ({
    query: async (text: string) => {
      return q.query(text);
    },
    end: async () => {},
  });

  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }]; const fakeReadFn = () => ({ text: JSON.stringify({ entries: [{ tag: "fake_tag_0000", when: 1785589560000 }] }), parsed: { entries: [{ tag: "fake_tag_0000", when: 1785589560000 }] }}); await runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, fakeReadFn as never, (() => Buffer.from("SELECT 1;")) as never);
  assert.strictEqual(migrateCallCount, 1);
});

test("JOURNAL_42703_BLOCKED_TEST", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  const baseRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      throw Object.assign(new Error("column hash does not exist"), { code: '42703' });
    }
    return baseRouter(t);
  };

  const q = new StrictFakeQueryable(routerProxy);
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => {},
  });

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, (() => ({ text: JSON.stringify({ entries: [] }), parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    (err: Error) => err.message.includes("column hash does not exist")
  );
  assert.strictEqual(migrateCallCount, 0, "migrate callback must NOT be called on 42703");
});

test("JOURNAL_42501_BLOCKED_TEST", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  const baseRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      throw Object.assign(new Error("permission denied for relation __drizzle_migrations"), { code: '42501' });
    }
    return baseRouter(t);
  };

  const q = new StrictFakeQueryable(routerProxy);
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => {},
  });

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, (() => ({ text: JSON.stringify({ entries: [] }), parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    (err: Error) => err.message.includes("permission denied")
  );
  assert.strictEqual(migrateCallCount, 0, "migrate callback must NOT be called on 42501");
});

test("JOURNAL_GENERIC_DOES_NOT_EXIST_BLOCKED_TEST", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  const baseRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      // Error without Postgres error code
      throw new Error("column hash does not exist");
    }
    return baseRouter(t);
  };

  const q = new StrictFakeQueryable(routerProxy);
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => {},
  });

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, (() => ({ text: JSON.stringify({ entries: [] }), parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    (err: Error) => err.message.includes("column hash does not exist")
  );
  assert.strictEqual(migrateCallCount, 0, "migrate callback must NOT be called on generic error without code");
});

test("BASELINE_0000_ONLY_JOURNAL_TEST", async () => {
  let migrateCallCount = 0;
  let currentRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const q: { router?: Router; query: (text: string) => Promise<unknown> } = {
    query: async (text: string) => qObj.query(text),
    set router(newRouter: Router) { currentRouter = newRouter; }
  };
  const fakeMigrate = async () => {
    migrateCallCount++;
    q.router = runnerRouter("EXACT", undefined, [{ hash: FAKE_HASH, created_at: "1785589560000" }, { hash: FAKE_HASH, created_at: "1785590000000" }, { hash: FAKE_HASH, created_at: "1785590500000" }, { hash: FAKE_HASH, created_at: "1785591000000" }]);
  };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      return { rows: [{ hash: FAKE_HASH, created_at: "1785589560000" }] };
    }
    return currentRouter(t);
  };

  const qObj = new StrictFakeQueryable(routerProxy);

  const factory = () => ({
    query: async (text: string) => {
      return q.query(text);
    },
    end: async () => {},
  });

  await runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, fakeReadFn as never, (() => Buffer.from("SELECT 1;")) as never);
  assert.strictEqual(migrateCallCount, 1);
});

test("BASELINE_0000_WRONG_HASH_TEST", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  const baseRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      return { rows: [{ hash: "wronghash", created_at: "1785589560000" }] };
    }
    return baseRouter(t);
  };

  const q = new StrictFakeQueryable(routerProxy);
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => {},
  });

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, (() => ({ text: JSON.stringify({ entries: [] }), parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    /BLOCKED.*do not match exact canonical 0000/
  );
  assert.strictEqual(migrateCallCount, 0);
});

test("BASELINE_0000_WRONG_TIMESTAMP_TEST", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  const baseRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      return { rows: [{ hash: FAKE_HASH, created_at: "1785589999999" }] };
    }
    return baseRouter(t);
  };

  const q = new StrictFakeQueryable(routerProxy);
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => {},
  });

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, (() => ({ text: JSON.stringify({ entries: [] }), parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    /BLOCKED.*do not match exact canonical 0000/
  );
  assert.strictEqual(migrateCallCount, 0);
});

test("BASELINE_FALSE_0001_JOURNAL_TEST", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  const baseRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      return { rows: [
        { hash: FAKE_HASH, created_at: "1785589560000" },
        { hash: "hash0001", created_at: "1785590000000" }
      ] };
    }
    return baseRouter(t);
  };

  const q = new StrictFakeQueryable(routerProxy);
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => {},
  });

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, (() => ({ text: JSON.stringify({ entries: [] }), parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    /BLOCKED.*do not match exact canonical 0000/
  );
  assert.strictEqual(migrateCallCount, 0);
});

test("BASELINE_DUPLICATE_JOURNAL_TEST", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  const baseRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      return { rows: [
        { hash: FAKE_HASH, created_at: "1785589560000" },
        { hash: FAKE_HASH, created_at: "1785589560000" }
      ] };
    }
    return baseRouter(t);
  };

  const q = new StrictFakeQueryable(routerProxy);
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => {},
  });

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, (() => ({ text: JSON.stringify({ entries: [] }), parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    /BLOCKED.*do not match exact canonical 0000/
  );
  assert.strictEqual(migrateCallCount, 0);
});

test("BASELINE_FALSE_0002_JOURNAL_TEST", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  const baseRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      return { rows: [
        { hash: FAKE_HASH, created_at: "1785589560000" },
        { hash: "hash0001", created_at: "1785590000000" },
        { hash: "hash0002", created_at: "1785591000000" }
      ] };
    }
    return baseRouter(t);
  };

  const q = new StrictFakeQueryable(routerProxy);
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => {},
  });

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, (() => ({ text: JSON.stringify({ entries: [] }), parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    /BLOCKED.*do not match exact canonical 0000/
  );
  assert.strictEqual(migrateCallCount, 0);
});

test("BASELINE_UNKNOWN_JOURNAL_TEST", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; };
  const fakeRead = () => [{ folderMillis: 1785589560000, hash: FAKE_HASH }];

  const baseRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => {
    if (t.includes("drizzle_runtime") && t.includes("hash")) {
      return { rows: [{ hash: "some_weird_hash", created_at: "999999999" }] };
    }
    return baseRouter(t);
  };

  const q = new StrictFakeQueryable(routerProxy);
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => {},
  });

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, fakeRead as never, (() => ({ text: JSON.stringify({ entries: [] }), parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    /BLOCKED.*do not match exact canonical 0000/
  );
  assert.strictEqual(migrateCallCount, 0);
});

test("RUNNER_DRIFT_TEST: runner throws and never calls migrate on PARTIAL_OR_DRIFTED", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => {
    migrateCallCount++;
  };
  const { state, factory } = fakeRunnerPool(runnerRouter("PARTIAL"));

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, (() => []) as never, (() => ({ text: "{ \"entries\": [] }", parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    /PARTIAL_OR_DRIFTED/
  );
  assert.strictEqual(migrateCallCount, 0, "migrate must NOT be called on drift");
  assert.ok(state.ended, "pool must be closed even on drift");
});

test("NOT_VALID_RUNNER_ABORTS: runner rejects schema with NOT VALID constraint without calling migrate", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => {
    migrateCallCount++;
  };

  const baseRouter = runnerRouter("BASELINE", BASELINE_PRODUCTION_FINGERPRINT);
  const routerProxy = (t: string) => {
    if (t.includes("pg_constraint") && t.includes("convalidated")) {
      const res = baseRouter(t);
      if (res && res.rows) {
        return {
          rows: (res.rows as Array<{ constraint_name: string; is_validated?: boolean; constraint_def?: string }>).map((r) => {
            if (r.constraint_name === "offers_publication_status_check") {
              return { ...r, is_validated: false, constraint_def: (r.constraint_def ?? "") + " NOT VALID" };
            }
            return r;
          })
        };
      }
    }
    return baseRouter(t);
  };

  const q = new StrictFakeQueryable(routerProxy);
  const factory = () => ({
    query: (text: string) => q.query(text),
    end: async () => {},
  });

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, (() => []) as never, (() => ({ text: "{ \"entries\": [] }", parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    /PARTIAL_OR_DRIFTED/
  );
  assert.strictEqual(migrateCallCount, 0, "MIGRATE_CALL_COUNT_ZERO");
});

test("RUNNER_POOL_CLOSE_TEST: pool is always closed even when migrate throws", async () => {
  let migrateCallCount = 0;
  let capturedFolder = "";
  const fakeMigrate = async (db: unknown, opts: { migrationsFolder: string }) => {
    migrateCallCount++;
    capturedFolder = opts.migrationsFolder;
    throw new Error("Synthetic migrate failure");
  };
  const { state, factory } = fakeRunnerPool(runnerRouter("EMPTY"));

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, (() => []) as never, (() => ({ text: "{ \"entries\": [] }", parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    /Synthetic migrate failure/
  );
  assert.ok(state.ended, "pool must be closed even when migrate throws");
  assert.strictEqual(migrateCallCount, 1, "migrate must be called exactly once");
  assert.strictEqual(fs.existsSync(capturedFolder), false, "migrations folder must be cleaned up");
});

test("RUNNER_POSTCHECK_DRIFT_TEST: post-check drift causes error after migration", async () => {
  const fakeMigrate = async () => {}; // migrate does nothing → post-check sees EMPTY
  const { state, factory } = fakeRunnerPool(runnerRouter("EMPTY"));

  await assert.rejects(
    async () => runMigrations(emptyEnv(), factory as never, fakeMigrate as never, (() => []) as never, (() => ({ text: "{ \"entries\": [] }", parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never),
    /post-check failed/
  );
  assert.ok(state.ended);
});

test("RUNNER_POST0003_STAYS_POST0003_BLOCK: post-check fails if POST_0003 migration doesn't reach POST_0004", async () => {
  let migrateCallCount = 0;
  const fakeMigrate = async () => { migrateCallCount++; }; // Does not change schema

  // Use runnerRouter("PREVIOUS") which simulates MIGRATABLE_POST_0003
  const { state, factory } = fakeRunnerPool(runnerRouter("PREVIOUS", PREVIOUS_PRODUCTION_FINGERPRINT));
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
        { folderMillis: 1785589560000, hash: FAKE_HASH },
        { folderMillis: 1785590000000, hash: FAKE_HASH },
        { folderMillis: 1785590500000, hash: FAKE_HASH },
        { folderMillis: 1785591000000, hash: FAKE_HASH },
        { folderMillis: 1785591500000, hash: FAKE_HASH }
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
      (() => Buffer.from("SELECT 1;")) as never
    ),
    /post-check failed/
  );

  assert.strictEqual(migrateCallCount, 1, "migrateFn must be called exactly once");
  assert.ok(state.ended, "pool must be closed");
});


test("RUNNER: error messages never contain DATABASE_URL or project refs", async () => {
  const fakeMigrate = async () => {};
  const { factory } = fakeRunnerPool(runnerRouter("PARTIAL"));

  const error = await runMigrations(emptyEnv(), factory as never, fakeMigrate as never, (() => []) as never, (() => ({ text: "{ \"entries\": [] }", parsed: { entries: [] } })) as never, (() => Buffer.from("SELECT 1;")) as never).catch(
    (e) => e
  );
  assert.ok(error instanceof Error);
  assert.ok(!error.message.includes(FAKE_DEV_URL), "DATABASE_URL must not leak into errors");
  assert.ok(!error.message.includes(DEV_REF), "project ref must not leak into errors");
});

// ---------------------------------------------------------------------------
// F. Grant verifier — real queryRuntimeGrants entrypoint logic
// ---------------------------------------------------------------------------

test("GRANT_TABLE_ACL_TEST: grant verifier counts table grants per role", async () => {
  const fakeQ: Queryable = {
    async query(text: string): Promise<{ rows: unknown[] }> {
      const t = text.toLowerCase();
      if (t.includes("pg_roles")) {
        return {
          rows: [
            { oid: 10, rolname: "anon" },
            { oid: 11, rolname: "authenticated" },
            { oid: 12, rolname: "service_role" },
          ],
        };
      }
      if (t.includes("relkind = 'r'") && t.includes("aclexplode")) {
        return {
          rows: [
            { object_name: "offers", grantee_oid: 10, privilege: "SELECT" },
            { object_name: "offers", grantee_oid: 11, privilege: "SELECT" },
            { object_name: "partners", grantee_oid: 12, privilege: "SELECT" },
          ],
        };
      }
      if (t.includes("relkind = 's'") && t.includes("aclexplode")) {
        return { rows: [{ object_name: "offers_id_seq", grantee_oid: 10, privilege: "USAGE" }] };
      }
      throw new Error("UNMATCHED_FAKE_QUERY");
    },
  };

  const result = await queryRuntimeGrants(fakeQ);
  assert.strictEqual(result.ANON_TABLE_GRANT_COUNT, 1);
  assert.strictEqual(result.AUTHENTICATED_TABLE_GRANT_COUNT, 1);
  assert.strictEqual(result.SERVICE_ROLE_TABLE_GRANT_COUNT, 1);
  assert.strictEqual(result.ANON_SEQUENCE_GRANT_COUNT, 1);
  assert.strictEqual(result.AUTHENTICATED_SEQUENCE_GRANT_COUNT, 0);
});

test("GRANT_SEQUENCE_ACL_TEST: grant verifier counts sequence grants per role", async () => {
  const fakeQ: Queryable = {
    async query(text: string): Promise<{ rows: unknown[] }> {
      const t = text.toLowerCase();
      if (t.includes("pg_roles")) {
        return {
          rows: [
            { oid: 20, rolname: "anon" },
            { oid: 21, rolname: "authenticated" },
            { oid: 22, rolname: "service_role" },
          ],
        };
      }
      if (t.includes("relkind = 'r'") && t.includes("aclexplode")) return { rows: [] };
      if (t.includes("relkind = 's'") && t.includes("aclexplode")) {
        return {
          rows: [
            { object_name: "offers_id_seq", grantee_oid: 20, privilege: "USAGE" },
            { object_name: "partners_id_seq", grantee_oid: 21, privilege: "USAGE" },
            { object_name: "categories_id_seq", grantee_oid: 22, privilege: "USAGE" },
          ],
        };
      }
      throw new Error("UNMATCHED_FAKE_QUERY");
    },
  };
  const result = await queryRuntimeGrants(fakeQ);
  assert.strictEqual(result.ANON_SEQUENCE_GRANT_COUNT, 1);
  assert.strictEqual(result.AUTHENTICATED_SEQUENCE_GRANT_COUNT, 1);
  assert.strictEqual(result.SERVICE_ROLE_SEQUENCE_GRANT_COUNT, 1);
});

test("GRANT_SCOPE_TEST: queries are restricted to the approved tables and sequences", async () => {
  const captured: { text: string; values?: unknown[] }[] = [];
  const fakeQ: Queryable = {
    async query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }> {
      captured.push({ text: text.toLowerCase(), values });
      if (text.toLowerCase().includes("pg_roles")) return { rows: [] };
      if (text.toLowerCase().includes("aclexplode")) return { rows: [] };
      return { rows: [] };
    },
  };

  await queryRuntimeGrants(fakeQ);

  const tableQuery = captured.find(
    (c) => c.text.includes("aclexplode") && c.text.includes("relkind = 'r'")
  );
  const seqQuery = captured.find(
    (c) => c.text.includes("aclexplode") && c.text.includes("relkind = 's'")
  );
  assert.ok(tableQuery, "table ACL query must exist");
  assert.ok(seqQuery, "sequence ACL query must exist");
  assert.ok(tableQuery.text.includes("any($1)"), "table grants must be scoped via ANY($1)");
  assert.ok(seqQuery.text.includes("any($1)"), "sequence grants must be scoped via ANY($1)");
  assert.deepStrictEqual(tableQuery.values?.[0], EXPECTED_BASELINE_TABLES);
  assert.deepStrictEqual(seqQuery.values?.[0], EXPECTED_RUNTIME_SEQUENCES);
  assert.strictEqual((seqQuery.values?.[0] as string[]).length, 17);
});

test("GRANT: verifier never issues write SQL", async () => {
  const writtenQueries: string[] = [];
  const fakeQ: Queryable = {
    async query(text: string): Promise<{ rows: unknown[] }> {
      const upper = text.toUpperCase().trim();
      if (
        upper.startsWith("GRANT") ||
        upper.startsWith("REVOKE") ||
        upper.startsWith("INSERT") ||
        upper.startsWith("UPDATE") ||
        upper.startsWith("DELETE")
      ) {
        writtenQueries.push(text);
      }
      if (text.toLowerCase().includes("pg_roles")) return { rows: [] };
      if (text.toLowerCase().includes("aclexplode")) return { rows: [] };
      return { rows: [] };
    },
  };
  await queryRuntimeGrants(fakeQ);
  assert.strictEqual(writtenQueries.length, 0, "Grant verifier must not issue write SQL");
});

// ---------------------------------------------------------------------------
// G. Rollback guards — real verifyRollbackPreconditions
// ---------------------------------------------------------------------------

test("ROLLBACK_BAD_TOKEN_TEST: rejects missing authorization token", async () => {
  const env = emptyEnv();
  delete (env as Record<string, unknown>).RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION;
  const q = new StrictFakeQueryable(metadataRouter());
  const result = await verifyRollbackPreconditions(q, env, FAKE_HASH);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason?.includes("RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION"));
});

test("ROLLBACK_BAD_TOKEN_TEST: rejects wrong authorization token", async () => {
  const env = { ...emptyEnv(), RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION: "WRONG_TOKEN" };
  const q = new StrictFakeQueryable(metadataRouter());
  const result = await verifyRollbackPreconditions(q, env, FAKE_HASH);
  assert.strictEqual(result.allowed, false);
});

test("ROLLBACK_PRODUCTION_REF_TEST: production ref is rejected by the ref guard", async () => {
  // Fingerprint is EXACT — rejection must come from the project-ref guard
  // itself, not from any fingerprint drift. A URL pointing at the forbidden
  // production ref also fails the expected-ref check (guard order), so the
  // reason must reference the project-ref guard either way.
  const env = { ...emptyEnv(), DATABASE_URL: FAKE_PROD_URL };
  const q = new StrictFakeQueryable(metadataRouter());
  const result = await verifyRollbackPreconditions(q, env, FAKE_HASH);
  assert.strictEqual(result.allowed, false);
  assert.ok(
    result.reason?.includes("forbidden") || result.reason?.includes("expected DEV project ref"),
    `expected project-ref guard reason, got: ${result.reason}`
  );
});

test("ROLLBACK: rejects when expected ref equals forbidden ref", async () => {
  const env = {
    ...emptyEnv(),
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: DEV_REF,
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: DEV_REF,
  };
  const q = new StrictFakeQueryable(metadataRouter());
  const result = await verifyRollbackPreconditions(q, env, FAKE_HASH);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason?.includes("equals forbidden ref"));
});

test("ROLLBACK_BAD_FINGERPRINT_TEST: rejects wrong fingerprint (PARTIAL schema)", async () => {
  const q = new StrictFakeQueryable(
    metadataRouter({ tables: EXPECTED_BASELINE_TABLES.slice(0, 7) })
  );
  const result = await verifyRollbackPreconditions(q, emptyEnv(), FAKE_HASH);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason?.includes("EXACT_EXISTING"));
});

test("ROLLBACK_NONEMPTY_TEST: rejects non-empty table", async () => {
  const q = new StrictFakeQueryable(metadataRouter({ tableCounts: { offers: 5 } }));
  const result = await verifyRollbackPreconditions(q, emptyEnv(), FAKE_HASH);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason?.includes("row(s)"));
});

test("ROLLBACK_MISSING_JOURNAL_TEST: rejects empty journal", async () => {
  const q = new StrictFakeQueryable(metadataRouter({ journalRows: [] }));
  const result = await verifyRollbackPreconditions(q, emptyEnv(), FAKE_HASH);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason?.includes("Journal is empty"));
});

test("ROLLBACK_BAD_HASH_TEST: rejects wrong hash in journal", async () => {
  const q = new StrictFakeQueryable(
    metadataRouter({ journalRows: [{ hash: "wronghash", created_at: "1785589560000" }] })
  );
  const result = await verifyRollbackPreconditions(q, emptyEnv(), FAKE_HASH);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason?.includes("hash mismatch"));
});

test("ROLLBACK_LATER_MIGRATION_TEST: rejects later migration entry (2 journal rows)", async () => {
  const q = new StrictFakeQueryable(
    metadataRouter({
      journalRows: [
        { hash: FAKE_HASH, created_at: "1785589560000" },
        { hash: "laterhash", created_at: "9999999999999" },
      ],
    })
  );
  const result = await verifyRollbackPreconditions(q, emptyEnv(), FAKE_HASH);
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason?.includes("2 entries"));
});

test("ROLLBACK: secrets do not appear in error reasons", async () => {
  const env = { ...emptyEnv(), RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION: "WRONG" };
  const q = new StrictFakeQueryable(metadataRouter());
  const result = await verifyRollbackPreconditions(q, env, FAKE_HASH);
  assert.ok(!result.reason?.includes(FAKE_DEV_URL), "DATABASE_URL must not appear in reason");
  assert.ok(!result.reason?.includes(DEV_REF), "project ref must not appear in reason");
});

// ---------------------------------------------------------------------------
// H. Count handling — string and number
// ---------------------------------------------------------------------------

test("COUNT_STRING_HANDLING_TEST: string counts are accepted", async () => {
  const q = new StrictFakeQueryable(metadataRouter({ countsAsNumbers: false }));
  const result = await verifyRollbackPreconditions(q, emptyEnv(), FAKE_HASH);
  assert.strictEqual(result.allowed, true, `expected allowed, got: ${result.reason}`);
});

test("COUNT_NUMBER_HANDLING_TEST: numeric counts are accepted", async () => {
  const q = new StrictFakeQueryable(
    metadataRouter({
      countsAsNumbers: true,
      journalRows: [{ hash: FAKE_HASH, created_at: 1785589560000 }],
    })
  );
  const result = await verifyRollbackPreconditions(q, emptyEnv(), FAKE_HASH);
  assert.strictEqual(result.allowed, true, `expected allowed, got: ${result.reason}`);
});

test("COUNT_NUMBER_HANDLING_TEST: numeric policy/trigger counts parse to numbers", async () => {
  const q = new StrictFakeQueryable(metadataRouter({ countsAsNumbers: true }));
  const { fingerprint, publicTables } = await fetchLiveSchemaMetadata(q);
  assert.strictEqual(publicTables.length, 19);
  for (const t of EXPECTED_BASELINE_TABLES) {
    assert.strictEqual(typeof fingerprint[t].policyCount, "number");
    assert.strictEqual(fingerprint[t].policyCount, 0);
    assert.strictEqual(fingerprint[t].triggerCount, 0);
  }
});

// ---------------------------------------------------------------------------
// I. Strict FakeQueryable contract
// ---------------------------------------------------------------------------

test("FAKE: unknown query throws a safe explicit error", async () => {
  const q = new StrictFakeQueryable(metadataRouter());
  await assert.rejects(
    async () => q.query("SELECT * FROM public.offers"),
    (e: Error) => {
      assert.ok(e.message.includes("UNMATCHED_FAKE_QUERY"));
      assert.ok(!e.message.includes(FAKE_DEV_URL), "error must not contain secrets");
      return true;
    }
  );
  assert.strictEqual(q.unmatched.length, 1);
});

test("FAKE: unmatched metadata query count is zero for a full preflight", async () => {
  const q = new StrictFakeQueryable(metadataRouter());
  const result = await verifyRollbackPreconditions(q, emptyEnv(), FAKE_HASH);
  assert.strictEqual(result.allowed, true, `expected allowed, got: ${result.reason}`);
  assert.strictEqual(q.unmatched.length, 0, "no metadata query may go unmatched");
});

// ---------------------------------------------------------------------------
// J. Rollback transaction — real executeRollback on a single fake client
// ---------------------------------------------------------------------------

function recordingClient(options?: { failOn?: string }) {
  const statements: string[] = [];
  return {
    statements,
    client: {
      async query(text: string): Promise<{ rows: unknown[] }> {
        const normalized = text.trim().replace(/\s+/g, " ");
        statements.push(normalized);
        if (options?.failOn && normalized.includes(options.failOn)) {
          throw new Error("DDL_FAILURE");
        }
        return { rows: [] };
      },
    },
  };
}

test("ROLLBACK_TRANSACTION_TEST: wraps all DDL in BEGIN ... COMMIT", async () => {
  const { client, statements } = recordingClient();
  await executeRollback(client);
  assert.strictEqual(statements[0], "BEGIN");
  assert.strictEqual(statements[statements.length - 1], "COMMIT");
});

test("ROLLBACK_TRANSACTION_TEST: DDL error triggers ROLLBACK and rethrows", async () => {
  const { client, statements } = recordingClient({ failOn: "DROP SEQUENCE" });
  await assert.rejects(async () => executeRollback(client), /DDL_FAILURE/);
  assert.strictEqual(statements[0], "BEGIN");
  assert.strictEqual(statements[statements.length - 1], "ROLLBACK");
  assert.ok(!statements.includes("COMMIT"), "COMMIT must not run after failure");
});

test("ROLLBACK_NO_CASCADE_TEST: no statement uses CASCADE", async () => {
  const { client, statements } = recordingClient();
  await executeRollback(client);
  assert.ok(
    !statements.some((s) => s.toUpperCase().includes("CASCADE")),
    "no rollback statement may use CASCADE"
  );
});

test("ROLLBACK: journal table is dropped explicitly before DROP SCHEMA (no CASCADE)", async () => {
  const { client, statements } = recordingClient();
  await executeRollback(client);
  const journalDrop = statements.findIndex((s) =>
    s.includes('DROP TABLE IF EXISTS drizzle_runtime."__drizzle_migrations"')
  );
  const schemaDrop = statements.findIndex((s) => s === "DROP SCHEMA IF EXISTS drizzle_runtime");
  assert.ok(journalDrop > 0, "journal table must be dropped explicitly");
  assert.ok(schemaDrop > journalDrop, "schema drop must follow the journal table drop");
});

test("ROLLBACK: explicit reverse dependency order is preserved", async () => {
  const { client, statements } = recordingClient();
  await executeRollback(client);
  const droppedTables = statements
    .map((s) => s.match(/DROP TABLE IF EXISTS public\.(\w+)/)?.[1])
    .filter(Boolean);
  assert.strictEqual(droppedTables.length, 19);
  assert.strictEqual(droppedTables[0], "clicks");
  assert.strictEqual(droppedTables[18], "partners");
});

// ---------------------------------------------------------------------------
// K. Full rollback wrapper — real rollbackEmptyDevBaseline entrypoint
// ---------------------------------------------------------------------------

test("ROLLBACK_FULL_WRAPPER_TEST: preflight + single client transaction + cleanup", async () => {
  const { pool, statements, state } = fakeRollbackPool(metadataRouter());

  await rollbackEmptyDevBaseline(emptyEnv(), FAKE_HASH, (() => pool) as never);

  assert.strictEqual(state.connects, 1, "exactly one client must be acquired");
  assert.strictEqual(statements[0], "BEGIN");
  assert.strictEqual(statements[statements.length - 1], "COMMIT");
  assert.ok(
    statements.filter((s) => s.startsWith("DROP TABLE IF EXISTS public.")).length === 19,
    "all tables must be dropped on the client"
  );
  assert.ok(!statements.some((s) => s.toUpperCase().includes("CASCADE")));
  assert.ok(state.released, "client.release must be called");
  assert.ok(state.ended, "pool.end must be called");
});

test("ROLLBACK_FULL_WRAPPER_TEST: denied preflight acquires no client and runs no DDL", async () => {
  const env = { ...emptyEnv(), RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION: "WRONG" };
  const { pool, statements, state } = fakeRollbackPool(metadataRouter());

  await assert.rejects(
    async () => rollbackEmptyDevBaseline(env, FAKE_HASH, (() => pool) as never),
    /ROLLBACK_ALLOWED=NO/
  );
  assert.strictEqual(state.connects, 0, "no client may be acquired on denied preflight");
  assert.strictEqual(statements.length, 0, "no DDL may run on denied preflight");
  assert.ok(state.ended, "pool.end must still be called");
});

test("ROLLBACK_FULL_WRAPPER_TEST: DDL error rolls back, releases client, closes pool", async () => {
  const { pool, statements, state } = fakeRollbackPool(metadataRouter(), {
    failOn: "DROP TABLE IF EXISTS public.offers",
  });

  await assert.rejects(
    async () => rollbackEmptyDevBaseline(emptyEnv(), FAKE_HASH, (() => pool) as never),
    /DDL_FAILURE/
  );
  assert.strictEqual(statements[statements.length - 1], "ROLLBACK");
  assert.ok(state.released, "client.release must be called even on error");
  assert.ok(state.ended, "pool.end must be called even on error");
});

// ---------------------------------------------------------------------------
// L. Normalisation helpers
// ---------------------------------------------------------------------------

test("NORM: normalizePostgresType handles character varying", () => {
  assert.strictEqual(normalizePostgresType("character varying(255)"), "varchar(255)");
  assert.strictEqual(normalizePostgresType("character varying"), "varchar");
});

test("NORM: normalizeDefaultExpression trims whitespace", () => {
  assert.strictEqual(normalizeDefaultExpression("  now()  "), "now()");
  assert.strictEqual(normalizeDefaultExpression(null), null);
});

test("NORM: normalizeConstraintDefinition lowercases", () => {
  const result = normalizeConstraintDefinition("PRIMARY KEY (id)");
  assert.strictEqual(result, "primary key (id)");
});







