import { sql } from "drizzle-orm";
import { offers, partners, rfqLeads, sellerEligibility } from "@/lib/schema";

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
  id: string;
  createdAt: string;
  companyName: string;
  status: "new" | "in_progress" | "responded";
}

export interface AdminDashboardReadResult {
  counts: AdminDashboardCounts;
  recentRfqQueue: AdminDashboardQueueRfq[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAdminDashboardReadModel(db: any): Promise<AdminDashboardReadResult> {
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
        draft: sql<number>`count(*) filter (where ${offers.publicationStatus} = 'draft')`,
        published: sql<number>`count(*) filter (where ${offers.publicationStatus} = 'published')`,
        hidden: sql<number>`count(*) filter (where ${offers.publicationStatus} = 'hidden')`,
        archived: sql<number>`count(*) filter (where ${offers.publicationStatus} = 'archived')`,
        deleted: sql<number>`count(*) filter (where ${offers.publicationStatus} = 'deleted')`,
      })
      .from(offers),

    db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(partners),

    db
      .select({
        pending: sql<number>`count(*) filter (where ${sellerEligibility.status} = 'pending')`,
        eligible: sql<number>`count(*) filter (where ${sellerEligibility.status} = 'eligible')`,
        ineligible: sql<number>`count(*) filter (where ${sellerEligibility.status} = 'ineligible')`,
        suspended: sql<number>`count(*) filter (where ${sellerEligibility.status} = 'suspended')`,
      })
      .from(sellerEligibility),

    db
      .select({
        total: sql<number>`count(*)`,
        new: sql<number>`count(*) filter (where ${rfqLeads.status} = 'new')`,
        inProgress: sql<number>`count(*) filter (where ${rfqLeads.status} = 'in_progress')`,
        responded: sql<number>`count(*) filter (where ${rfqLeads.status} = 'responded')`,
        closed: sql<number>`count(*) filter (where ${rfqLeads.status} = 'closed')`,
      })
      .from(rfqLeads),

    db
      .select({
        id: rfqLeads.id,
        createdAt: rfqLeads.createdAt,
        companyName: rfqLeads.companyName,
        status: rfqLeads.status,
      })
      .from(rfqLeads)
      .where(sql`${rfqLeads.status} != 'closed'`)
      .orderBy(sql`${rfqLeads.createdAt} DESC NULLS LAST, ${rfqLeads.id} DESC`)
      .limit(5)
  ]);

  const offersData = offersAgg[0] || { total: 0, draft: 0, published: 0, hidden: 0, archived: 0, deleted: 0 };
  const partnersData = partnersAgg[0] || { total: 0 };
  const eligibilityData = eligibilityAgg[0] || { pending: 0, eligible: 0, ineligible: 0, suspended: 0 };
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

  const noneEligibility = Math.max(0, parsedPartners.total - (parsedEligibility.pending + parsedEligibility.eligible + parsedEligibility.ineligible + parsedEligibility.suspended));

  return {
    counts: {
      offers: parsedOffers,
      partners: parsedPartners,
      sellerEligibility: {
        ...parsedEligibility,
        none: noneEligibility,
      },
      rfq: parsedRfq,
    },
    recentRfqQueue: recentRfqQueue.map((r) => ({
      id: String(r.id),
      createdAt: (r.createdAt as Date).toISOString(),
      companyName: r.companyName || "",
      status: r.status as "new" | "in_progress" | "responded",
    })),
  };
}
