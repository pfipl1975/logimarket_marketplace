import { test, describe } from "node:test";
import * as assert from "node:assert/strict";
import { parseAdminOfferAttributesEditInput } from "../../src/lib/admin/offer-attributes-edit-core";

describe("Admin Offer Attributes Edit Core - Parser", () => {
  test("1. invalid root input", () => {
    assert.equal(parseAdminOfferAttributesEditInput(null), null);
    assert.equal(parseAdminOfferAttributesEditInput("str"), null);
  });

  test("2. invalid offerId", () => {
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: "1",
        expectedUpdatedAt: null,
        attributes: [],
      }),
      null,
    );
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: 0,
        expectedUpdatedAt: null,
        attributes: [],
      }),
      null,
    );
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: -5,
        expectedUpdatedAt: null,
        attributes: [],
      }),
      null,
    );
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: 1.5,
        expectedUpdatedAt: null,
        attributes: [],
      }),
      null,
    );
  });

  test("3. malformed expectedUpdatedAt", () => {
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: 1,
        expectedUpdatedAt: 123,
        attributes: [],
      }),
      null,
    );
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: 1,
        expectedUpdatedAt: "2024-99-99",
        attributes: [],
      }),
      null,
    );
  });

  test("4. duplicate attributeId", () => {
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: 1,
        expectedUpdatedAt: null,
        attributes: [
          { attributeId: 10, value: { type: "text", value: "A" } },
          { attributeId: 10, value: { type: "text", value: "B" } },
        ],
      }),
      null,
    );
  });

  test("5. valid text", () => {
    const r = parseAdminOfferAttributesEditInput({
      offerId: 1,
      expectedUpdatedAt: null,
      attributes: [{ attributeId: 10, value: { type: "text", value: "A" } }],
    });
    assert.deepEqual(r, {
      offerId: 1,
      expectedUpdatedAt: null,
      attributes: [{ attributeId: 10, value: { type: "text", value: "A" } }],
    });
  });

  test("6. duplicate optionIds in multi_enum rejected", () => {
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: 1,
        expectedUpdatedAt: null,
        attributes: [
          { attributeId: 10, value: { type: "multi_enum", optionIds: [1, 1] } },
        ],
      }),
      null,
    );
  });

  test("7. optionIds <= 0 rejected in enum and multi_enum", () => {
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: 1,
        expectedUpdatedAt: null,
        attributes: [{ attributeId: 10, value: { type: "enum", optionId: 0 } }],
      }),
      null,
    );
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: 1,
        expectedUpdatedAt: null,
        attributes: [
          { attributeId: 10, value: { type: "enum", optionId: -1 } },
        ],
      }),
      null,
    );
    assert.equal(
      parseAdminOfferAttributesEditInput({
        offerId: 1,
        expectedUpdatedAt: null,
        attributes: [
          { attributeId: 10, value: { type: "multi_enum", optionIds: [1, 0] } },
        ],
      }),
      null,
    );
  });
});
