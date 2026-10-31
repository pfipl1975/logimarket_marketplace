// QA-only metadata proof, never connects to shared or production databases.
import { Pool } from "pg";
import { fetchLiveSchemaMetadata, classifyRuntimeTarget } from "../../../scripts/database/verify-runtime-schema-fingerprint";
async function main() {
  const exact = "postgres://postgres:password@localhost:5432/logimarket_test";
  if (process.env.GITHUB_ACTIONS !== "true" ||
      process.env.E2E_DB_CLASSIFICATION !== "ISOLATED_DISPOSABLE_TEST" ||
      process.env.TEST_DATABASE_URL !== exact) {
    throw new Error("BLOCKED_NO_SAFE_QA_DB: isolated CI PostgreSQL required");
  }
  const pool = new Pool({ connectionString: exact, max: 1 });
  try {
    const { fingerprint, publicTables, security } = await fetchLiveSchemaMetadata(pool);
    if (classifyRuntimeTarget(fingerprint, publicTables, security).state !== "EXACT_EXISTING_POST_0026") {
      throw new Error("Canonical POST_0026 fingerprint mismatch");
    }
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
    // Real append-only negative proofs. All fixture inserts are rolled back.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const partner = (await client.query("INSERT INTO public.partners (company_name,contact_email) VALUES ('LM0026 QA','qa@example.test') RETURNING id")).rows[0];
      const category = (await client.query("INSERT INTO public.categories (name,slug) VALUES ('LM0026 QA','lm0026-proof') RETURNING id")).rows[0];
      const offer = (await client.query("INSERT INTO public.offers (partner_id,category_id,title) VALUES ($1,$2,'LM0026 QA') RETURNING id", [partner.id,category.id])).rows[0];
      const event = (await client.query(
        "INSERT INTO public.offer_moderation_events (offer_id,partner_id,admin_actor_id,decision,from_status,to_status,reason) VALUES ($1,$2,'00000000-0000-4000-8000-000000000001','returned_for_correction','pending_review','draft','Correct specification') RETURNING id",
        [offer.id,partner.id])).rows[0];
      for (const statement of [
        "UPDATE public.offer_moderation_events SET reason='tampered' WHERE id=$1",
        "DELETE FROM public.offer_moderation_events WHERE id=$1",
        "TRUNCATE public.offer_moderation_events",
      ]) {
        await client.query("SAVEPOINT lm0026_guard");
        let rejected = false;
        try { await client.query(statement, statement.includes("$1") ? [event.id] : []); }
        catch (error) { rejected = error instanceof Error && error.message.includes("OFFER_MODERATION_HISTORY_APPEND_ONLY"); }
        await client.query("ROLLBACK TO SAVEPOINT lm0026_guard");
        if (!rejected) throw new Error("Append-only guard failed: " + statement);
      }
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
    process.stdout.write("LM0026_ACTUAL_TABLE_FINGERPRINT=" + JSON.stringify(table) + "\n");
    process.stdout.write("LM0026_SECURITY_CONTRACT=" + JSON.stringify(security) + "\n");
    process.stdout.write("LM0026_ISOLATED_DDL_PROOF=PASS\n");
  } finally {
    await pool.end();
  }
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
