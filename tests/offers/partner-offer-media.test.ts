import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.join(__dirname, "../..");

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("Partner Media Domain Tests (LM-PARTNER-OFFER-MEDIA-09)", () => {
  const actionsCode = readProjectFile("src/app/actions.ts");
  const mediaServiceCode = readProjectFile("src/lib/partner-offers/media-service.ts");
  const componentCode = readProjectFile("src/components/partner/PartnerOfferImageManager.tsx");

  test("AUTH / OWNERSHIP: actions validate partnerId, offerId, mediaId and locale", () => {
    assert.match(
      actionsCode,
      /function validId\(id: number\) \{ return typeof id === "number" && Number\.isSafeInteger\(id\) && id > 0; \}/,
      "validId must be defined and check for positive safe integer"
    );
    assert.match(
      actionsCode,
      /if \(\!validId\(partnerId\) \|\| \!validId\(offerId\)\) return \{ ok: false as const, code: "VALIDATION_ERROR" \}/,
      "preparePartnerOfferMediaUpload must validate ids"
    );
    assert.match(
      actionsCode,
      /if \(typeof locale !== "string" \|\| \!isLocale\(locale\)\) return \{ ok: false as const, code: "VALIDATION_ERROR" \}/,
      "actions must validate locale"
    );
    assert.match(
      actionsCode,
      /await requirePartnerMembership\(partnerId\)/,
      "actions must require partner membership"
    );
  });

  test("AUTH / OWNERSHIP: domain errors are preserved", () => {
    assert.match(
      actionsCode,
      /if \(e instanceof Error && e\.name === "MediaOperationError"\) return \{ ok: false as const, code: e\.message \};/,
      "Domain errors like UNAUTHORIZED and OFFER_NOT_EDITABLE must be preserved"
    );
    assert.doesNotMatch(
      actionsCode,
      /code: "STORAGE_ERROR" \} catch \(e: any\) \{ if \(e\.name === "MediaOperationError"\)/,
      "Domain errors should not be mapped to STORAGE_ERROR blindly"
    );
  });

  test("UPLOAD / CORE REUSE: size and mime validation", () => {
    assert.match(
      actionsCode,
      /if \(\!Number\.isSafeInteger\(size\) \|\| size < 1\) return \{ ok: false as const, code: "FILE_EMPTY" \}/,
      "Empty file rejected"
    );
    assert.match(
      actionsCode,
      /if \(size > MAX_UPLOAD_SIZE\) return \{ ok: false as const, code: "FILE_TOO_LARGE" \}/,
      ">10 MiB rejected"
    );
    assert.match(
      actionsCode,
      /if \(\!\["image\/jpeg", "image\/png", "image\/webp", "image\/avif"\]\.includes\(mime\)\)/,
      "Allowed MIME types verified"
    );
  });

  test("STAGING: actor-bound and offer-bound receipt, draft recheck", () => {
    assert.match(
      actionsCode,
      /verifyStagingReceipt\(receipt, offerId, actor\.id, key\)/,
      "Staging receipt must be offer-bound and actor-bound"
    );
    assert.match(
      mediaServiceCode,
      /if \(offer\.publicationStatus !== "draft"\) return \{ ok: false as const, code: "OFFER_NOT_EDITABLE" \}/,
      "persistPartnerOfferImage must recheck draft status under lock"
    );
    assert.match(
      mediaServiceCode,
      /if \(offer\.partnerId !== partnerId\) return \{ ok: false as const, code: "UNAUTHORIZED" \}/,
      "persistPartnerOfferImage must recheck ownership under lock"
    );
  });

  test("MANAGEMENT: operations delegate to core", () => {
    assert.match(
      mediaServiceCode,
      /changeOfferMediaCore\(offerId, mediaId, operation, /,
      "changePartnerOfferMedia delegates to changeOfferMediaCore"
    );
    assert.match(
      mediaServiceCode,
      /if \(offer\.partnerId !== partnerId\) throw new MediaOperationError\("UNAUTHORIZED"\);/,
      "changePartnerOfferMedia rechecks ownership under lock"
    );
  });

  test("UI: Partner media manager constraints", () => {
    assert.match(
      componentCode,
      /accept="image\/jpeg,image\/png,image\/webp,image\/avif"/,
      "Accepts correct MIME types in UI"
    );
    assert.match(
      componentCode,
      /file\.size > 10 \* 1024 \* 1024/,
      "Max size 10 MiB in UI"
    );
    assert.doesNotMatch(
      componentCode,
      /import\s*\{\s*AdminOfferImageManager/,
      "Should not import Admin UI"
    );
    assert.doesNotMatch(
      componentCode,
      /router\.refresh\(\)/,
      "Should not use router.refresh to preserve sibling state"
    );
  });
});
