import "server-only";
import { createHmac } from "node:crypto";
import { sql, eq, and, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { partnerApplications, partnerApplicationEvents } from "@/lib/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { applicationInputSchema, reviewInputSchema, APPLICATION_TRANSITIONS, type ApplicationInput, type ApplicationResult, type ApplicationStatus } from "./contract";

type Database = typeof db;
function digest(value: string, secret: string) { return createHmac("sha256", secret).update(value).digest("hex"); }

/** Receives only a server-verified actor. Never queries Partner/Seller identities. */
export async function submitApplicationCore(database: Database, input: ApplicationInput, userId: string | null, secret: string): Promise<ApplicationResult> {
  if (secret.length < 32) return { code: "unavailable" };
  const parsed = applicationInputSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const value = parsed.data;
  const keyHash = digest(value.submissionKey, secret);
  const payloadHash = digest(JSON.stringify([value.companyName,value.countryCode,value.contactEmail,value.businessType,value.taxIdentifier,value.locale,value.privacyNoticeVersion,userId]),secret);
  return database.transaction(async tx => {
    // Same key serializes before checking durable state, including simultaneous first submissions.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${keyHash}, 0))`);
    const [existing] = await tx.select({ digest: partnerApplications.requestDigest }).from(partnerApplications).where(eq(partnerApplications.submissionKeyHash,keyHash));
    if (existing) return { code: existing.digest === payloadHash ? "received" : "conflict" };
    const now = await tx.execute<{ epoch: string }>(sql`SELECT floor(extract(epoch from clock_timestamp()) / 3600)::text AS epoch`);
    const window = now.rows[0].epoch;
    // Global backstop prevents bypass by rotating contacts. No IP headers are trusted or stored.
    const buckets = [{ key: `global:${window}`, limit: 100 }, { key: `${digest(value.contactEmail,secret)}:${window}`, limit: 5 }];
    for (const bucket of buckets) {
      const result = await tx.execute<{ attempts: number }>(sql`INSERT INTO public.partner_application_limits(bucket, attempts, expires_at)
        VALUES (${bucket.key},1,to_timestamp((${window}::bigint + 1) * 3600))
        ON CONFLICT (bucket) DO UPDATE SET attempts = partner_application_limits.attempts + 1
        WHERE partner_application_limits.attempts < ${bucket.limit} RETURNING attempts`);
      if (!result.rows.length) return { code: "limited" };
    }
    await tx.execute(sql`DELETE FROM public.partner_application_limits WHERE bucket IN
      (SELECT bucket FROM public.partner_application_limits WHERE expires_at < clock_timestamp() LIMIT 100)`);
    await tx.insert(partnerApplications).values({companyName:value.companyName,countryCode:value.countryCode,contactEmail:value.contactEmail,
      businessType:value.businessType,taxIdentifier:value.taxIdentifier || null,submittedAuthUserId:userId,
      submissionKeyHash:keyHash,requestDigest:payloadHash,privacyNoticeVersion:value.privacyNoticeVersion,locale:value.locale});
    return { code: "received" };
  });
}

export async function submitApplication(input: unknown): Promise<ApplicationResult> {
  const parsed = applicationInputSchema.safeParse(input);
  if (!parsed.success) return {code:"invalid",fields:[...new Set(parsed.error.issues.map(i=>String(i.path[0])))]};
  try {
    const user = await getCurrentUser();
    if (user.status === "unavailable") return {code:"unavailable"};
    return await submitApplicationCore(db,parsed.data,user.status === "authenticated" ? user.user.id : null,process.env.PARTNER_APPLICATION_HMAC_SECRET ?? "");
  } catch { return {code:"unavailable"}; }
}

export async function reviewApplicationCore(database: Database, actorId: string, raw: unknown) {
  const parsed = reviewInputSchema.safeParse(raw);
  if (!parsed.success) return {code:"invalid"} as const;
  const input = parsed.data;
  return database.transaction(async tx => {
    const [current] = await tx.select().from(partnerApplications).where(eq(partnerApplications.id,input.applicationId)).for("update");
    if (!current || current.version !== input.expectedVersion) return {code:"conflict"} as const;
    if (!APPLICATION_TRANSITIONS[current.status as ApplicationStatus]?.includes(input.status)) return {code:"invalid"} as const;
    await tx.execute(sql`SELECT set_config('lm.application_actor',${actorId},true),set_config('lm.application_reason',${input.reason},true),set_config('lm.application_note',${input.note},true)`);
    await tx.update(partnerApplications).set({status:input.status,version:current.version+1}).where(and(eq(partnerApplications.id,current.id),eq(partnerApplications.version,current.version)));
    return {code:"updated"} as const;
  });
}
export async function reviewApplication(raw: unknown) {
  const actor = await requireAdmin();
  try { return await reviewApplicationCore(db,actor.id,raw); } catch { return {code:"unavailable"} as const; }
}
export async function listApplications(status?: ApplicationStatus, oldestFirst=false) {
  await requireAdmin();
  return db.select().from(partnerApplications).where(status ? eq(partnerApplications.status,status) : undefined)
    .orderBy(oldestFirst ? asc(partnerApplications.createdAt) : desc(partnerApplications.createdAt),asc(partnerApplications.id)).limit(100);
}
export async function getApplication(id: string) {
  await requireAdmin();
  if (!reviewInputSchema.shape.applicationId.safeParse(id).success) return null;
  const [application] = await db.select().from(partnerApplications).where(eq(partnerApplications.id,id));
  if (!application) return null;
  const history = await db.select().from(partnerApplicationEvents).where(eq(partnerApplicationEvents.applicationId,id)).orderBy(asc(partnerApplicationEvents.version));
  const duplicates = await db.select({id:partnerApplications.id}).from(partnerApplications).where(sql`${partnerApplications.id} <> ${id} AND
    (${partnerApplications.contactEmail} = ${application.contactEmail} OR (${application.taxIdentifier}::text IS NOT NULL AND ${partnerApplications.taxIdentifier} = ${application.taxIdentifier} AND ${partnerApplications.countryCode} = ${application.countryCode}))`).limit(10);
  return {application,history,duplicates};
}
