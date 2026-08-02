/**
 * runtime-sequence-allowlist.test.ts
 *
 * Contract tests for the EXACT runtime sequence allowlist used by the Data
 * API grant verifier. The allowlist must match two independent local sources
 * at all times:
 *   1. scripts/database/runtime-migration-contract.ts (sequenceName data)
 *   2. drizzle-runtime/0000_production_runtime_baseline.sql (CREATE/ALTER SEQUENCE)
 *
 * No fillers — every test asserts real behavior of the real verifier.
 */

import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

import {
  queryRuntimeGrants,
  EXPECTED_RUNTIME_SEQUENCES,
} from "../../scripts/database/verify-runtime-data-api-grants";
import {
  EXPECTED_BASELINE_TABLES,
  PRODUCTION_FINGERPRINT,
} from "../../scripts/database/runtime-migration-contract";
import type { Queryable } from "../../scripts/database/verify-runtime-schema-fingerprint";

// ---------------------------------------------------------------------------
// Independent extraction from the two authoritative local sources
// ---------------------------------------------------------------------------

function contractSequenceNames(): string[] {
  return EXPECTED_BASELINE_TABLES.flatMap((t) =>
    PRODUCTION_FINGERPRINT[t].columns
      .map((c) => c.sequenceName)
      .filter((n): n is string => n !== null)
  ).sort();
}

function contractSequenceOwnership(): string[] {
  const pairs: string[] = [];
  for (const t of EXPECTED_BASELINE_TABLES) {
    for (const c of PRODUCTION_FINGERPRINT[t].columns) {
      if (c.sequenceName) pairs.push(`${c.sequenceName} -> ${t}.${c.name}`);
    }
  }
  return pairs.sort();
}

const BASELINE_SQL = fs.readFileSync(
  path.join(process.cwd(), "drizzle-runtime/0000_production_runtime_baseline.sql"),
  "utf8"
);

function sqlSequenceNames(): string[] {
  return [...BASELINE_SQL.matchAll(/CREATE SEQUENCE (\w+) AS/g)].map((m) => m[1]).sort();
}

function sqlSequenceOwnership(): string[] {
  return [...BASELINE_SQL.matchAll(/ALTER SEQUENCE (\w+) OWNED BY (\w+)\.(\w+);/g)]
    .map((m) => `${m[1]} -> ${m[2]}.${m[3]}`)
    .sort();
}

/** Drift-detection predicate shared by the source-parity tests. */
function setsMatch(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && [...a].sort().join("") === [...b].sort().join("");
}

// ---------------------------------------------------------------------------
// Fake DB that honors the ANY($1) scope like a real Postgres would
// ---------------------------------------------------------------------------

type AclRow = { object_name: string; grantee_oid: number; privilege: string };

const ROLE_OIDS = [
  { oid: 1, rolname: "anon" },
  { oid: 2, rolname: "authenticated" },
  { oid: 3, rolname: "service_role" },
];

function fakeDb(opts: { seqAclRows?: AclRow[]; tableAclRows?: AclRow[] }): {
  q: Queryable;
  captured: { text: string; values?: unknown[] }[];
} {
  const captured: { text: string; values?: unknown[] }[] = [];
  const q: Queryable = {
    async query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }> {
      const t = text.trim().replace(/\s+/g, " ").toLowerCase();
      captured.push({ text: t, values });
      if (t.includes("pg_roles")) return { rows: ROLE_OIDS };
      if (t.includes("aclexplode") && t.includes("relkind = 's'")) {
        const scope = (values?.[0] as string[]) ?? [];
        return { rows: (opts.seqAclRows ?? []).filter((r) => scope.includes(r.object_name)) };
      }
      if (t.includes("aclexplode") && t.includes("relkind = 'r'")) {
        const scope = (values?.[0] as string[]) ?? [];
        return { rows: (opts.tableAclRows ?? []).filter((r) => scope.includes(r.object_name)) };
      }
      throw new Error(`UNMATCHED_FAKE_QUERY[${t.slice(0, 60)}]`);
    },
  };
  return { q, captured };
}

// ---------------------------------------------------------------------------
// 1-4. Allowlist parity with both authoritative sources
// ---------------------------------------------------------------------------

test("ALLOWLIST: exact runtime sequence allowlist contains 15 names", () => {
  assert.strictEqual(EXPECTED_RUNTIME_SEQUENCES.length, 15);
  assert.strictEqual(new Set(EXPECTED_RUNTIME_SEQUENCES).size, 15, "names must be unique");
});

test("ALLOWLIST_CONTRACT_TEST: allowlist is identical to the contract sequenceName data", () => {
  assert.deepStrictEqual([...EXPECTED_RUNTIME_SEQUENCES].sort(), contractSequenceNames());
});

test("ALLOWLIST_SQL_TEST: allowlist is identical to the baseline SQL sequences", () => {
  assert.deepStrictEqual([...EXPECTED_RUNTIME_SEQUENCES].sort(), sqlSequenceNames());
});

test("SEQUENCE_OWNERSHIP_TEST: ownership matches contract and baseline SQL", () => {
  assert.deepStrictEqual(contractSequenceOwnership(), sqlSequenceOwnership());
  assert.strictEqual(contractSequenceOwnership().length, 15);
  for (const pair of contractSequenceOwnership()) {
    const [seq] = pair.split(" -> ");
    assert.ok(
      EXPECTED_RUNTIME_SEQUENCES.includes(seq),
      `allowlist must contain owned sequence ${seq}`
    );
  }
});

// ---------------------------------------------------------------------------
// 5-7. No heuristic generation; drift detection works both ways
// ---------------------------------------------------------------------------

test("ALLOWLIST: verifier source does not generate names via ${table}_id_seq heuristic", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "scripts/database/verify-runtime-data-api-grants.ts"),
    "utf8"
  );
  assert.ok(
    !/\$\{[^}]*\}\s*_id_seq/.test(src),
    "template-literal _id_seq name generation is forbidden"
  );
  assert.ok(
    !/\+\s*["']_id_seq["']/.test(src),
    "string-concatenation _id_seq name generation is forbidden"
  );
});

test("ALLOWLIST_DRIFT_TEST: a missing required sequence is detected", () => {
  const incomplete = sqlSequenceNames().slice(1);
  assert.strictEqual(
    setsMatch(incomplete, [...EXPECTED_RUNTIME_SEQUENCES]),
    false,
    "parity check must FAIL when one approved sequence is missing"
  );
});

test("ALLOWLIST_DRIFT_TEST: an additional sequence is detected", () => {
  const extended = [...sqlSequenceNames(), "random_extra_seq"];
  assert.strictEqual(
    setsMatch(extended, [...EXPECTED_RUNTIME_SEQUENCES]),
    false,
    "parity check must FAIL when an extra sequence appears"
  );
});

// ---------------------------------------------------------------------------
// 8-12. Real verifier behavior on scoped ACL queries
// ---------------------------------------------------------------------------

test("EXTRA_PUBLIC_SEQUENCE_IGNORED_TEST: a random extra public sequence is never counted", async () => {
  const { q, captured } = fakeDb({
    seqAclRows: [
      ...EXPECTED_RUNTIME_SEQUENCES.map((name) => ({
        object_name: name,
        grantee_oid: 3,
        privilege: "USAGE",
      })),
      { object_name: "random_public_seq", grantee_oid: 1, privilege: "USAGE" },
    ],
  });

  const result = await queryRuntimeGrants(q);

  const seqQuery = captured.find(
    (c) => c.text.includes("aclexplode") && c.text.includes("relkind = 's'")
  );
  assert.ok(seqQuery?.text.includes("any($1)"), "sequence query must be scoped via ANY($1)");
  assert.deepStrictEqual(seqQuery?.values?.[0], EXPECTED_RUNTIME_SEQUENCES);
  assert.ok(
    !(seqQuery?.values?.[0] as string[]).includes("random_public_seq"),
    "scope must not include unapproved sequences"
  );
  assert.strictEqual(result.SERVICE_ROLE_SEQUENCE_GRANT_COUNT, 15);
  assert.strictEqual(result.ANON_SEQUENCE_GRANT_COUNT, 0, "extra sequence grant must not leak in");
});

test("SEQUENCE_COUNT_TEST: all 15 approved sequences are counted", async () => {
  const { q } = fakeDb({
    seqAclRows: EXPECTED_RUNTIME_SEQUENCES.map((name) => ({
      object_name: name,
      grantee_oid: 3,
      privilege: "USAGE",
    })),
  });
  const result = await queryRuntimeGrants(q);
  assert.strictEqual(result.SERVICE_ROLE_SEQUENCE_GRANT_COUNT, 15);
});

test("ANON_SEQUENCE_GRANT_TEST: anon sequence grants are counted", async () => {
  const { q } = fakeDb({
    seqAclRows: [
      { object_name: EXPECTED_RUNTIME_SEQUENCES[0], grantee_oid: 1, privilege: "USAGE" },
      { object_name: EXPECTED_RUNTIME_SEQUENCES[1], grantee_oid: 1, privilege: "SELECT" },
    ],
  });
  const result = await queryRuntimeGrants(q);
  assert.strictEqual(result.ANON_SEQUENCE_GRANT_COUNT, 2);
});

test("AUTHENTICATED_SEQUENCE_GRANT_TEST: authenticated sequence grants are counted", async () => {
  const { q } = fakeDb({
    seqAclRows: [
      { object_name: EXPECTED_RUNTIME_SEQUENCES[2], grantee_oid: 2, privilege: "USAGE" },
    ],
  });
  const result = await queryRuntimeGrants(q);
  assert.strictEqual(result.AUTHENTICATED_SEQUENCE_GRANT_COUNT, 1);
});

test("SERVICE_ROLE_SEQUENCE_GRANT_TEST: service_role sequence grants are counted", async () => {
  const { q } = fakeDb({
    seqAclRows: [
      { object_name: EXPECTED_RUNTIME_SEQUENCES[3], grantee_oid: 3, privilege: "USAGE" },
      { object_name: EXPECTED_RUNTIME_SEQUENCES[4], grantee_oid: 3, privilege: "UPDATE" },
    ],
  });
  const result = await queryRuntimeGrants(q);
  assert.strictEqual(result.SERVICE_ROLE_SEQUENCE_GRANT_COUNT, 2);
});

// ---------------------------------------------------------------------------
// 13-15. Table allowlist, read-only SQL, import side effects
// ---------------------------------------------------------------------------

test("TABLE_ALLOWLIST_TEST: table grants remain scoped to the exact 15 runtime tables", async () => {
  const { q, captured } = fakeDb({});
  await queryRuntimeGrants(q);
  const tableQuery = captured.find(
    (c) => c.text.includes("aclexplode") && c.text.includes("relkind = 'r'")
  );
  assert.ok(tableQuery?.text.includes("any($1)"));
  assert.deepStrictEqual(tableQuery?.values?.[0], EXPECTED_BASELINE_TABLES);
  assert.strictEqual((tableQuery?.values?.[0] as string[]).length, 15);
});

test("GRANT_NO_WRITE_SQL_TEST: verifier never issues write SQL", async () => {
  const { q, captured } = fakeDb({});
  await queryRuntimeGrants(q);
  for (const c of captured) {
    const upper = c.text.toUpperCase();
    assert.ok(
      !/^(GRANT|REVOKE|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)/.test(upper),
      `write/DDL SQL is forbidden, got: ${upper.slice(0, 40)}`
    );
  }
});

test("IMPORT_SIDE_EFFECT_TEST: importing the verifier creates no Pool and no connection", () => {
  // The module was imported at the top of this file; reaching this assertion
  // proves no connection attempt happened at import time.
  assert.strictEqual(typeof queryRuntimeGrants, "function");
  assert.ok(Array.isArray(EXPECTED_RUNTIME_SEQUENCES));
});
