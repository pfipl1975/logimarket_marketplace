import { z } from 'zod';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@/lib/schema';

export const adminPartnerCreateSchema = z.object({
  companyName: z.string().trim().min(1, 'MISSING_COMPANY_NAME').max(255, 'COMPANY_NAME_TOO_LONG'),
  contactEmail: z.string().trim().min(1, 'MISSING_EMAIL').max(100, 'EMAIL_TOO_LONG').email('INVALID_EMAIL'),
  websiteUrl: z
    .string()
    .trim()
    .max(512, 'WEBSITE_TOO_LONG')
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

export type AdminPartnerCreateResult =
  | { ok: true; partnerId: number }
  | { ok: false; reason: 'PARTNER_INVALID_INPUT'; errors: z.ZodError<AdminPartnerCreateInput> }
  | { ok: false; reason: 'PARTNER_CREATE_FAILED' };

export async function createPartnerCore(
  db: NodePgDatabase<typeof schema>,
  rawInput: unknown
): Promise<AdminPartnerCreateResult> {
  const parsed = adminPartnerCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, reason: 'PARTNER_INVALID_INPUT', errors: parsed.error };
  }

  const { companyName, contactEmail, websiteUrl } = parsed.data;

  // We are explicitly instructed NOT to assume unique constraints on companyName/contactEmail
  // However, we MUST perform an application-level duplicate check for logical duplicates as per A0 finding?
  // Wait. The requirement says:
  // "Do NOT assume same companyName = same legal entity"
  // "Do NOT assume same contactEmail = same legal entity"
  // "A1_DUPLICATE_BLOCKING=NO"
  // "Do not add duplicate-check queries."
  // So we just INSERT directly.

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
    console.error('[createPartnerCore] Failed:', error);
    return { ok: false, reason: 'PARTNER_CREATE_FAILED' };
  }
}

