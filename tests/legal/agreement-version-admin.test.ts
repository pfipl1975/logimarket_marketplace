import { test } from "node:test";
import assert from "node:assert";
import { CreateDraftSchema, ActivateSchema } from "@/lib/admin/agreement-version-core";

test("Agreement Version Core Validations", async (t) => {
  await t.test("CreateDraftSchema accepts valid version and hash", () => {
    const result = CreateDraftSchema.safeParse({
      version: "v1.0",
      canonicalTemplateHashSha256: "a".repeat(64),
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.canonicalTemplateHashSha256, "a".repeat(64));
    }
  });

  await t.test("CreateDraftSchema accepts uppercase hash", () => {
    const result = CreateDraftSchema.safeParse({
      version: "v1.0",
      canonicalTemplateHashSha256: "A".repeat(64),
    });
    assert.strictEqual(result.success, true);
  });

  await t.test("CreateDraftSchema rejects invalid version formats", () => {
    const invalids = ["1.0", "v1", "v1.0 beta", "V1.0"];
    for (const inv of invalids) {
      const result = CreateDraftSchema.safeParse({
        version: inv,
        canonicalTemplateHashSha256: "a".repeat(64),
      });
      assert.strictEqual(result.success, false, `Failed for ${inv}`);
    }
  });

  await t.test("CreateDraftSchema trims spaces around valid version", () => {
    const result = CreateDraftSchema.safeParse({
      version: " v1.0 ",
      canonicalTemplateHashSha256: "a".repeat(64),
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.version, "v1.0");
    }
  });

  await t.test("CreateDraftSchema rejects malformed hash", () => {
    const result = CreateDraftSchema.safeParse({
      version: "v1.0",
      canonicalTemplateHashSha256: "a".repeat(63), // 63 chars
    });
    assert.strictEqual(result.success, false);
  });

  await t.test("CreateDraftSchema rejects empty hash", () => {
    const result = CreateDraftSchema.safeParse({
      version: "v1.0",
      canonicalTemplateHashSha256: "",
    });
    assert.strictEqual(result.success, false);
  });

  await t.test("CreateDraftSchema rejects extra fields", () => {
    const result = CreateDraftSchema.safeParse({
      version: "v1.0",
      canonicalTemplateHashSha256: "a".repeat(64),
      status: "active",
      effectiveFrom: new Date(),
      title: "Test",
    });
    assert.strictEqual(result.success, false);
  });

  await t.test("ActivateSchema accepts valid id", () => {
    const result = ActivateSchema.safeParse({
      agreementVersionId: 1,
    });
    assert.strictEqual(result.success, true);
  });

  await t.test("ActivateSchema rejects negative id", () => {
    const result = ActivateSchema.safeParse({
      agreementVersionId: -1,
    });
    assert.strictEqual(result.success, false);
  });

  await t.test("ActivateSchema rejects unsafe large id", () => {
    const result = ActivateSchema.safeParse({
      agreementVersionId: Number.MAX_SAFE_INTEGER + 1,
    });
    assert.strictEqual(result.success, false);
  });

  await t.test("ActivateSchema rejects extra fields", () => {
    const result = ActivateSchema.safeParse({
      agreementVersionId: 1,
      status: "active",
    });
    assert.strictEqual(result.success, false);
  });
});
