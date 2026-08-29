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

export async function createPartnerCore(
  db: NodePgDatabase<typeof schema>,
  rawInput: unknown
): Promise<AdminPartnerCreateResult> {
  const parsed = adminPartnerCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message as AdminPartnerCreateValidationCode) || "INVALID_WEBSITE";
    return { ok: false, reason: 'PARTNER_INVALID_INPUT', code };
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
