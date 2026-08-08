import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { PublicRfqInputSchema } from "@/lib/rfq/schema";
import { validatePublicRfqEligibility } from "@/lib/rfq/eligibility";

test("Public RFQ Eligibility Behavior Matrix", async (t) => {
  await t.test("published + active + rfq/inbound -> eligible", () => {
    assert.strictEqual(
      validatePublicRfqEligibility({
        isActive: true,
        publicationStatus: "published",
        offerModel: "rfq",
        conversionType: "inbound"
      }),
      true
    );
  });

  await t.test("draft -> reject", () => {
    assert.strictEqual(
      validatePublicRfqEligibility({
        isActive: true,
        publicationStatus: "draft",
        offerModel: "rfq",
        conversionType: "inbound"
      }),
      false
    );
  });

  await t.test("archived -> reject", () => {
    assert.strictEqual(
      validatePublicRfqEligibility({
        isActive: true,
        publicationStatus: "archived",
        offerModel: "rfq",
        conversionType: "inbound"
      }),
      false
    );
  });

  await t.test("inactive -> reject", () => {
    assert.strictEqual(
      validatePublicRfqEligibility({
        isActive: false,
        publicationStatus: "published",
        offerModel: "rfq",
        conversionType: "inbound"
      }),
      false
    );
  });

  await t.test("marketplace + inbound -> reject", () => {
    assert.strictEqual(
      validatePublicRfqEligibility({
        isActive: true,
        publicationStatus: "published",
        offerModel: "marketplace",
        conversionType: "inbound"
      }),
      false
    );
  });

  await t.test("rfq + outbound -> reject", () => {
    assert.strictEqual(
      validatePublicRfqEligibility({
        isActive: true,
        publicationStatus: "published",
        offerModel: "rfq",
        conversionType: "outbound"
      }),
      false
    );
  });

  await t.test("marketplace + outbound -> reject", () => {
    assert.strictEqual(
      validatePublicRfqEligibility({
        isActive: true,
        publicationStatus: "published",
        offerModel: "marketplace",
        conversionType: "outbound"
      }),
      false
    );
  });

  await t.test("unknown offerModel -> reject", () => {
    assert.strictEqual(
      validatePublicRfqEligibility({
        isActive: true,
        publicationStatus: "published",
        offerModel: "some_weird_model",
        conversionType: "inbound"
      }),
      false
    );
  });

  await t.test("unknown conversionType -> reject", () => {
    assert.strictEqual(
      validatePublicRfqEligibility({
        isActive: true,
        publicationStatus: "published",
        offerModel: "rfq",
        conversionType: "some_weird_type"
      }),
      false
    );
  });
});

test("Public RFQ Schema Validation Details", async (t) => {
  const basePayload = {
    offerId: 123,
    companyName: "Valid Company",
    contactName: "John Doe",
    email: "john@example.com"
  };

  await t.test("companyName trim", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, companyName: "  Company  " });
    assert.ok(res.success);
    assert.strictEqual(res.data.companyName, "Company");
  });

  await t.test("contactName trim", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, contactName: "  John  " });
    assert.ok(res.success);
    assert.strictEqual(res.data.contactName, "John");
  });

  await t.test("companyName whitespace-only reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, companyName: "   " });
    assert.strictEqual(res.success, false);
  });

  await t.test("contactName whitespace-only reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, contactName: "   " });
    assert.strictEqual(res.success, false);
  });

  await t.test("companyName 256 reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, companyName: "A".repeat(256) });
    assert.strictEqual(res.success, false);
  });

  await t.test("contactName 256 reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, contactName: "A".repeat(256) });
    assert.strictEqual(res.success, false);
  });

  await t.test("email trimmed output", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, email: " test@test.com  " });
    assert.ok(res.success);
    assert.strictEqual(res.data.email, "test@test.com");
  });

  await t.test("invalid email reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, email: "invalid-email" });
    assert.strictEqual(res.success, false);
  });

  await t.test("email >255 reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, email: "a".repeat(250) + "@b.com" });
    assert.strictEqual(res.success, false);
  });

  await t.test("phone empty -> undefined", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, phone: "" });
    assert.ok(res.success);
    assert.strictEqual(res.data.phone, undefined);
  });

  await t.test("phone whitespace-only -> undefined", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, phone: "   " });
    assert.ok(res.success);
    assert.strictEqual(res.data.phone, undefined);
  });

  await t.test("phone >100 reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, phone: "1".repeat(101) });
    assert.strictEqual(res.success, false);
  });

  await t.test("message empty -> undefined", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, message: "" });
    assert.ok(res.success);
    assert.strictEqual(res.data.message, undefined);
  });

  await t.test("message whitespace-only -> undefined", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, message: "   " });
    assert.ok(res.success);
    assert.strictEqual(res.data.message, undefined);
  });

  await t.test("message >5000 reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...basePayload, message: "A".repeat(5001) });
    assert.strictEqual(res.success, false);
  });
});

test("Public RFQ Trust Boundary Inspection", async (t) => {
  const actionsPath = path.join(process.cwd(), "src/app/actions.ts");
  const sourceCode = fs.readFileSync(actionsPath, "utf-8");

  await t.test("submitRfq does not insert client-provided status or partnerId", () => {
    const submitStart = sourceCode.indexOf("export async function submitRfq");
    assert.ok(submitStart !== -1, "submitRfq not found");
    const insertIdx = sourceCode.indexOf("await db.insert(rfqLeads).values({", submitStart);
    assert.ok(insertIdx !== -1, "Insert not found");

    const insertBlockEnd = sourceCode.indexOf("});", insertIdx);
    const insertBlock = sourceCode.substring(insertIdx, insertBlockEnd);

    // Explicitly check for absence of "status: " or "data.status" in the insert block
    assert.strictEqual(insertBlock.includes("status:"), false, "status field must not be included in insert payload (DB default is used)");
    assert.strictEqual(insertBlock.includes("data.partnerId"), false, "partnerId must not be taken from client payload");
    assert.ok(insertBlock.includes("partnerId: offer.partnerId"), "partnerId must be strictly derived from the fetched offer");
  });
});
