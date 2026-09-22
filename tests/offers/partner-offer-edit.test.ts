import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parsePartnerOfferEditInput,
  evaluatePartnerOfferEditCore,
  type CurrentPartnerOfferState,
} from "../../src/lib/partner-offers/edit-core";
import {
  getInitialPriceMode,
  buildPricePayload,
  initPriceFormState,
  transitionPriceMode,
  updatePriceValue,
  PRICE_INPUT_PATTERN,
} from "../../src/lib/partner-offers/price-mode";

test("Partner Offer Edit - evaluate logic: NULL VERSION", () => {
  const current: CurrentPartnerOfferState = {
    publicationStatus: "draft",
    updatedAt: null,
    offerModel: "marketplace",
    conversionType: "inbound",
    title: "t",
    description: null,
    priceBrutto: null,
    priceOnRequest: false,
    outboundUrl: null,
  };

  const input = {
    partnerId: 1, offerId: 1, expectedUpdatedAt: null, title: "new title", description: null,
    partnerOfferType: "marketplace", priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };

  const res = evaluatePartnerOfferEditCore(input, current);
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.code, "EXECUTE_UPDATE");
});

test("Partner Offer Edit - evaluate logic: MATCHING TIMESTAMP", () => {
  const ts = new Date("2024-01-01T10:00:00.000Z");
  const current: CurrentPartnerOfferState = {
    publicationStatus: "draft",
    updatedAt: ts,
    offerModel: "marketplace",
    conversionType: "inbound",
    title: "t",
    description: null,
    priceBrutto: null,
    priceOnRequest: false,
    outboundUrl: null,
  };

  const input = {
    partnerId: 1, offerId: 1, expectedUpdatedAt: ts.toISOString(), title: "new title", description: null,
    partnerOfferType: "marketplace", priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };

  const res = evaluatePartnerOfferEditCore(input, current);
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.code, "EXECUTE_UPDATE");
});

test("Partner Offer Edit - evaluate logic: STALE TIMESTAMP", () => {
  const current: CurrentPartnerOfferState = {
    publicationStatus: "draft",
    updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    offerModel: "marketplace",
    conversionType: "inbound",
    title: "t", description: null, priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };

  const input = {
    partnerId: 1, offerId: 1, expectedUpdatedAt: "2024-01-01T11:00:00.000Z", title: "new title", description: null,
    partnerOfferType: "marketplace", priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };

  const res = evaluatePartnerOfferEditCore(input, current);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.code, "OFFER_CONFLICT");
});

test("Partner Offer Edit - evaluate logic: OWNERSHIP", () => {
  const input = {
    partnerId: 1, offerId: 1, expectedUpdatedAt: null, title: "new title", description: null,
    partnerOfferType: "marketplace", priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };

  // current = null -> OFFER_NOT_FOUND (wrong partnerId or missing)
  const res = evaluatePartnerOfferEditCore(input, null);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.code, "OFFER_NOT_FOUND");
});

test("Partner Offer Edit - evaluate logic: STATUSES", () => {
  const input = {
    partnerId: 1, offerId: 1, expectedUpdatedAt: null, title: "new title", description: null,
    partnerOfferType: "marketplace", priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };

  const statuses = ["published", "hidden", "archived"];
  for (const status of statuses) {
    const current: CurrentPartnerOfferState = {
      publicationStatus: status, updatedAt: null, offerModel: "marketplace", conversionType: "inbound",
      title: "t", description: null, priceBrutto: null, priceOnRequest: false, outboundUrl: null,
    };
    const res = evaluatePartnerOfferEditCore(input, current);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "OFFER_NOT_EDITABLE_STATUS");
  }
});

test("Partner Offer Edit - evaluate logic: UNKNOWN CURRENT STORAGE", () => {
  const input = {
    partnerId: 1, offerId: 1, expectedUpdatedAt: null, title: "new title", description: null,
    partnerOfferType: "marketplace", priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };
  const current: CurrentPartnerOfferState = {
    publicationStatus: "draft", updatedAt: null, offerModel: "unknown_model", conversionType: "inbound",
    title: "t", description: null, priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };

  const res = evaluatePartnerOfferEditCore(input, current);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.code, "OFFER_NOT_FOUND");
});

test("Partner Offer Edit - evaluate logic: DRAFT COMPLETENESS", () => {
  const current: CurrentPartnerOfferState = {
    publicationStatus: "draft", updatedAt: null, offerModel: "marketplace", conversionType: "inbound",
    title: "t", description: null, priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };

  const inputMarket = {
    partnerId: 1, offerId: 1, expectedUpdatedAt: null, title: "t", description: null,
    partnerOfferType: "marketplace", priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };
  const res1 = evaluatePartnerOfferEditCore(inputMarket, current);
  assert.equal(res1.ok, true, "Marketplace without price is allowed");

  const inputOutbound = {
    partnerId: 1, offerId: 1, expectedUpdatedAt: null, title: "t", description: null,
    partnerOfferType: "external_partner", priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };
  const currentOutbound = { ...current, offerModel: "marketplace", conversionType: "outbound" };
  const res2 = evaluatePartnerOfferEditCore(inputOutbound, currentOutbound);
  assert.equal(res2.ok, true, "Outbound without outboundUrl is allowed");
});

test("Partner Offer Edit - evaluate logic: UPDATE SCOPE", () => {
  const current: CurrentPartnerOfferState = {
    publicationStatus: "draft", updatedAt: null, offerModel: "marketplace", conversionType: "inbound",
    title: "t", description: null, priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };
  const input = {
    partnerId: 1, offerId: 1, expectedUpdatedAt: null, title: "new title", description: null,
    partnerOfferType: "marketplace", priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };

  const res = evaluatePartnerOfferEditCore(input, current);
  assert.equal(res.ok, true);
  if (res.ok && res.code === "EXECUTE_UPDATE") {
    const payload = res.payload;
    assert.equal("title" in payload, true);
    assert.equal("description" in payload, true);
    assert.equal("priceBrutto" in payload, true);
    assert.equal("priceOnRequest" in payload, true);
    assert.equal("offerModel" in payload, true);
    assert.equal("conversionType" in payload, true);
    assert.equal("outboundUrl" in payload, true);

    assert.equal("partnerId" in payload, false);
    assert.equal("categoryId" in payload, false);
    assert.equal("publicationStatus" in payload, false);
    assert.equal("isActive" in payload, false);
    assert.equal("isFeatured" in payload, false);
    assert.equal("contractModel" in payload, false);
  }
});

test("Partner Offer Edit - NO PUBLICATION TRANSITION", () => {
  const current: CurrentPartnerOfferState = {
    publicationStatus: "draft", updatedAt: null, offerModel: "marketplace", conversionType: "inbound",
    title: "t", description: null, priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };
  const input = {
    partnerId: 1, offerId: 1, expectedUpdatedAt: null, title: "new title", description: null,
    partnerOfferType: "marketplace", priceBrutto: null, priceOnRequest: false, outboundUrl: null,
  };

  const res = evaluatePartnerOfferEditCore(input, current);
  assert.equal(res.ok, true);
  if (res.ok && res.code === "EXECUTE_UPDATE") {
    // Assert that the payload does not contain publicationStatus
    assert.equal("publicationStatus" in res.payload, false, "Must not transition publication status");
  }
});

test("Partner Offer Edit - ID parser strict validation", () => {
  const baseInput = {
    partnerId: 1,
    offerId: 1,
    expectedUpdatedAt: new Date().toISOString(),
    title: "T",
    description: "D",
    partnerOfferType: "marketplace",
    priceBrutto: "100.00",
    priceOnRequest: false,
    outboundUrl: null,
  };

  assert.equal(parsePartnerOfferEditInput(baseInput).ok, true);
  assert.equal(parsePartnerOfferEditInput({ ...baseInput, partnerId: 0 }).ok, false);
  assert.equal(parsePartnerOfferEditInput({ ...baseInput, partnerId: -1 }).ok, false);
  assert.equal(parsePartnerOfferEditInput({ ...baseInput, partnerId: 1.5 }).ok, false);
  assert.equal(parsePartnerOfferEditInput({ ...baseInput, partnerId: NaN }).ok, false);
  assert.equal(parsePartnerOfferEditInput({ ...baseInput, partnerId: Infinity }).ok, false);
  assert.equal(parsePartnerOfferEditInput({ ...baseInput, partnerId: Number.MAX_SAFE_INTEGER + 1 }).ok, false);

  assert.equal(parsePartnerOfferEditInput({ ...baseInput, offerId: 0 }).ok, false);
  assert.equal(parsePartnerOfferEditInput({ ...baseInput, offerId: -1 }).ok, false);
  assert.equal(parsePartnerOfferEditInput({ ...baseInput, offerId: 1.5 }).ok, false);
  assert.equal(parsePartnerOfferEditInput({ ...baseInput, offerId: NaN }).ok, false);
});

test("Partner Offer Edit - PL route params contract and strict parsing", () => {
  const plRoute = fs.readFileSync(
    path.join(process.cwd(), "src/app/(pl)/partner/[partnerId]/oferty/[offerId]/edytuj/page.tsx"),
    "utf-8"
  );

  // params are declared as Promise
  assert.ok(plRoute.includes("params: Promise<"), "params must be declared as Promise");

  // params are awaited before use
  assert.ok(plRoute.includes("await params"), "params must be awaited");
  const awaitIdx = plRoute.indexOf("await params");
  const partnerIdParseIdx = plRoute.indexOf("parseStrictIdOrNotFound(partnerId)");
  const offerIdParseIdx = plRoute.indexOf("parseStrictIdOrNotFound(offerId)");

  assert.ok(awaitIdx < partnerIdParseIdx, "params must be awaited before partnerId parsing");
  assert.ok(awaitIdx < offerIdParseIdx, "params must be awaited before offerId parsing");

  // strict parsing remains
  assert.ok(plRoute.includes("parseStrictIdOrNotFound(partnerId)"), "must use parseStrictIdOrNotFound(partnerId)");
  assert.ok(plRoute.includes("parseStrictIdOrNotFound(offerId)"), "must use parseStrictIdOrNotFound(offerId)");

  // props.params is not used directly
  assert.ok(!plRoute.includes("props.params"), "must not access props.params directly");
});

test("Partner Offer Edit - localized edit route contract", () => {
  const localizedRoute = fs.readFileSync(
    path.join(process.cwd(), "src/app/(localized)/[locale]/partner/[partnerId]/offers/[offerId]/edit/page.tsx"),
    "utf-8"
  );

  // remains force-dynamic
  assert.ok(localizedRoute.includes('export const dynamic = "force-dynamic"'), "localized route must be force-dynamic");

  // remains noindex
  assert.ok(localizedRoute.includes("robots: { index: false, follow: false, nocache: true }"), "localized route must be noindex");

  // continues to route through corrected implementation
  assert.ok(
    localizedRoute.includes('import PartnerOfferEditPage from "@/app/(pl)/partner/[partnerId]/oferty/[offerId]/edytuj/page"'),
    "localized route must import PartnerOfferEditPage"
  );
  assert.ok(localizedRoute.includes("export default PartnerOfferEditPage"), "localized route must export PartnerOfferEditPage");
});

test("Partner Offer Detail - edit CTA links regression", () => {
  const detailRoute = fs.readFileSync(
    path.join(process.cwd(), "src/app/(pl)/partner/[partnerId]/oferty/[offerId]/page.tsx"),
    "utf-8"
  );

  // CTA for draft offers
  assert.ok(detailRoute.includes('offer.publicationStatus === "draft"'), "must guard edit CTA with draft status");
  assert.ok(
    detailRoute.includes('href={locale ? `${basePath}/${offer.offerId}/edit` : `${basePath}/${offer.offerId}/edytuj`}'),
    "must link to /edytuj for PL and /edit for localized"
  );
  assert.ok(detailRoute.includes("`/partner/${parsedPartnerId}/oferty`"), "basePath must use /partner/.../oferty for PL");
  assert.ok(detailRoute.includes("`/${resolvedLocale}/partner/${parsedPartnerId}/offers`"), "basePath must use /offers for localized");
});

test("Partner Offer Edit - Production QA price mode regression", () => {
  // Initial production defect case:
  // priceBrutto = "1500.00", priceOnRequest = true
  const initialOffer = {
    priceBrutto: "1500.00",
    priceOnRequest: true,
  };

  const state0 = initPriceFormState(initialOffer);
  assert.equal(state0.priceMode, "request", "UI initial mode must be request");
  assert.equal(state0.priceValue, "1500.00", "Preserves numeric price in state");

  // Submission without editing:
  const payload0 = buildPricePayload(state0.priceMode, state0.priceValue);
  assert.deepEqual(payload0, {
    priceBrutto: "1500.00",
    priceOnRequest: true,
  });

  // Transition request -> fixed:
  const state1 = transitionPriceMode(state0, "fixed");
  assert.equal(state1.priceMode, "fixed");
  assert.equal(state1.priceValue, "1500.00", "price value remains 1500.00 after switching to fixed");
  const payload1 = buildPricePayload(state1.priceMode, state1.priceValue);
  assert.deepEqual(payload1, {
    priceBrutto: "1500.00",
    priceOnRequest: false,
  });

  // Transition fixed -> request -> fixed:
  const state2 = transitionPriceMode(state1, "request");
  assert.equal(state2.priceValue, "1500.00");
  const state3 = transitionPriceMode(state2, "fixed");
  assert.equal(state3.priceValue, "1500.00", "switching back to fixed does not erase entered value");
});

test("Partner Offer Edit - price mode matrix (A-H)", () => {
  // A. initial fixed mode
  assert.equal(getInitialPriceMode(false), "fixed");

  // B. initial request mode
  assert.equal(getInitialPriceMode(true), "request");

  // C. request mode preserves numeric price value
  const reqState = initPriceFormState({ priceOnRequest: true, priceBrutto: "250.50" });
  assert.equal(reqState.priceValue, "250.50");

  // D. switching request -> fixed restores existing price
  const switchedToFixed = transitionPriceMode(reqState, "fixed");
  assert.equal(switchedToFixed.priceValue, "250.50");

  // E. switching fixed -> request -> fixed with custom value
  const customFixed = updatePriceValue(initPriceFormState({ priceOnRequest: false, priceBrutto: null }), "99.99");
  const customReq = transitionPriceMode(customFixed, "request");
  const customFixedAgain = transitionPriceMode(customReq, "fixed");
  assert.equal(customFixedAgain.priceValue, "99.99");

  // F. submit fixed
  assert.deepEqual(buildPricePayload("fixed", "100.00"), { priceBrutto: "100.00", priceOnRequest: false });

  // G. submit request
  assert.deepEqual(buildPricePayload("request", "100.00"), { priceBrutto: "100.00", priceOnRequest: true });

  // H. blank fixed price
  assert.deepEqual(buildPricePayload("fixed", ""), { priceBrutto: null, priceOnRequest: false });
  assert.deepEqual(buildPricePayload("fixed", "   "), { priceBrutto: null, priceOnRequest: false });
});

test("Partner Offer Edit - exact 1-2 decimal validation regex (I)", () => {
  const regex = new RegExp(PRICE_INPUT_PATTERN);
  assert.ok(regex.test("100"));
  assert.ok(regex.test("100.5"));
  assert.ok(regex.test("100.50"));
  assert.ok(!regex.test("100.555"));
  assert.ok(!regex.test("abc"));
  assert.ok(!regex.test("-100"));
  assert.ok(!regex.test("100,50"));
});

test("Partner Offer Edit - no currency label or value added (J)", () => {
  const formSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/partner/PartnerOfferEditForm.tsx"),
    "utf-8"
  );
  assert.ok(!formSource.includes("PLN"), "No PLN currency literal in form");
  assert.ok(!formSource.includes("EUR"), "No EUR currency literal in form");
  assert.ok(!formSource.includes("zł"), "No zł currency literal in form");
  assert.ok(!formSource.includes("€"), "No € currency literal in form");
});

test("Partner Offer Detail - price precedence regression remains (K)", () => {
  const detailSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(pl)/partner/[partnerId]/oferty/[offerId]/page.tsx"),
    "utf-8"
  );
  assert.ok(
    detailSource.includes("item.priceOnRequest || item.priceBrutto === null"),
    "Detail page prioritizes priceOnRequest over priceBrutto"
  );
  assert.ok(
    detailSource.includes("? dict.offersPriceOnRequest"),
    "Renders offersPriceOnRequest when priceOnRequest is true"
  );
});

test("Partner Offer Edit - price mode i18n keys exist in all 7 locales (L)", () => {
  const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"];
  const requiredKeys = [
    "offerEditPriceModeLabel",
    "offerEditPriceModeFixed",
    "offerEditPriceModeRequest",
    "offerEditPriceFixedHelp",
    "offerEditPriceRequestHelp",
  ];

  for (const loc of locales) {
    const filePath = path.join(process.cwd(), `src/messages/${loc}.json`);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const partnerWs = content.PartnerWorkspace;
    assert.ok(partnerWs, `PartnerWorkspace missing in ${loc}.json`);

    for (const key of requiredKeys) {
      assert.ok(
        typeof partnerWs[key] === "string" && partnerWs[key].trim().length > 0,
        `Key ${key} missing or empty in ${loc}.json`
      );
    }
  }
});

test("Partner Offer Edit - accessibility and controlled form structure (M)", () => {
  const formSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/partner/PartnerOfferEditForm.tsx"),
    "utf-8"
  );

  // fieldset and legend used
  assert.ok(formSource.includes("<fieldset"), "Form must use fieldset for price mode");
  assert.ok(formSource.includes("<legend"), "Form must use legend for price mode");

  // semantic radio inputs
  assert.ok(formSource.includes('type="radio"'), "Price mode must use radio inputs");
  assert.ok(formSource.includes('value="fixed"'), "Fixed price mode radio exists");
  assert.ok(formSource.includes('value="request"'), "Request price mode radio exists");

  // does not rely on disabled input FormData
  assert.ok(
    formSource.includes("buildPricePayload(priceMode, priceValue)"),
    "Payload must be built directly from state, not disabled input FormData"
  );
});
