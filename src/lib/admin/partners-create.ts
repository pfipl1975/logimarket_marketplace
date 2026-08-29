import { z } from 'zod';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@/lib/schema';

export const adminPartnerCreateSchema = z.object({
  companyName: z.string().trim().min(1, 'MISSING_COMPANY_NAME').max(255, 'COMPANY_NAME_TOO_LONG'),
  contactEmail: z.string().trim().min(1, 'MISSING_EMAIL').max(100, 'EMAIL_TOO_LONG').email('INVALID_EMAIL'),
  websiteUrl: z
    .string()
    .trim()
    .optional()
    .transform((val) => (!val || val === '' ? null : val))
    .refine((val) => {
      if (val === null) return true;
      try {
        const url = new URL(val);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, 'INVALID_WEBSITE'),
});

export type AdminPartnerCreateInput = z.infer<typeof adminPartnerCreateSchema>;

export type AdminPartnerCreateValidationCode =
  | "INVALID_INPUT"
  | "MISSING_COMPANY_NAME"
  | "COMPANY_NAME_TOO_LONG"
  | "MISSING_EMAIL"
  | "EMAIL_TOO_LONG"
  | "INVALID_EMAIL"
  | "INVALID_WEBSITE";

export type AdminPartnerCreateResult =
  | { ok: true; partnerId: number }
  | { ok: false; reason: 'PARTNER_INVALID_INPUT'; code: AdminPartnerCreateValidationCode }
  | { ok: false; reason: 'PARTNER_CREATE_FAILED' };

export function parseAdminPartnerCreateInput(
  rawInput: unknown
): { ok: true; data: AdminPartnerCreateInput } | { ok: false; code: AdminPartnerCreateValidationCode } {
  if (rawInput === null || typeof rawInput !== 'object') {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  const parsed = adminPartnerCreateSchema.safeParse(rawInput);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  const issue = parsed.error.issues[0];
  if (!issue || !issue.path[0]) {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  const path = issue.path[0];

  if (path === 'companyName') {
    if (issue.message === 'COMPANY_NAME_TOO_LONG') return { ok: false, code: 'COMPANY_NAME_TOO_LONG' };
    return { ok: false, code: 'MISSING_COMPANY_NAME' };
  }

  if (path === 'contactEmail') {
    if (issue.message === 'EMAIL_TOO_LONG') return { ok: false, code: 'EMAIL_TOO_LONG' };
    if (issue.message === 'INVALID_EMAIL') return { ok: false, code: 'INVALID_EMAIL' };
    return { ok: false, code: 'MISSING_EMAIL' };
  }

  if (path === 'websiteUrl') {
    return { ok: false, code: 'INVALID_WEBSITE' };
  }

  return { ok: false, code: 'INVALID_INPUT' };
}

export async function createPartnerCore(
  db: NodePgDatabase<typeof schema>,
  rawInput: unknown
): Promise<AdminPartnerCreateResult> {
  const parsed = parseAdminPartnerCreateInput(rawInput);
  if (!parsed.ok) {
    return { ok: false, reason: 'PARTNER_INVALID_INPUT', code: parsed.code };
  }

  const { companyName, contactEmail, websiteUrl } = parsed.data;

  try {
    const [inserted] = await db
      .insert(schema.partners)
      .values({
        companyName,
        contactEmail,
        websiteUrl: websiteUrl ?? null,
      })
      .returning({ id: schema.partners.id });

    if (!inserted) {
      return { ok: false, reason: 'PARTNER_CREATE_FAILED' };
    }

    return { ok: true, partnerId: Number(inserted.id) };
  } catch (error) {
    console.error(`[partner-create] stage=insert errorName=${error instanceof Error ? error.name : "Unknown"}`);
    return { ok: false, reason: 'PARTNER_CREATE_FAILED' };
  }
}
