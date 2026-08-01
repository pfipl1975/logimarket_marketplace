/**
 * verify-runtime-data-api-grants.ts
 *
 * Verifies Data API grants on runtime tables and sequences using pg ACL metadata.
 *
 * IMPORT SIDE-EFFECTS: NONE.
 * Does not create pg.Pool at import time.
 * Does not read DATABASE_URL at import time.
 * Accepts a Queryable injected by the caller.
 * Does not execute GRANT or REVOKE.
 */

import { EXPECTED_BASELINE_TABLES } from "./runtime-migration-contract";
import { Queryable } from "./verify-runtime-schema-fingerprint";

// ---------------------------------------------------------------------------
// Approved runtime objects — derived from the fixed contract only, never
// from user input. All 15 runtime sequences follow the <table>_id_seq pattern
// (see EXPECTED_SEQUENCES in rollback-empty-development-baseline.ts).
// ---------------------------------------------------------------------------

const EXPECTED_RUNTIME_SEQUENCES: readonly string[] = EXPECTED_BASELINE_TABLES.map(
  (t) => `${t}_id_seq`
);

// ---------------------------------------------------------------------------
// Grant result shape
// ---------------------------------------------------------------------------

export type GrantCounts = {
  ANON_TABLE_GRANT_COUNT: number;
  AUTHENTICATED_TABLE_GRANT_COUNT: number;
  SERVICE_ROLE_TABLE_GRANT_COUNT: number;
  ANON_SEQUENCE_GRANT_COUNT: number;
  AUTHENTICATED_SEQUENCE_GRANT_COUNT: number;
  SERVICE_ROLE_SEQUENCE_GRANT_COUNT: number;
};

// ---------------------------------------------------------------------------
// queryRuntimeGrants — pure metadata reader, no writes
// ---------------------------------------------------------------------------

export async function queryRuntimeGrants(q: Queryable): Promise<GrantCounts> {
  // Table grants (relkind = 'r')
  const tableResult = await q.query(`
    SELECT
      c.relname AS object_name,
      (aclexplode(COALESCE(c.relacl, acldefault('r'::"char", c.relowner)))).grantee AS grantee_oid,
      (aclexplode(COALESCE(c.relacl, acldefault('r'::"char", c.relowner)))).privilege_type AS privilege
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = ANY($1)
  `, [EXPECTED_BASELINE_TABLES]);

  type AclRow = { object_name: string; grantee_oid: number; privilege: string };

  // Sequence grants (relkind = 'S') — restricted to the 15 approved sequences
  const seqResult = await q.query(`
    SELECT
      c.relname AS object_name,
      (aclexplode(COALESCE(c.relacl, acldefault('S'::"char", c.relowner)))).grantee AS grantee_oid,
      (aclexplode(COALESCE(c.relacl, acldefault('S'::"char", c.relowner)))).privilege_type AS privilege
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'S'
      AND c.relname = ANY($1)
  `, [EXPECTED_RUNTIME_SEQUENCES]);

  // Resolve role OIDs to names
  const oidResult = await q.query(`
    SELECT oid, rolname FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated', 'service_role')
  `);
  const oidMap = Object.fromEntries(
    (oidResult.rows as { oid: number; rolname: string }[]).map((r) => [r.oid, r.rolname])
  );

  function countForRole(rows: AclRow[], role: string): number {
    const roleOids = Object.entries(oidMap)
      .filter(([, name]) => name === role)
      .map(([oid]) => parseInt(oid));
    return rows.filter((r) => roleOids.includes(r.grantee_oid)).length;
  }

  const tableRows = tableResult.rows as AclRow[];
  const seqRows = seqResult.rows as AclRow[];

  return {
    ANON_TABLE_GRANT_COUNT: countForRole(tableRows, "anon"),
    AUTHENTICATED_TABLE_GRANT_COUNT: countForRole(tableRows, "authenticated"),
    SERVICE_ROLE_TABLE_GRANT_COUNT: countForRole(tableRows, "service_role"),
    ANON_SEQUENCE_GRANT_COUNT: countForRole(seqRows, "anon"),
    AUTHENTICATED_SEQUENCE_GRANT_COUNT: countForRole(seqRows, "authenticated"),
    SERVICE_ROLE_SEQUENCE_GRANT_COUNT: countForRole(seqRows, "service_role"),
  };
}

// ---------------------------------------------------------------------------
// Entrypoint (CLI usage only — used by db:runtime:verify-grants npm script)
// ---------------------------------------------------------------------------

async function main() {
  const { Pool } = await import("pg");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");

  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  try {
    const counts = await queryRuntimeGrants(pool);
    console.log(`ANON_TABLE_GRANT_COUNT=${counts.ANON_TABLE_GRANT_COUNT}`);
    console.log(`AUTHENTICATED_TABLE_GRANT_COUNT=${counts.AUTHENTICATED_TABLE_GRANT_COUNT}`);
    console.log(`SERVICE_ROLE_TABLE_GRANT_COUNT=${counts.SERVICE_ROLE_TABLE_GRANT_COUNT}`);
    console.log(`ANON_SEQUENCE_GRANT_COUNT=${counts.ANON_SEQUENCE_GRANT_COUNT}`);
    console.log(`AUTHENTICATED_SEQUENCE_GRANT_COUNT=${counts.AUTHENTICATED_SEQUENCE_GRANT_COUNT}`);
    console.log(`SERVICE_ROLE_SEQUENCE_GRANT_COUNT=${counts.SERVICE_ROLE_SEQUENCE_GRANT_COUNT}`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Grant verification failed:", e.message);
    process.exit(1);
  });
}
