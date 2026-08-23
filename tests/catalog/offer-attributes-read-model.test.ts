import { test, describe } from "node:test";
import * as assert from "node:assert/strict";
import { buildPublicOfferAttributes } from "../../src/lib/catalog/offer-attributes-read-model";


describe("Catalog Attributes Read Model Integration", () => {
  const baseOffer = { id: 1, categoryId: 10 };
  const baseDef = { id: 100, stableKey: "test", dataType: "text", isActive: true };
  const baseAssign = { categoryId: 10, attributeDefinitionId: 100, isVisible: true, isRequired: false, sortOrder: 1, unitCode: null };
  const baseOav = { id: 1000, offerId: 1, attributeId: 100, valueText: "ValA", valueNumber: null, valueBoolean: null, valueDate: null, valueYear: null, optionId: null };

  test("assigned + visible + active attribute appears", () => {
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [baseAssign as never],
      [baseDef as never],
      [], [], [],
      [baseOav as never],
      [],
      "en"
    );
    assert.deepEqual(res[1][0].values, ["ValA"]);
  });

  test("assigned + isVisible=false does NOT appear even when OAV exists", () => {
    const assign = { ...baseAssign, isVisible: false };
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [assign as never],
      [baseDef as never],
      [], [], [],
      [baseOav as never],
      [],
      "en"
    );
    assert.equal(res[1].length, 0);
  });

  test("orphan OAV does NOT appear", () => {
    // Has OAV but no assignment
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [], // No assignment
      [baseDef as never],
      [], [], [],
      [baseOav as never],
      [],
      "en"
    );
    assert.equal(res[1].length, 0);
  });

  test("orphan OAOV does NOT appear", () => {
    const oaov = { id: 1000, offerId: 1, attributeId: 100, optionId: 200 };
    const def = { ...baseDef, dataType: "multi_enum" };
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [], // No assignment
      [def as never],
      [], [], [],
      [],
      [oaov as never],
      "en"
    );
    assert.equal(res[1].length, 0);
  });

  test("inactive definition does NOT appear", () => {
    const def = { ...baseDef, isActive: false };
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [baseAssign as never],
      [def as never],
      [], [], [],
      [baseOav as never],
      [],
      "en"
    );
    assert.equal(res[1].length, 0);
  });

  test("inactive enum option does NOT expose raw ID/fallback", () => {
    const def = { ...baseDef, dataType: "enum" };
    const oav = { ...baseOav, valueText: null, optionId: 200 }; // The value
    // The option definition is inactive
    const opt = { id: 200, attributeId: 100, stableKey: "opt1", isActive: false };
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [baseAssign as never],
      [def as never],
      [],
      [opt as never], // inactive
      [],
      [oav as never],
      [],
      "en"
    );
    assert.equal(res[1].length, 0);
  });

  test("requested-locale translation selected", () => {
    const def = { ...baseDef, dataType: "enum" };
    const oav = { ...baseOav, valueText: null, optionId: 200 };
    const opt = { id: 200, attributeId: 100, stableKey: "opt1", isActive: true };
    const optTrans = { id: 1, controlledOptionValueId: 200, locale: "de", label: "Rot" };
    
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [baseAssign as never],
      [def as never],
      [],
      [opt as never],
      [optTrans as never],
      [oav as never],
      [],
      "de"
    );
    assert.deepEqual(res[1][0].values, ["Rot"]);
  });

  test("missing requested locale -> PL", () => {
    const def = { ...baseDef, dataType: "enum" };
    const oav = { ...baseOav, valueText: null, optionId: 200 };
    const opt = { id: 200, attributeId: 100, stableKey: "opt1", isActive: true };
    const optTrans = { id: 1, controlledOptionValueId: 200, locale: "pl", label: "Czerwony" };
    
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [baseAssign as never],
      [def as never],
      [],
      [opt as never],
      [optTrans as never],
      [oav as never],
      [],
      "en" // en missing
    );
    assert.deepEqual(res[1][0].values, ["Czerwony"]);
  });

  test("missing requested + PL -> stableKey", () => {
    const def = { ...baseDef, dataType: "enum" };
    const oav = { ...baseOav, valueText: null, optionId: 200 };
    const opt = { id: 200, attributeId: 100, stableKey: "opt1_fallback", isActive: true };
    
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [baseAssign as never],
      [def as never],
      [],
      [opt as never],
      [], // no translations
      [oav as never],
      [],
      "en"
    );
    assert.deepEqual(res[1][0].values, ["opt1_fallback"]);
  });

  test("numeric '1234.5600' exact", () => {
    const def = { ...baseDef, dataType: "number" };
    const oav = { ...baseOav, valueText: null, valueNumber: "1234.5600" };
    
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [baseAssign as never],
      [def as never],
      [], [], [],
      [oav as never],
      [],
      "en"
    );
    assert.deepEqual(res[1][0].values, ["1234.5600"]);
  });

  test("multi_enum deterministic stableKey ordering", () => {
    const def = { ...baseDef, dataType: "multi_enum" };
    const opt1 = { id: 10, attributeId: 100, stableKey: "B", isActive: true };
    const opt2 = { id: 20, attributeId: 100, stableKey: "A", isActive: true };
    const oaov1 = { id: 1, offerId: 1, attributeId: 100, optionId: 20 };
    const oaov2 = { id: 2, offerId: 1, attributeId: 100, optionId: 10 };
    
    const res = buildPublicOfferAttributes(
      [baseOffer],
      [baseAssign as never],
      [def as never],
      [],
      [opt1, opt2] as never,
      [],
      [],
      [oaov1, oaov2] as never,
      "en"
    );
    // Should order by stableKey: A then B
    assert.deepEqual(res[1][0].values, ["A", "B"]);
  });
});
