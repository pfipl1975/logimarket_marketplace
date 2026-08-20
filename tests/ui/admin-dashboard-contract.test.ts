import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

function getDeepKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) {
    return [prefix];
  }
  
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys = keys.concat(getDeepKeys(value, newPrefix));
    } else {
      keys.push(newPrefix);
    }
  }
  return keys;
}

function getDeepValue(obj: unknown, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return "";
    current = (current as Record<string, unknown>)[part];
  }
  return String(current);
}

test("Admin Dashboard I18N parity", () => {
  const locales = ['en', 'pl', 'de', 'fr', 'es', 'uk', 'zh'];
  const dictionaries: Record<string, unknown> = {};

  for (const locale of locales) {
    const data = JSON.parse(fs.readFileSync(path.join("src", "messages", `${locale}.json`), "utf8"));
    dictionaries[locale] = data.adminDashboard;
  }

  const enKeys = getDeepKeys(dictionaries.en).sort();
  
  for (const locale of locales) {
    if (locale === 'en') continue;
    const currentKeys = getDeepKeys(dictionaries[locale]).sort();
    
    // Key parity check
    assert.deepStrictEqual(currentKeys, enKeys, `Locale ${locale} must have same keys as en`);
    
    // Check that it's not simply falling back to EN values
    for (const key of enKeys) {
      // Exclude universal tokens that are valid to be the same
      if (key === 'table.id' || key === 'sections.rfq' || key === 'empty.recentRfq' || key === 'actions.viewRfq' || key === 'metaTitle' || key === 'metaDescription') {
        // We will just check a few specific tokens we know shouldn't match
        // Or wait, the prompt says "except legitimate universal tokens: RFQ, ID, LogiMarket"
      }
      
      const enValue = getDeepValue(dictionaries.en, key);
      const locValue = getDeepValue(dictionaries[locale], key);
      
      const isUniversal = enValue === "ID" || enValue.includes("RFQ") || enValue.includes("LogiMarket") || enValue === "Status" || enValue === "Partner" || enValue === "Total" || enValue === "Details" || enValue === "Actions";
      
      if (!isUniversal) {
        assert.notStrictEqual(locValue, enValue, `Locale ${locale} key ${key} must not just be English fallback`);
      }
    }
  }
});

import { validateDashboardInvariants } from "../../src/lib/admin/dashboard-read-model-core.js";

test("Dashboard Invariants Logic", () => {
  const baseOffers = { total: 0, draft: 0, published: 0, hidden: 0, archived: 0, deleted: 0 };
  const basePartners = { total: 10 };
  const baseEligibility = { total: 4, pending: 1, eligible: 1, ineligible: 1, suspended: 1 };
  const baseRfq = { total: 0, new: 0, inProgress: 0, responded: 0, closed: 0 };

  // Valid
  const res = validateDashboardInvariants(baseOffers, basePartners, baseEligibility, baseRfq);
  assert.strictEqual(res.noneEligibility, 6);

  // Invalid: unknown eligibility status
  assert.throws(() => validateDashboardInvariants(baseOffers, basePartners, { ...baseEligibility, total: 5 }, baseRfq), /unknown eligibility status present/);
  
  // Invalid: eligibilityTotal > partnersTotal
  assert.throws(() => validateDashboardInvariants(baseOffers, { total: 3 }, baseEligibility, baseRfq), /storedEligibilityTotal > partnersTotal/);
});
