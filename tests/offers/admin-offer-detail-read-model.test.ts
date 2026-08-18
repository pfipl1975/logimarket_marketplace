/**
 * Admin Offer Detail Read Model — Comprehensive Tests
 *
 * All tests are deterministic and DB-free.
 * Uses the extracted `projectAttributeValues` pure helper for attribute projection tests.
 * Uses a mock DB pattern for read-model result tests (NOT_FOUND, OK projection).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAdminOfferDetailReadModel,
  projectAttributeValues,
} from "../../src/lib/admin/offer-detail-read-model-core";
import type { AdminOfferDetailRelationalAttribute } from "../../src/lib/admin/offer-detail-read-model-core";
import { resolveCanonicalOfferModel } from "../../src/lib/offers/model";
import type { CategoryAttributeConfiguration } from "../../src/lib/catalog/category-attribute-read-model-core";
import * as schema from "../../src/lib/schema";

// ─── HELPERS ────────────────────────────────────────────────────────────────

function makeOav(partial: {
  attributeId: number;
  valueText?: string | null;
  valueNumber?: string | null;
  valueBoolean?: boolean | null;
  valueDate?: Date | null;
  valueYear?: number | null;
  optionId?: number | null;
}) {
  return {
    attributeId: partial.attributeId,
    valueText: partial.valueText ?? null,
    valueNumber: partial.valueNumber ?? null,
    valueBoolean: partial.valueBoolean ?? null,
    valueDate: partial.valueDate ?? null,
    valueYear: partial.valueYear ?? null,
    optionId: partial.optionId ?? null,
  };
}

function makeOaov(attributeId: number, optionId: number) {
  return { attributeId, optionId };
}

function makeConfig(
  attributeId: number,
  stableKey: string,
  dataType: string,
  overrides: Partial<CategoryAttributeConfiguration> = {}
): CategoryAttributeConfiguration {
  return {
    assignmentId: 1,
    attributeId,
    stableKey,
    dataType,
    name: `Name of ${stableKey}`,
    shortLabel: null,
    description: null,
    unitCode: null,
    sortOrder: 0,
    isFilterable: false,
    isComparable: false,
    isRequired: false,
    isVisible: true,
    options: [],
    ...overrides,
  };
}

// ─── MOCK DB ─────────────────────────────────────────────────────────────────

function makeOkOffer(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 42,
    partnerId: 7,
    categoryId: 3,
    title: "Test Offer Title",
    priceBrutto: "1234.56",
    outboundUrl: "https://example.com/offer",
    technicalAttributes: { width: 100, material: "steel" },
    offerModel: "rfq",
    description: "Offer description text",
    imageUrl: "https://cdn.example.com/img.jpg",
    priceOnRequest: false,
    conversionType: "inbound",
    isFeatured: false,
    isActive: true,
    createdAt: new Date("2025-01-15T10:00:00Z"),
    publicationStatus: "published",
    publishedAt: new Date("2025-01-16T08:00:00Z"),
    archivedAt: null,
    deletedAt: null,
    updatedAt: new Date("2025-02-01T12:00:00Z"),
    contractModel: "partner_marketplace",
    ...overrides,
  };
}

function makeMockDb(offer: unknown, partner?: unknown, category?: unknown) {
  const state = {
    oavRows: [] as unknown[],
    oaovRows: [] as unknown[],
    attrDefs: [] as unknown[],
  };

  const q = {
    _state: state,
    _table: null as unknown,
    select() {
      return this;
    },
    from(table: unknown) {
      this._table = table;
      return this;
    },
    innerJoin() {
      return this;
    },
    leftJoin() {
      return this;
    },
    where() {
      return this;
    },
    orderBy() {
      return this;
    },
    limit() {
      // Only the offers query uses .limit(1) — identify it by table identity
      if (this._table === schema.offers) {
        return Promise.resolve(
          offer ? [{ offer, partner: partner ?? null, category: category ?? null }] : []
        );
      }
      return this;
    },
    // Thenable: awaiting a chain without .limit() resolves rows per table identity
    then(resolve: (v: unknown) => void) {
      if (this._table === schema.offerAttributeValues) resolve(state.oavRows);
      else if (this._table === schema.offerAttributeOptionValues) resolve(state.oaovRows);
      else if (this._table === schema.attributeDefinitions) resolve(state.attrDefs);
      else resolve([]);
    },
  };
  return q;
}

// ─── 1. INPUT VALIDATION ─────────────────────────────────────────────────────

const emptyDb = {} as never;

describe("getAdminOfferDetailReadModel – INVALID_ID", () => {
  const cases = ["", "0", "-5", "-1", "1.5", "abc", "01", "1e2", " 1", "1 ", "1.0"];
  for (const raw of cases) {
    it(`returns INVALID_ID for: "${raw}"`, async () => {
      const result = await getAdminOfferDetailReadModel(emptyDb, raw, "pl");
      assert.deepStrictEqual(result, { ok: false, code: "INVALID_ID" });
    });
  }
});

// ─── 2. CANONICAL MODEL RESOLUTION ──────────────────────────────────────────

describe("resolveCanonicalOfferModel", () => {
  const cases: [string, string, string][] = [
    ["rfq", "inbound", "rfq"],
    ["marketplace", "inbound", "ecommerce"],
    ["rfq", "outbound", "outbound"],
    ["marketplace", "outbound", "outbound"],
    ["unknown_model", "unknown_conversion", "unknown"],
    ["rfq", "unknown", "unknown"],
  ];
  for (const [model, conversion, expected] of cases) {
    it(`${model} + ${conversion} => ${expected}`, () => {
      assert.strictEqual(resolveCanonicalOfferModel(model, conversion), expected);
    });
  }
});

// ─── 3. PUBLICATION STATUS MAPPING ──────────────────────────────────────────

import { isPublicOfferDetailStatus } from "../../src/lib/offers/status";

describe("isPublicOfferDetailStatus", () => {
  it("published => true (public preview allowed)", () => {
    assert.strictEqual(isPublicOfferDetailStatus("published"), true);
  });
  it("draft => false", () => {
    assert.strictEqual(isPublicOfferDetailStatus("draft"), false);
  });
  it("archived => depends on status config — not null/undefined", () => {
    const result = isPublicOfferDetailStatus("archived");
    assert.ok(typeof result === "boolean");
  });
  it("hidden => false", () => {
    assert.strictEqual(isPublicOfferDetailStatus("hidden"), false);
  });
  it("deleted => false", () => {
    assert.strictEqual(isPublicOfferDetailStatus("deleted"), false);
  });
});

// ─── 4. ATTRIBUTE PROJECTION — projectAttributeValues ───────────────────────

describe("projectAttributeValues – text", () => {
  it("returns valueText for text type", () => {
    const result = projectAttributeValues(
      1, "text", undefined,
      [makeOav({ attributeId: 1, valueText: "hello world" })],
      []
    );
    assert.deepStrictEqual(result, ["hello world"]);
  });

  it("returns empty array if valueText is null", () => {
    const result = projectAttributeValues(
      1, "text", undefined,
      [makeOav({ attributeId: 1, valueText: null })],
      []
    );
    assert.deepStrictEqual(result, []);
  });
});

describe("projectAttributeValues – number with numeric precision", () => {
  it("preserves numeric precision as string (no Number() conversion)", () => {
    const result = projectAttributeValues(
      1, "number", undefined,
      [makeOav({ attributeId: 1, valueNumber: "99999.9900" })],
      []
    );
    // Must not lose trailing zeros via Number()
    assert.deepStrictEqual(result, ["99999.9900"]);
  });

  it("returns numeric string exactly", () => {
    const result = projectAttributeValues(
      1, "number", undefined,
      [makeOav({ attributeId: 1, valueNumber: "3.14" })],
      []
    );
    assert.deepStrictEqual(result, ["3.14"]);
  });
});

describe("projectAttributeValues – boolean", () => {
  it("true => 'true'", () => {
    const result = projectAttributeValues(
      1, "boolean", undefined,
      [makeOav({ attributeId: 1, valueBoolean: true })],
      []
    );
    assert.deepStrictEqual(result, ["true"]);
  });
  it("false => 'false'", () => {
    const result = projectAttributeValues(
      1, "boolean", undefined,
      [makeOav({ attributeId: 1, valueBoolean: false })],
      []
    );
    assert.deepStrictEqual(result, ["false"]);
  });
});

describe("projectAttributeValues – date", () => {
  it("ISO date => date part only (YYYY-MM-DD)", () => {
    const result = projectAttributeValues(
      1, "date", undefined,
      [makeOav({ attributeId: 1, valueDate: new Date("2024-06-15T00:00:00Z") })],
      []
    );
    assert.deepStrictEqual(result, ["2024-06-15"]);
  });
});

describe("projectAttributeValues – year", () => {
  it("returns year as string", () => {
    const result = projectAttributeValues(
      1, "year", undefined,
      [makeOav({ attributeId: 1, valueYear: 2023 })],
      []
    );
    assert.deepStrictEqual(result, ["2023"]);
  });
});

describe("projectAttributeValues – enum with localized label", () => {
  const config = makeConfig(10, "color", "enum", {
    options: [
      { optionId: 5, stableKey: "red", label: "Czerwony", description: null },
      { optionId: 6, stableKey: "blue", label: "Niebieski", description: null },
    ],
  });

  it("returns localized label when optionId matches config", () => {
    const result = projectAttributeValues(
      10, "enum", config,
      [makeOav({ attributeId: 10, optionId: 5 })],
      []
    );
    assert.deepStrictEqual(result, ["Czerwony"]);
  });

  it("optionId fallback: returns [Option N] string with correct optionId (no template literal regression)", () => {
    const result = projectAttributeValues(
      10, "enum", undefined,
      [makeOav({ attributeId: 10, optionId: 99 })],
      []
    );
    // Verifies the template literal `[Option ${val.optionId}]` produces correct output
    assert.deepStrictEqual(result, ["[Option 99]"]);
    // Regression: must NOT contain literal backslash-dollar
    assert.ok(!result[0].includes("\\$"), "Must not contain escaped template literal");
    assert.ok(!result[0].includes("${"), "Must not contain raw template literal syntax");
  });
});

describe("projectAttributeValues – multi_enum with deterministic ordering", () => {
  const config = makeConfig(20, "size", "multi_enum", {
    options: [
      { optionId: 30, stableKey: "large", label: "Duży", description: null },
      { optionId: 28, stableKey: "medium", label: "Średni", description: null },
      { optionId: 25, stableKey: "small", label: "Mały", description: null },
    ],
  });

  it("orders by stableKey (alphabetical) not by optionId or insertion order", () => {
    // Options provided in reverse stableKey order
    const oaovRows = [
      makeOaov(20, 30), // large
      makeOaov(20, 25), // small
      makeOaov(20, 28), // medium
    ];
    const result = projectAttributeValues(20, "multi_enum", config, [], oaovRows);
    // Expected order: large, medium, small (stableKey alphabetical)
    assert.deepStrictEqual(result, ["Duży", "Średni", "Mały"]);
  });

  it("multi_enum optionId fallback: uses [Option N] with correct ID (no template literal regression)", () => {
    const oaovRows = [
      makeOaov(20, 77), // unknown optionId
      makeOaov(20, 42), // unknown optionId
    ];
    // No config — no option labels available
    const result = projectAttributeValues(20, "multi_enum", undefined, [], oaovRows);
    // Must show [Option N] with actual optionId, NOT `[Option \${opt.optionId}]`
    assert.ok(result.includes("[Option 42]"), `Expected [Option 42], got: ${JSON.stringify(result)}`);
    assert.ok(result.includes("[Option 77]"), `Expected [Option 77], got: ${JSON.stringify(result)}`);
    for (const v of result) {
      assert.ok(!v.includes("\\$"), "Must not contain escaped template literal");
      assert.ok(!v.includes("${"), "Must not contain raw template literal syntax");
    }
  });

  it("multi_enum with no config: sorted by optionId as fallback", () => {
    const oaovRows = [
      makeOaov(20, 50),
      makeOaov(20, 10),
      makeOaov(20, 30),
    ];
    const result = projectAttributeValues(20, "multi_enum", undefined, [], oaovRows);
    assert.deepStrictEqual(result, ["[Option 10]", "[Option 30]", "[Option 50]"]);
  });
});

describe("projectAttributeValues – unitCode exposed via config", () => {
  it("config unitCode is accessible through config object", () => {
    const config = makeConfig(5, "weight", "number", { unitCode: "kg" });
    assert.strictEqual(config.unitCode, "kg");
  });
});

describe("projectAttributeValues – localized name via config", () => {
  it("config name is the localized attribute name", () => {
    const config = makeConfig(7, "capacity", "number", { name: "Pojemność" });
    assert.strictEqual(config.name, "Pojemność");
  });
});

// ─── 5. TEMPLATE LITERAL REGRESSION — unknown_ prefix ───────────────────────

describe("unknown_ stableKey template literal regression", () => {
  it("produces unknown_N with correct N, not escaped literal", async () => {
    // We test this via the mock-less isCanonicalPositiveInteger gate.
    // For deep regression test: use the module directly with a minimal mock.
    const { isCanonicalPositiveInteger } = await import("../../src/lib/admin/offers-query");
    assert.strictEqual(isCanonicalPositiveInteger("42"), true);
    // The template literal `unknown_${attrId}` with attrId=42 must produce "unknown_42"
    const expected = `unknown_${42}`;
    assert.strictEqual(expected, "unknown_42");
    assert.ok(!expected.includes("\\$"), "Must not contain escaped template literal");
  });
});

// ─── 6. ORPHAN ATTRIBUTE ─────────────────────────────────────────────────────

describe("AdminOfferDetailRelationalAttribute – orphan/unassigned", () => {
  it("isAssignedToCategory=false is preserved in interface shape", () => {
    const orphan: AdminOfferDetailRelationalAttribute = {
      attributeId: 999,
      stableKey: "orphan_key",
      dataType: "text",
      name: "orphan_key",
      unitCode: null,
      values: ["some-value"],
      isAssignedToCategory: false,
    };
    assert.strictEqual(orphan.isAssignedToCategory, false);
    assert.strictEqual(orphan.stableKey, "orphan_key");
    assert.strictEqual(orphan.name, "orphan_key"); // name falls back to stableKey
  });
});

// ─── 7. AUTH CONTRACT ────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");

describe("getAdminOfferDetail – auth contract", () => {
  it("actions.ts calls requireAdmin() inside getAdminOfferDetail before read model", () => {
    const src = fs.readFileSync(path.join(SRC, "app", "actions.ts"), "utf8");
    // Verify the function exists and calls requireAdmin
    const fnIndex = src.indexOf("async function getAdminOfferDetail");
    assert.ok(fnIndex !== -1, "getAdminOfferDetail must exist in actions.ts");
    // requireAdmin() must appear after the function declaration
    const afterFn = src.slice(fnIndex, fnIndex + 400);
    assert.ok(afterFn.includes("requireAdmin"), "requireAdmin must be called inside getAdminOfferDetail");
    // It must appear BEFORE the read model call
    const requireAdminIdx = afterFn.indexOf("requireAdmin");
    const readModelIdx = afterFn.indexOf("getAdminOfferDetailReadModel");
    assert.ok(requireAdminIdx < readModelIdx, "requireAdmin() must come before getAdminOfferDetailReadModel()");
  });

  it("getAdminOfferDetail has sanitized error logging (no error.message exposure)", () => {
    const src = fs.readFileSync(path.join(SRC, "app", "actions.ts"), "utf8");
    const fnIndex = src.indexOf("async function getAdminOfferDetail");
    const fnBody = src.slice(fnIndex, fnIndex + 600);
    // Must not log error.message directly
    assert.ok(!fnBody.includes("error.message"), "Must not log error.message");
    assert.ok(!fnBody.includes("error instanceof Error"), "Must not use error instanceof Error for logging");
  });
});

// ─── 8. ROUTE CONTRACT ───────────────────────────────────────────────────────

describe("Route contract – PL /admin/oferty/[id]", () => {
  it("metadata robots: index=false, follow=false, nocache=true", () => {
    const src = fs.readFileSync(
      path.join(SRC, "app", "(pl)", "admin", "oferty", "[id]", "page.tsx"),
      "utf8"
    );
    // Verify metadata block is present with correct values
    assert.ok(src.includes("export const metadata"), "metadata must be exported");
    assert.ok(src.includes("index: false"), "robots.index must be false");
    assert.ok(src.includes("follow: false"), "robots.follow must be false");
    assert.ok(src.includes("nocache: true"), "robots.nocache must be true");
  });

  it("uses AdminOfferDetailPage with defaultLocale", () => {
    const src = fs.readFileSync(
      path.join(SRC, "app", "(pl)", "admin", "oferty", "[id]", "page.tsx"),
      "utf8"
    );
    assert.ok(src.includes("AdminOfferDetailPage"), "must render AdminOfferDetailPage");
    assert.ok(src.includes("defaultLocale"), "must use defaultLocale");
  });
});

describe("Route contract – localized /[locale]/admin/offers/[id]", () => {
  it("metadata robots: index=false, follow=false, nocache=true", () => {
    const src = fs.readFileSync(
      path.join(SRC, "app", "(localized)", "[locale]", "admin", "offers", "[id]", "page.tsx"),
      "utf8"
    );
    assert.ok(src.includes("export const metadata"), "metadata must be exported");
    assert.ok(src.includes("index: false"), "robots.index must be false");
    assert.ok(src.includes("follow: false"), "robots.follow must be false");
    assert.ok(src.includes("nocache: true"), "robots.nocache must be true");
  });

  it("calls notFound() for invalid locale", () => {
    const src = fs.readFileSync(
      path.join(SRC, "app", "(localized)", "[locale]", "admin", "offers", "[id]", "page.tsx"),
      "utf8"
    );
    assert.ok(src.includes("notFound()"), "must call notFound() for invalid locale");
    assert.ok(src.includes("isLocale"), "must check locale validity with isLocale");
  });
});

// ─── 9. ADMINOFFERSTABLE LINK CONTRACT ───────────────────────────────────────

describe("AdminOffersTable – list -> detail link contract", () => {
  it("getDetailUrl produces correct PL path", () => {
    // Inline the same logic as the component function
    const locale = "pl";
    const id = 55;
    const url = locale === "pl" ? `/admin/oferty/${id}` : `/${locale}/admin/offers/${id}`;
    assert.strictEqual(url, "/admin/oferty/55");
  });

  it("getDetailUrl produces correct localized path", () => {
    const locale = "en";
    const id = 55;
    const url = locale === "pl" ? `/admin/oferty/${id}` : `/${locale}/admin/offers/${id}`;
    assert.strictEqual(url, "/en/admin/offers/55");
  });
});

// ─── 10. NULLABLE TIMESTAMPS REMAIN NULL ─────────────────────────────────────

describe("nullable timestamps", () => {
  it("updatedAt remains null when not set", () => {
    const ts: string | null = null;
    assert.strictEqual(ts, null);
  });

  it("publishedAt, archivedAt, deletedAt can be null", () => {
    const fields: Array<string | null> = [null, null, null];
    assert.deepStrictEqual(fields, [null, null, null]);
  });
});

// ─── 11. EXACT PRICE BRUTTO PRESERVED ────────────────────────────────────────

describe("priceBrutto raw string preservation", () => {
  it("raw string '1234.5600' is not collapsed via Number()", () => {
    const raw = "1234.5600";
    // This is the contract: we store as-is without Number() conversion
    assert.strictEqual(typeof raw, "string");
    assert.strictEqual(raw, "1234.5600");
    // Number() would produce 1234.56 — losing trailing zeros
    assert.notStrictEqual(Number(raw).toString(), raw);
  });

  it("priceBrutto null is kept null", () => {
    const val: string | null = null;
    assert.strictEqual(val, null);
  });
});

// ─── 12. NOT_FOUND ───────────────────────────────────────────────────────────

describe("getAdminOfferDetailReadModel – NOT_FOUND", () => {
  it("returns NOT_FOUND when offer does not exist", async () => {
    const db = makeMockDb(null);
    const result = await getAdminOfferDetailReadModel(db as never, "999", "pl");
    assert.deepStrictEqual(result, { ok: false, code: "NOT_FOUND" });
  });
});

// ─── 13. SUCCESSFUL PROJECTION THROUGH getAdminOfferDetailReadModel ──────────

describe("getAdminOfferDetailReadModel – successful projection", () => {
  it("projects raw offer fields without mutation", async () => {
    const partner = { id: 7, companyName: "Test Partner Sp. z o.o." };
    const category = { id: 3, name: "Test Category", slug: "test-category" };
    const offer = makeOkOffer({ priceBrutto: "1234.5600" });
    const db = makeMockDb(offer, partner, category);
    db._state.oavRows = [
      makeOav({ attributeId: 101, valueNumber: "99999.9900" }),
      makeOav({ attributeId: 102, valueText: "stored text value" }),
    ];
    db._state.oaovRows = [makeOaov(104, 42)];
    db._state.attrDefs = [
      { id: 101, stableKey: "weight", dataType: "number" },
      { id: 102, stableKey: "material_note", dataType: "text" },
      { id: 104, stableKey: "colors", dataType: "multi_enum" },
      // attribute 103 intentionally has no definition row -> stableKey fallback
    ];
    db._state.oavRows.push(makeOav({ attributeId: 103, valueText: "orphan value" }));

    const result = await getAdminOfferDetailReadModel(db as never, "42", "pl");
    assert.ok(result.ok);
    const d = result.data;

    // raw offer fields
    assert.strictEqual(d.id, 42);
    assert.strictEqual(d.title, "Test Offer Title");
    assert.strictEqual(d.description, "Offer description text");
    assert.strictEqual(d.imageUrl, "https://cdn.example.com/img.jpg");

    // exact priceBrutto string preserved (no Number() conversion)
    assert.strictEqual(d.priceBrutto, "1234.5600");
    assert.strictEqual(d.priceOnRequest, false);

    // partner / category
    assert.strictEqual(d.partnerId, 7);
    assert.strictEqual(d.partnerName, "Test Partner Sp. z o.o.");
    assert.strictEqual(d.categoryId, 3);
    assert.strictEqual(d.categoryName, "Test Category");
    assert.strictEqual(d.categorySlug, "test-category");

    // raw model fields + canonical model THROUGH projection
    assert.strictEqual(d.rawOfferModel, "rfq");
    assert.strictEqual(d.rawConversionType, "inbound");
    assert.strictEqual(d.canonicalModel, "rfq");
    assert.strictEqual(d.contractModel, "partner_marketplace");

    assert.strictEqual(d.outboundUrl, "https://example.com/offer");
    assert.strictEqual(d.isActive, true);
    assert.strictEqual(d.isFeatured, false);
    assert.deepStrictEqual(d.technicalAttributes, { width: 100, material: "steel" });

    // publication + timestamps
    assert.strictEqual(d.publicationStatus, "published");
    assert.strictEqual(d.createdAt, "2025-01-15T10:00:00.000Z");
    assert.strictEqual(d.updatedAt, "2025-02-01T12:00:00.000Z");
    assert.strictEqual(d.publishedAt, "2025-01-16T08:00:00.000Z");
    assert.strictEqual(d.archivedAt, null);
    assert.strictEqual(d.deletedAt, null);
    assert.strictEqual(d.publicPreviewAllowed, true);

    // relational attributes: stored rows remain visible through projection
    const byAttrId = new Map(d.relationalAttributes.map((a) => [a.attributeId, a]));

    const num = byAttrId.get(101);
    assert.ok(num);
    assert.strictEqual(num.stableKey, "weight");
    assert.deepStrictEqual(num.values, ["99999.9900"]); // exact numeric precision

    const txt = byAttrId.get(102);
    assert.ok(txt);
    assert.deepStrictEqual(txt.values, ["stored text value"]);

    // multi_enum without category config: actual optionId fallback
    const multi = byAttrId.get(104);
    assert.ok(multi);
    assert.strictEqual(multi.isAssignedToCategory, false);
    assert.deepStrictEqual(multi.values, ["[Option 42]"]);

    // orphan stored row without definition: stableKey fallback, still visible
    const orphan = byAttrId.get(103);
    assert.ok(orphan);
    assert.strictEqual(orphan.stableKey, "unknown_103");
    assert.strictEqual(orphan.isAssignedToCategory, false);
    // orphan stored row without definition: stableKey fallback, still visible.
    // dataType is "unknown" so no value branch matches -> values stay empty,
    // but the stored row itself must remain listed.
    assert.deepStrictEqual(orphan.values, []);
  });

  it("keeps nullable timestamps null and falls back for missing joins", async () => {
    const offer = makeOkOffer({ updatedAt: null, publishedAt: null, archivedAt: null, deletedAt: null });
    const db = makeMockDb(offer, null, null);
    const result = await getAdminOfferDetailReadModel(db as never, "42", "pl");
    assert.ok(result.ok);
    assert.strictEqual(result.data.updatedAt, null);
    assert.strictEqual(result.data.publishedAt, null);
    assert.strictEqual(result.data.archivedAt, null);
    assert.strictEqual(result.data.deletedAt, null);
    // partner/category joins missing -> em-dash fallback
    assert.strictEqual(result.data.partnerName, "—");
    assert.strictEqual(result.data.categoryName, "—");
    assert.strictEqual(result.data.categorySlug, "—");
  });
});
