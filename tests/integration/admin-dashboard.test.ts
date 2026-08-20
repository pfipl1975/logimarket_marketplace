import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getAdminDashboardReadModel } from "@/lib/admin/dashboard-read-model-core";
import { db } from "@/lib/db";
import { offers, partners, rfqLeads, sellerEligibility } from "@/lib/schema";
import { sql } from "drizzle-orm";

describe("Admin Dashboard Read Model Integration", () => {
  beforeAll(async () => {
    // Clear out existing data for test isolation
    await db.execute(sql`TRUNCATE TABLE rfq_leads CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE offers CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE seller_eligibility CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE partners CASCADE;`);

    // Insert synthetic fixtures
    const p1 = await db.insert(partners).values({ companyName: "Partner 1", isVerified: true }).returning({ id: partners.id }).then(res => res[0].id);
    const p2 = await db.insert(partners).values({ companyName: "Partner 2", isVerified: false }).returning({ id: partners.id }).then(res => res[0].id);
    const p3 = await db.insert(partners).values({ companyName: "Partner 3", isVerified: true }).returning({ id: partners.id }).then(res => res[0].id);

    // Offers
    await db.insert(offers).values([
      { partnerId: p1, title: "Offer 1", publicationStatus: "draft", sku: "SKU1", price: "100" },
      { partnerId: p1, title: "Offer 2", publicationStatus: "published", sku: "SKU2", price: "100" },
      { partnerId: p2, title: "Offer 3", publicationStatus: "hidden", sku: "SKU3", price: "100" },
      { partnerId: p3, title: "Offer 4", publicationStatus: "archived", sku: "SKU4", price: "100" },
      { partnerId: p3, title: "Offer 5", publicationStatus: "deleted", sku: "SKU5", price: "100" },
    ]);

    // Eligibility
    await db.insert(sellerEligibility).values([
      { partnerId: p1, status: "eligible", reviewNotes: "Ok" },
      { partnerId: p2, status: "pending", reviewNotes: "Wait" },
      // p3 gets no row => "none"
    ]);

    // RFQ
    await db.insert(rfqLeads).values([
      { companyName: "C1", status: "new", message: "msg1", contactEmail: "c1@example.com", isArchived: false },
      { companyName: "C2", status: "in_progress", message: "msg2", contactEmail: "c2@example.com", isArchived: false },
      { companyName: "C3", status: "responded", message: "msg3", contactEmail: "c3@example.com", isArchived: false },
      { companyName: "C4", status: "closed", message: "msg4", contactEmail: "c4@example.com", isArchived: false },
    ]);
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE TABLE rfq_leads CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE offers CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE seller_eligibility CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE partners CASCADE;`);
  });

  it("should aggregate data accurately and omit PII", async () => {
    const result = await getAdminDashboardReadModel(db);

    // Counts
    expect(result.counts.partners.total).toBe(3);
    
    expect(result.counts.offers.total).toBe(5);
    expect(result.counts.offers.draft).toBe(1);
    expect(result.counts.offers.published).toBe(1);
    expect(result.counts.offers.hidden).toBe(1);
    expect(result.counts.offers.archived).toBe(1);
    expect(result.counts.offers.deleted).toBe(1);

    expect(result.counts.sellerEligibility.none).toBe(1);
    expect(result.counts.sellerEligibility.pending).toBe(1);
    expect(result.counts.sellerEligibility.eligible).toBe(1);
    expect(result.counts.sellerEligibility.ineligible).toBe(0);
    expect(result.counts.sellerEligibility.suspended).toBe(0);

    expect(result.counts.rfq.total).toBe(4);
    expect(result.counts.rfq.new).toBe(1);
    expect(result.counts.rfq.inProgress).toBe(1);
    expect(result.counts.rfq.responded).toBe(1);
    expect(result.counts.rfq.closed).toBe(1);

    // Queue excludes closed, max 5, ordered desc
    expect(result.recentRfqQueue.length).toBe(3);
    const statuses = result.recentRfqQueue.map(r => r.status);
    expect(statuses).not.toContain("closed");

    // Zero PII check in queue
    const firstQueueItem = result.recentRfqQueue[0] as unknown as { contactEmail?: string; contactName?: string; phone?: string; message?: string };
    expect(firstQueueItem.contactEmail).toBeUndefined();
    expect(firstQueueItem.contactName).toBeUndefined();
    expect(firstQueueItem.phone).toBeUndefined();
    expect(firstQueueItem.message).toBeUndefined();
  });
});
