import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { uploadOfferMediaCore, MAX_UPLOAD_SIZE, OfferMediaDependencies } from "../../src/lib/admin/offer-media-core";

function createFakeDeps(overrides?: Partial<OfferMediaDependencies>): OfferMediaDependencies {
  return {
    checkOfferExists: async () => true,
    checkDuplicate: async () => false,
    getMediaCount: async () => 0,
    insertMedia: async () => 100,
    storage: {
      put: async () => ({ ok: true }),
      delete: async () => ({ ok: true })
    },
    generateId: () => "fake-uuid",
    ...overrides
  };
}

const VALID_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

describe("Offer Media Core (MEDIA-02)", () => {
  test("rejects empty file", async () => {
    const res = await uploadOfferMediaCore(1, "test.jpg", Buffer.alloc(0), createFakeDeps());
    assert.deepEqual(res, { ok: false, code: "FILE_EMPTY" });
  });

  test("rejects file exceeding size limit", async () => {
    const res = await uploadOfferMediaCore(1, "test.jpg", Buffer.alloc(MAX_UPLOAD_SIZE + 1), createFakeDeps());
    assert.deepEqual(res, { ok: false, code: "FILE_TOO_LARGE" });
  });

  test("rejects invalid mime type", async () => {
    const buf = Buffer.from("invalid-signature");
    const res = await uploadOfferMediaCore(1, "test.jpg", buf, createFakeDeps());
    assert.deepEqual(res, { ok: false, code: "INVALID_MIME_TYPE" });
  });

  test("nonexistent offer", async () => {
    const deps = createFakeDeps({ checkOfferExists: async () => false });
    const res = await uploadOfferMediaCore(1, "test.jpg", VALID_JPEG, deps);
    assert.deepEqual(res, { ok: false, code: "OFFER_NOT_FOUND" });
  });

  test("duplicate checksum for same offer", async () => {
    const deps = createFakeDeps({ checkDuplicate: async () => true });
    const res = await uploadOfferMediaCore(1, "test.jpg", VALID_JPEG, deps);
    assert.deepEqual(res, { ok: false, code: "DUPLICATE_CONTENT" });
  });

  test("first image becomes primary", async () => {
    let insertedIsPrimary = false;
    let insertedSortOrder = -1;
    const deps = createFakeDeps({
      getMediaCount: async () => 0,
      insertMedia: async (data) => {
        insertedIsPrimary = data.isPrimary;
        insertedSortOrder = data.sortOrder;
        return 101;
      }
    });
    const res = await uploadOfferMediaCore(1, "test.jpg", VALID_JPEG, deps);
    assert.deepEqual(res, { ok: true, mediaId: 101 });
    assert.equal(insertedIsPrimary, true);
    assert.equal(insertedSortOrder, 0);
  });

  test("later image does not replace primary", async () => {
    let insertedIsPrimary = true;
    let insertedSortOrder = -1;
    const deps = createFakeDeps({
      getMediaCount: async () => 3, // 3 existing images
      insertMedia: async (data) => {
        insertedIsPrimary = data.isPrimary;
        insertedSortOrder = data.sortOrder;
        return 102;
      }
    });
    const res = await uploadOfferMediaCore(1, "test.jpg", VALID_JPEG, deps);
    assert.deepEqual(res, { ok: true, mediaId: 102 });
    assert.equal(insertedIsPrimary, false);
    assert.equal(insertedSortOrder, 3);
  });

  test("storage upload failure", async () => {
    const deps = createFakeDeps({
      storage: {
        put: async () => ({ ok: false, error: "S3 down" }),
        delete: async () => ({ ok: true })
      }
    });
    const res = await uploadOfferMediaCore(1, "test.jpg", VALID_JPEG, deps);
    assert.deepEqual(res, { ok: false, code: "STORAGE_ERROR" });
  });

  test("DB persistence failure after successful storage upload (compensating delete success)", async () => {
    let deletedPath = "";
    const deps = createFakeDeps({
      insertMedia: async () => { throw new Error("DB down"); },
      storage: {
        put: async () => ({ ok: true }),
        delete: async (bucket, path) => {
          deletedPath = path;
          return { ok: true };
        }
      }
    });
    const res = await uploadOfferMediaCore(1, "test.jpg", VALID_JPEG, deps);
    assert.deepEqual(res, { ok: false, code: "DB_ERROR" });
    assert.equal(deletedPath, "offers/1/fake-uuid.jpg");
  });

  test("compensating delete failure", async () => {
    const deps = createFakeDeps({
      insertMedia: async () => { throw new Error("DB down"); },
      storage: {
        put: async () => ({ ok: true }),
        delete: async () => ({ ok: false, error: "S3 also down" })
      }
    });
    const res = await uploadOfferMediaCore(1, "test.jpg", VALID_JPEG, deps);
    assert.deepEqual(res, { ok: false, code: "DB_ERROR_CLEANUP_FAILED" });
  });

  test("canonical extension derived from MIME, not filename", async () => {
    let putPath = "";
    const deps = createFakeDeps({
      storage: {
        put: async (bucket, path) => {
          putPath = path;
          return { ok: true };
        },
        delete: async () => ({ ok: true })
      }
    });
    // Valid JPEG, but misleading .svg filename
    const res = await uploadOfferMediaCore(1, "payload.svg", VALID_JPEG, deps);
    assert.equal(res.ok, true);
    assert.equal(putPath, "offers/1/fake-uuid.jpg");
  });
});
