/* eslint-disable @typescript-eslint/no-explicit-any */
import test from "node:test";
import assert from "node:assert/strict";
import { executeOfferPublicationStateChange } from "@/lib/admin/offer-publication-core";

const createMockDb = (mockOffer: any, updates: any[]) => {
  const tx = {
    select: () => tx,
    from: () => tx,
    where: () => tx,
    for: () => tx,
    then: (resolve: any) => resolve(mockOffer ? [mockOffer] : []),
    update: () => tx,
    set: (data: any) => {
      updates.push(data);
      return tx;
    }
  };
  return {
    transaction: async (fn: any) => fn(tx)
  } as any;
};

test("Admin Offer Publication Executor (Mocked)", async (t) => {
  const defaultEcommerceOffer = {
    id: 1,
    partnerId: 42,
    publicationStatus: "draft",
    isActive: true,
    title: "Test",
    offerModel: "marketplace",
    conversionType: "inbound",
    priceOnRequest: false,
    normalizedPrice: "10.00",
    outboundUrl: null,
  };

  await t.test("J. draft ecommerce offer Partner Seller Ready -> publication UPDATE occurs", async () => {
    const updates: any[] = [];
    const db = createMockDb(defaultEcommerceOffer, updates);
    let queriedPartnerId = -1;
    const deps = {
      querySellerReadiness: async (tx: any, pId: number) => {
        queriedPartnerId = pId;
        return { status: "ready", blockers: [] };
      }
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].publicationStatus, "published");
    assert.equal(queriedPartnerId, 42); // L
  });

  await t.test("K. draft ecommerce offer Partner NOT READY -> NO UPDATE, OFFER_PUBLISH_NOT_ELIGIBLE", async () => {
    const updates: any[] = [];
    const db = createMockDb(defaultEcommerceOffer, updates);
    const deps = {
      querySellerReadiness: async () => ({ status: "not_ready", blockers: [] })
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.code, "OFFER_PUBLISH_NOT_ELIGIBLE");
      assert.equal(res.reason, "SELLER_NOT_READY");
    }
    assert.equal(updates.length, 0);
  });

  await t.test("M. RFQ publication -> Seller Readiness query NOT called", async () => {
    const updates: any[] = [];
    const db = createMockDb({
      ...defaultEcommerceOffer, offerModel: "rfq", conversionType: "inbound", priceOnRequest: true
    }, updates);
    let called = false;
    const deps = {
      querySellerReadiness: async () => { called = true; return { status: "not_ready", blockers: [] }; }
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(called, false);
  });

  await t.test("N. outbound publication -> Seller Readiness query NOT called", async () => {
    const updates: any[] = [];
    const db = createMockDb({
      ...defaultEcommerceOffer, offerModel: "marketplace", conversionType: "outbound", outboundUrl: "https://x.com"
    }, updates);
    let called = false;
    const deps = {
      querySellerReadiness: async () => { called = true; return { status: "not_ready", blockers: [] }; }
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(called, false);
  });

  await t.test("O. unknown model -> no readiness query if MODEL_UNKNOWN resolves first", async () => {
    const updates: any[] = [];
    const db = createMockDb({ ...defaultEcommerceOffer, offerModel: "unknown", conversionType: "unknown" }, updates);
    let called = false;
    const deps = {
      querySellerReadiness: async () => { called = true; return { status: "ready", blockers: [] }; }
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "MODEL_UNKNOWN");
    assert.equal(called, false);
  });

  await t.test("P. readiness query failure -> fail closed -> no publication UPDATE", async () => {
    const updates: any[] = [];
    const db = createMockDb(defaultEcommerceOffer, updates);
    const deps = {
      querySellerReadiness: async () => { throw new Error("DB Error"); }
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "SELLER_NOT_READY");
    assert.equal(updates.length, 0);
  });

  await t.test("Q. archive flow unchanged -> readiness query NOT called", async () => {
    const updates: any[] = [];
    const db = createMockDb({ ...defaultEcommerceOffer, publicationStatus: "published" }, updates);
    let called = false;
    const deps = {
      querySellerReadiness: async () => { called = true; return { status: "not_ready", blockers: [] }; }
    };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "published", targetStatus: "archived"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(called, false);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].publicationStatus, "archived");
  });

  await t.test("R. idempotent already-published flow unchanged", async () => {
    const updates: any[] = [];
    const db = createMockDb({ ...defaultEcommerceOffer, publicationStatus: "published" }, updates);
    let called = false;
    const deps = { querySellerReadiness: async () => { called = true; return { status: "not_ready", blockers: [] }; } };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "published", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, true);
    assert.equal(called, false);
    assert.equal(updates.length, 0);
  });

  await t.test("S. transition conflict unchanged", async () => {
    const updates: any[] = [];
    const db = createMockDb({ ...defaultEcommerceOffer, publicationStatus: "archived" }, updates);
    const deps = { querySellerReadiness: async () => ({ status: "ready", blockers: [] }) };

    const res = await executeOfferPublicationStateChange(db, {
      offerId: 1, expectedStatus: "draft", targetStatus: "published"
    }, deps);

    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "OFFER_TRANSITION_CONFLICT");
  });
});
