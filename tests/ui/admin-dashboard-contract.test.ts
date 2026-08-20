import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

test("Admin Dashboard I18N parity", () => {
  const locales = ['en', 'pl', 'de', 'fr', 'es', 'uk', 'zh'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dictionaries: Record<string, any> = {};

  for (const locale of locales) {
    const data = JSON.parse(fs.readFileSync(path.join("src", "messages", `${locale}.json`), "utf8"));
    dictionaries[locale] = data.adminDashboard;
  }

  const enKeys = Object.keys(dictionaries.en);
  
  for (const locale of locales) {
    if (locale === 'en') continue;
    const currentKeys = Object.keys(dictionaries[locale]);
    
    // Key parity check
    assert.deepStrictEqual(currentKeys.sort(), enKeys.sort(), `Locale ${locale} must have same keys as en`);
    
    // Check that it's not simply falling back to EN values
    assert.notStrictEqual(dictionaries[locale].title, dictionaries.en.title, `Locale ${locale} title must not just be English fallback`);
    assert.notStrictEqual(dictionaries[locale].sections.offers, dictionaries.en.sections.offers, `Locale ${locale} offers section must not just be English fallback`);
  }
});
