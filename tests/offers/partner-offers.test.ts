import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ForbiddenError } from "../../src/lib/auth/authorization-errors";
import {
  buildPartnerOfferListItem,
  buildPartnerOffersListModel,
  parsePartnerOfferFilter,
  type PartnerOfferSourceRow,
} from "../../src/lib/partner-offers/model-core";
import { getPartnerOffersListWithDependencies } from "../../src/lib/partner-offers/read-model";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function read(relativePath: string) {
  return fs.readFile(path.join(__dirname, "../..", relativePath), "utf-8");
}

function sourceRow(
  overrides: Partial<PartnerOfferSourceRow> = {},
): PartnerOfferSourceRow {
  return {
    offerId: 1,
    title: "Industrial offer",
    categoryId: 10,
    categorySlug: "wozki-widlowe-czolowe",
    categoryName: "Wózki widłowe czołowe",
    offerModel: "rfq",
    conversionType: "inbound",
    priceBrutto: "1299.9900",
    priceOnRequest: false,
    publicationStatus: "draft",
    isActive: true,
    publishedAt: null,
    updatedAt: new Date("2026-09-15T10:00:00.000Z"),
    createdAt: new Date("2026-09-14T10:00:00.000Z"),
    ...overrides,
  };
}

function item(overrides: Partial<PartnerOfferSourceRow> = {}) {
  const result = buildPartnerOfferListItem(sourceRow(overrides));
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected valid offer item");
  return result.item;
}

test("Partner offer filter parsing accepts the contract and normalizes unknown values to all", () => {
  for (const value of ["all", "draft", "pending_review", "published", "hidden", "archived"] as const) {
    assert.equal(parsePartnerOfferFilter(value), value);
  }
  assert.equal(parsePartnerOfferFilter("deleted"), "all");
  assert.equal(parsePartnerOfferFilter("unexpected"), "all");
  assert.equal(parsePartnerOfferFilter(undefined), "all");
});

test("Partner offer counts use the loaded set and never expose a deleted bucket", () => {
  const items = [
    item({ offerId: 1, publicationStatus: "draft" }),
    item({ offerId: 2, publicationStatus: "pending_review" }),
    item({ offerId: 3, publicationStatus: "published" }),
    item({ offerId: 4, publicationStatus: "hidden" }),
    item({ offerId: 5, publicationStatus: "archived" }),
    item({ offerId: 6, publicationStatus: "published" }),
  ];
  const model = buildPartnerOffersListModel(items, "published");

  assert.deepEqual(model.counts, {
    all: 6,
    draft: 1,
    pending_review: 1,
    published: 2,
    hidden: 1,
    archived: 1,
  });
  assert.deepEqual(model.filteredItems.map((entry) => entry.offerId), [3, 6]);
  assert.equal("deleted" in model.counts, false);
});

test("canonical offer models reuse the repository resolver and unknown is fail-safe", () => {
  assert.equal(item({ offerModel: "rfq", conversionType: "inbound" }).canonicalModel, "rfq");
  assert.equal(item({ offerModel: "marketplace", conversionType: "inbound" }).canonicalModel, "ecommerce");
  assert.equal(item({ offerModel: "rfq", conversionType: "outbound" }).canonicalModel, "outbound");

  const unknown = item({
    publicationStatus: "published",
    offerModel: "unexpected",
    conversionType: "inbound",
  });
  assert.equal(unknown.canonicalModel, "unknown");
  assert.equal(unknown.publicPreviewAllowed, false);
});

test("published active canonical offers alone receive a public preview", () => {
  assert.equal(item({ publicationStatus: "published" }).publicPreviewAllowed, true);
  assert.equal(item({ publicationStatus: "pending_review" }).publicPreviewAllowed, false);
  assert.equal(item({ publicationStatus: "published", isActive: false }).publicPreviewAllowed, false);
  assert.equal(item({ publicationStatus: "hidden" }).publicPreviewAllowed, false);
  assert.equal(item({ publicationStatus: "archived" }).publicPreviewAllowed, false);
});

test("deleted tombstones and missing category relations fail closed", () => {
  assert.deepEqual(buildPartnerOfferListItem(sourceRow({ publicationStatus: "deleted" })), { ok: false });
  assert.deepEqual(buildPartnerOfferListItem(sourceRow({ publicationStatus: "invalid_status" })), { ok: false });
  assert.deepEqual(buildPartnerOfferListItem(sourceRow({ categorySlug: null })), { ok: false });
  assert.deepEqual(buildPartnerOfferListItem(sourceRow({ categoryName: null })), { ok: false });
});

test("read model authorizes the requested Partner before loading its rows", async () => {
  const events: string[] = [];
  const result = await getPartnerOffersListWithDependencies(42, {
    authorize: async (partnerId) => {
      events.push(`authorize:${partnerId}`);
    },
    loadRows: async (partnerId) => {
      events.push(`load:${partnerId}`);
      return [sourceRow()];
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(events, ["authorize:42", "load:42"]);
});

test("unauthorized Partner access fails closed without loading offers", async () => {
  let loaded = false;
  const result = await getPartnerOffersListWithDependencies(99, {
    authorize: async () => {
      throw new ForbiddenError();
    },
    loadRows: async () => {
      loaded = true;
      return [sourceRow()];
    },
  });

  assert.deepEqual(result, { ok: false, code: "UNAUTHORIZED" });
  assert.equal(loaded, false);
});

test("production read model applies membership, Partner scope, and deleted exclusion", async () => {
  const source = await read("src/lib/partner-offers/read-model.ts");
  assert.match(source, /await dependencies\.authorize\(partnerId\)/);
  assert.match(source, /authorize: requirePartnerMembership/);
  assert.match(source, /eq\(offers\.partnerId, partnerId\)/);
  assert.match(source, /ne\(offers\.publicationStatus, "deleted"\)/);
  assert.match(source, /leftJoin\(categories/);
  assert.doesNotMatch(
    source,
    /requireAdmin|createPartnerOffer|\.insert\(|\.update\(|\.delete\(/,
  );
});

test("Partner Offers routes and UI preserve read-only responsive contracts", async () => {
  const page = await read("src/app/(pl)/partner/[partnerId]/oferty/page.tsx");
  const localized = await read("src/app/(localized)/[locale]/partner/[partnerId]/offers/page.tsx");

  assert.match(page, /getPartnerOffersList\(parsedPartnerId\)/);
  assert.match(page, /dynamic = "force-dynamic"/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /grid-cols-2/);
  assert.match(page, /lg:hidden/);
  assert.match(page, /hidden overflow-x-auto lg:block/);
  assert.match(page, /<table/);
  assert.match(page, /getLocalizedCategoryLabel/);
  assert.match(page, /getOfferPath/);
  assert.doesNotMatch(
    page,
    /<form|action=|onClick=|createPartnerOffer|updatePartnerOffer|publishPartnerOffer|deletePartnerOffer/,
  );
  assert.match(localized, /oferty\/page/);
});

test("Partner navigation exposes Offers as a real active module", async () => {
  const navigation = await read("src/app/_shared/partner/PartnerWorkspaceNavigation.tsx");
  const shell = await read("src/app/_shared/partner/PartnerWorkspaceShell.tsx");
  assert.match(navigation, /offersHref/);
  assert.match(navigation, /isOffersActive/);
  assert.match(navigation, /aria-current=\{isOffersActive \? "page" : undefined\}/);
  assert.match(navigation, /grid-cols-3/);
  assert.match(shell, /offers: dict\.offers/);
  assert.match(shell, /dict\.backToMarketplace/);
  assert.match(shell, /PublicLogoutForm/);
});

test("all seven locales provide the Partner Offers dictionary", async (t) => {
  const requiredKeys = [
    "offers",
    "offersTitle",
    "offersIntro",
    "offersFiltersLabel",
    "offersFilterAll",
    "offersFilterDraft",
    "offersFilterPublished",
    "offersFilterHidden",
    "offersFilterArchived",
    "offersStatusDraft",
    "offersStatusPendingReview",
    "offersStatusPublished",
    "offersStatusHidden",
    "offersStatusArchived",
    "offersModelRfq",
    "offersModelEcommerce",
    "offersModelOutbound",
    "offersModelUnknown",
    "offersPriceOnRequest",
    "offersPublicPreview",
    "offersEmptyTitle",
    "offersEmptyDescription",
  ];

  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"]) {
    await t.test(locale, async () => {
      const dictionary = JSON.parse(await read(`src/messages/${locale}.json`));
      for (const key of requiredKeys) {
        const value = dictionary.PartnerWorkspace?.[key];
        assert.ok(typeof value === "string" && value.trim().length > 0, `${locale}.${key}`);
      }
    });
  }
});
