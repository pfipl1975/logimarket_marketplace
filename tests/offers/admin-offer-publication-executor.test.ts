import test from "node:test";
import assert from "node:assert/strict";
import { executeOfferPublicationStateChange, OfferPublicationTx, PublicationSellerReadinessQuery } from "../../src/lib/admin/offer-publication-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../src/lib/schema";

test("Admin Offer Publication Executor (Mocked)", async (t) => {
  const defaultEcommerceOffer = {
    id: 1,
    partnerId: 42,
    offerModel: "marketplace" as const,
    conversionType: "inbound" as const,
    priceOnRequest: false,
    normalizedPrice: "10.00",
    outboundUrl: null,
    publicationStatus: "draft" as const,
    isActive: true,
    title: "Test",
    description: "Desc",
    imageUrl: "https://example.com/img.png",
    priceBrutto: "100.00"
  };

  const createMockDb = (mockOffer: Record<string, unknown> | null, updates: Record<string, unknown>[], events: Record<string, unknown>[] = []) => {
    // Non-thenable mock query builder
    const selectBuilder = {
      from: () => ({
        where: () => ({
          for: async () => mockOffer ? [mockOffer] : []
        })
      })
    };

    const updateBuilder = {
      set: (data: Record<string, unknown>) => {
        updates.push(data);
        return {
          where: async () => []
        };
      }
    };

    const tx = {
      select: () => selectBuilder,
      update: () => updateBuilder,
      insert: () => ({ values: async (event: Record<string, unknown>) => { events.push(event); return []; } }),
    };

    const db = {
      transaction: async (fn: (txArg: OfferPublicationTx) => Promise<unknown>) => fn(tx as unknown as OfferPublicationTx)
    };

    return { db: db as unknown as NodePgDatabase<typeof schema>, tx: tx as unknown as OfferPublicationTx, events };
  };

  await t.test("J. draft ecommerce offer Partner Seller Ready -> publication UPDATE occurs", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb(defaultEcommerceOffer, updates);
    let queriedPartnerId = -1;
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async (txArg: OfferPublicationTx, pId: number) => {
        queriedPartnerId = pId;
        return { status: "ready" as const };
      }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    if (res.ok) assert.equal(res.code, "OFFER_PUBLISHED");
    assert.equal(updates.length, 1);
    assert.equal(updates[0].publicationStatus, "published");
    assert.equal(queriedPartnerId, 42); // L. correct offer.partnerId passed
  });

  await t.test("T. exact transaction executor is passed to readiness dependency", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db, tx } = createMockDb(defaultEcommerceOffer, updates);
    let passedTx: OfferPublicationTx | undefined;
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async (txArg: OfferPublicationTx) => {
        passedTx = txArg;
        return { status: "ready" as const };
      }) satisfies PublicationSellerReadinessQuery
    };

    await executeOfferPublicationStateChange(db, { offerId: 1, expectedStatus: "draft", targetStatus: "published" }, deps);
    assert.strictEqual(passedTx, tx);
  });

  await t.test("U. ecommerce execution without usable readiness dependency -> fail closed", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb(defaultEcommerceOffer, updates);
    const badDeps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async () => { throw new Error("Dependency offline"); }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, { offerId: 1, expectedStatus: "draft", targetStatus: "published" }, badDeps);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "SELLER_NOT_READY");
    assert.equal(updates.length, 0);
  });

  await t.test("K. draft ecommerce offer Partner NOT READY -> NO UPDATE, OFFER_PUBLISH_NOT_ELIGIBLE", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb(defaultEcommerceOffer, updates);
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async () => ({ status: "not_ready" as const })) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "SELLER_NOT_READY");
    assert.equal(updates.length, 0);
  });

  await t.test("M. RFQ publication -> Seller Readiness query NOT called", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({
      ...defaultEcommerceOffer, offerModel: "rfq", conversionType: "inbound", priceOnRequest: true
    }, updates);
    let called = false;
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async () => { called = true; return { status: "not_ready" as const }; }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(called, false);
  });

  await t.test("R6. eligible pending_review RFQ offer can be published", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({
      ...defaultEcommerceOffer,
      publicationStatus: "pending_review",
      offerModel: "rfq",
      conversionType: "inbound",
      priceOnRequest: true,
      normalizedPrice: null,
    }, updates);
    let readinessQueried = false;
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async () => {
        readinessQueried = true;
        return { status: "not_ready" as const };
      }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 7, expectedStatus: "pending_review", targetStatus: "published"
    }, deps);

    assert.deepEqual(res, { ok: true, code: "OFFER_PUBLISHED", changed: true });
    assert.equal(readinessQueried, false);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].publicationStatus, "published");
  });

  await t.test("R6. ineligible pending_review offer remains unpublished", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({
      ...defaultEcommerceOffer,
      publicationStatus: "pending_review",
      offerModel: "rfq",
      conversionType: "inbound",
      priceOnRequest: true,
      normalizedPrice: null,
      isActive: false,
    }, updates);
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async () => ({ status: "ready" as const })) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 7, expectedStatus: "pending_review", targetStatus: "published"
    }, deps);

    assert.deepEqual(res, { ok: false, code: "OFFER_PUBLISH_NOT_ELIGIBLE", reason: "OFFER_INACTIVE" });
    assert.equal(updates.length, 0);
  });

  await t.test("R6. pending_review return-to-draft remains unchanged", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({
      ...defaultEcommerceOffer,
      publicationStatus: "pending_review",
    }, updates);
    let readinessQueried = false;
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async () => {
        readinessQueried = true;
        return { status: "ready" as const };
      }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 7, expectedStatus: "pending_review", targetStatus: "draft", rejectionReason: "Please update specifications"
    }, deps);

    assert.deepEqual(res, { ok: true, code: "OFFER_RETURNED_TO_DRAFT", changed: true });
    assert.equal(readinessQueried, false);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].publicationStatus, "draft");
  });

  await t.test("approved RFQ records tenant-bound ADMIN audit event", async () => {
    const updates: Record<string, unknown>[] = [];
    const events: Record<string, unknown>[] = [];
    const { db } = createMockDb({ ...defaultEcommerceOffer, offerModel: "rfq", conversionType: "inbound", priceOnRequest: true, normalizedPrice: null, publicationStatus: "pending_review" }, updates, events);
    const result = await executeOfferPublicationStateChange(db, {offerId:1,expectedStatus:"pending_review",targetStatus:"published"}, {
      adminActorId: "00000000-0000-4000-8000-000000000001", querySellerReadiness: async () => { throw new Error("RFQ never requires ecommerce readiness"); }
    });
    assert.equal(result.ok, true);
    assert.deepEqual(events, [{
      offerId: 1, partnerId: 42, adminActorId: "00000000-0000-4000-8000-000000000001",
      decision: "approved", fromStatus: "pending_review", toStatus: "published", reason: null,
    }]);
  });

  await t.test("missing rejection reason fails closed before SQL", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db, events } = createMockDb({ ...defaultEcommerceOffer, publicationStatus: "pending_review" }, updates);
    const result = await executeOfferPublicationStateChange(db, {offerId:1,expectedStatus:"pending_review",targetStatus:"draft"}, {
      adminActorId: "00000000-0000-4000-8000-000000000001", querySellerReadiness: async () => ({status:"ready"})
    });
    assert.deepEqual(result, {ok:false,code:"OFFER_INVALID_INPUT"});
    assert.equal(updates.length, 0);
    assert.equal(events.length, 0);
  });

  await t.test("N. outbound publication -> Seller Readiness query NOT called", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({
      ...defaultEcommerceOffer, offerModel: "marketplace", conversionType: "outbound", outboundUrl: "https://x.com"
    }, updates);
    let called = false;
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async () => { called = true; return { status: "not_ready" as const }; }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(called, false);
  });

  await t.test("O. unknown model -> no readiness query if MODEL_UNKNOWN resolves first", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({ ...defaultEcommerceOffer, offerModel: "unknown", conversionType: "unknown" }, updates);
    let called = false;
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async () => { called = true; return { status: "ready" as const }; }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "OFFER_PUBLISH_NOT_ELIGIBLE");
    assert.equal(called, false);
  });

  await t.test("P. readiness query failure -> fail closed -> no publication UPDATE", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb(defaultEcommerceOffer, updates);
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async () => { throw new Error("DB Error"); }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "SELLER_NOT_READY");
    assert.equal(updates.length, 0);
  });

  await t.test("Q. archive flow unchanged -> readiness query NOT called", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({ ...defaultEcommerceOffer, publicationStatus: "published" }, updates);
    let called = false;
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001",
      querySellerReadiness: (async () => { called = true; return { status: "not_ready" as const }; }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "published", targetStatus: "archived"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(called, false);
  });

  await t.test("R. already published / idempotent flow unchanged", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({ ...defaultEcommerceOffer, publicationStatus: "published" }, updates);
    let called = false;
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001", querySellerReadiness: (async () => { called = true; return { status: "not_ready" as const }; }) satisfies PublicationSellerReadinessQuery };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "published", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    if (res.ok) assert.equal(res.code, "OFFER_PUBLISHED");
    assert.equal(called, false);
  });

  await t.test("S. transition conflict unchanged", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({ ...defaultEcommerceOffer, publicationStatus: "archived" }, updates);
    const deps = { adminActorId: "00000000-0000-4000-8000-000000000001", querySellerReadiness: (async () => ({ status: "ready" as const })) satisfies PublicationSellerReadinessQuery };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "OFFER_TRANSITION_CONFLICT");
  });
});
