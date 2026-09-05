import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.join(__dirname, "../..");

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("CREATE UX: fields follow the operator flow and keep the category picker", () => {
  const source = readProjectFile("src/components/admin/AdminOfferCreateForm.tsx");
  const partnerIndex = source.indexOf('id="partnerId"');
  const typeIndex = source.indexOf("<AdminOfferTypeSelector");
  const categoryIndex = source.indexOf("<AdminCategoryPicker");
  const titleIndex = source.indexOf('id="title"');

  assert.ok(partnerIndex > -1, "Partner field must remain present");
  assert.ok(typeIndex > partnerIndex, "Offer type must follow Partner");
  assert.ok(categoryIndex > typeIndex, "Category must follow offer type");
  assert.ok(titleIndex > categoryIndex, "Title must follow category");
  assert.ok(source.includes("dict.createSave"), "Draft CTA must remain dictionary-driven");
});

test("OFFER TYPE UX: selector exposes exactly the canonical admin offer types", () => {
  const source = readProjectFile("src/components/admin/AdminOfferTypeSelector.tsx");
  const optionValues = [...source.matchAll(/value: "([a-z_]+)"/g)].map((match) => match[1]);

  assert.deepStrictEqual(optionValues, ["rfq", "marketplace", "external_partner"]);
  assert.ok(source.includes('name="adminOfferType"'));
  assert.ok(source.includes("peer-focus-visible:ring-2"));
});

test("EDIT UX: operational sections, conditional guidance, and summary stay in one form", () => {
  const source = readProjectFile("src/components/admin/AdminOfferEditForm.tsx");
  const contentIndex = source.indexOf("dict.sectionBasic");
  const commercialIndex = source.indexOf("dict.sectionBusiness");
  const imageIndex = source.indexOf("dict.sectionImage");

  assert.ok(contentIndex > -1);
  assert.ok(commercialIndex > contentIndex);
  assert.ok(imageIndex > commercialIndex);
  assert.ok(source.includes('adminOfferType === "marketplace"'));
  assert.ok(source.includes('adminOfferType === "external_partner"'));
  assert.ok(source.includes('adminOfferType === "rfq"'));
  assert.ok(source.includes('name="priceBrutto"'));
  assert.ok(source.includes('name="outboundUrl"'));
  assert.ok(source.includes('name="imageUrl"'));
  assert.ok(source.includes("dict.contextOfferType"));
  assert.ok(source.includes("<details"));
  assert.ok(source.indexOf("offer.contractModel") > source.indexOf("<details"));
});

test("I18N: all supported locales include the new offer operations copy", () => {
  const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"];
  const createKeys = [
    "createDescription",
    "offerTypeRfqHelp",
    "offerTypeMarketplaceHelp",
    "offerTypeExternalHelp",
  ];
  const editKeys = [
    "description",
    "sectionBasicHelp",
    "sectionBusinessHelp",
    "sectionImage",
    "sectionImageHelp",
    "contextOfferType",
    "contextTechnicalDetails",
    "statusDraft",
    "statusPublished",
    "statusArchived",
    "marketplacePriceHelp",
    "optionalPriceHelp",
    "externalUrlHelp",
    "rfqOutboundHelp",
    "optionalOutboundHelp",
  ];

  for (const locale of locales) {
    const dictionary = JSON.parse(
      readProjectFile(`src/messages/${locale}.json`),
    ) as Record<string, Record<string, unknown>>;

    for (const key of createKeys) {
      assert.equal(typeof dictionary.adminOffers[key], "string", `${locale}.adminOffers.${key}`);
    }
    for (const key of editKeys) {
      assert.equal(typeof dictionary.adminOfferEdit[key], "string", `${locale}.adminOfferEdit.${key}`);
    }
  }

  const polish = JSON.parse(readProjectFile("src/messages/pl.json"));
  assert.equal(polish.adminOffers.offerTypeRfq, "Zapytanie ofertowe (RFQ)");
  assert.equal(polish.adminOffers.offerTypeMarketplace, "Sprzedaż przez LogiMarket");
  assert.equal(polish.adminOffers.offerTypeExternal, "Oferta zewnętrzna Partnera");
  assert.equal(polish.adminOffers.createSave, "Zapisz jako szkic");
});
