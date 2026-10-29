import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";

import { runMigrations } from "../../scripts/database/run-runtime-migrations";
import { classifyRuntimeTarget,fetchLiveSchemaMetadata } from "../../scripts/database/verify-runtime-schema-fingerprint";
const run=promisify(execFile);
const secret="synthetic-local-hmac-secret-for-db-tests";
const valid=(key=randomUUID(),email=`${randomUUID()}@example.test`)=>({companyName:"Synthetic Partner",countryCode:"PL",contactEmail:email,businessType:"manufacturer" as const,taxIdentifier:"PL-SYNTHETIC",locale:"pl" as const,submissionKey:key,privacyNoticeVersion:"LOCAL_FIXTURE_ONLY" as const,website:"" as const});
test("Partner application real LOCAL PostgreSQL proof",async t=>{
 if(!process.env.PARTNER_APPLICATION_TEST_URL){t.skip("No classified LOCAL application database");return;}
 const {submitApplicationCore,reviewApplicationCore}=await import("@/lib/partner-applications/service");
 const url=new URL(process.env.PARTNER_APPLICATION_TEST_URL);
 assert.equal(process.env.PARTNER_APPLICATION_DB_TESTS,"LOCAL_ISOLATED_15479");assert.equal(url.hostname,"127.0.0.1");assert.equal(url.port,"15479");assert.equal(url.pathname,"/lm_partner_application_test");
 const pool=new Pool({connectionString:url.toString(),max:8});t.after(()=>pool.end());const db=drizzle(pool,{schema});
 const identity=await pool.query("SELECT current_database() AS db,inet_server_port() AS port");assert.equal(identity.rows[0].db,"lm_partner_application_test");assert.equal(identity.rows[0].port,15479);
 const migrationEnv={...process.env,DATABASE_URL:url.toString(),RUNTIME_MIGRATION_TARGET:"development",RUNTIME_MIGRATION_EXPECTED_PROJECT_REF:"localhost",RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF:"tpjsiutclowwaxlopemn",RUNTIME_MIGRATION_WRITE_AUTHORIZATION:"AUTHORIZED_DEV_BASELINE_WRITE"};
 await t.test("runner exact 0025 and durable journal no-op",async()=>{
  await runMigrations(migrationEnv);await runMigrations(migrationEnv);
  const m=await fetchLiveSchemaMetadata(pool);assert.equal(classifyRuntimeTarget(m.fingerprint,m.publicTables,m.security).state,"EXACT_EXISTING_POST_0025");
  const j=await pool.query("SELECT count(*)::int n FROM drizzle_runtime.__drizzle_migrations");assert.equal(j.rows[0].n,26);
 });
 await t.test("production migration refuses before client acquisition",async()=>{
  let opened=false;await assert.rejects(runMigrations({...migrationEnv,RUNTIME_MIGRATION_TARGET:"production",RUNTIME_MIGRATION_WRITE_AUTHORIZATION:"AUTHORIZED_PROD_RUNTIME_0000_TO_0003"},()=>{opened=true;throw Error("opened");}),/separate Owner/);assert.equal(opened,false);
 });
 await t.test("anonymous, verified actor, same-key concurrency, changed payload and domain isolation",async()=>{
  const tables=["partners","seller_legal_identities","seller_tax_identifiers","seller_eligibility","seller_verification_events","partner_user_memberships","partner_agreement_execution_evidence","offers","orders","rfq_leads"];
  const before=await Promise.all(tables.map(n=>pool.query(`SELECT count(*)::int n FROM public.${n}`)));
  const value=valid();const results=await Promise.all(Array.from({length:5},()=>submitApplicationCore(db,value,null,secret)));
  assert.ok(results.every(r=>r.code === "received"));
  assert.equal((await submitApplicationCore(db,{...value,companyName:"Changed"},null,secret)).code,"conflict");
  const actor=randomUUID();await submitApplicationCore(db,valid(),actor,secret);
  const match=await pool.query("SELECT id,version FROM public.partner_applications WHERE contact_email=$1",[value.contactEmail]);assert.equal(match.rowCount,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM public.partner_application_events WHERE application_id=$1",[match.rows[0].id])).rows[0].n,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM public.partner_applications WHERE submitted_auth_user_id=$1",[actor])).rows[0].n,1);
  for(let i=0;i<tables.length;i++)assert.equal((await pool.query(`SELECT count(*)::int n FROM public.${tables[i]}`)).rows[0].n,before[i].rows[0].n,tables[i]);
 });
 await t.test("cross-process shared limits",async()=>{
  const email=`${randomUUID()}@example.test`;
  const result=await Promise.all(Array.from({length:8},()=>run(process.execPath,["--conditions=react-server","--import=tsx","tests/partners/fixtures/application-worker.ts",JSON.stringify(valid(randomUUID(),email))],{env:process.env})));
  assert.equal(result.filter(r=>r.stdout === "received").length,5);assert.equal(result.filter(r=>r.stdout === "limited").length,3);
  assert.equal((await pool.query("SELECT count(*)::int n FROM public.partner_applications WHERE contact_email=$1",[email])).rows[0].n,5);
 });
 await t.test("version races, transitions, actor audit and immutable history",async()=>{
  const input=valid();await submitApplicationCore(db,input,null,secret);
  const row=(await pool.query("SELECT id FROM public.partner_applications WHERE contact_email=$1",[input.contactEmail])).rows[0];const actor=randomUUID();
  const review={applicationId:row.id,expectedVersion:1,status:"under_review",reason:"Synthetic review",note:"Internal synthetic note"};
  const results=await Promise.all([reviewApplicationCore(db,actor,review),reviewApplicationCore(db,randomUUID(),review)]);assert.equal(results.filter(r=>r.code === "updated").length,1);assert.equal(results.filter(r=>r.code === "conflict").length,1);
  assert.equal((await reviewApplicationCore(db,actor,{...review,expectedVersion:2,status:"submitted"})).code,"invalid");
  assert.equal((await reviewApplicationCore(db,actor,{...review,expectedVersion:2,status:"accepted_for_onboarding"})).code,"updated");
  const history=await pool.query("SELECT * FROM public.partner_application_events WHERE application_id=$1 ORDER BY version",[row.id]);assert.equal(history.rowCount,3);assert.ok(history.rows[1].actor_id);assert.equal(history.rows[2].actor_id,actor);
  await assert.rejects(pool.query("UPDATE public.partner_application_events SET note='tamper' WHERE application_id=$1",[row.id]),/APPEND_ONLY/);
  await assert.rejects(pool.query("DELETE FROM public.partner_application_events WHERE application_id=$1",[row.id]),/APPEND_ONLY/);
  await assert.rejects(pool.query("INSERT INTO public.partner_application_events(application_id,version,to_status,reason,note) VALUES($1,4,'submitted','forged','')",[row.id]),/APPEND_ONLY/);
 });
 await t.test("RLS and grants block Data API roles, also under an accidental grant",async()=>{
  const client=await pool.connect();try{
   for(const role of ["anon","authenticated","service_role"]){
    await client.query("BEGIN");await client.query(`SET LOCAL ROLE ${role}`);
    for(const table of ["partner_applications","partner_application_events","partner_application_limits"]){
     await client.query("SAVEPOINT denied");await assert.rejects(client.query(`SELECT * FROM public.${table}`),e=>(e as {code:string}).code === "42501");await client.query("ROLLBACK TO denied");
    }await client.query("ROLLBACK");
   }
   await client.query("BEGIN");await client.query("GRANT SELECT,INSERT ON public.partner_applications TO anon");await client.query("SET LOCAL ROLE anon");
   assert.equal((await client.query("SELECT * FROM public.partner_applications")).rowCount,0);
   await assert.rejects(client.query("INSERT INTO public.partner_applications(company_name) VALUES('forged')"),e=>(e as {code:string}).code === "42501");await client.query("ROLLBACK");
  }finally{await client.query("ROLLBACK");client.release();}
 });
});
