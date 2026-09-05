import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateImageSignature, computeSha256 } from "../../src/lib/storage/image-validation";

describe("Image Validation (MEDIA-02)", () => {
  test("accepts valid JPEG", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    assert.equal(validateImageSignature(buf), "image/jpeg");
  });

  test("accepts valid PNG", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    assert.equal(validateImageSignature(buf), "image/png");
  });

  test("accepts valid WEBP", () => {
    const buf = Buffer.from("RIFF1234WEBPVP8 ");
    assert.equal(validateImageSignature(buf), "image/webp");
  });

  test("accepts valid AVIF", () => {
    const buf = Buffer.from("....ftypavif");
    assert.equal(validateImageSignature(buf), "image/avif");
  });

  test("rejects SVG", () => {
    const buf = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\"");
    assert.equal(validateImageSignature(buf), null);
  });

  test("rejects PDF", () => {
    const buf = Buffer.from("%PDF-1.4\n1 0 obj\n");
    assert.equal(validateImageSignature(buf), null);
  });

  test("rejects random bytes", () => {
    const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c]);
    assert.equal(validateImageSignature(buf), null);
  });

  test("rejects too short buffer", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff]);
    assert.equal(validateImageSignature(buf), null);
  });

  test("computes sha256 hex correctly", () => {
    const buf = Buffer.from("test content");
    // echo -n "test content" | sha256sum
    const expected = "6ae8a75555209fd6c44157c0aed8016e763ff435a19cf186f76863140143ff72";
    assert.equal(computeSha256(buf), expected);
  });
});
