import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { resolvePublicOfferImage } from "@/lib/offers/public-media-resolver";

function readProjectFile(path: string) {
  return fs.readFileSync(path, "utf8");
}

test("Public Media Integration SPRINT MEDIA-06", async (t) => {
  // Mock environment so getCanonicalOfferMediaPublicUrl succeeds
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

  await t.test("CASE A: canonical + legacy -> canonical", () => {
    const result = resolvePublicOfferImage("legacy.jpg", "bucket1", "path1");
    // getCanonicalOfferMediaPublicUrl will prefix it based on SUPABASE env var,
    // but we can just test that it doesn't return legacy.jpg. Since config isn't mocked,
    // it will return something with "path1" inside.
    assert.ok(result?.includes("path1"));
    assert.ok(!result?.includes("legacy.jpg"));
  });

  await t.test("CASE B: canonical + legacy NULL -> canonical", () => {
    const result = resolvePublicOfferImage(null, "bucket1", "path1");
    assert.ok(result?.includes("path1"));
  });

  await t.test("CASE C: canonical absent + legacy -> legacy", () => {
    const result = resolvePublicOfferImage("legacy.jpg", null, null);
    assert.strictEqual(result, "legacy.jpg");
  });

  await t.test("CASE D: both absent -> null", () => {
    const result = resolvePublicOfferImage(null, null, null);
    assert.strictEqual(result, null);
  });

  await t.test("CASE E: multi-media deterministic primary", () => {
    const actionsSrc = readProjectFile("src/app/actions.ts");
    assert.match(
      actionsSrc,
      /eq\(offerMedia\.isPrimary, true\)/,
      "query must deterministically join only the primary media"
    );
  });

  await t.test("CASE F: N+1 bounded query behavior", () => {
    const filterQuerySrc = readProjectFile("src/lib/catalog/filter-query-core.ts");
    assert.match(
      filterQuerySrc,
      /\.leftJoin\(schema\.offerMedia, and\(eq\(schema\.offerMedia\.offerId, schema\.offers\.id\), eq\(schema\.offerMedia\.isPrimary, true\)\)\)/,
      "filter query must leftJoin primaryMedia directly avoiding N+1"
    );

    const actionsSrc = readProjectFile("src/app/actions.ts");
    assert.match(
      actionsSrc,
      /\.leftJoin\(offerMedia, and\(eq\(offerMedia\.offerId, offers\.id\), eq\(offerMedia\.isPrimary, true\)\)\)/,
      "list queries must leftJoin primaryMedia directly avoiding N+1"
    );
  });

  await t.test("CASE G: public detail uses same source priority", () => {
    const actionsSrc = readProjectFile("src/app/actions.ts");
    assert.match(
      actionsSrc,
      /export async function getOfferById[\s\S]*?leftJoin\(offerMedia/,
      "getOfferById must use the exact same join and priority for detail views"
    );
  });

  await t.test("Search Projection uses the same priority", () => {
    const projectionSrc = readProjectFile("src/lib/search/projection.ts");
    assert.match(
      projectionSrc,
      /resolvePublicOfferImage\([\s\S]*?offer\.imageUrl,[\s\S]*?offer\.primaryMediaStorageBucket,[\s\S]*?offer\.primaryMediaObjectPath/,
      "projection must prioritize canonicalUrl over legacy by using resolvePublicOfferImage"
    );
  });
});
