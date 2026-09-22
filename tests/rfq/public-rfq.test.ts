import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { PublicRfqInputSchema } from "@/lib/rfq/schema";
import { validatePublicRfqEligibility } from "@/lib/rfq/eligibility";

// ---------------------------------------------------------------------------
// Eligibility Matrix
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// offerId Zod validation — no coercion
// ---------------------------------------------------------------------------
test("Public RFQ offerId Zod Validation (no coercion)", async (t) => {
  const base = {
    companyName: "Company",
    contactName: "Name",
    email: "a@b.com",
  };

  await t.test("offerId = 0 -> reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...base, offerId: 0 });
    assert.strictEqual(res.success, false);
  });

  await t.test("offerId = -1 -> reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...base, offerId: -1 });
    assert.strictEqual(res.success, false);
  });

  await t.test("offerId = 1.5 -> reject", () => {
    const res = PublicRfqInputSchema.safeParse({ ...base, offerId: 1.5 });
    assert.strictEqual(res.success, false);
  });

  await t.test("offerId = '1' (string) -> reject (no coercion)", () => {
    const res = PublicRfqInputSchema.safeParse({ ...base, offerId: "1" });
    assert.strictEqual(res.success, false);
  });

  await t.test("offerId = '123' (string) -> reject (no coercion)", () => {
    const res = PublicRfqInputSchema.safeParse({ ...base, offerId: "123" });
    assert.strictEqual(res.success, false);
  });

  await t.test("offerId = MAX_SAFE_INTEGER + 1 -> reject (unsafe integer)", () => {
    const res = PublicRfqInputSchema.safeParse({ ...base, offerId: Number.MAX_SAFE_INTEGER + 1 });
    assert.strictEqual(res.success, false);
  });

  await t.test("offerId = 1 -> accept", () => {
    const res = PublicRfqInputSchema.safeParse({ ...base, offerId: 1 });
    assert.ok(res.success);
    if (res.success) assert.strictEqual(res.data.offerId, 1);
  });
});

// ---------------------------------------------------------------------------
// Missing offer neutral result contract
// ---------------------------------------------------------------------------
test("Public RFQ Missing-Offer Neutral Result Contract", async (t) => {
  const actionsPath = path.join(process.cwd(), "src/app/actions.ts");
  const sourceCode = fs.readFileSync(actionsPath, "utf-8");

  await t.test("offerRows.length === 0 returns RFQ_OFFER_NOT_FOUND (not a disclosure code)", () => {
    // Prove the source code never returns a different disclosure code for the
    // empty-result branch.  The only code visible after 'offerRows.length === 0'
    // must be RFQ_OFFER_NOT_FOUND.
    const submitStart = sourceCode.indexOf("export async function submitRfq");
    assert.ok(submitStart !== -1, "submitRfq not found");

    const emptyCheckIdx = sourceCode.indexOf("offerRows.length === 0", submitStart);
    assert.ok(emptyCheckIdx !== -1, "empty check not found");

    // The line that handles the empty case must return RFQ_OFFER_NOT_FOUND
    const afterEmptyCheck = sourceCode.substring(emptyCheckIdx, emptyCheckIdx + 200);
    assert.ok(
      afterEmptyCheck.includes("RFQ_OFFER_NOT_FOUND"),
      "missing offer must return RFQ_OFFER_NOT_FOUND"
    );

    // It must NOT return any discriminating internal status code
    const disclosingCodes = ["RFQ_OFFER_DRAFT", "RFQ_OFFER_ARCHIVED", "RFQ_OFFER_INACTIVE", "RFQ_OFFER_WRONG_MODEL"];
    for (const code of disclosingCodes) {
      assert.ok(
        !sourceCode.slice(submitStart).includes(code),
        `submitRfq must not expose discriminating code '${code}'`
      );
    }
  });

  await t.test("ineligible offer also returns RFQ_OFFER_NOT_FOUND (same neutral code)", () => {
    const submitStart = sourceCode.indexOf("export async function submitRfq");
    // Both the missing-row path and the eligibility-failure path must use the
    // same neutral code, never leaking whether the offer exists but is wrong.
    const submitBlock = sourceCode.substring(
      submitStart,
      sourceCode.indexOf("export async function", submitStart + 1)
    );
    const rfqOfferNotFoundCount = (submitBlock.match(/RFQ_OFFER_NOT_FOUND/g) ?? []).length;
    // Both branches (offerRows empty + ineligible) must use this code
    assert.ok(
      rfqOfferNotFoundCount >= 2,
      "both missing-row and ineligible paths must return RFQ_OFFER_NOT_FOUND"
    );
  });
});

// ---------------------------------------------------------------------------
// Schema Validation Details
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Trust Boundary
// ---------------------------------------------------------------------------
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
