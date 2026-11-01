import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applicationInputSchema, reviewInputSchema, parseBoundReviewForm, APPLICATION_TRANSITIONS, adminPartnerHandoffPath, isLocalIntakeEnabled, validApplicationOrigin } from "@/lib/partner-applications/contract";
const valid = {companyName:"Synthetic Ltd",countryCode:"PL",contactEmail:"synthetic@example.test",businessType:"manufacturer",taxIdentifier:"",locale:"pl",submissionKey:"09b7e0b4-9578-4dc0-aa43-4549713b51b1",privacyNoticeVersion:"LOCAL_FIXTURE_ONLY",website:""};
test("minimal anonymous input, optional tax ID, normalization and strict allowlist",()=>{
 assert.ok(applicationInputSchema.safeParse(valid).success);
 assert.equal(applicationInputSchema.parse({...valid,contactEmail:" SYNTHETIC@EXAMPLE.TEST "}).contactEmail,valid.contactEmail);
 for(const extra of ["status","source","submittedAuthUserId","partnerId","membership","version","retentionDueAt"]){assert.equal(applicationInputSchema.safeParse({...valid,[extra]:"forged"}).success,false);}
 for(const fields of [{companyName:""},{companyName:"x".repeat(256)},{countryCode:"ZZ"},{contactEmail:"broken"},{contactEmail:"x".repeat(101)},{businessType:"admin"},{taxIdentifier:"x".repeat(101)},{website:"bot"},{privacyNoticeVersion:"invented"},{locale:"xx"}])assert.equal(applicationInputSchema.safeParse({...valid,...fields}).success,false);
});
test("explicit lifecycle excludes conversion and terminal changes",()=>{
 assert.deepEqual(APPLICATION_TRANSITIONS.submitted,["under_review"]);
 assert.deepEqual(APPLICATION_TRANSITIONS.accepted_for_onboarding,[]);
 assert.deepEqual(APPLICATION_TRANSITIONS.rejected,[]);
 assert.equal(reviewInputSchema.safeParse({applicationId:valid.submissionKey,expectedVersion:1,status:"linked_to_partner",reason:"x",note:""}).success,false);
});
test("only accepted applications expose localized Admin handoff with opaque ID",()=>{
 const id=valid.submissionKey;
 assert.equal(adminPartnerHandoffPath("pl","accepted_for_onboarding",id),`/admin/partnerzy/nowy?applicationId=${id}`);
 for(const locale of ["en","de","fr","uk","es","zh"] as const){
  assert.equal(adminPartnerHandoffPath(locale,"accepted_for_onboarding",id),`/${locale}/admin/partners/new?applicationId=${id}`);
 }
 for(const status of ["submitted","under_review","needs_information","rejected"] as const){
  assert.equal(adminPartnerHandoffPath("pl",status,id),null);
 }
 for(const invalidId of ["","../login","not-a-uuid","00000000-0000-0000-0000-000000000000?partnerId=1"]){
  assert.equal(adminPartnerHandoffPath("pl","accepted_for_onboarding",invalidId),null);
 }
});
test("LOCAL-only switch refuses production, unknown/shared targets, spoofed and missing origins",()=>{
 const env={NODE_ENV:"test",PARTNER_APPLICATION_ENVIRONMENT:"LOCAL",PARTNER_APPLICATION_LOCAL_INTAKE:"1",DATABASE_URL:"postgres://postgres@127.0.0.1:15479/lm_partner_application_test",PARTNER_APPLICATION_ORIGIN:"http://localhost:3107"};
 assert.equal(isLocalIntakeEnabled(env),true);
 for(const patch of [{NODE_ENV:"production"},{VERCEL:"1"},{VERCEL_ENV:"preview"},{PARTNER_APPLICATION_ENVIRONMENT:"DISPOSABLE_DEV"},{DATABASE_URL:"postgres://postgres@remote/lm_partner_application_test"},{DATABASE_URL:"postgres://postgres@localhost/production"}])assert.equal(isLocalIntakeEnabled({...env,...patch}),false);
 assert.equal(validApplicationOrigin("https://attacker.test",env),false); assert.equal(validApplicationOrigin(null,env),false);assert.equal(validApplicationOrigin(env.PARTNER_APPLICATION_ORIGIN,env),true);
});
test("seven dictionaries have complete translated application labels",()=>{
 const all=["pl","en","de","fr","uk","es","zh"].map(l=>JSON.parse(readFileSync(`src/messages/${l}.json`,"utf8")).partnerApplications);
 const expected=Object.keys(all[0]).sort(); for(const d of all){assert.deepEqual(Object.keys(d).sort(),expected);assert.ok(Object.values(d).every(s=>typeof s === "string" && s.length>0));}
 assert.equal(new Set(all.map(d=>d.received)).size,7);
});

test("bound review rejects missing context, other actor, target/version substitution and mass assignment",()=>{
 const context={applicationId:valid.submissionKey,expectedVersion:1,actorId:"00000000-0000-0000-0000-000000000000"};
 const fields={applicationId:context.applicationId,expectedVersion:"1",status:"under_review",reason:"Synthetic review",note:""};
 const form=(patch:Record<string,string>={})=>{const data=new FormData();for(const [key,value] of Object.entries({...fields,...patch}))data.append(key,value);return data;};
 assert.deepEqual(parseBoundReviewForm(context,context.actorId,form()),{...fields,expectedVersion:1});
 for(const invalid of [null,undefined,{},"client-context",{...context,unexpected:"x"},{...context,expectedVersion:0}])assert.equal(parseBoundReviewForm(invalid,context.actorId,form()),null);
 assert.equal(parseBoundReviewForm(context,"11111111-1111-1111-1111-111111111111",form()),null);
 for(const patch of ([{applicationId:"11111111-1111-4111-8111-111111111111"},{expectedVersion:"2"},{expectedVersion:"01"},{context:"forged"},{partnerId:"999"},{status:"linked_to_partner"},{reason:"x".repeat(101)},{note:"x".repeat(1001)}] as Record<string, string>[]))assert.equal(parseBoundReviewForm(context,context.actorId,form(patch)),null);
 for(const name of ["applicationId","expectedVersion"]){const missing=form();missing.delete(name);assert.equal(parseBoundReviewForm(context,context.actorId,missing),null);const duplicate=form();duplicate.append(name,String(fields[name as keyof typeof fields]));assert.equal(parseBoundReviewForm(context,context.actorId,duplicate),null);}
 const upload=form();upload.set("reason",new Blob(["file"]),"reason.txt");assert.equal(parseBoundReviewForm(context,context.actorId,upload),null);
 const actions=readFileSync("src/app/actions.ts","utf8");assert.equal(/export async function reviewPartnerApplication\(/.test(actions),false,"The old unbound mutation endpoint must remain removed");
});