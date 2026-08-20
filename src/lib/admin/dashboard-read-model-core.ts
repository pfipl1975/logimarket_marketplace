import { sql, inArray, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";

export interface AdminDashboardCounts {
  offers: {
    total: number;
    draft: number;
    published: number;
    hidden: number;
    archived: number;
    deleted: number;
  };
  partners: {
    total: number;
  };
  sellerEligibility: {
    none: number;
    pending: number;
    eligible: number;
    ineligible: number;
    suspended: number;
  };
  rfq: {
    total: number;
    new: number;
    inProgress: number;
    responded: number;
    closed: number;
  };
}

export interface AdminDashboardQueueRfq {
  id: number;
  createdAt: string | null;
  status: "new" | "in_progress" | "responded";
  companyName: string | null;
  offerId: number;
  offerTitle: string | null;
  partnerId: number;
  partnerCompanyName: string | null;
}

export interface AdminDashboardReadResult {
  counts: AdminDashboardCounts;
  recentRfqQueue: AdminDashboardQueueRfq[];
}

export async function getAdminDashboardReadModel(db: NodePgDatabase<typeof schema>): Promise<AdminDashboardReadResult> {
  const [
    offersAgg,
    partnersAgg,
    eligibilityAgg,
    rfqAgg,
    recentRfqQueue
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        draft: sql<number>`count(*) filter (where ${schema.offers.publicationStatus} = 'draft')`,
        published: sql<number>`count(*) filter (where ${schema.offers.publicationStatus} = 'published')`,
        hidden: sql<number>`count(*) filter (where ${schema.offers.publicationStatus} = 'hidden')`,
        archived: sql<number>`count(*) filter (where ${schema.offers.publicationStatus} = 'archived')`,
        deleted: sql<number>`count(*) filter (where ${schema.offers.publicationStatus} = 'deleted')`,
      })
      .from(schema.offers),

    db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(schema.partners),

    db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${schema.sellerEligibility.eligibilityStatus} = 'pending')`,
        eligible: sql<number>`count(*) filter (where ${schema.sellerEligibility.eligibilityStatus} = 'eligible')`,
        ineligible: sql<number>`count(*) filter (where ${schema.sellerEligibility.eligibilityStatus} = 'ineligible')`,
        suspended: sql<number>`count(*) filter (where ${schema.sellerEligibility.eligibilityStatus} = 'suspended')`,
      })
      .from(schema.sellerEligibility),

    db
      .select({
        total: sql<number>`count(*)`,
        new: sql<number>`count(*) filter (where ${schema.rfqLeads.status} = 'new')`,
        inProgress: sql<number>`count(*) filter (where ${schema.rfqLeads.status} = 'in_progress')`,
        responded: sql<number>`count(*) filter (where ${schema.rfqLeads.status} = 'responded')`,
        closed: sql<number>`count(*) filter (where ${schema.rfqLeads.status} = 'closed')`,
      })
      .from(schema.rfqLeads),

    db
      .select({
        id: schema.rfqLeads.id,
        createdAt: schema.rfqLeads.createdAt,
        status: schema.rfqLeads.status,
        companyName: schema.rfqLeads.companyName,
        offerId: schema.offers.id,
        offerTitle: schema.offers.title,
        partnerId: schema.partners.id,
        partnerCompanyName: schema.partners.companyName,
      })
      .from(schema.rfqLeads)
      .innerJoin(schema.offers, eq(schema.rfqLeads.offerId, schema.offers.id))
      .innerJoin(schema.partners, eq(schema.rfqLeads.partnerId, schema.partners.id))
      .where(inArray(schema.rfqLeads.status, ["new", "in_progress", "responded"]))
      .orderBy(sql`${schema.rfqLeads.createdAt} DESC NULLS LAST, ${schema.rfqLeads.id} DESC`)
      .limit(5)
  ]);

  const offersData = offersAgg[0] || { total: 0, draft: 0, published: 0, hidden: 0, archived: 0, deleted: 0 };
  const partnersData = partnersAgg[0] || { total: 0 };
  const eligibilityData = eligibilityAgg[0] || { total: 0, pending: 0, eligible: 0, ineligible: 0, suspended: 0 };
  const rfqData = rfqAgg[0] || { total: 0, new: 0, inProgress: 0, responded: 0, closed: 0 };

  const parsedOffers = {
    total: Number(offersData.total),
    draft: Number(offersData.draft),
    published: Number(offersData.published),
    hidden: Number(offersData.hidden),
    archived: Number(offersData.archived),
    deleted: Number(offersData.deleted),
  };

  const parsedPartners = {
    total: Number(partnersData.total),
  };

  const parsedEligibility = {
    total: Number(eligibilityData.total),
    pending: Number(eligibilityData.pending),
    eligible: Number(eligibilityData.eligible),
    ineligible: Number(eligibilityData.ineligible),
    suspended: Number(eligibilityData.suspended),
  };

  const parsedRfq = {
    total: Number(rfqData.total),
    new: Number(rfqData.new),
    inProgress: Number(rfqData.inProgress),
    responded: Number(rfqData.responded),
    closed: Number(rfqData.closed),
  };

  const { noneEligibility } = validateDashboardInvariants(parsedOffers, parsedPartners, parsedEligibility, parsedRfq);

  return {
    counts: {
      offers: parsedOffers,
      partners: parsedPartners,
      sellerEligibility: {
        pending: parsedEligibility.pending,
        eligible: parsedEligibility.eligible,
        ineligible: parsedEligibility.ineligible,
        suspended: parsedEligibility.suspended,
        none: noneEligibility,
      },
      rfq: parsedRfq,
    },
    recentRfqQueue: recentRfqQueue.map((r) => ({
      id: Number(r.id),
      createdAt: r.createdAt ? (r.createdAt as Date).toISOString() : null,
      status: r.status as "new" | "in_progress" | "responded",
      companyName: r.companyName || null,
      offerId: Number(r.offerId),
      offerTitle: r.offerTitle || null,
      partnerId: Number(r.partnerId),
      partnerCompanyName: r.partnerCompanyName || null,
    })),
  };
}

export function validateDashboardInvariants(
  parsedOffers: { total: number, draft: number, published: number, hidden: number, archived: number, deleted: number },
  parsedPartners: { total: number },
  parsedEligibility: { total: number, pending: number, eligible: number, ineligible: number, suspended: number },
  parsedRfq: { total: number, new: number, inProgress: number, responded: number, closed: number }
) {
  const storedEligibilityTotal = parsedEligibility.pending + parsedEligibility.eligible + parsedEligibility.ineligible + parsedEligibility.suspended;
  if (parsedEligibility.total !== storedEligibilityTotal) {
    throw new Error("Dashboard Invariant Violation: unknown eligibility status present");
  }
  
  if (parsedEligibility.total > parsedPartners.total) {
    throw new Error("Dashboard Invariant Violation: storedEligibilityTotal > partnersTotal");
  }
  const noneEligibility = parsedPartners.total - parsedEligibility.total;

  const storedOffersTotal = parsedOffers.draft + parsedOffers.published + parsedOffers.hidden + parsedOffers.archived + parsedOffers.deleted;
  if (parsedOffers.total !== storedOffersTotal) {
    throw new Error("Dashboard Invariant Violation: unknown offer status present");
  }

  const storedRfqTotal = parsedRfq.new + parsedRfq.inProgress + parsedRfq.responded + parsedRfq.closed;
  if (parsedRfq.total !== storedRfqTotal) {
    throw new Error("Dashboard Invariant Violation: unknown rfq status present");
  }
  return { noneEligibility };
}
