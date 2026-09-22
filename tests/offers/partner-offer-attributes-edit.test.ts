import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parsePartnerOfferAttributesEditInput,
  planPartnerOfferAttributesMutation,
  type PartnerOfferAttributesEditInput,
  type PartnerOfferAttributesMutationState,
} from "../../src/lib/partner-offers/attribute-edit-core";
import {
  buildPartnerAttributeEditReadState,
  buildPartnerAttributeEditViewModel,
} from "../../src/lib/partner-offers/attribute-edit-read-model";
import { requirePartnerMembershipCore } from "../../src/lib/auth/partner-membership";

const timestamp = "2026-09-17T10:00:00.000Z";

function input(
  attributes: PartnerOfferAttributesEditInput["attributes"] = [],
): PartnerOfferAttributesEditInput {
  return {
    partnerId: 10,
    offerId: 20,
    expectedCategoryId: 30,
    expectedUpdatedAt: timestamp,
    attributes,
  };
}

function state(
  overrides: Partial<PartnerOfferAttributesMutationState> = {},
): PartnerOfferAttributesMutationState {
  const definitions = [
    { id: 1, dataType: "text", isActive: true },
    { id: 2, dataType: "number", isActive: true },
    { id: 3, dataType: "boolean", isActive: true },
    { id: 4, dataType: "date", isActive: true },
    { id: 5, dataType: "year", isActive: true },
    { id: 6, dataType: "enum", isActive: true },
    { id: 7, dataType: "multi_enum", isActive: true },
  ];
  return {
    offer: {
      id: 20,
      partnerId: 10,
      categoryId: 30,
      publicationStatus: "draft",
      updatedAt: new Date(timestamp),
    },
    assignments: definitions.map((definition) => ({
      attributeDefinitionId: definition.id,
    })),
    definitions,
    options: [
      { id: 61, attributeId: 6, isActive: true },
      { id: 62, attributeId: 6, isActive: false },
      { id: 71, attributeId: 7, isActive: true },
      { id: 72, attributeId: 7, isActive: true },
      { id: 81, attributeId: 8, isActive: true },
    ],
    scalarRows: [],
    multiRows: [],
    ...overrides,
  };
}

function scalarRow(
  attributeId: number,
  slots: Partial<
    Omit<PartnerOfferAttributesMutationState["scalarRows"][number], "id" | "attributeId">
  >,
): PartnerOfferAttributesMutationState["scalarRows"][number] {
  return {
    id: 100 + attributeId,
    attributeId,
    valueText: null,
    valueNumber: null,
    valueBoolean: null,
    valueDate: null,
    valueYear: null,
    optionId: null,
    ...slots,
  };
}

describe("Partner technical attribute input parser", () => {
  test("accepts the bounded payload and preserves explicit boolean false", () => {
    const parsed = parsePartnerOfferAttributesEditInput({
      ...input([{ attributeId: 3, value: { type: "boolean", value: false } }]),
      locale: "pl",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.data.attributes[0], {
        attributeId: 3,
        value: { type: "boolean", value: false },
      });
    }
  });

  test("rejects unknown fields, malformed versions and duplicate attributes/options", () => {
    assert.equal(
      parsePartnerOfferAttributesEditInput({ ...input(), categoryId: 30 }).ok,
      false,
    );
    assert.equal(
      parsePartnerOfferAttributesEditInput({
        ...input(),
        expectedUpdatedAt: "2026-09-17",
      }).ok,
      false,
    );
    assert.equal(
      parsePartnerOfferAttributesEditInput({
        ...input(),
        attributes: [
          { attributeId: 1, value: { type: "text", value: "A" } },
          { attributeId: 1, value: { type: "text", value: "B" } },
        ],
      }).ok,
      false,
    );
    assert.equal(
      parsePartnerOfferAttributesEditInput({
        ...input(),
        attributes: [
          {
            attributeId: 7,
            value: { type: "multi_enum", optionIds: [71, 71] },
          },
        ],
      }).ok,
      false,
    );
  });
});

describe("Partner membership boundary", () => {
  const identity = {
    status: "authenticated" as const,
    user: { id: "00000000-0000-0000-0000-000000000010", email: "p@example.com" },
  };

  test("active membership for the requested partner is allowed", async () => {
    const result = await requirePartnerMembershipCore(
      async () => identity,
      async () => ({ membershipStatus: "active", canAcceptOrders: false }),
      10,
    );
    assert.equal(result.id, identity.user.id);
  });

  test("unauthenticated and missing membership are denied", async () => {
    await assert.rejects(() =>
      requirePartnerMembershipCore(
        async () => ({ status: "unauthenticated" as const, user: null }),
        async () => undefined,
        10,
      ),
    );
    await assert.rejects(() =>
      requirePartnerMembershipCore(
        async () => identity,
        async () => undefined,
        10,
      ),
    );
  });
});

describe("Partner technical attribute mutation planner", () => {
  test("allows own draft and produces canonical OAV/OAOV operations for all seven types", () => {
    const result = planPartnerOfferAttributesMutation(
      input([
        { attributeId: 1, value: { type: "text", value: "  Steel  " } },
        { attributeId: 2, value: { type: "number", value: "1234.5600" } },
        { attributeId: 3, value: { type: "boolean", value: false } },
        { attributeId: 4, value: { type: "date", value: "2026-02-28" } },
        { attributeId: 5, value: { type: "year", value: "2026" } },
        { attributeId: 6, value: { type: "enum", optionId: 61 } },
        { attributeId: 7, value: { type: "multi_enum", optionIds: [72, 71] } },
      ]),
      state(),
    );
    assert.equal(result.code, "EXECUTE_MUTATION");
    if (result.code === "EXECUTE_MUTATION") {
      assert.equal(result.plan.scalarInserts.length, 6);
      assert.equal(result.plan.multiInserts.length, 2);
      assert.equal(result.plan.scalarInserts[0].valueText, "Steel");
      assert.equal(result.plan.scalarInserts[1].valueNumber, "1234.5600");
      assert.equal(result.plan.scalarInserts[2].valueBoolean, false);
      assert.equal(result.plan.scalarInserts[3].valueDate?.toISOString(), "2026-02-28T00:00:00.000Z");
      assert.equal(result.plan.scalarInserts[4].valueYear, 2026);
      assert.equal(result.plan.scalarInserts[5].optionId, 61);
      assert.deepEqual(
        result.plan.multiInserts.map((row) => row.optionId),
        [71, 72],
      );
    }
  });

  test("denies cross-partner, missing, deleted, published, hidden and archived offers", () => {
    assert.equal(
      planPartnerOfferAttributesMutation(input(), state({ offer: null })).code,
      "OFFER_NOT_FOUND",
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        input(),
        state({ offer: { ...state().offer!, partnerId: 11 } }),
      ).code,
      "OFFER_NOT_FOUND",
    );
    for (const publicationStatus of ["deleted", "published", "hidden", "archived"]) {
      const result = planPartnerOfferAttributesMutation(
        input(),
        state({ offer: { ...state().offer!, publicationStatus } }),
      );
      assert.equal(
        result.code,
        publicationStatus === "deleted"
          ? "OFFER_NOT_FOUND"
          : "OFFER_NOT_EDITABLE_STATUS",
      );
    }
  });

  test("enforces the exact nullable optimistic-concurrency contract", () => {
    assert.equal(planPartnerOfferAttributesMutation(input(), state()).ok, true);
    assert.equal(
      planPartnerOfferAttributesMutation(
        { ...input(), expectedUpdatedAt: "2026-09-17T11:00:00.000Z" },
        state(),
      ).code,
      "OFFER_CONFLICT",
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        { ...input(), expectedUpdatedAt: null },
        state({ offer: { ...state().offer!, updatedAt: null } }),
      ).ok,
      true,
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        { ...input(), expectedUpdatedAt: null },
        state(),
      ).code,
      "OFFER_CONFLICT",
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        input(),
        state({ offer: { ...state().offer!, updatedAt: null } }),
      ).code,
      "OFFER_CONFLICT",
    );
  });

  test("fails closed for category drift, assignment, definition and datatype inconsistencies", () => {
    assert.equal(
      planPartnerOfferAttributesMutation(
        input(),
        state({ offer: { ...state().offer!, categoryId: 31 } }),
      ).code,
      "CATEGORY_CONFLICT",
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 99, value: { type: "text", value: "x" } }]),
        state(),
      ).code,
      "ATTRIBUTE_NOT_ASSIGNED",
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 1, value: { type: "text", value: "x" } }]),
        state({ definitions: [] }),
      ).code,
      "ATTRIBUTE_NOT_FOUND",
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 1, value: { type: "text", value: "x" } }]),
        state({ definitions: [{ id: 1, dataType: "text", isActive: false }] }),
      ).code,
      "ATTRIBUTE_INACTIVE",
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 1, value: { type: "text", value: "x" } }]),
        state({ definitions: [{ id: 1, dataType: "json", isActive: true }] }),
      ).code,
      "ATTRIBUTE_TYPE_UNSUPPORTED",
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 1, value: { type: "number", value: "1" } }]),
        state(),
      ).code,
      "ATTRIBUTE_TYPE_MISMATCH",
    );
  });

  test("fails closed when scalar or enum definitions have existing OAOV rows", () => {
    const cases: Array<PartnerOfferAttributesEditInput["attributes"][number]> = [
      { attributeId: 1, value: { type: "text", value: "new" } },
      { attributeId: 2, value: { type: "number", value: "2" } },
      { attributeId: 6, value: { type: "enum", optionId: 61 } },
    ];

    for (const mutation of cases) {
      const result = planPartnerOfferAttributesMutation(
        input([mutation]),
        state({
          multiRows: [
            { id: 900 + mutation.attributeId, attributeId: mutation.attributeId, optionId: 999 },
          ],
        }),
      );
      assert.equal(result.code, "ATTRIBUTE_STORAGE_INCONSISTENT");
    }
  });

  test("fails closed when a multi-enum definition has an existing OAV row without reconciling it", () => {
    const inconsistentState = state({
      scalarRows: [scalarRow(7, { valueText: "historical drift" })],
    });
    const snapshot = structuredClone(inconsistentState);
    const result = planPartnerOfferAttributesMutation(
      input([{ attributeId: 7, value: { type: "clear" } }]),
      inconsistentState,
    );

    assert.equal(result.code, "ATTRIBUTE_STORAGE_INCONSISTENT");
    assert.deepEqual(inconsistentState, snapshot, "rejected drift is not reconciled");
    assert.deepEqual(inconsistentState.offer?.updatedAt, new Date(timestamp));
    assert.equal("plan" in result, false);
  });

  test("fails closed when an existing OAV row uses the wrong datatype slot", () => {
    const cases: Array<{
      mutation: PartnerOfferAttributesEditInput["attributes"][number];
      row: PartnerOfferAttributesMutationState["scalarRows"][number];
    }> = [
      {
        mutation: { attributeId: 1, value: { type: "text", value: "new" } },
        row: scalarRow(1, { valueNumber: "1" }),
      },
      {
        mutation: { attributeId: 2, value: { type: "number", value: "2" } },
        row: scalarRow(2, { valueText: "wrong" }),
      },
      {
        mutation: { attributeId: 3, value: { type: "boolean", value: true } },
        row: scalarRow(3, { valueText: "wrong" }),
      },
      {
        mutation: { attributeId: 4, value: { type: "date", value: "2026-09-17" } },
        row: scalarRow(4, { valueText: "wrong" }),
      },
      {
        mutation: { attributeId: 5, value: { type: "year", value: "2026" } },
        row: scalarRow(5, { valueText: "wrong" }),
      },
      {
        mutation: { attributeId: 6, value: { type: "enum", optionId: 61 } },
        row: scalarRow(6, { valueText: "wrong" }),
      },
    ];

    for (const testCase of cases) {
      assert.equal(
        planPartnerOfferAttributesMutation(
          input([testCase.mutation]),
          state({ scalarRows: [testCase.row] }),
        ).code,
        "ATTRIBUTE_STORAGE_INCONSISTENT",
      );
    }
  });

  test("accepts canonical existing rows in their datatype-specific stores", () => {
    const result = planPartnerOfferAttributesMutation(
      input([
        { attributeId: 1, value: { type: "text", value: "same" } },
        { attributeId: 2, value: { type: "number", value: "1.00" } },
        { attributeId: 3, value: { type: "boolean", value: false } },
        { attributeId: 4, value: { type: "date", value: "2026-09-17" } },
        { attributeId: 5, value: { type: "year", value: "2026" } },
        { attributeId: 6, value: { type: "enum", optionId: 61 } },
        { attributeId: 7, value: { type: "multi_enum", optionIds: [71] } },
      ]),
      state({
        scalarRows: [
          scalarRow(1, { valueText: "same" }),
          scalarRow(2, { valueNumber: "1.00" }),
          scalarRow(3, { valueBoolean: false }),
          scalarRow(4, { valueDate: new Date("2026-09-17T00:00:00.000Z") }),
          scalarRow(5, { valueYear: 2026 }),
          scalarRow(6, { optionId: 61 }),
        ],
        multiRows: [{ id: 171, attributeId: 7, optionId: 71 }],
      }),
    );

    assert.equal(result.code, "ATTRIBUTES_UNCHANGED");
  });

  test("validates enum and multi-enum option existence, ownership and activity from input", () => {
    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 6, value: { type: "enum", optionId: 999 } }]),
        state(),
      ).code,
      "OPTION_NOT_FOUND",
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 6, value: { type: "enum", optionId: 81 } }]),
        state(),
      ).code,
      "OPTION_WRONG_ATTRIBUTE",
    );
    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 6, value: { type: "enum", optionId: 62 } }]),
        state(),
      ).code,
      "OPTION_INACTIVE",
    );
  });

  test("validates persisted enum and multi-enum options and fails closed on inactive options without reconciling", () => {
    // 1. existing active enum option + valid replacement/update -> allowed
    const activeEnumState = state({
      scalarRows: [scalarRow(6, { optionId: 61 })],
    });
    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 6, value: { type: "clear" } }]),
        activeEnumState,
      ).code,
      "EXECUTE_MUTATION",
    );

    // 2. existing inactive enum option + clear -> OPTION_INACTIVE
    // 3. existing inactive enum option + replace with active option -> OPTION_INACTIVE
    const inactiveEnumState = state({
      scalarRows: [scalarRow(6, { optionId: 62 })],
    });
    const inactiveEnumSnapshot = structuredClone(inactiveEnumState);
    const resultClearEnum = planPartnerOfferAttributesMutation(
      input([{ attributeId: 6, value: { type: "clear" } }]),
      inactiveEnumState,
    );
    assert.equal(resultClearEnum.code, "OPTION_INACTIVE");
    assert.deepEqual(inactiveEnumState, inactiveEnumSnapshot, "state not mutated");

    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 6, value: { type: "enum", optionId: 61 } }]),
        inactiveEnumState,
      ).code,
      "OPTION_INACTIVE",
    );

    // 4. all existing multi_enum options active + valid update -> allowed
    const activeMultiState = state({
      multiRows: [{ id: 1, attributeId: 7, optionId: 71 }],
    });
    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 7, value: { type: "multi_enum", optionIds: [72] } }]),
        activeMultiState,
      ).code,
      "EXECUTE_MUTATION",
    );

    // 5. existing multi_enum contains inactive option + clear -> OPTION_INACTIVE
    // 6. existing multi_enum contains inactive option + mutation omits/removes the inactive option -> OPTION_INACTIVE
    const inactiveMultiState = state({
      options: [
        { id: 71, attributeId: 7, isActive: true },
        { id: 73, attributeId: 7, isActive: false },
      ],
      multiRows: [
        { id: 1, attributeId: 7, optionId: 71 },
        { id: 2, attributeId: 7, optionId: 73 },
      ],
    });
    const inactiveMultiSnapshot = structuredClone(inactiveMultiState);
    const resultClearMulti = planPartnerOfferAttributesMutation(
      input([{ attributeId: 7, value: { type: "clear" } }]),
      inactiveMultiState,
    );
    assert.equal(resultClearMulti.code, "OPTION_INACTIVE");
    assert.deepEqual(inactiveMultiState, inactiveMultiSnapshot, "state not mutated");

    assert.equal(
      planPartnerOfferAttributesMutation(
        input([{ attributeId: 7, value: { type: "multi_enum", optionIds: [71] } }]),
        inactiveMultiState,
      ).code,
      "OPTION_INACTIVE",
    );
  });

  test("rejects malformed values without date normalization surprises", () => {
    for (const mutation of [
      { attributeId: 2, value: { type: "number" as const, value: "NaN" } },
      { attributeId: 2, value: { type: "number" as const, value: "1e3" } },
      { attributeId: 4, value: { type: "date" as const, value: "2026-02-30" } },
      { attributeId: 5, value: { type: "year" as const, value: "2026.5" } },
    ]) {
      assert.equal(
        planPartnerOfferAttributesMutation(input([mutation]), state()).code,
        "INVALID_INPUT",
      );
    }
  });

  test("clear deletes canonical rows and creates no sentinel values", () => {
    const result = planPartnerOfferAttributesMutation(
      input([
        { attributeId: 1, value: { type: "text", value: "   " } },
        { attributeId: 6, value: { type: "clear" } },
        { attributeId: 7, value: { type: "multi_enum", optionIds: [] } },
      ]),
      state({
        scalarRows: [
          {
            id: 101,
            attributeId: 1,
            valueText: "old",
            valueNumber: null,
            valueBoolean: null,
            valueDate: null,
            valueYear: null,
            optionId: null,
          },
          {
            id: 106,
            attributeId: 6,
            valueText: null,
            valueNumber: null,
            valueBoolean: null,
            valueDate: null,
            valueYear: null,
            optionId: 61,
          },
        ],
        multiRows: [
          { id: 171, attributeId: 7, optionId: 71 },
          { id: 172, attributeId: 7, optionId: 72 },
        ],
      }),
    );
    assert.equal(result.code, "EXECUTE_MUTATION");
    if (result.code === "EXECUTE_MUTATION") {
      assert.deepEqual(result.plan.scalarDeletes, [101, 106]);
      assert.deepEqual(result.plan.multiDeletes, [171, 172]);
      assert.equal(result.plan.scalarInserts.length, 0);
      assert.equal(result.plan.multiInserts.length, 0);
    }
  });

  test("no-op preserves the version marker and the plan exposes no forbidden offer fields", () => {
    const result = planPartnerOfferAttributesMutation(
      input([{ attributeId: 1, value: { type: "text", value: "same" } }]),
      state({
        scalarRows: [
          {
            id: 1,
            attributeId: 1,
            valueText: "same",
            valueNumber: null,
            valueBoolean: null,
            valueDate: null,
            valueYear: null,
            optionId: null,
          },
        ],
      }),
    );
    assert.deepEqual(result, {
      ok: true,
      code: "ATTRIBUTES_UNCHANGED",
      changed: false,
      newUpdatedAt: timestamp,
    });

    const changed = planPartnerOfferAttributesMutation(
      input([{ attributeId: 1, value: { type: "text", value: "new" } }]),
      state(),
    );
    assert.equal(changed.code, "EXECUTE_MUTATION");
    if (changed.code === "EXECUTE_MUTATION") {
      for (const forbidden of [
        "categoryId",
        "publicationStatus",
        "title",
        "description",
        "priceBrutto",
        "priceOnRequest",
        "offerModel",
        "conversionType",
        "outboundUrl",
        "partnerId",
        "isActive",
        "isFeatured",
        "contractModel",
        "technicalAttributes",
      ]) {
        assert.equal(forbidden in changed.plan, false);
      }
    }
  });
});

describe("Partner technical attribute read model assembly", () => {
  const base = {
    locale: "de" as const,
    assignments: [
      { attributeDefinitionId: 1, sortOrder: 20, isRequired: false, unitCode: null },
      { attributeDefinitionId: 2, sortOrder: 10, isRequired: true, unitCode: "kg" },
    ],
    definitions: [
      { id: 1, stableKey: "inactive", dataType: "text", isActive: false },
      { id: 2, stableKey: "material", dataType: "enum", isActive: true },
      { id: 3, stableKey: "outside", dataType: "text", isActive: true },
    ],
    attributeTranslations: [
      { attributeDefinitionId: 2, locale: "pl", name: "Materiał", description: "Opis PL" },
      { attributeDefinitionId: 2, locale: "de", name: "Material", description: "Beschreibung" },
    ],
    options: [
      { id: 21, attributeId: 2, stableKey: "steel", isActive: true },
      { id: 22, attributeId: 2, stableKey: "old", isActive: false },
    ],
    optionTranslations: [
      { controlledOptionValueId: 21, locale: "pl", label: "Stal", description: null },
      { controlledOptionValueId: 21, locale: "de", label: "Stahl", description: "DE" },
    ],
    scalarRows: [
      {
        attributeId: 2,
        valueText: null,
        valueNumber: null,
        valueBoolean: null,
        valueDate: null,
        valueYear: null,
        optionId: 21,
      },
    ],
    multiRows: [],
  };

  test("renders only assigned active definitions and active localized options", () => {
    const result = buildPartnerAttributeEditViewModel(base);
    assert.equal(result.length, 1);
    assert.equal(result[0].attributeId, 2);
    assert.equal(result[0].localizedName, "Material");
    assert.equal(result[0].localizedDescription, "Beschreibung");
    assert.equal(result[0].isRequired, true);
    assert.equal(result[0].unitCode, "kg");
    assert.deepEqual(result[0].options.map((option) => option.localizedLabel), ["Stahl"]);
  });

  test("uses PL translation fallback and reserves the normal zero state for no assignments", () => {
    const fallback = buildPartnerAttributeEditViewModel({ ...base, locale: "fr" });
    assert.equal(fallback[0].localizedName, "Materiał");
    assert.equal(fallback[0].options[0].localizedLabel, "Stal");
    const empty = buildPartnerAttributeEditReadState({
      ...base,
      assignments: [],
    });
    assert.equal(empty.configurationState, "no_assignments");
    assert.deepEqual(empty.attributes, []);
  });

  test("marks assigned inactive definitions as configuration-inconsistent instead of empty", () => {
    const result = buildPartnerAttributeEditReadState({
      ...base,
      assignments: [base.assignments[0]],
    });
    assert.equal(result.configurationState, "configuration_inconsistent");
    assert.deepEqual(result.attributes, []);
  });

  test("makes canonical storage mismatches non-editable and hides the invalid value", () => {
    const result = buildPartnerAttributeEditReadState({
      ...base,
      assignments: [base.assignments[1]],
      scalarRows: [
        {
          ...base.scalarRows[0],
          valueText: "wrong store slot",
          optionId: null,
        },
      ],
    });
    assert.equal(result.configurationState, "configuration_inconsistent");
    assert.equal(result.attributes[0].isConsistent, false);
    assert.deepEqual(result.attributes[0].currentValue, { hasValue: false });
  });

  test("keeps canonical assigned rows editable", () => {
    const result = buildPartnerAttributeEditReadState({
      ...base,
      assignments: [base.assignments[1]],
    });
    assert.equal(result.configurationState, "editable");
    assert.equal(result.attributes[0].isConsistent, true);
  });
});

test("Partner technical attribute UI messages exist in all seven locales", () => {
  const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"];
  const keys = [
    "offerAttributeEditTitle",
    "offerAttributeEditDescription",
    "offerAttributeEditEmpty",
    "offerAttributeEditEmptyHint",
    "offerAttributeEditConfigurationTitle",
    "offerAttributeEditConfigurationHint",
    "offerAttributeEditRequired",
    "offerAttributeEditOptional",
    "offerAttributeEditUnit",
    "offerAttributeEditInconsistent",
    "offerAttributeEditClear",
    "offerAttributeEditUnset",
    "offerAttributeEditTrue",
    "offerAttributeEditFalse",
    "offerAttributeEditSave",
    "offerAttributeEditSaving",
    "offerAttributeEditSuccess",
    "offerAttributeEditConflict",
    "offerAttributeEditNotEditable",
    "offerAttributeEditValidation",
    "offerAttributeEditProvenanceLocked",
    "offerAttributeEditError",
  ];

  for (const locale of locales) {
    const messages = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "src", "messages", `${locale}.json`),
        "utf8",
      ),
    ).PartnerWorkspace;
    for (const key of keys) {
      assert.equal(
        typeof messages[key] === "string" && messages[key].trim().length > 0,
        true,
        `${locale}.${key}`,
      );
    }
  }
});
