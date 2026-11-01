import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../src/lib/schema";
import { executeOfferPublicationStateChange } from "../../src/lib/admin/offer-publication-core";
import { executePartnerOfferSubmit } from "../../src/lib/partner-offers/submit-core";
import { runMigrations } from "../../scripts/database/run-runtime-migrations";
import { resetDisposableTestDatabase, validateDestructiveTestEnvironment } from "./helpers/destructive-db-safety";

const actor = "00000000-0000-4000-8000-000000000001";

test("ADMIN moderation is atomic, auditable and Partner resubmission stays tenant-scoped", async t => {
  const safety = validateDestructiveTestEnvironment(process.env);
  if (safety.type === "SKIP") { t.skip(safety.reason); return; }
  if (safety.type !== "PASS") throw new Error("BLOCKED_UNSAFE_QA_DB: " + safety.reason);
  const dbUrl = safety.url;
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = dbUrl;
  const pool = new Pool({ connectionString: dbUrl, max: 4 });
  t.after(async () => {
    await pool.end();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  });
  await resetDisposableTestDatabase(pool, { ...process.env, DATABASE_URL: originalUrl, TEST_DATABASE_URL: dbUrl });
  await runMigrations(process.env);

  const db = drizzle(pool, {schema});
  const newPartner = async (name: string) =>
    Number((await pool.query("INSERT INTO public.partners (company_name,contact_email) VALUES ($1,$2) RETURNING id",
      [name,name.toLowerCase().replace(/\s/g,"-")+"@example.test"])).rows[0].id);
  const partnerId = await newPartner("Moderation QA Seller");
  const otherPartnerId = await newPartner("Other QA Seller");
  const categoryId = Number((await pool.query("INSERT INTO public.categories (name,slug) VALUES ($1,$2) RETURNING id",
    ["Moderation QA","moderation-qa"])).rows[0].id);
  const createOffer = async (partner: number, model: string, priceOnRequest: boolean, price: string|null) =>
    Number((await pool.query(
      "INSERT INTO public.offers (partner_id,category_id,title,offer_model,conversion_type,price_on_request,price_brutto,publication_status) VALUES ($1,$2,'QA moderation offer',$3,'inbound',$4,$5,'pending_review') RETURNING id",
      [partner,categoryId,model,priceOnRequest,price],
    )).rows[0].id);
  const offerId = await createOffer(partnerId,"rfq",true,null);
  const deps = {adminActorId:actor,querySellerReadiness:async () => {throw new Error("RFQ must not require ecommerce readiness");}};
  const currentStatus = async (id: number) => (await pool.query("SELECT publication_status FROM public.offers WHERE id=$1",[id])).rows[0].publication_status;
  const events = async (id: number) => (await pool.query(
    "SELECT offer_id,partner_id,admin_actor_id,decision,from_status,to_status,reason FROM public.offer_moderation_events WHERE offer_id=$1 ORDER BY id",[id])).rows;

  const returned = await executeOfferPublicationStateChange(db,
    {offerId,expectedStatus:"pending_review",targetStatus:"draft",rejectionReason:"  Update load capacity  "},deps);
  assert.deepEqual(returned,{ok:true,code:"OFFER_RETURNED_TO_DRAFT",changed:true});
  assert.equal(await currentStatus(offerId),"draft");
  const firstEvents = await events(offerId);
  assert.equal(firstEvents.length,1);
  assert.equal(Number(firstEvents[0].partner_id),partnerId);
  assert.equal(firstEvents[0].admin_actor_id,actor);
  assert.equal(firstEvents[0].reason,"Update load capacity");
  assert.equal(firstEvents[0].decision,"returned_for_correction");

  const forbidden = await executePartnerOfferSubmit(db, otherPartnerId, offerId);
  assert.deepEqual(forbidden,{ok:false,code:"OFFER_NOT_FOUND"});
  assert.equal(await currentStatus(offerId),"draft");
  assert.deepEqual(await executePartnerOfferSubmit(db,partnerId,offerId),{ok:true,code:"OFFER_SUBMITTED"});
  assert.equal(await currentStatus(offerId),"pending_review");
  const approved = await executeOfferPublicationStateChange(db,{offerId,expectedStatus:"pending_review",targetStatus:"published"},deps);
  assert.deepEqual(approved,{ok:true,code:"OFFER_PUBLISHED",changed:true});
  assert.equal(await currentStatus(offerId),"published");
  const audit = await events(offerId);
  assert.equal(audit.length,2);
  assert.equal(audit[1].decision,"approved");
  assert.equal(audit[1].reason,null);

  // Ecommerce readiness is mandatory; no publication or audit insert on failure.
  const ecommerceId = await createOffer(partnerId,"marketplace",false,"150.00");
  const blocked = await executeOfferPublicationStateChange(db,
    {offerId:ecommerceId,expectedStatus:"pending_review",targetStatus:"published"},
    {adminActorId:actor,querySellerReadiness:async()=>({status:"not_ready" as const})});
  assert.deepEqual(blocked,{ok:false,code:"OFFER_PUBLISH_NOT_ELIGIBLE",reason:"SELLER_NOT_READY"});
  assert.equal(await currentStatus(ecommerceId),"pending_review");
  assert.equal((await events(ecommerceId)).length,0);

  // A deliberately failing audit INSERT proves transactional rollback.
  const rollbackId = await createOffer(partnerId,"rfq",true,null);
  await pool.query(`CREATE FUNCTION public.moderation_qa_insert_fail() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'QA_MODERATION_AUDIT_INSERT_DENIED'; END $$`);
  await pool.query(`CREATE TRIGGER moderation_qa_insert_failure BEFORE INSERT ON public.offer_moderation_events
    FOR EACH ROW EXECUTE FUNCTION public.moderation_qa_insert_fail()`);
  try {
    const failed = await executeOfferPublicationStateChange(db,
      {offerId:rollbackId,expectedStatus:"pending_review",targetStatus:"draft",rejectionReason:"Please correct fields"},deps);
    assert.deepEqual(failed,{ok:false,code:"SYSTEM_ERROR"});
    assert.equal(await currentStatus(rollbackId),"pending_review");
    assert.equal((await events(rollbackId)).length,0);
  } finally {
    await pool.query("DROP TRIGGER moderation_qa_insert_failure ON public.offer_moderation_events");
    await pool.query("DROP FUNCTION public.moderation_qa_insert_fail()");
  }

  // There is never an unscoped Partner read of another company's reason.
  assert.equal((await pool.query(
    "SELECT count(*)::int AS n FROM public.offer_moderation_events WHERE offer_id=$1 AND partner_id=$2",
    [offerId,otherPartnerId])).rows[0].n,0);
});
