import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  resolvePublicOfferGallery,
  resolvePublicOfferImage,
  selectInitialPublicOfferMedia,
  type PublicOfferMediaSource,
} from "@/lib/offers/public-media-resolver";

const canonical = (
  overrides: Partial<PublicOfferMediaSource> = {},
): PublicOfferMediaSource => ({
  id: 1,
  storageBucket: "offer-media",
  objectPath: "offers/10/one.webp",
  altText: "Widok produktu",
  isPrimary: true,
  sortOrder: 0,
  ...overrides,
});

test("public offer gallery projection", async (t) => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

  await t.test("uses canonical multi-media and deterministically orders by sort_order then id", () => {
    const result = resolvePublicOfferGallery("legacy.jpg", "Oferta", [
      canonical({ id: 5, sortOrder: 2, objectPath: "five.webp" }),
      canonical({ id: 3, sortOrder: 1, objectPath: "three.webp", isPrimary: false }),
      canonical({ id: 2, sortOrder: 1, objectPath: "two.webp", isPrimary: false }),
    ]);

    assert.deepEqual(result.map((item) => item.id), [2, 3, 5]);
    assert.equal(result.some((item) => item.url === "legacy.jpg"), false);
  });

  await t.test("selects the canonical primary initially", () => {
    const result = resolvePublicOfferGallery(null, "Oferta", [
      canonical({ id: 1, isPrimary: false }),
      canonical({ id: 2, isPrimary: true, sortOrder: 2 }),
    ]);
    assert.equal(selectInitialPublicOfferMedia(result)?.id, 2);
  });

  await t.test("falls back to the first valid canonical item when primary is absent", () => {
    const result = resolvePublicOfferGallery(null, "Oferta", [
      canonical({ id: 4, isPrimary: false, sortOrder: 2 }),
      canonical({ id: 3, isPrimary: false, sortOrder: 1 }),
    ]);
    assert.equal(selectInitialPublicOfferMedia(result)?.id, 3);
  });

  await t.test("prefers canonical media over legacy and falls back to legacy when canonical is absent", () => {
    const canonicalResult = resolvePublicOfferGallery("legacy.jpg", "Oferta", [canonical()]);
    assert.equal(canonicalResult.length, 1);
    assert.match(canonicalResult[0].url, /\/offer-media\/offers\/10\/one\.webp$/);

    const legacyResult = resolvePublicOfferGallery(" legacy.jpg ", "Oferta", []);
    assert.deepEqual(legacyResult, [{
      id: "legacy",
      url: "legacy.jpg",
      altText: "Oferta — 1",
      isPrimary: true,
      sortOrder: 0,
    }]);
  });

  await t.test("returns no item when canonical and legacy media are absent", () => {
    assert.deepEqual(resolvePublicOfferGallery(null, "Oferta", []), []);
  });

  await t.test("rejects staging and arbitrary buckets but accepts offer-media", () => {
    assert.equal(resolvePublicOfferImage("legacy.jpg", "offer-media-staging", "x.webp"), "legacy.jpg");
    assert.equal(resolvePublicOfferImage("legacy.jpg", "private-media", "x.webp"), "legacy.jpg");
    assert.equal(
      resolvePublicOfferImage(null, "offer-media", "x.webp"),
      "https://test.supabase.co/storage/v1/object/public/offer-media/x.webp",
    );
  });

  await t.test("rejects unsafe rows before choosing canonical fallback and builds deterministic alt text", () => {
    const result = resolvePublicOfferGallery("legacy.jpg", "Pompa przemysłowa", [
      canonical({ id: 1, storageBucket: "offer-media-staging", altText: "staging" }),
      canonical({ id: 2, storageBucket: "arbitrary", altText: "private" }),
      canonical({ id: 3, isPrimary: false, altText: "  ", objectPath: "safe.webp" }),
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 3);
    assert.equal(result[0].altText, "Pompa przemysłowa — 1");
  });
});

test("public gallery UI and visibility contracts", async (t) => {
  const gallerySource = fs.readFileSync(
    "src/components/offers/PublicOfferMediaGallery.tsx",
    "utf8",
  );
  const offerPageSource = fs.readFileSync("src/app/_shared/OfferPage.tsx", "utf8");
  const actionsSource = fs.readFileSync("src/app/actions.ts", "utf8");
  const detailAction = actionsSource.slice(
    actionsSource.indexOf("export async function getOfferById"),
    actionsSource.indexOf("export type CartItemWithOffer"),
  );

  await t.test("is read-only, keyboard operable, and hides thumbnail clutter for one image", () => {
    assert.match(gallerySource, /<button/);
    assert.match(gallerySource, /aria-pressed=\{isSelected\}/);
    assert.match(gallerySource, /media\.length > 1/);
    assert.doesNotMatch(gallerySource, /type="file"|upload|delete|remove|reorder|setPrimary/i);
  });

  await t.test("preserves the existing zero-image placeholder", () => {
    assert.match(gallerySource, /!selectedMedia/);
    assert.match(gallerySource, /imageUnavailableLabel/);
    assert.match(offerPageSource, /dict\.offers\.imageUnavailable/);
  });

  await t.test("keeps media behind the published or archived detail visibility boundary", () => {
    assert.match(detailAction, /inArray\(offers\.publicationStatus, \["published", "archived"\]\)/);
    assert.doesNotMatch(detailAction, /"draft"|"pending_review"/);
    assert.ok(
      detailAction.indexOf("if (rows.length === 0) return null") <
        detailAction.indexOf("const mediaRows = await db"),
      "media query must run only after the public offer lookup succeeds",
    );
    assert.doesNotMatch(actionsSource, /export async function getPublicOfferMedia/);
  });

  await t.test("queries one offer gallery in deterministic database order", () => {
    assert.match(
      detailAction,
      /\.where\(eq\(offerMedia\.offerId, rows\[0\]\.offer\.id\)\)[\s\S]*?\.orderBy\(asc\(offerMedia\.sortOrder\), asc\(offerMedia\.id\)\)/,
    );
  });
});
