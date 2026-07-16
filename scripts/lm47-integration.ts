import { readFileSync } from "node:fs";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Logger } from "drizzle-orm/logger";
import { Pool } from "pg";
import * as schema from "../src/lib/schema";
import { queryFilteredCategoryOffers } from "../src/lib/catalog/filter-query-core";
import { parseFilterQueryInput } from "../src/lib/filters/parser";
import { normalizeFilterQuery } from "../src/lib/filters/validation-core";

type QueryClass = "categories" | "validation" | "count" | "items";
type LoggedQuery = { query: string; params: unknown[]; queryClass: QueryClass };
type MatrixRecord = {
  id: string;
  assertionId: string;
  group: string;
  input: unknown;
  expectedResult: "success" | "error";
  expectedErrorCodes: string[] | null;
  expectedOfferIds: number[] | null;
  expectedTotal: number | null;
  expectedQueryCount: number;
  independentFailure: true;
  expectedQueryClasses?: QueryClass[];
  before?: () => Promise<void>;
  verify?: (result: Awaited<ReturnType<typeof invoke>>, entries: LoggedQuery[]) => Promise<void> | void;
};

function classify(query: string): QueryClass {
  if (/WITH requested_attributes/i.test(query)) return "validation";
  if (/from "categories"/i.test(query)) return "categories";
  if (/count\(\*\)/i.test(query)) return "count";
  return "items";
}

class SqlLogger implements Logger {
  entries: LoggedQuery[] = [];
  logQuery(query: string, params: unknown[]) {
    const normalized = query.replace(/\s+/g, " ").trim();
    this.entries.push({ query: normalized, params: [...params], queryClass: classify(normalized) });
  }
  reset() { this.entries = []; }
}

const url = process.env.DATABASE_URL;
if (!url || !/^postgres:\/\/[^@/]+@(?:localhost|127\.0\.0\.1):\d+\//.test(url)) {
  throw new Error("Disposable localhost DATABASE_URL required");
}
const logger = new SqlLogger();
const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema, logger });
let failures = 0;
const executed = new Set<string>();
const runtimeReached = new Set<string>();
let scaleOffers = 0;
let scaleBaseline: { count: number; classes: QueryClass[] } | null = null;

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function equal(actual: unknown, expected: unknown, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}; expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonical((value as Record<string, unknown>)[key])]));
  }
  return value;
}
function equalObject(actual: unknown, expected: unknown, message: string) {
  equal(canonical(actual), canonical(expected), message);
}
function flatten(values: unknown[]): unknown[] {
  return values.flatMap((value) => Array.isArray(value) ? flatten(value) : [value]);
}
const q0: QueryClass[] = [];
const q1: QueryClass[] = ["categories"];
const q2: QueryClass[] = ["categories", "validation"];
const q3: QueryClass[] = ["categories", "count", "items"];
const q4: QueryClass[] = ["categories", "validation", "count", "items"];

function record(
  id: string,
  group: string,
  input: unknown,
  expectedResult: "success" | "error",
  expectedErrorCodes: string[] | null,
  expectedOfferIds: number[] | null,
  expectedTotal: number | null,
  expectedQueryCount: number,
  expectedQueryClasses: QueryClass[],
  verify?: MatrixRecord["verify"],
  before?: MatrixRecord["before"],
): MatrixRecord {
  return {
    id,
    assertionId: `LM47B-${id}`,
    group,
    input,
    expectedResult,
    expectedErrorCodes,
    expectedOfferIds,
    expectedTotal,
    expectedQueryCount,
    expectedQueryClasses,
    independentFailure: true,
    verify,
    before,
  };
}

async function seed() {
  await db.execute(sql`INSERT INTO partners (id, company_name, logo_url, website_url, contact_email)
    VALUES (1, 'LM47 Partner', 'https://example.test/logo.png', 'https://example.test', 'lm47@example.test')`);
  await db.execute(sql`INSERT INTO categories (id, name, slug, parent_id) VALUES
    (1,'Root','root',NULL),(2,'Child','child',1),(3,'Other','other',NULL),
    (4,'Legacy Root','legacy-root',NULL),(5,'Legacy Child','legacy-child',4)`);
  await db.execute(sql`INSERT INTO attribute_definitions (id,stable_key,data_type,is_active) VALUES
    (11,'color','enum',true),(12,'features','multi_enum',true),(13,'capacity','number',true),
    (14,'year','year',true),(15,'available','boolean',true),(16,'hidden_filter','number',true),
    (17,'disabled_filter','number',true),(18,'inactive','number',false),(19,'unassigned','number',true)`);
  await db.execute(sql`INSERT INTO category_attribute_assignments (category_id,attribute_definition_id,is_filterable,is_visible) VALUES
    (1,11,true,true),(1,12,true,true),(1,13,true,true),(1,14,true,true),(1,15,true,true),
    (1,16,true,false),(1,17,false,true),(1,18,true,true)`);
  await db.execute(sql`INSERT INTO controlled_option_values (id,attribute_id,stable_key,is_active) VALUES
    (101,11,'red',true),(102,11,'blue',true),(103,11,'inactive',false),(201,12,'wifi',true),(202,12,'gps',true)`);
  await db.execute(sql`INSERT INTO offers
    (id,partner_id,category_id,title,description,image_url,price_brutto,price_on_request,offer_model,conversion_type,outbound_url,is_featured,is_active,publication_status,technical_attributes,created_at)
    VALUES
    (108,1,1,'Tie RFQ','RFQ description','https://example.test/rfq.png',NULL,true,'rfq','rfq',NULL,true,true,'published','{"workflow":"rfq"}','2025-01-01T00:00:00Z'),
    (109,1,1,'Tie Ecommerce','Ecommerce description','https://example.test/ecommerce.png',100.00,false,'ecommerce','ecommerce',NULL,true,true,'published','{"workflow":"ecommerce"}','2025-01-01T00:00:00Z'),
    (110,1,1,'Tie Outbound','Outbound description','https://example.test/outbound.png',0.00,false,'outbound','outbound','https://example.test/go',true,true,'published','{"workflow":"outbound"}','2025-01-01T00:00:00Z'),
    (111,1,1,'Blue',NULL,NULL,NULL,true,'rfq','rfq',NULL,false,true,'published','{}','2024-01-01T00:00:00Z'),
    (112,1,2,'Child',NULL,NULL,NULL,true,'rfq','rfq',NULL,false,true,'published','{}','2023-01-01T00:00:00Z'),
    (113,1,1,'Inactive',NULL,NULL,NULL,true,'rfq','rfq',NULL,false,false,'published','{}','2026-01-01T00:00:00Z'),
    (114,1,1,'Draft',NULL,NULL,NULL,true,'rfq','rfq',NULL,false,true,'draft','{}','2026-01-01T00:00:00Z'),
    (115,1,3,'Other',NULL,NULL,NULL,true,'rfq','rfq',NULL,false,true,'published','{}','2026-01-01T00:00:00Z'),
    (116,1,1,'Hidden',NULL,NULL,NULL,true,'rfq','rfq',NULL,false,true,'hidden','{}','2026-01-01T00:00:00Z'),
    (117,1,4,'Legacy Featured',NULL,NULL,NULL,true,'rfq','rfq',NULL,true,true,'published','{}','2024-04-01T00:00:00Z'),
    (118,1,5,'Legacy Child',NULL,NULL,NULL,true,'rfq','rfq',NULL,false,true,'published','{}','2023-04-01T00:00:00Z'),
    (119,1,4,'Legacy Older',NULL,NULL,NULL,true,'rfq','rfq',NULL,false,true,'published','{}','2022-04-01T00:00:00Z')`);
  await db.execute(sql`INSERT INTO offer_attribute_values (offer_id,attribute_id,option_id) VALUES
    (108,11,101),(109,11,101),(110,11,101),(111,11,102),(112,11,101),(116,11,101)`);
  await db.execute(sql`INSERT INTO offer_attribute_option_values (offer_id,attribute_id,option_id) VALUES
    (108,12,201),(109,12,202),(110,12,201),(110,12,202),(116,12,201)`);
  await db.execute(sql`INSERT INTO offer_attribute_values (offer_id,attribute_id,value_number) VALUES
    (108,13,2000),(109,13,2000),(110,13,2000),(111,13,1000),(112,13,1500),(116,13,2000),(108,16,1),(108,17,1)`);
  await db.execute(sql`INSERT INTO offer_attribute_values (offer_id,attribute_id,value_year) VALUES
    (108,14,2020),(109,14,2021),(110,14,2022),(111,14,2019),(112,14,2023),(116,14,2020)`);
  await db.execute(sql`INSERT INTO offer_attribute_values (offer_id,attribute_id,value_boolean) VALUES
    (108,15,true),(109,15,false),(110,15,true),(111,15,false),(112,15,false),(116,15,true)`);
}

async function invoke(input: unknown) {
  const parsed = parseFilterQueryInput(input);
  if (!parsed.ok) return { ok: false as const, errors: parsed.errors.map((code) => ({ code })) };
  const normalized = normalizeFilterQuery(parsed.value);
  if (!normalized.ok) return normalized;
  return queryFilteredCategoryOffers(db, normalized.value);
}

function catalog(row: { offer: typeof schema.offers.$inferSelect; category: typeof schema.categories.$inferSelect | null; partner: typeof schema.partners.$inferSelect | null }) {
  return {
    id: row.offer.id, title: row.offer.title, description: row.offer.description, imageUrl: row.offer.imageUrl,
    priceBrutto: row.offer.priceBrutto, priceOnRequest: row.offer.priceOnRequest, conversionType: row.offer.conversionType,
    offerModel: row.offer.offerModel, outboundUrl: row.offer.outboundUrl, isFeatured: row.offer.isFeatured,
    isActive: row.offer.isActive, technicalAttributes: row.offer.technicalAttributes ?? {},
    categoryName: row.category?.name ?? "Bez kategorii", categorySlug: row.category?.slug ?? "",
    partnerId: row.partner?.id ?? 0, partnerName: row.partner?.companyName ?? "Partner",
    partnerLogo: row.partner?.logoUrl ?? null, partnerWebsite: row.partner?.websiteUrl ?? null,
    partnerEmail: row.partner?.contactEmail ?? "", publicationStatus: row.offer.publicationStatus,
  };
}

function expectedProjection(id: 108 | 109 | 110) {
  const common = {
    id, isFeatured: true, isActive: true, categoryName: "Root", categorySlug: "root",
    partnerId: 1, partnerName: "LM47 Partner", partnerLogo: "https://example.test/logo.png",
    partnerWebsite: "https://example.test", partnerEmail: "lm47@example.test", publicationStatus: "published",
  };
  if (id === 108) return { ...common, title: "Tie RFQ", description: "RFQ description", imageUrl: "https://example.test/rfq.png", priceBrutto: null, priceOnRequest: true, conversionType: "rfq", offerModel: "rfq", outboundUrl: null, technicalAttributes: { workflow: "rfq" } };
  if (id === 109) return { ...common, title: "Tie Ecommerce", description: "Ecommerce description", imageUrl: "https://example.test/ecommerce.png", priceBrutto: "100.00", priceOnRequest: false, conversionType: "ecommerce", offerModel: "ecommerce", outboundUrl: null, technicalAttributes: { workflow: "ecommerce" } };
  return { ...common, title: "Tie Outbound", description: "Outbound description", imageUrl: "https://example.test/outbound.png", priceBrutto: "0.00", priceOnRequest: false, conversionType: "outbound", offerModel: "outbound", outboundUrl: "https://example.test/go", technicalAttributes: { workflow: "outbound" } };
}

// Independent reference query: it does not import the filter engine, its predicates or its order helper.
async function legacyOracle(categoryId: number) {
  const allCategories = await db.select({ id: schema.categories.id, parentId: schema.categories.parentId }).from(schema.categories);
  const scope = new Set<number>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of allCategories) {
      if (category.parentId !== null && scope.has(category.parentId) && !scope.has(category.id)) {
        scope.add(category.id);
        changed = true;
      }
    }
  }
  const rows = await db.select({ offer: schema.offers, category: schema.categories, partner: schema.partners })
    .from(schema.offers)
    .leftJoin(schema.categories, eq(schema.offers.categoryId, schema.categories.id))
    .leftJoin(schema.partners, eq(schema.offers.partnerId, schema.partners.id))
    .where(and(eq(schema.offers.isActive, true), eq(schema.offers.publicationStatus, "published"), inArray(schema.offers.categoryId, [...scope])))
    .orderBy(desc(schema.offers.isFeatured), desc(schema.offers.createdAt));
  return rows.map(catalog);
}

async function addScaleOffers(target: number) {
  for (let index = scaleOffers; index < target; index++) {
    const id = 3000 + index;
    await db.execute(sql`INSERT INTO offers (id,partner_id,category_id,title,offer_model,conversion_type,is_featured,is_active,publication_status,technical_attributes,created_at)
      VALUES (${id},1,1,${`Scale ${id}`},'rfq','rfq',false,true,'published','{}','2020-01-01T00:00:00Z')`);
    await db.execute(sql`INSERT INTO offer_attribute_values (offer_id,attribute_id,option_id) VALUES (${id},11,101)`);
  }
  scaleOffers = target;
}

async function execute(record: MatrixRecord) {
  try {
    assert(record.independentFailure === true, "independentFailure must be true");
    if (record.before) await record.before();
    logger.reset();
    const result = await invoke(record.input);
    const entries = [...logger.entries];
    const classes = entries.map((entry) => entry.queryClass);
    equal(entries.length, record.expectedQueryCount, `${record.id} query count`);
    equal(classes, record.expectedQueryClasses ?? [], `${record.id} query class sequence`);
    if (record.expectedResult === "error") {
      assert(!result.ok, `${record.id} expected an error`);
      equal(result.errors.map((error) => error.code), record.expectedErrorCodes, `${record.id} error codes`);
    } else {
      assert(result.ok, `${record.id} unexpected errors ${JSON.stringify(result)}`);
      const ids = result.rows.map((row) => row.offer.id);
      if (record.expectedOfferIds !== null) equal(ids, record.expectedOfferIds, `${record.id} ordered ids`);
      if (record.expectedTotal !== null) equal(result.total, record.expectedTotal, `${record.id} total`);
    }
    if (record.verify) await record.verify(result, entries);
    runtimeReached.add(record.id);
    executed.add(record.id);
    console.log(`${record.id}|PASS|assertion=${record.assertionId}|queries=${entries.length}|classes=${classes.join(",")}`);
  } catch (error) {
    executed.add(record.id);
    failures++;
    console.log(`${record.id}|FAIL|assertion=${record.assertionId}|${error instanceof Error ? error.message : String(error)}`);
  }
}

const matrix: MatrixRecord[] = [
  record("R01", "runtime", null, "error", ["INVALID_INPUT"], null, null, 0, q0),
  record("R02", "runtime", [], "error", ["INVALID_INPUT"], null, null, 0, q0),
  record("R03", "category-id", { categoryId: -1 }, "error", ["INVALID_IDENTIFIER"], null, null, 0, q0),
  record("R04", "category-id", { categoryId: 1.5 }, "error", ["INVALID_IDENTIFIER"], null, null, 0, q0),
  record("R05", "category-id", { categoryId: Number.NaN }, "error", ["INVALID_IDENTIFIER"], null, null, 0, q0),
  record("R06", "category-id", { categoryId: Infinity }, "error", ["INVALID_IDENTIFIER"], null, null, 0, q0),
  ...[0, -1, 1.5, Number.NaN, Infinity].map((attributeId, index) =>
    record(`R${String(7 + index).padStart(2, "0")}`, "attribute-id", { categoryId: 1, numbers: [{ attributeId, min: 1 }] }, "error", ["INVALID_IDENTIFIER"], null, null, 0, q0)),
  ...[0, -1, 1.5, Number.NaN, Infinity].map((optionId, index) =>
    record(`R${String(12 + index).padStart(2, "0")}`, "option-id", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [optionId] }] }, "error", ["INVALID_IDENTIFIER"], null, null, 0, q0)),
  record("R17", "primitive", { categoryId: 1, booleans: [{ attributeId: 15, value: "true" }] }, "error", ["INVALID_INPUT"], null, null, 0, q0),
  record("R18", "primitive", { categoryId: 1, numbers: [{ attributeId: 13, min: "100" }] }, "error", ["INVALID_INPUT"], null, null, 0, q0),
  record("R19", "primitive", { categoryId: 1, numbers: [{ attributeId: 13, max: "200" }] }, "error", ["INVALID_INPUT"], null, null, 0, q0),
  record("R20", "primitive", { categoryId: 1, years: [{ attributeId: 14, min: "2020" }] }, "error", ["INVALID_INPUT"], null, null, 0, q0),
  ...[0, -1, 1.5, Number.NaN, Infinity].map((page, index) =>
    record(`R${String(21 + index).padStart(2, "0")}`, "pagination-page", { categoryId: 1, page, pageSize: 1 }, "error", ["INVALID_PAGINATION"], null, null, 0, q0)),
  ...[0, -1, 1.5, Number.NaN, Infinity, 101].map((pageSize, index) =>
    record(`R${String(26 + index).padStart(2, "0")}`, "pagination-size", { categoryId: 1, page: 1, pageSize }, "error", ["INVALID_PAGINATION"], null, null, 0, q0)),
  record("R32", "controlled", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [] }] }, "error", ["EMPTY_OPTION_ARRAY"], null, null, 0, q0),
  record("R33", "duplicate", { categoryId: 1, numbers: [{ attributeId: 13, min: 1 }], years: [{ attributeId: 13, min: 2020 }] }, "error", ["DUPLICATE_ATTRIBUTE_FILTER"], null, null, 0, q0),
  record("R34", "multiple-error-order", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }, { attributeId: 11, optionIds: [102] }, { attributeId: 12, optionIds: [] }], numbers: [{ attributeId: 13 }], years: [{ attributeId: 14, min: 2021, max: 2020 }] }, "error", ["DUPLICATE_ATTRIBUTE_FILTER", "EMPTY_OPTION_ARRAY", "INVALID_NUMERIC_BOUNDS", "INVALID_YEAR_BOUNDS"], null, null, 0, q0),
  record("R35", "numeric-bounds", { categoryId: 1, numbers: [{ attributeId: 13 }] }, "error", ["INVALID_NUMERIC_BOUNDS"], null, null, 0, q0),
  record("R36", "numeric-bounds", { categoryId: 1, numbers: [{ attributeId: 13, min: 4, max: 3 }] }, "error", ["INVALID_NUMERIC_BOUNDS"], null, null, 0, q0),
  ...[{ min: Number.NaN }, { max: Number.NaN }, { min: Infinity }, { max: Infinity }, { min: -Infinity }, { max: -Infinity }].map((bounds, index) =>
    record(`R${String(37 + index).padStart(2, "0")}`, "numeric-non-finite", { categoryId: 1, numbers: [{ attributeId: 13, ...bounds }] }, "error", ["NON_FINITE_NUMBER"], null, null, 0, q0)),
  record("R43", "year-bounds", { categoryId: 1, years: [{ attributeId: 14 }] }, "error", ["INVALID_YEAR_BOUNDS"], null, null, 0, q0),
  record("R44", "year-bounds", { categoryId: 1, years: [{ attributeId: 14, min: 2022, max: 2021 }] }, "error", ["INVALID_YEAR_BOUNDS"], null, null, 0, q0),
  record("R45", "year-bounds", { categoryId: 1, years: [{ attributeId: 14, min: 2020.5 }] }, "error", ["INVALID_YEAR_BOUNDS"], null, null, 0, q0),
  record("R46", "year-bounds", { categoryId: 1, years: [{ attributeId: 14, max: 2020.5 }] }, "error", ["INVALID_YEAR_BOUNDS"], null, null, 0, q0),
  ...[{ min: Number.NaN }, { min: Infinity }, { max: -Infinity }].map((bounds, index) =>
    record(`R${String(47 + index).padStart(2, "0")}`, "year-non-finite", { categoryId: 1, years: [{ attributeId: 14, ...bounds }] }, "error", ["INVALID_YEAR_BOUNDS"], null, null, 0, q0)),
  record("R50", "category", { categoryId: 999 }, "error", ["UNKNOWN_CATEGORY"], null, null, 1, q1),
  record("R51", "category", { categoryId: 999, numbers: [{ attributeId: 13, min: 1 }] }, "error", ["UNKNOWN_CATEGORY"], null, null, 1, q1),
  record("R52", "configuration", { categoryId: 1, numbers: [{ attributeId: 999, min: 1 }] }, "error", ["UNKNOWN_ATTRIBUTE"], null, null, 2, q2),
  record("R53", "configuration", { categoryId: 1, numbers: [{ attributeId: 18, min: 1 }] }, "error", ["INACTIVE_ATTRIBUTE"], null, null, 2, q2),
  record("R54", "configuration", { categoryId: 1, numbers: [{ attributeId: 19, min: 1 }] }, "error", ["ATTRIBUTE_NOT_ASSIGNED"], null, null, 2, q2),
  record("R55", "configuration", { categoryId: 1, numbers: [{ attributeId: 17, min: 1 }] }, "error", ["INACTIVE_ASSIGNMENT"], null, null, 2, q2),
  record("R56", "assignment-visible", { categoryId: 1, numbers: [{ attributeId: 16, min: 1 }] }, "success", null, [108], 1, 4, q4),
  record("R57", "configuration", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [999] }] }, "error", ["UNKNOWN_OPTION"], null, null, 2, q2),
  record("R58", "configuration", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [201] }] }, "error", ["OPTION_WRONG_ATTRIBUTE"], null, null, 2, q2),
  record("R59", "configuration", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [103] }] }, "error", ["INACTIVE_OPTION"], null, null, 2, q2),
  record("R60", "configuration", { categoryId: 1, numbers: [{ attributeId: 11, min: 1 }] }, "error", ["INCOMPATIBLE_FILTER_TYPE"], null, null, 2, q2),
  record("R61", "catalog", { categoryId: 1 }, "success", null, [110, 109, 108, 111, 112], 5, 3, q3, async (result) => {
    assert(result.ok, "base catalog result");
    const ids = result.rows.map((row) => row.offer.id);
    assert(!ids.includes(113) && !ids.includes(114) && !ids.includes(116), "inactive, draft and hidden offers must be excluded");
  }),
  record("R62", "controlled-enum", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }] }, "success", null, [110, 109, 108, 112], 4, 4, q4),
  record("R63", "controlled-dedupe", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [102, 101, 101] }] }, "success", null, [110, 109, 108, 111, 112], 5, 4, q4),
  record("R64", "multi-enum-or", { categoryId: 1, controlled: [{ attributeId: 12, optionIds: [201, 202] }] }, "success", null, [110, 109, 108], 3, 4, q4),
  record("R65", "zero-matches", { categoryId: 1, numbers: [{ attributeId: 13, min: 3000 }] }, "success", null, [], 0, 4, q4),
  record("R66", "numeric", { categoryId: 1, numbers: [{ attributeId: 13, min: 2000 }] }, "success", null, [110, 109, 108], 3, 4, q4),
  record("R67", "numeric", { categoryId: 1, numbers: [{ attributeId: 13, max: 1500 }] }, "success", null, [111, 112], 2, 4, q4),
  record("R68", "numeric-closed", { categoryId: 1, numbers: [{ attributeId: 13, min: 1500, max: 2000 }] }, "success", null, [110, 109, 108, 112], 4, 4, q4),
  record("R69", "numeric-exact", { categoryId: 1, numbers: [{ attributeId: 13, min: 2000, max: 2000 }] }, "success", null, [110, 109, 108], 3, 4, q4),
  record("R70", "year", { categoryId: 1, years: [{ attributeId: 14, min: 2021 }] }, "success", null, [110, 109, 112], 3, 4, q4),
  record("R71", "year", { categoryId: 1, years: [{ attributeId: 14, max: 2019 }] }, "success", null, [111], 1, 4, q4),
  record("R72", "year-exact", { categoryId: 1, years: [{ attributeId: 14, min: 2020, max: 2020 }] }, "success", null, [108], 1, 4, q4),
  record("R73", "year-closed", { categoryId: 1, years: [{ attributeId: 14, min: 2020, max: 2022 }] }, "success", null, [110, 109, 108], 3, 4, q4),
  record("R74", "boolean", { categoryId: 1, booleans: [{ attributeId: 15, value: true }] }, "success", null, [110, 108], 2, 4, q4),
  record("R75", "boolean", { categoryId: 1, booleans: [{ attributeId: 15, value: false }] }, "success", null, [109, 111, 112], 3, 4, q4),
  record("R76", "combined", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }, { attributeId: 12, optionIds: [202] }], numbers: [{ attributeId: 13, min: 2000 }], years: [{ attributeId: 14, min: 2021 }], booleans: [{ attributeId: 15, value: true }] }, "success", null, [110], 1, 4, q4),
  record("R77", "pagination", { categoryId: 1, page: 2, pageSize: 2 }, "success", null, [108, 111], 5, 3, q3),
  record("R78", "category-boundary", { categoryId: 3 }, "success", null, [115], 1, 3, q3),
  record("R79", "rfq-projection", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }] }, "success", null, [110, 109, 108, 112], 4, 4, q4, (result) => {
    assert(result.ok, "R79 result");
    const actual = catalog(result.rows.find((row) => row.offer.id === 108)!);
    equal(Object.keys(actual).sort(), Object.keys(expectedProjection(108)).sort(), "RFQ projection keys");
    equalObject(actual, expectedProjection(108), "RFQ full projection");
  }),
  record("R80", "ecommerce-projection", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }] }, "success", null, [110, 109, 108, 112], 4, 4, q4, (result) => {
    assert(result.ok, "R80 result");
    equalObject(catalog(result.rows.find((row) => row.offer.id === 109)!), expectedProjection(109), "ecommerce full projection");
  }),
  record("R81", "outbound-projection", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }] }, "success", null, [110, 109, 108, 112], 4, 4, q4, (result) => {
    assert(result.ok, "R81 result");
    equalObject(catalog(result.rows.find((row) => row.offer.id === 110)!), expectedProjection(110), "outbound full projection");
  }),
  record("R82", "legacy-oracle", { categoryId: 4 }, "success", null, [117, 118, 119], 3, 3, q3, async (result) => {
    assert(result.ok, "R82 result");
    const oracle = await legacyOracle(4);
    equal(result.rows.map(catalog), oracle, "independent legacy catalog equivalence");
  }),
  record("R83", "stable-ties", { categoryId: 1 }, "success", null, [110, 109, 108, 111, 112], 5, 3, q3),
  record("R84", "no-duplicates", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }, { attributeId: 12, optionIds: [201, 202] }], numbers: [{ attributeId: 13, min: 1500 }], years: [{ attributeId: 14, min: 2020 }], booleans: [{ attributeId: 15, value: true }] }, "success", null, [110, 108], 2, 4, q4, (result) => {
    assert(result.ok, "R84 result");
    const ids = result.rows.map((row) => row.offer.id);
    assert(ids.length === new Set(ids).size, "duplicate catalog rows");
  }),
  record("R85", "logger-params", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101, 102] }] }, "success", null, [110, 109, 108, 111, 112], 5, 4, q4, (_result, entries) => {
    const validation = entries.find((entry) => entry.queryClass === "validation");
    assert(validation, "validation query missing");
    assert(!/\b101\b|\b102\b/.test(validation.query), "controlled option IDs rendered into SQL");
    const params = flatten(validation.params);
    assert(params.includes(101) && params.includes(102) && params.includes(11), "controlled identifiers missing from query params");
  }),
  record("R86", "option-count-independence", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }] }, "success", null, [110, 109, 108, 112], 4, 4, q4),
  record("R87", "option-count-independence", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101, 102] }] }, "success", null, [110, 109, 108, 111, 112], 5, 4, q4),
  record("R88", "filter-count-independence", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }, { attributeId: 12, optionIds: [201] }] }, "success", null, [110, 108], 2, 4, q4),
  record("R89", "filter-count-independence", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }], numbers: [{ attributeId: 13, min: 2000 }], years: [{ attributeId: 14, min: 2020 }], booleans: [{ attributeId: 15, value: true }] }, "success", null, [110, 108], 2, 4, q4),
  record("R90", "offer-count-independence", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }] }, "success", null, null, null, 4, q4, (_result, entries) => {
    scaleBaseline = { count: entries.length, classes: entries.map((entry) => entry.queryClass) };
  }, () => addScaleOffers(10)),
  record("R91", "offer-count-independence", { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }] }, "success", null, null, null, 4, q4, (_result, entries) => {
    assert(scaleBaseline !== null, "missing scale baseline");
    equal({ count: entries.length, classes: entries.map((entry) => entry.queryClass) }, scaleBaseline, "offer-count query independence");
  }, () => addScaleOffers(100)),
];

async function auditMatrix() {
  const ids = matrix.map((entry) => entry.id);
  const assertionIds = matrix.map((entry) => entry.assertionId);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const duplicateAssertionIds = assertionIds.filter((id, index) => assertionIds.indexOf(id) !== index);
  const source = readFileSync(new URL(import.meta.url), "utf8");
  const unconditionalPassFindings = (source.match(/console\.log\([^\n]*\|PASS\|/g) ?? []).filter((line) => !line.includes("record.id")).length;
  assert(duplicateIds.length === 0, `duplicate matrix ids: ${duplicateIds}`);
  assert(duplicateAssertionIds.length === 0, `duplicate assertion ids: ${duplicateAssertionIds}`);
  assert(matrix.every((entry) => entry.independentFailure), "independentFailure guard");
  for (const entry of matrix) await execute(entry);
  const missing = ids.filter((id) => !executed.has(id));
  const unknown = [...executed].filter((id) => !ids.includes(id));
  const notReached = ids.filter((id) => !runtimeReached.has(id));
  console.log(`LM47_MATRIX_RECORDS=${matrix.length}`);
  console.log(`LM47_EXECUTED_RECORDS=${executed.size}`);
  console.log(`LM47_UNIQUE_IDS=${new Set(ids).size}`);
  console.log(`LM47_UNIQUE_ASSERTION_IDS=${new Set(assertionIds).size}`);
  console.log(`LM47_MISSING_IDS=${missing.length}`);
  console.log(`LM47_UNKNOWN_IDS=${unknown.length}`);
  console.log(`LM47_DUPLICATE_IDS=${duplicateIds.length}`);
  console.log(`LM47_DUPLICATE_ASSERTION_IDS=${duplicateAssertionIds.length}`);
  console.log(`LM47_RUNTIME_ASSERTIONS_MISSED=${notReached.length}`);
  console.log(`LM47_UNCONDITIONAL_PASS_FINDINGS=${unconditionalPassFindings}`);
  assert(missing.length === 0 && unknown.length === 0 && notReached.length === 0 && unconditionalPassFindings === 0, "matrix authenticity audit");
}

async function main() {
  await seed();
  await auditMatrix();
  await pool.end();
  if (failures) process.exit(1);
}
main().catch(async (error) => { console.error(error); await pool.end(); process.exit(1); });
