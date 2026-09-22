import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.join(__dirname, "../..");

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("Admin Offer Detail Canonical Media Gallery (LM-OFFER-MEDIA-05)", () => {
  // 1. canonical media section exists on admin offer detail
  test("1. AdminOfferDetailPage imports and mounts AdminOfferDetailMediaGallery with server-side media data", () => {
    const pageSource = readProjectFile("src/app/_shared/AdminOfferDetailPage.tsx");
    assert.match(
      pageSource,
      /import\s*\{\s*AdminOfferDetailMediaGallery\s*\}\s*from\s*["']@\/components\/admin\/AdminOfferDetailMediaGallery["']/,
      "AdminOfferDetailPage must import AdminOfferDetailMediaGallery",
    );
    assert.match(
      pageSource,
      /const\s+mediaResult\s*=\s*await\s+getAdminOfferMedia\(offer\.id\)/,
      "AdminOfferDetailPage must fetch getAdminOfferMedia(offer.id) server-side",
    );
    assert.match(
      pageSource,
      /<AdminOfferDetailMediaGallery[\s\S]*?mediaResult=\{mediaResult\}[\s\S]*?offerTitle=\{offer\.title\}[\s\S]*?dict=\{dict\}/,
      "AdminOfferDetailPage must mount AdminOfferDetailMediaGallery with mediaResult, offerTitle, and dict",
    );
  });

  // 2. zero-media empty state
  test("2. AdminOfferDetailMediaGallery renders localized empty state when media list is empty", () => {
    const gallerySource = readProjectFile("src/components/admin/AdminOfferDetailMediaGallery.tsx");
    assert.match(
      gallerySource,
      /mediaResult\.media\.length\s*===\s*0/,
      "Gallery must branch on mediaResult.media.length === 0",
    );
    assert.match(
      gallerySource,
      /dict\.mediaEmpty/,
      "Gallery must display dict.mediaEmpty for empty state",
    );
    // Ensure empty state does not render broken image tags
    const emptyBranch = gallerySource.match(/mediaResult\.media\.length\s*===\s*0\s*\?[\s\S]*?:\s*\(/);
    assert.ok(emptyBranch, "Empty state branch must exist");
    assert.ok(!emptyBranch[0].includes("<Image"), "Empty state branch must not render <Image>");
  });

  // 3. canonical images are rendered
  test("3. AdminOfferDetailMediaGallery renders canonical images with valid URLs and accessible alt text", () => {
    const gallerySource = readProjectFile("src/components/admin/AdminOfferDetailMediaGallery.tsx");
    assert.match(
      gallerySource,
      /<Image[\s\S]*?src=\{item\.url\}[\s\S]*?alt=\{alt\}[\s\S]*?unoptimized/,
      "Gallery must render <Image> with item.url, accessible alt, and unoptimized flag",
    );
    assert.match(
      gallerySource,
      /item\.altText\s*\|\|\s*`\$\{offerTitle\}\s*—\s*\$\{dict\.mediaImage\}\s*\$\{index\s*\+\s*1\}`/,
      "Gallery must provide deterministic fallback alt text combining title and position",
    );
    assert.match(
      gallerySource,
      /aspect-4\/3[\s\S]*?object-contain/,
      "Gallery must preserve aspect ratio without distortion",
    );
  });

  // 4. primary media is visibly identified
  test("4. AdminOfferDetailMediaGallery visibly identifies exactly the primary image with Główne badge", () => {
    const gallerySource = readProjectFile("src/components/admin/AdminOfferDetailMediaGallery.tsx");
    assert.match(
      gallerySource,
      /item\.isPrimary\s*&&[\s\S]*?dict\.mediaPrimary/,
      "Primary media must be conditionally rendered using item.isPrimary and dict.mediaPrimary badge",
    );
    assert.match(
      gallerySource,
      /bg-brand-navy\s+text-white/,
      "Primary badge must use distinctive LogiMarket brand styling",
    );
  });

  // 5. canonical ordering is respected
  test("5. AdminOfferDetailMediaGallery preserves canonical ordering and exposes position indicators", () => {
    const gallerySource = readProjectFile("src/components/admin/AdminOfferDetailMediaGallery.tsx");
    assert.match(
      gallerySource,
      /mediaResult\.media\.map\(\(item,\s*index\)\s*=>/,
      "Gallery must directly map over mediaResult.media without re-sorting or mutation",
    );
    assert.match(
      gallerySource,
      /\{dict\.mediaImage\}\s*\{index\s*\+\s*1\}/,
      "Gallery must render position indicator for each canonical image",
    );
  });

  // 6. legacy image_url remains distinct from canonical gallery
  test("6. Legacy offers.image_url remains preserved and clearly distinguished in Section 5", () => {
    const pageSource = readProjectFile("src/app/_shared/AdminOfferDetailPage.tsx");
    const contentSectionIndex = pageSource.indexOf("dict.sectionContent");
    const legacyImageIndex = pageSource.indexOf("dict.fieldLegacyImageUrl");
    const canonicalGalleryIndex = pageSource.indexOf("<AdminOfferDetailMediaGallery");

    assert.ok(contentSectionIndex > -1, "Content section must exist");
    assert.ok(legacyImageIndex > contentSectionIndex, "Legacy image field must be in Content section");
    assert.ok(
      canonicalGalleryIndex > legacyImageIndex,
      "Canonical media gallery must follow after the legacy field",
    );
    assert.match(
      pageSource,
      /offer\.imageUrl/,
      "Legacy offer.imageUrl must remain preserved",
    );
  });

  // 7. no mutation controls are rendered in detail gallery
  test("7. Gallery is strictly read-only with zero mutation controls or form elements", () => {
    const gallerySource = readProjectFile("src/components/admin/AdminOfferDetailMediaGallery.tsx");
    assert.ok(!gallerySource.includes("<button"), "Detail gallery must not contain <button>");
    assert.ok(!gallerySource.includes("<input"), "Detail gallery must not contain <input>");
    assert.ok(!gallerySource.includes("<form"), "Detail gallery must not contain <form>");
    assert.ok(!gallerySource.includes("onClick"), "Detail gallery must not contain onClick handlers");
    assert.ok(!gallerySource.includes("onChange"), "Detail gallery must not contain onChange handlers");
    assert.ok(!gallerySource.includes("deleteAdminOfferMedia"), "Detail gallery must not invoke deleteAdminOfferMedia");
    assert.ok(!gallerySource.includes("setAdminOfferPrimaryMedia"), "Detail gallery must not invoke setAdminOfferPrimaryMedia");
    assert.ok(!gallerySource.includes("moveAdminOfferMedia"), "Detail gallery must not invoke moveAdminOfferMedia");
    assert.ok(!gallerySource.includes("prepareAdminOfferMediaUpload"), "Detail gallery must not invoke prepareAdminOfferMediaUpload");
    assert.ok(!gallerySource.includes("importAdminOfferMedia"), "Detail gallery must not invoke importAdminOfferMedia");
  });

  // 8. localization keys exist for supported locales
  test("8. All 7 supported locales include complete canonical media dictionaries", () => {
    const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"] as const;
    const requiredKeys = [
      "sectionMedia",
      "mediaEmpty",
      "mediaError",
      "mediaPrimary",
      "mediaImage",
      "fieldLegacyImageUrl",
    ];

    for (const locale of locales) {
      const dict = JSON.parse(readProjectFile(`src/messages/${locale}.json`));
      assert.ok(dict.adminOfferDetail, `${locale} must define adminOfferDetail`);
      for (const key of requiredKeys) {
        assert.equal(
          typeof dict.adminOfferDetail[key],
          "string",
          `Missing string key '${key}' in ${locale}.json`,
        );
        assert.ok(
          dict.adminOfferDetail[key].trim().length > 0,
          `Key '${key}' in ${locale}.json must not be empty`,
        );
      }
    }

    const polish = JSON.parse(readProjectFile("src/messages/pl.json"));
    assert.equal(polish.adminOfferDetail.sectionMedia, "Zdjęcia oferty");
    assert.equal(polish.adminOfferDetail.mediaEmpty, "Brak zdjęć w galerii oferty.");
    assert.equal(polish.adminOfferDetail.mediaPrimary, "Główne");
    assert.equal(polish.adminOfferDetail.fieldLegacyImageUrl, "Dotychczasowy adres zdjęcia (legacy)");
  });

  // Error boundary test
  test("AdminOfferDetailMediaGallery handles media read failure gracefully", () => {
    const gallerySource = readProjectFile("src/components/admin/AdminOfferDetailMediaGallery.tsx");
    assert.match(
      gallerySource,
      /!mediaResult\.ok/,
      "Gallery must check for !mediaResult.ok error condition",
    );
    assert.match(
      gallerySource,
      /role="alert"/,
      "Error state must render an accessible alert role",
    );
    assert.match(
      gallerySource,
      /dict\.mediaError/,
      "Error state must render localized error copy",
    );
  });

  // 9. existing offer detail behavior remains intact
  test("9. Preserves existing offer detail sections and actions", () => {
    const pageSource = readProjectFile("src/app/_shared/AdminOfferDetailPage.tsx");
    assert.ok(pageSource.includes("dict.sectionIdentity"), "Identity section preserved");
    assert.ok(pageSource.includes("dict.sectionBusinessModel"), "Business model section preserved");
    assert.ok(pageSource.includes("dict.sectionPricing"), "Pricing section preserved");
    assert.ok(pageSource.includes("dict.sectionLifecycle"), "Lifecycle section preserved");
    assert.ok(pageSource.includes("dict.sectionContent"), "Content section preserved");
    assert.ok(pageSource.includes("dict.sectionRelationalAttributes"), "Relational attributes preserved");
    assert.ok(pageSource.includes("dict.sectionLegacyAttributes"), "Legacy attributes preserved");
    assert.ok(pageSource.includes("actionEdit"), "Edit action button preserved");
  });
});
