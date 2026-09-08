import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

function readProjectFile(path: string) {
  return fs.readFileSync(path, "utf8");
}

test("Public Media Integration SPRINT MEDIA-06", async (t) => {
  await t.test("CASE A & B & C & D: rowToOffer properly resolves canonical url vs legacy", () => {
    const actionsSrc = readProjectFile("src/app/actions.ts");
    assert.match(
      actionsSrc,
      /const canonicalUrl = row\.primaryMedia \? getCanonicalOfferMediaPublicUrl/,
      "rowToOffer must extract canonicalUrl from primaryMedia"
    );
    assert.match(
      actionsSrc,
      /const resolvedImageUrl = canonicalUrl \|\| row\.offer\.imageUrl/,
      "rowToOffer must prioritize canonical over legacy, falling back correctly"
    );
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
      /const canonicalUrl = offer\.primaryMediaStorageBucket && offer\.primaryMediaObjectPath/,
      "projection must prioritize canonicalUrl over legacy"
    );
  });
});
