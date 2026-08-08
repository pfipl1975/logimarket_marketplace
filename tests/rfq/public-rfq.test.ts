import test, { describe } from "node:test";
import assert from "node:assert";
import fs from "fs/promises";
import path from "path";
import { PublicRfqInputSchema } from "../../src/lib/rfq/schema";

describe("Public RFQ Validation Matrix", () => {
  const validBase = {
    offerId: 1,
    companyName: "Test Company",
    contactName: "John Doe",
    email: "john@example.com",
  };

  test("valid base accepts", () => {
    const res = PublicRfqInputSchema.safeParse(validBase);
    assert.ok(res.success);
  });

  test("offerId rejection matrix", () => {
    const cases = [0, -1, 1.5, "1", "123", Number.MAX_SAFE_INTEGER + 1];
    for (const offerId of cases) {
      const res = PublicRfqInputSchema.safeParse({ ...validBase, offerId });
      assert.ok(!res.success, `Should reject offerId: ${offerId}`);
    }
  });

  test("companyName validation", () => {
    assert.ok(!PublicRfqInputSchema.safeParse({ ...validBase, companyName: "" }).success);
    assert.ok(!PublicRfqInputSchema.safeParse({ ...validBase, companyName: "   " }).success);
    assert.ok(!PublicRfqInputSchema.safeParse({ ...validBase, companyName: "a".repeat(256) }).success);
    
    const trimRes = PublicRfqInputSchema.safeParse({ ...validBase, companyName: "  Acme  " });
    assert.ok(trimRes.success);
    assert.equal(trimRes.data.companyName, "Acme");
  });

  test("contactName validation", () => {
    assert.ok(!PublicRfqInputSchema.safeParse({ ...validBase, contactName: "" }).success);
    assert.ok(!PublicRfqInputSchema.safeParse({ ...validBase, contactName: "a".repeat(256) }).success);
  });

  test("email validation", () => {
    assert.ok(!PublicRfqInputSchema.safeParse({ ...validBase, email: "invalid" }).success);
    assert.ok(!PublicRfqInputSchema.safeParse({ ...validBase, email: "a".repeat(250) + "@b.com" }).success);
    assert.ok(PublicRfqInputSchema.safeParse({ ...validBase, email: "  a@b.com  " }).success);
  });

  test("phone optional & normalization", () => {
    let res = PublicRfqInputSchema.safeParse({ ...validBase, phone: "  " });
    assert.ok(res.success);
    assert.equal(res.data.phone, undefined);

    res = PublicRfqInputSchema.safeParse({ ...validBase, phone: "" });
    assert.ok(res.success);
    assert.equal(res.data.phone, undefined);

    res = PublicRfqInputSchema.safeParse({ ...validBase, phone: " 123 " });
    assert.ok(res.success);
    assert.equal(res.data.phone, "123");

    assert.ok(!PublicRfqInputSchema.safeParse({ ...validBase, phone: "1".repeat(101) }).success);
  });

  test("message optional & normalization", () => {
    let res = PublicRfqInputSchema.safeParse({ ...validBase, message: "  " });
    assert.ok(res.success);
    assert.equal(res.data.message, undefined);

    res = PublicRfqInputSchema.safeParse({ ...validBase, message: "" });
    assert.ok(res.success);
    assert.equal(res.data.message, undefined);

    res = PublicRfqInputSchema.safeParse({ ...validBase, message: " hello " });
    assert.ok(res.success);
    assert.equal(res.data.message, "hello");

    assert.ok(!PublicRfqInputSchema.safeParse({ ...validBase, message: "1".repeat(5001) }).success);
  });

  test("submitRfq Server Action Contract", async () => {
    const actionPath = path.join(process.cwd(), "src/app/actions.ts");
    const sourceCode = await fs.readFile(actionPath, "utf-8");

    const submitStart = sourceCode.indexOf("export async function submitRfq(rawInput: unknown)");
    assert.ok(submitStart !== -1, "submitRfq with unknown boundary missing");

    const zodIdx = sourceCode.indexOf("PublicRfqInputSchema.safeParse(rawInput)", submitStart);
    assert.ok(zodIdx !== -1, "Zod validation missing");

    // Eligibility check
    assert.ok(sourceCode.indexOf("!offer.isActive", submitStart) !== -1, "Active check missing");
    assert.ok(sourceCode.indexOf("!isConversionAllowedStatus(offer.publicationStatus)", submitStart) !== -1, "Publication status check missing");
    assert.ok(sourceCode.indexOf("resolveCanonicalOfferModel(", submitStart) !== -1, "Canonical model check missing");
    assert.ok(sourceCode.indexOf("!== \"rfq\"", submitStart) !== -1, "Must enforce rfq canonical model");

    // Trust boundary - partnerId derived from DB
    const insertIdx = sourceCode.indexOf("db.insert(rfqLeads).values", submitStart);
    assert.ok(insertIdx !== -1, "Insert missing");
    const partnerIdIdx = sourceCode.indexOf("partnerId: offer.partnerId", insertIdx);
    assert.ok(partnerIdIdx !== -1, "partnerId must be derived from server offer");
    assert.ok(sourceCode.indexOf("data.partnerId", insertIdx) === -1, "partnerId cannot be taken from client data");

    // Catch blocks should not log raw errors or throw
    const catchIdx = sourceCode.indexOf("catch", submitStart);
    assert.ok(catchIdx !== -1, "Missing try/catch");
    const returnSystemErrorIdx = sourceCode.indexOf("return { ok: false, code: \"SYSTEM_ERROR\" };", catchIdx);
    assert.ok(returnSystemErrorIdx !== -1, "Must return SYSTEM_ERROR on exception");
  });
});
