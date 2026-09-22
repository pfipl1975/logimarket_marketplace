import test from "node:test";
import assert from "node:assert/strict";
import { finalizeStagedImage } from "../../src/lib/admin/offer-media-staging-core";

test("TOCTOU proof: prepare while DRAFT -> status changes before finalize -> finalize rejected", async () => {
  let removeCalled = false;
  let persistCalled = false;

  const fakeDeps = {
    download: async (p: string) => Buffer.from("fake data for " + p),
    persist: async () => {
      persistCalled = true;
      // Simulate Drizzle transaction lock seeing a changed publicationStatus -> "published"
      // So the DB layer aborts and returns OFFER_NOT_EDITABLE.
      return { ok: false as const, code: "OFFER_NOT_EDITABLE" };
    },
    remove: async () => {
      removeCalled = true;
      return { ok: true as const };
    }
  };

  const result = await finalizeStagedImage("fake-receipt.jpg", fakeDeps);

  // 1. Result must be failure with the domain code from persist
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "OFFER_NOT_EDITABLE");
  }

  // 2. Persist must have been called
  assert.equal(persistCalled, true);

  // 3. Staging cleanup MUST be called despite the domain failure
  assert.equal(removeCalled, true, "Staging remove() IS CALLED even if persist fails with domain error");
});
