import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { isCanonicalPositiveInteger } from "./rfq-query";

// ---------------------------------------------------------------------------
// Detail DTO — full contact/message data exposed ONLY on the admin detail view
// (the list read model intentionally omits these PII fields)
// ---------------------------------------------------------------------------
export interface AdminRfqDetailDto {
  id: number;
  createdAt: string | null;
  status: string;

  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;

  offerId: number;
  offerTitle: string | null;
  offerPublicationStatus: string | null;

  partnerId: number;
  partnerCompanyName: string | null;
}

export type AdminRfqDetailResult =
  | { ok: true; data: AdminRfqDetailDto }
  | { ok: false; code: "INVALID_ID" | "NOT_FOUND" };

/**
 * Parse a raw RFQ ID from URL params.
 * Accepts only canonical positive safe integers (no leading zeros, no floats, no scientific notation).
 */
export function parseAdminRfqDetailId(rawId: unknown): number | null {
  const str = typeof rawId === "string" ? rawId : null;
  if (!str) return null;
  if (!isCanonicalPositiveInteger(str)) return null;
  return parseInt(str, 10);
}

export async function getAdminRfqDetail(
  db: NodePgDatabase<typeof schema>,
  rfqId: number
): Promise<AdminRfqDetailResult> {
  const rows = await db
    .select({
      id: schema.rfqLeads.id,
      createdAt: schema.rfqLeads.createdAt,
      status: schema.rfqLeads.status,
      companyName: schema.rfqLeads.companyName,
      contactName: schema.rfqLeads.contactName,
      email: schema.rfqLeads.email,
      phone: schema.rfqLeads.phone,
      message: schema.rfqLeads.message,
      offerId: schema.rfqLeads.offerId,
      offerTitle: schema.offers.title,
      offerPublicationStatus: schema.offers.publicationStatus,
      partnerId: schema.rfqLeads.partnerId,
      partnerCompanyName: schema.partners.companyName,
    })
    .from(schema.rfqLeads)
    .leftJoin(schema.offers, eq(schema.offers.id, schema.rfqLeads.offerId))
    .leftJoin(schema.partners, eq(schema.partners.id, schema.rfqLeads.partnerId))
    .where(eq(schema.rfqLeads.id, rfqId))
    .limit(1);

  if (rows.length === 0) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const row = rows[0];
  return {
    ok: true,
    data: {
      id: Number(row.id),
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      status: row.status,
      companyName: row.companyName,
      contactName: row.contactName,
      email: row.email,
      phone: row.phone,
      message: row.message,
      offerId: Number(row.offerId),
      offerTitle: row.offerTitle,
      offerPublicationStatus: row.offerPublicationStatus ?? null,
      partnerId: Number(row.partnerId),
      partnerCompanyName: row.partnerCompanyName,
    },
  };
}
