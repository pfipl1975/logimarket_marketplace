import { z } from "zod";
import { locales, type Locale } from "@/lib/i18n/config";
export const APPLICATION_STATUSES = ["submitted", "under_review", "needs_information", "rejected", "accepted_for_onboarding"] as const;
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];

/** Admin-only navigation; applicant declarations are fetched server-side, never put in the URL. */
export function adminPartnerHandoffPath(locale: Locale, status: ApplicationStatus, applicationId: string): string | null {
  if (status !== "accepted_for_onboarding" || !z.uuid().safeParse(applicationId).success) return null;
  const base = locale === "pl" ? "/admin/partnerzy/nowy" : `/${locale}/admin/partners/new`;
  return `${base}?${new URLSearchParams({ applicationId })}`;
}
export const BUSINESS_TYPES = ["manufacturer", "distributor", "service_provider", "other"] as const;
export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  submitted: ["under_review"], under_review: ["needs_information", "rejected", "accepted_for_onboarding"],
  needs_information: ["under_review", "rejected"], rejected: [], accepted_for_onboarding: [],
};
const plain = (max: number) => z.string().trim().min(1).max(max).refine(v => !/[\u0000-\u001f\u007f]/.test(v));
export const applicationInputSchema = z.strictObject({
  companyName: plain(255), countryCode: z.string().regex(/^[A-Z]{2}$/).refine(v => APPLICATION_COUNTRIES.includes(v)),
  contactEmail: z.string().trim().toLowerCase().max(100).email(), businessType: z.enum(BUSINESS_TYPES),
  taxIdentifier: z.string().trim().max(100).refine(v => !/[\u0000-\u001f\u007f]/.test(v)),
  locale: z.enum(locales), submissionKey: z.uuid(), privacyNoticeVersion: z.literal("LOCAL_FIXTURE_ONLY"), website: z.literal(""),
});
export type ApplicationInput = z.infer<typeof applicationInputSchema>;
export const reviewInputSchema = z.strictObject({
  applicationId: z.uuid(), expectedVersion: z.number().int().min(1).max(2147483646),
  status: z.enum(APPLICATION_STATUSES), reason: plain(100), note: z.string().trim().max(1000),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ApplicationReviewState = {code:"idle"|"updated"|"invalid"|"conflict"|"unavailable"};
export const reviewContextSchema = reviewInputSchema.pick({applicationId:true,expectedVersion:true}).extend({actorId:z.uuid()}).strict();
export type ReviewContext = z.infer<typeof reviewContextSchema>;

/** Context must come from a server-created, authenticated action closure. */
export function parseBoundReviewForm(context: unknown, currentActorId: string, formData: FormData): ReviewInput | null {
  const parsedContext = reviewContextSchema.safeParse(context);
  if (!parsedContext.success || parsedContext.data.actorId !== currentActorId) return null;
  const bound = parsedContext.data;
  const allowed = new Set(["applicationId","expectedVersion","status","reason","note"]);
  const input: Record<string,string> = {}; let size = 0;
  for (const [key,value] of formData.entries()) {
    if (key.startsWith("$ACTION_")) continue;
    if (!allowed.has(key) || typeof value !== "string" || key in input) return null;
    size += new TextEncoder().encode(key + value).byteLength;
    if (size > 4096) return null;
    input[key] = value;
  }
  if (input.applicationId !== bound.applicationId || input.expectedVersion !== String(bound.expectedVersion)) return null;
  const parsed = reviewInputSchema.safeParse({...input,applicationId:bound.applicationId,expectedVersion:bound.expectedVersion});
  return parsed.success ? parsed.data : null;
}
export type ApplicationResult = { code: "received" | "invalid" | "unavailable" | "limited" | "conflict"; fields?: string[] };
/** Production activation needs separately approved privacy, retention and trusted source contracts. */
export function isLocalIntakeEnabled(env: Readonly<Record<string,string|undefined>>): boolean {
  if (env.VERCEL || env.VERCEL_ENV || env.NODE_ENV === "production" || env.PARTNER_APPLICATION_LOCAL_INTAKE !== "1") return false;
  try {
    const url = new URL(env.DATABASE_URL ?? "");
    return env.PARTNER_APPLICATION_ENVIRONMENT === "LOCAL" && ["localhost", "127.0.0.1"].includes(url.hostname)
      && url.port === "15479" && url.pathname === "/lm_partner_application_test" && env.PARTNER_APPLICATION_ORIGIN === "http://localhost:3107";
  } catch { return false; }
}
export function validApplicationOrigin(origin: string | null, env: Readonly<Record<string,string|undefined>>): boolean {
  return isLocalIntakeEnabled(env) && origin === env.PARTNER_APPLICATION_ORIGIN;
}

export const APPLICATION_COUNTRIES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
