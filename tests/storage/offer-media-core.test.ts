import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { uploadOfferMediaCore, MAX_UPLOAD_SIZE } from "../../src/lib/admin/offer-media-core";

describe("Offer Media Core (MEDIA-02)", () => {
  test("rejects empty file", async () => {
    const res = await uploadOfferMediaCore(1, "test.jpg", Buffer.alloc(0));
    assert.deepEqual(res, { ok: false, code: "FILE_EMPTY" });
  });

  test("rejects file exceeding size limit", async () => {
    const res = await uploadOfferMediaCore(1, "test.jpg", Buffer.alloc(MAX_UPLOAD_SIZE + 1));
    assert.deepEqual(res, { ok: false, code: "FILE_TOO_LARGE" });
  });

  test("rejects invalid mime type", async () => {
    const buf = Buffer.from("invalid-signature");
    const res = await uploadOfferMediaCore(1, "test.jpg", buf);
    assert.deepEqual(res, { ok: false, code: "INVALID_MIME_TYPE" });
  });

});
