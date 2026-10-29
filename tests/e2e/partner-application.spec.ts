import { expect, type Page } from "@playwright/test";
import { test,E2E_NON_ADMIN_USER_ID,createDummySupabaseCookie } from "./fixtures/auth";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import pl from "../../src/messages/pl.json";
const labels=pl.partnerApplications;
const dbUrl=process.env.PARTNER_APPLICATION_TEST_URL;
const local=dbUrl === "postgres://postgres@127.0.0.1:15479/lm_partner_application_test" && process.env.PARTNER_APPLICATION_DB_TESTS === "LOCAL_ISOLATED_15479";
test.skip(!local,"Classified LOCAL application environment required");
const pool=local ? new Pool({connectionString:dbUrl}) : null;
test.afterAll(()=>pool?.end());
function watch(page:Page){const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type() === "error")errors.push(m.text());});page.on("response",r=>{if(r.status()>=500)errors.push(`${r.status()} ${new URL(r.url()).pathname}`);});return errors;}
async function fill(page:Page,company:string,email:string){await page.locator("#application-companyName").fill(company);await page.locator("#application-countryCode").fill("PL");await page.locator("#application-contactEmail").fill(email);}
for(const locale of ["pl","en","de","fr","uk","es","zh"]){
 test(`${locale} mobile labels, keyboard and geometry`,async({page})=>{
  const errors=watch(page);await page.setViewportSize({width:375,height:812});const d=JSON.parse(readFileSync(`src/messages/${locale}.json`,"utf8")).partnerApplications;
  const response=await page.goto(locale === "pl" ? "/dla-partnerow" : `/${locale}/for-partners`);expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{name:d.title,exact:true})).toBeVisible();
  const input=page.locator("#application-companyName");await input.focus();await expect(input).toBeFocused();await page.keyboard.press("Tab");await expect(page.locator("#application-countryCode")).toBeFocused();
  for(const name of ["companyName","countryCode","contactEmail","businessType","taxIdentifier"]){await expect(page.locator(`label[for="application-${name}"]`)).toHaveText(d[name]);}
  expect(await page.evaluate(()=>window.innerWidth)).toBe(375);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect((await page.getByRole("button",{name:d.submit,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(errors).toEqual([]);
 });
}
test("anonymous submit, server validation keeps entries and focuses feedback",async({page})=>{
 const errors=watch(page);await page.goto("/dla-partnerow");const company=`QA anonymous ${randomUUID()}`;const email=`${randomUUID()}@example.test`;
 await fill(page,company,email);await page.locator("#application-countryCode").fill("ZZ");await page.getByRole("button",{name:labels.submit,exact:true}).click();
 await expect(page.locator("#application-feedback")).toHaveText(labels.invalid);await expect(page.locator("#application-feedback")).toBeFocused();await expect(page.locator("#application-companyName")).toHaveValue(company);
 await page.locator("#application-countryCode").fill("PL");await page.getByRole("button",{name:labels.submit,exact:true}).click();
 await expect(page.getByRole("status").filter({hasText:labels.received})).toBeVisible();
 const row=await pool!.query("SELECT submitted_auth_user_id,status FROM public.partner_applications WHERE contact_email=$1",[email]);expect(row.rowCount).toBe(1);expect(row.rows[0].submitted_auth_user_id).toBeNull();expect(row.rows[0].status).toBe("submitted");expect(errors).toEqual([]);
});
test("logged-in applicant cannot choose actor; non-admin and visitor cannot review",async({page,nonAdminPage})=>{
 await page.goto("/admin/partner-applications");await expect(page).toHaveURL(/login/);await expect(page.locator("body")).not.toContainText("QA anonymous");
 await nonAdminPage.goto("/admin/partner-applications");await expect(nonAdminPage.getByRole("heading",{name:labels.title,exact:true})).toHaveCount(0);
 await nonAdminPage.goto("/dla-partnerow");const email=`${randomUUID()}@example.test`;await fill(nonAdminPage,"QA signed applicant",email);await nonAdminPage.getByRole("button",{name:labels.submit,exact:true}).click();await expect(nonAdminPage.getByRole("status").filter({hasText:labels.received})).toBeVisible();
 expect((await pool!.query("SELECT submitted_auth_user_id FROM public.partner_applications WHERE contact_email=$1",[email])).rows[0].submitted_auth_user_id).toBe(E2E_NON_ADMIN_USER_ID);
});
test("Admin reviews declared application, records reason, cannot convert",async({adminPage})=>{
 const errors=watch(adminPage);await adminPage.setViewportSize({width:1280,height:900});
 const company=`QA admin review ${randomUUID()}`;await adminPage.goto("/dla-partnerow");await fill(adminPage,company,`${randomUUID()}@example.test`);await adminPage.getByRole("button",{name:labels.submit,exact:true}).click();await expect(adminPage.getByRole("status").filter({hasText:labels.received})).toBeVisible();await adminPage.goto("/admin/partner-applications");await expect(adminPage.getByRole("heading",{name:labels.title,exact:true})).toBeVisible();
 const detailLink=adminPage.getByRole("link",{name:company,exact:true}).first();
 const expectedDetailUrl=new URL((await detailLink.getAttribute("href"))!,adminPage.url()).toString();
 await detailLink.click();await expect(adminPage).toHaveURL(expectedDetailUrl);await expect(adminPage.getByText(labels.unverified,{exact:true})).toBeVisible();
 const detailUrl=adminPage.url(); const applicationId=new URL(detailUrl).searchParams.get("id");
 expect(applicationId).toBeTruthy();
 const persistedDecision=async()=>{const row=await pool!.query("SELECT status,version,(SELECT count(*)::int FROM partner_application_events e WHERE e.application_id=a.id) AS events FROM partner_applications a WHERE id=$1",[applicationId]);return row.rows[0];};
 expect(await persistedDecision()).toEqual({status:"submitted",version:1,events:1});
 await adminPage.getByLabel(labels.reason,{exact:true}).fill("Synthetic manual review");await adminPage.getByLabel(labels.note,{exact:true}).fill("Synthetic internal note");await adminPage.getByRole("button",{name:labels.update,exact:true}).click();
 await expect.poll(persistedDecision).toEqual({status:"under_review",version:2,events:2});
 await expect(adminPage).toHaveURL(detailUrl);
 await expect(adminPage.locator("ol")).toContainText(labels.under_review);await expect(adminPage.locator("ol")).toContainText("Synthetic manual review");await expect(adminPage.locator("ol")).toContainText("Synthetic internal note");
 await expect(adminPage.locator("ol > li")).toHaveCount(2);
 await adminPage.reload();await expect(adminPage).toHaveURL(detailUrl);await expect(adminPage.locator("ol > li")).toHaveCount(2);expect(await persistedDecision()).toEqual({status:"under_review",version:2,events:2});
 await expect(adminPage.getByRole("button",{name:/Create Partner|Utwórz Partnera|Membership/i})).toHaveCount(0);expect(errors).toEqual([]);
});

async function securityFixture(contactEmail=`${randomUUID()}@example.test`){
 const id=randomUUID();const hex=()=>randomUUID().replaceAll("-","").repeat(2);
 await pool!.query("INSERT INTO partner_applications(id,company_name,country_code,contact_email,business_type,submission_key_hash,request_digest,privacy_notice_version,locale) VALUES($1,$2,'PL',$3,'distributor',$4,$5,'LOCAL_FIXTURE_ONLY','pl')",[id,`R6 synthetic ${id}`,contactEmail,hex(),hex()]);
 return id;
}
async function securityState(id:string){return (await pool!.query("SELECT status,version,(SELECT count(*)::int FROM partner_application_events e WHERE e.application_id=a.id) events FROM partner_applications a WHERE id=$1",[id])).rows[0];}
async function openSecurityForm(page:Page,id:string){
 await page.goto(`/admin/partner-applications?id=${id}`);
 await expect(page.locator('input[name="applicationId"]')).toHaveValue(id);
 await page.waitForLoadState("networkidle");
 await page.locator('input[name="reason"]').fill("R6 synthetic review");
 await page.locator('textarea[name="note"]').fill("R6 synthetic note");
}
async function postSecurityForm(page:Page){
 const pending=page.waitForResponse(r=>r.request().method()==="POST" && Boolean(r.request().headers()["next-action"]));
 await page.getByRole("button",{name:labels.update,exact:true}).click();return pending;
}

test("bound context rejects target/version substitution, missing/corrupt context and plaintext replacement",async({adminPage})=>{
 const a=await securityFixture(),b=await securityFixture();
 const unchanged={status:"submitted",version:1,events:1};
 for(const field of ["applicationId","expectedVersion"]){
  await openSecurityForm(adminPage,a);
  await adminPage.locator(`input[name="${field}"]`).evaluate((input,value)=>{(input as HTMLInputElement).value=value;},field === "applicationId" ? b : "2");
  expect((await postSecurityForm(adminPage)).status()).toBe(200);
  await expect(adminPage.getByRole("status").filter({hasText:labels.invalid})).toBeVisible();
  expect(await securityState(a)).toEqual(unchanged);expect(await securityState(b)).toEqual(unchanged);
 }
 for(const mode of ["missing","corrupt","plaintext"]){
  await openSecurityForm(adminPage,a);let intercepted=false;
  await adminPage.route("**/admin/partner-applications*",async route=>{
   const request=route.request();if(request.method() !== "POST" || !request.headers()["next-action"] || intercepted){await route.continue();return;}
   intercepted=true;
   // Manipulate only the opaque client-visible action envelope in memory; never log it.
   const headers=request.headers();const body=await new Request("http://localhost",{method:"POST",headers:{"content-type":headers["content-type"]},body:request.postDataBuffer()!}).formData();
   // Only numeric Flight records carry call arguments; exclude duplicated $ACTION_ form metadata.
   const encryptedParts:[string,string][]=[];
   for(const [key,value] of body.entries()){
    if(typeof value !== "string" || !/^[0-9a-f]+$/i.test(key))continue;
    let parsed:unknown;try{parsed=JSON.parse(value);}catch{continue;}
    if(typeof parsed === "string" && parsed.length>64 && /^[A-Za-z0-9+/]+=*$/.test(parsed))encryptedParts.push([key,parsed]);
   }
   expect(encryptedParts.length,"Exactly one authenticated closure envelope must be present").toBe(1);
   const [key,encrypted]=encryptedParts[0];
   if(mode === "missing")body.set(key,JSON.stringify(null));
   else if(mode === "plaintext")body.set(key,JSON.stringify({applicationId:b,expectedVersion:1,actorId:"00000000-0000-0000-0000-000000000000"}));
   else {const index=Math.floor(encrypted.length/2);body.set(key,JSON.stringify(encrypted.slice(0,index)+(encrypted[index] === "A" ? "B" : "A")+encrypted.slice(index+1)));}
   const encoded=new Response(body);headers["content-type"]=encoded.headers.get("content-type")!;delete headers["content-length"];
   await route.continue({headers,postData:Buffer.from(await encoded.arrayBuffer())});
  });
  const response=await postSecurityForm(adminPage);expect(intercepted).toBe(true);expect(response.status(),`Context mode ${mode} must be rejected`).toBeGreaterThanOrEqual(400);
  await adminPage.unroute("**/admin/partner-applications*");
  expect(await securityState(a)).toEqual(unchanged);expect(await securityState(b)).toEqual(unchanged);
 }
});

test("bound context rejects stale replay and version rewriting; fresh Admin form records one next event",async({adminPage})=>{
 const a=await securityFixture();await openSecurityForm(adminPage,a);
 const stale=await adminPage.context().newPage();await openSecurityForm(stale,a);
 expect((await postSecurityForm(adminPage)).status()).toBe(200);
 await expect.poll(()=>securityState(a)).toEqual({status:"under_review",version:2,events:2});
 await expect(adminPage).toHaveURL(new RegExp(`[?]id=${a}$`));await expect(adminPage.locator("ol > li")).toHaveCount(2);
 expect((await postSecurityForm(stale)).status()).toBe(200);
 await expect(stale.getByRole("status").filter({hasText:labels.conflict})).toBeVisible();
 expect(await securityState(a)).toEqual({status:"under_review",version:2,events:2});
 await stale.locator('input[name="expectedVersion"]').evaluate(input=>{(input as HTMLInputElement).value="2";});
 await postSecurityForm(stale);await expect(stale.getByRole("status").filter({hasText:labels.invalid})).toBeVisible();
 expect(await securityState(a)).toEqual({status:"under_review",version:2,events:2});await stale.close();
 await openSecurityForm(adminPage,a);await adminPage.locator('select[name="status"]').selectOption("needs_information");
 await postSecurityForm(adminPage);await expect.poll(()=>securityState(a)).toEqual({status:"needs_information",version:3,events:3});
 await expect(adminPage.locator("ol > li")).toHaveCount(3);
 const events=await pool!.query("SELECT version,from_status,to_status,reason,note FROM partner_application_events WHERE application_id=$1 ORDER BY version",[a]);
 expect(events.rows.map(e=>[e.version,e.from_status,e.to_status])).toEqual([[1,null,"submitted"],[2,"submitted","under_review"],[3,"under_review","needs_information"]]);
 expect(events.rows.slice(1).every(e=>e.reason === "R6 synthetic review" && e.note === "R6 synthetic note")).toBe(true);
});

test("bound context reauthorizes current caller before any target mutation",async({adminPage})=>{
 const a=await securityFixture(),b=await securityFixture();await openSecurityForm(adminPage,a);
 await adminPage.context().addCookies([{name:"sb-localhost-auth-token",value:createDummySupabaseCookie(E2E_NON_ADMIN_USER_ID),domain:"localhost",path:"/"}]);
 await adminPage.locator('input[name="applicationId"]').evaluate((input,value)=>{(input as HTMLInputElement).value=value;},b);
 expect((await postSecurityForm(adminPage)).status()).toBeGreaterThanOrEqual(400);
 expect(await securityState(a)).toEqual({status:"submitted",version:1,events:1});expect(await securityState(b)).toEqual({status:"submitted",version:1,events:1});
});
test("bound review preserves native list/duplicate navigation and direct GET",async({adminPage})=>{
 const contact=`${randomUUID()}@example.test`;const a=await securityFixture(contact),b=await securityFixture(contact);
 const base="/admin/partner-applications";await adminPage.goto(base);
 const link=adminPage.locator(`a[href="${base}?id=${a}"]`).first();await link.focus();await expect(link).toBeFocused();
 const documentGet=adminPage.waitForResponse(r=>r.request().isNavigationRequest() && r.request().resourceType() === "document" && r.request().method() === "GET" && new URL(r.url()).searchParams.get("id") === a);
 await link.click();expect((await documentGet).status()).toBe(200);await expect(adminPage.locator('input[name="applicationId"]')).toHaveValue(a);
 await adminPage.goto(`/en/admin/partner-applications?id=${a}`);
 const duplicate=adminPage.locator(`aside a[href="/en/admin/partner-applications?id=${b}"]`);await duplicate.focus();await expect(duplicate).toBeFocused();
 const duplicateGet=adminPage.waitForResponse(r=>r.request().isNavigationRequest() && r.request().resourceType() === "document" && r.request().method() === "GET" && new URL(r.url()).pathname === "/en/admin/partner-applications" && new URL(r.url()).searchParams.get("id") === b);
 await duplicate.click();expect((await duplicateGet).status()).toBe(200);await expect(adminPage.locator('input[name="applicationId"]')).toHaveValue(b);
 expect((await adminPage.goto(`${base}?id=${a}`))?.status()).toBe(200);await expect(adminPage.locator('input[name="applicationId"]')).toHaveValue(a);
 expect(await securityState(a)).toEqual({status:"submitted",version:1,events:1});expect(await securityState(b)).toEqual({status:"submitted",version:1,events:1});
});