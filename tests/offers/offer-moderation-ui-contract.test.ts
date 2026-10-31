import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("moderation UI and read model use required reason with tenant-bound query", () => {
  const action = fs.readFileSync("src/components/admin/AdminOfferLifecycleAction.tsx","utf8");
  const core = fs.readFileSync("src/lib/admin/offer-publication-core.ts","utf8");
  const read = fs.readFileSync("src/lib/partner-offers/detail-read-model.ts","utf8");
  const page = fs.readFileSync("src/app/(pl)/partner/[partnerId]/oferty/[offerId]/page.tsx","utf8");
  assert.match(action,/rejectionReason:\s*reason/);
  assert.match(action,/maxLength=\{1000\}/);
  assert.match(core,/tx\.insert\(schema\.offerModerationEvents\)/);
  assert.match(core,/returned_for_correction/);
  assert.match(read,/requirePartnerMembership\(partnerId\)/);
  assert.match(read,/eq\(schema\.offers\.partnerId, partnerId\)/);
  assert.match(read,/eq\(schema\.offerModerationEvents\.partnerId, partnerId\)/);
  assert.match(page,/offer\.publicationStatus === "draft" && offer\.latestModerationReturn/);
  for (const locale of ["pl","en","de","fr","uk","es","zh"]) {
    const dictionary = JSON.parse(fs.readFileSync(`src/messages/${locale}.json`,"utf8"));
    for (const key of ["rejectionReasonLabel","rejectionReasonPlaceholder","rejectionReasonHelp","rejectionReasonRequired","returnedForCorrectionSuccess","actionConfirmReturnToDraft"]) {
      assert.ok(dictionary.adminOfferDetail[key],`${locale}: missing ${key}`);
    }
    for (const key of ["moderationReturnedTitle","moderationReturnedInstruction"]) {
      assert.ok(dictionary.PartnerWorkspace[key],`${locale}: missing ${key}`);
    }
  }
});
