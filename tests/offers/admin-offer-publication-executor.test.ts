/* eslint-disable @typescript-eslint/no-explicit-any */
import test from "node:test";
import assert from "node:assert/strict";
import { executeOfferPublicationStateChange, OfferPublicationTx, PublicationSellerReadinessQuery } from "../../src/lib/admin/offer-publication-core";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

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

  const createMockDb = (mockOffer: Record<string, unknown> | null, updates: Record<string, unknown>[]) => {
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
      update: () => updateBuilder
    };

    const db = {
      transaction: async (fn: (txArg: OfferPublicationTx) => Promise<unknown>) => fn(tx as unknown as OfferPublicationTx)
    };

    return { db: db as unknown as NodePgDatabase<Record<string, never>>, tx };
  };

  await t.test("J. draft ecommerce offer Partner Seller Ready -> publication UPDATE occurs", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb(defaultEcommerceOffer, updates);
    let queriedPartnerId = -1;
    const deps = {
      querySellerReadiness: (async (txArg: OfferPublicationTx, pId: number) => {
        queriedPartnerId = pId;
        return { status: "ready" as const };
      }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db as any, {
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
    let passedTx: any;
    const deps = {
      querySellerReadiness: (async (txArg: OfferPublicationTx) => {
        passedTx = txArg;
        return { status: "ready" as const };
      }) satisfies PublicationSellerReadinessQuery
    };

    await executeOfferPublicationStateChange(db as any, { offerId: 1, expectedStatus: "draft", targetStatus: "published" }, deps);
    assert.strictEqual(passedTx, tx);
  });

  await t.test("U. ecommerce execution without usable readiness dependency -> fail closed", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb(defaultEcommerceOffer, updates);
    const badDeps = {
      querySellerReadiness: (async () => { throw new Error("Dependency offline"); }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db as any, { offerId: 1, expectedStatus: "draft", targetStatus: "published" }, badDeps);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "SELLER_NOT_READY");
    assert.equal(updates.length, 0);
  });

  await t.test("K. draft ecommerce offer Partner NOT READY -> NO UPDATE, OFFER_PUBLISH_NOT_ELIGIBLE", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb(defaultEcommerceOffer, updates);
    const deps = {
      querySellerReadiness: (async () => ({ status: "not_ready" as const })) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db as any, {
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
    const deps = {
      querySellerReadiness: (async () => { called = true; return { status: "not_ready" as const }; }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db as any, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(called, false);
  });

  await t.test("N. outbound publication -> Seller Readiness query NOT called", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({
      ...defaultEcommerceOffer, offerModel: "marketplace", conversionType: "outbound", outboundUrl: "https://x.com"
    }, updates);
    let called = false;
    const deps = {
      querySellerReadiness: (async () => { called = true; return { status: "not_ready" as const }; }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db as any, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(called, false);
  });

  await t.test("O. unknown model -> no readiness query if MODEL_UNKNOWN resolves first", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({ ...defaultEcommerceOffer, offerModel: "unknown", conversionType: "unknown" }, updates);
    let called = false;
    const deps = {
      querySellerReadiness: (async () => { called = true; return { status: "ready" as const }; }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db as any, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "OFFER_PUBLISH_NOT_ELIGIBLE");
    assert.equal(called, false);
  });

  await t.test("P. readiness query failure -> fail closed -> no publication UPDATE", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb(defaultEcommerceOffer, updates);
    const deps = {
      querySellerReadiness: (async () => { throw new Error("DB Error"); }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db as any, {
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
    const deps = {
      querySellerReadiness: (async () => { called = true; return { status: "not_ready" as const }; }) satisfies PublicationSellerReadinessQuery
    };

    const res = await executeOfferPublicationStateChange(db as any, {
      offerId: 1, expectedStatus: "published", targetStatus: "archived"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(called, false);
  });

  await t.test("R. already published / idempotent flow unchanged", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({ ...defaultEcommerceOffer, publicationStatus: "published" }, updates);
    let called = false;
    const deps = { querySellerReadiness: (async () => { called = true; return { status: "not_ready" as const }; }) satisfies PublicationSellerReadinessQuery };

    const res = await executeOfferPublicationStateChange(db as any, {
      offerId: 1, expectedStatus: "published", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    if (res.ok) assert.equal(res.code, "OFFER_PUBLISHED"); // Idempotent is still OK/OFFER_PUBLISHED code or ALREADY_PUBLISHED depending on implementation
    assert.equal(called, false);
  });

  await t.test("S. transition conflict unchanged", async () => {
    const updates: Record<string, unknown>[] = [];
    const { db } = createMockDb({ ...defaultEcommerceOffer, publicationStatus: "archived" }, updates);
    const deps = { querySellerReadiness: (async () => ({ status: "ready" as const })) satisfies PublicationSellerReadinessQuery };

    const res = await executeOfferPublicationStateChange(db as any, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "OFFER_TRANSITION_CONFLICT");
  });
});
