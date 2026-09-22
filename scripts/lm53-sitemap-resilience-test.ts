import assert from "node:assert/strict";
import {
  getCoreSitemapEntries,
  getResilientSitemapEntries,
} from "../src/lib/seo/sitemap-entries";

async function run() {
  const coreEntries = getCoreSitemapEntries();
  const coreUrls = new Set(coreEntries.map((entry) => entry.url));

  assert.ok(coreEntries.length > 0, "core sitemap must not be empty");
  assert.ok([...coreUrls].some((url) => url.endsWith("/katalog")), "catalog root must be present");
  assert.ok([...coreUrls].some((url) => url.endsWith("/slownik-branzowy")), "glossary hub must be present");

  const withDynamicEntries = await getResilientSitemapEntries(async () => ({
    offers: [{ id: 5, createdAt: new Date("2026-07-04T11:55:27.431Z") }],
    categories: [{ slug: "pojemniki-plastikowe-euro" }],
  }));
  const dynamicUrls = new Set(withDynamicEntries.map((entry) => entry.url));

  assert.ok([...dynamicUrls].some((url) => url.endsWith("/oferta/5")), "dynamic offer entry must be present");
  assert.ok([...dynamicUrls].some((url) => url.endsWith("/katalog/c-pojemniki-plastikowe-euro")), "dynamic category entry must be present");
  assert.equal(dynamicUrls.size, withDynamicEntries.length, "sitemap URLs must be unique");

  const warnings: string[] = [];
  const fallbackEntries = await getResilientSitemapEntries(
    async () => {
      const cause = Object.assign(new Error("Connection terminated due to connection timeout"), { code: "ETIMEDOUT" });
      throw Object.assign(new Error("Failed query"), { cause });
    },
    (message) => warnings.push(message),
  );

  assert.deepEqual(fallbackEntries, coreEntries, "database timeout must return the core sitemap");
  assert.equal(warnings.length, 1, "database timeout must emit one warning");
  assert.ok(!warnings[0].includes("postgres://"), "warning must not include a connection string");

  await assert.rejects(
    () => getResilientSitemapEntries(async () => { throw new Error("unexpected sitemap failure"); }),
    /unexpected sitemap failure/,
  );

  console.log("LM53_SITEMAP_RESILIENCE_TEST=PASS");
}

void run();
