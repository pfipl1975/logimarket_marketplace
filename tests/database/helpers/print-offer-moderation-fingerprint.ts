// QA-only metadata proof, never connects to shared or production databases.
import { Pool } from "pg";
import { fetchLiveSchemaMetadata } from "../../../scripts/database/verify-runtime-schema-fingerprint";
async function main() {
  const exact = "postgres://postgres:password@localhost:5432/logimarket_test";
  if (process.env.GITHUB_ACTIONS !== "true" ||
      process.env.E2E_DB_CLASSIFICATION !== "ISOLATED_DISPOSABLE_TEST" ||
      process.env.TEST_DATABASE_URL !== exact) {
    throw new Error("BLOCKED_NO_SAFE_QA_DB: isolated CI PostgreSQL required");
  }
  const pool = new Pool({ connectionString: exact, max: 1 });
  try {
    const { fingerprint, security } = await fetchLiveSchemaMetadata(pool);
    const table = fingerprint["offer_moderation_events"];
    if (!table || !table.rlsEnabled || table.triggerCount < 2) {
      throw new Error("Candidate moderation table missing RLS or append-only triggers");
    }
    for (const role of ["anon","authenticated","service_role"]) {
      const grant = await pool.query(
        "SELECT has_table_privilege($1,'public.offer_moderation_events','SELECT') AS readable, has_table_privilege($1,'public.offer_moderation_events','INSERT') AS writable", [role]
      );
      if (grant.rows[0].readable || grant.rows[0].writable) throw new Error("Forbidden client grant: " + role);
    }
    process.stdout.write("LM0026_ACTUAL_TABLE_FINGERPRINT=" + JSON.stringify(table) + "\n");
    process.stdout.write("LM0026_SECURITY_CONTRACT=" + JSON.stringify(security) + "\n");
    process.stdout.write("LM0026_ISOLATED_DDL_PROOF=PASS\n");
  } finally {
    await pool.end();
  }
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
