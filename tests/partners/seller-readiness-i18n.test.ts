import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

const LOCALES = ["en", "pl", "de", "es", "fr", "uk", "zh"];
const EXPECTED_KEYS = [
  "sellerReadinessSection",
  "sellerReadinessReady",
  "sellerReadinessNotReady",
  "sellerReadinessBlockers",
  "blocker_missing_partner",
  "blocker_missing_legal_identity",
  "blocker_incomplete_legal_identity",
  "blocker_missing_tax_identity",
  "blocker_verification_not_valid",
  "blocker_eligibility_not_eligible",
  "blocker_active_agreement_missing",
  "blocker_active_agreement_ambiguous",
  "blocker_agreement_execution_missing",
  "blocker_agreement_execution_invalidated"
];

test("Seller Readiness I18N Contract", async (t) => {
  await t.test("All 7 locales contain all seller readiness keys", () => {
    for (const locale of LOCALES) {
      const p = path.join(process.cwd(), "src", "messages", `${locale}.json`);
      const dict = JSON.parse(fs.readFileSync(p, "utf8"));
      const adminDict = dict.adminPartnerDetail || {};

      for (const key of EXPECTED_KEYS) {
        assert.ok(adminDict[key], `Locale ${locale} is missing key ${key}`);
      }
    }
  });

  await t.test("AdminPartnerDetailPage does not hardcode English readiness strings", () => {
    const pagePath = path.join(process.cwd(), "src", "app", "_shared", "AdminPartnerDetailPage.tsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(!content.includes(">Seller Readiness<"), "Should not hardcode 'Seller Readiness'");
    assert.ok(!content.includes(">READY<") && !content.includes("'READY' :"), "Should not hardcode 'READY'");
    assert.ok(!content.includes(">NOT READY<") && !content.includes("'NOT READY'"), "Should not hardcode 'NOT READY'");
    assert.ok(!content.includes(">Blockers:<"), "Should not hardcode 'Blockers:'");

    assert.ok(content.includes("{dict.sellerReadinessSection}"), "Should use dict.sellerReadinessSection");
    assert.ok(content.includes("{dict.sellerReadinessBlockers}"), "Should use dict.sellerReadinessBlockers");
    assert.ok(content.includes("dict[`blocker_${blocker}` as keyof typeof dict]"), "Should use dynamic blocker dict mapping");
  });

  await t.test("FR, UK, ZH values are translated (differ from EN)", () => {
    const enDict = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "messages", "en.json"), "utf8")).adminPartnerDetail;
    const localesToCheck = ["fr", "uk", "zh"];

    for (const locale of localesToCheck) {
      const p = path.join(process.cwd(), "src", "messages", locale + ".json");
      const dict = JSON.parse(fs.readFileSync(p, "utf8")).adminPartnerDetail;

      for (const key of EXPECTED_KEYS) {
        assert.ok(dict[key], "Locale " + locale + " missing key " + key);
        assert.notEqual(dict[key], enDict[key], "Locale " + locale + " key " + key + " is still English");
      }
    }
  });

});
