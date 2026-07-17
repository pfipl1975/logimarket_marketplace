import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Logger } from "drizzle-orm/logger";
import { Pool } from "pg";
import * as schema from "../src/lib/schema";
import {
  MAX_CATEGORY_ANCESTRY_DEPTH,
  assertCatalogFilterConfigurationDTO,
  assertPlainJsonDTO,
  getCatalogFilterConfigurationCore,
  parsePositiveSafeId,
} from "../src/lib/filters/configuration-core";
import { CatalogFilterConfigurationError } from "../src/lib/filters/configuration-types";

type QueryClass = "configuration" | "options" | "forbidden";
type LoggedQuery = { query: string; params: unknown[]; queryClass: QueryClass };
type Result = Awaited<ReturnType<typeof getCatalogFilterConfigurationCore>>;
type MatrixRecord = {
  id: string; assertionId: string; input: { categoryId: unknown; locale: unknown }; expected: "result" | "null" | "error";
  expectedCode: string | null; expectedFilterIds: number[] | null; expectedQueryCount: number; expectedClasses: QueryClass[];
  independentFailure: true; before?: () => Promise<void>; verify?: (result: Result, entries: LoggedQuery[]) => void;
};

function classify(query: string): QueryClass {
  if (/\bfrom\s+"?(offers|offer_attribute)/i.test(query)) return "forbidden";
  if (/WITH RECURSIVE/i.test(query)) return "configuration";
  return "options";
}
class SqlLogger implements Logger {
  entries: LoggedQuery[] = [];
  logQuery(query: string, params: unknown[]): void { this.entries.push({ query: query.replace(/\s+/g, " ").trim(), params: [...params], queryClass: classify(query) }); }
  reset() { this.entries = []; }
}

const url = process.env.DATABASE_URL;
if (!url || !/^postgres:\/\/[^@/]+@(?:localhost|127\.0\.0\.1):\d+\//.test(url)) throw new Error("Disposable localhost DATABASE_URL required");
const logger = new SqlLogger();
const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema, logger });
const executed = new Set<string>();
const reached = new Set<string>();
let failures = 0;

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function equal(actual: unknown, expected: unknown, message: string) { assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}; expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
function ids(result: Result) { return result?.filters.map((filter) => filter.attributeId) ?? []; }

async function seed() {
  await db.execute(sql`TRUNCATE controlled_option_value_translations, attribute_definition_translations, controlled_option_values, category_attribute_assignments, attribute_definitions, categories CASCADE`);
  await db.execute(sql`INSERT INTO categories (id,name,slug,parent_id) VALUES
    (1,'Root','root',NULL),(2,'Parent','parent',1),(3,'Child','child',2),(4,'Sibling','sibling',2),(5,'Descendant','descendant',3),(6,'Empty','empty',NULL),(7,'Scalar','scalar',NULL)`);
  await db.execute(sql`INSERT INTO attribute_definitions (id,stable_key,data_type,is_active) VALUES
    (100,'root-enum','enum',true),(101,'root-number','number',true),(102,'parent-year','year',true),
    (103,'child-boolean','boolean',true),(104,'hidden-filter','enum',true),(105,'text','text',true),
    (106,'empty-enum','enum',true),(107,'inactive-enum','enum',false),(108,'multi','multi_enum',true),(109,'sibling-only','enum',true),(110,'other-option','enum',true)`);
  await db.execute(sql`INSERT INTO category_attribute_assignments (category_id,attribute_definition_id,sort_order,is_filterable,is_visible,unit_code) VALUES
    (1,100,50,true,true,'root-unit'),(1,101,9,true,true,'kg'),(2,102,20,true,true,'year'),
    (3,103,10,true,true,NULL),(3,104,0,true,false,NULL),(3,105,1,true,true,NULL),(3,106,2,true,true,NULL),
    (3,107,3,true,true,NULL),(3,108,10,true,true,NULL),(4,109,1,true,true,NULL),(3,110,11,true,true,NULL),(7,101,1,true,true,'kg')`);
  await db.execute(sql`INSERT INTO controlled_option_values (id,attribute_id,stable_key,is_active) VALUES
    (501,100,'zeta',true),(502,100,'alpha',true),(503,100,'inactive',false),(541,104,'hidden-option',true),
    (581,108,'multi-z',true),(582,108,'multi-a',true),(591,109,'sibling-option',true),(601,110,'other',true)`);
  await db.execute(sql`INSERT INTO attribute_definition_translations (attribute_definition_id,locale,name) VALUES
    (100,'pl','Główny'),(100,'en','Root'),(104,'pl','Ukryty filtr'),(104,'en','Hidden filter'),(108,'pl','Wiele')`);
  await db.execute(sql`INSERT INTO controlled_option_value_translations (controlled_option_value_id,locale,label) VALUES
    (501,'pl','Zeta PL'),(501,'en','Zeta EN'),(502,'pl','Alfa PL'),(541,'pl','Ukryta')`);
}

function record(id: string, input: MatrixRecord["input"], expected: MatrixRecord["expected"], expectedCode: string | null, expectedFilterIds: number[] | null, expectedQueryCount: number, expectedClasses: QueryClass[], verify?: MatrixRecord["verify"], before?: MatrixRecord["before"]): MatrixRecord {
  return { id, assertionId: `LM48-${id}`, input, expected, expectedCode, expectedFilterIds, expectedQueryCount, expectedClasses, independentFailure: true, verify, before };
}

async function execute(record: MatrixRecord) {
  try {
    await seed();
    if (record.before) await record.before();
    logger.reset();
    let result: Result = null;
    let code: string | null = null;
    try { result = await getCatalogFilterConfigurationCore(db, record.input); } catch (error) { if (error instanceof CatalogFilterConfigurationError) code = error.code; else throw error; }
    const entries = [...logger.entries];
    equal(entries.length, record.expectedQueryCount, `${record.id} query count`);
    equal(entries.map((entry) => entry.queryClass), record.expectedClasses, `${record.id} query classes`);
    assert(entries.every((entry) => entry.queryClass !== "forbidden"), `${record.id} forbidden offer query`);
    if (record.expected === "error") equal(code, record.expectedCode, `${record.id} error code`);
    else { assert(code === null, `${record.id} unexpected ${code}`); if (record.expected === "null") equal(result, null, `${record.id} null`); else { assert(result !== null, `${record.id} result`); if (record.expectedFilterIds) equal(ids(result), record.expectedFilterIds, `${record.id} filters`); } }
    record.verify?.(result, entries);
    reached.add(record.id); executed.add(record.id);
    console.log(`${record.id}|PASS|assertion=${record.assertionId}|queries=${entries.length}`);
  } catch (error) { executed.add(record.id); failures++; console.log(`${record.id}|FAIL|assertion=${record.assertionId}|${error instanceof Error ? error.message : String(error)}`); }
}

const q0: QueryClass[] = [];
const q1: QueryClass[] = ["configuration"];
const q2: QueryClass[] = ["configuration", "options"];
const matrix: MatrixRecord[] = [
  record("R01", { categoryId: "3", locale: "pl" }, "error", "INVALID_CATEGORY_ID", null, 0, q0),
  record("R02", { categoryId: 0, locale: "pl" }, "error", "INVALID_CATEGORY_ID", null, 0, q0),
  record("R03", { categoryId: -1, locale: "pl" }, "error", "INVALID_CATEGORY_ID", null, 0, q0),
  record("R04", { categoryId: Number.MAX_SAFE_INTEGER + 1, locale: "pl" }, "error", "INVALID_CATEGORY_ID", null, 0, q0),
  record("R05", { categoryId: 3, locale: "xx" }, "error", "INVALID_LOCALE", null, 0, q0),
  record("R06", { categoryId: 999, locale: "pl" }, "null", null, null, 1, q1),
  record("R07", { categoryId: 6, locale: "pl" }, "result", null, [], 1, q1),
  record("R08", { categoryId: 3, locale: "pl" }, "result", null, [104, 106, 101, 103, 108, 110, 102, 100], 2, q2, (result) => {
    assert(result, "R08 result"); equal(result.filters.find((filter) => filter.attributeId === 104)?.label, "Ukryty filtr", "visible false included");
    equal(result.filters.find((filter) => filter.attributeId === 100)?.options.map((option) => option.optionId), [501, 502], "option id order");
    equal(result.filters.find((filter) => filter.attributeId === 101)?.options, [], "scalar options");
    equal(result.filters.find((filter) => filter.attributeId === 106)?.options, [], "empty controlled options retained");
    equal(result.filters.find((filter) => filter.attributeId === 106)?.label, "empty-enum", "stable key attribute fallback");
    equal(result.filters.find((filter) => filter.attributeId === 108)?.options.map((option) => option.label), ["multi-z", "multi-a"], "stable key option fallback");
    equal(Object.keys(result.filters[0]).sort(), ["attributeId", "filterKind", "label", "options", "sortOrder", "unit"], "no public stable key");
    assert(!result.filters.find((filter) => filter.attributeId === 100)?.options.some((option) => option.optionId === 503 || option.optionId === 601), "inactive and cross-attribute options excluded");
    assert(!ids(result).includes(105) && !ids(result).includes(107) && !ids(result).includes(109), "unsupported/inactive/sibling excluded");
    equal(ids(result).length, new Set(ids(result)).size, "no duplicate localized filter rows");
  }),
  record("R09", { categoryId: 3, locale: "en" }, "result", null, [104, 106, 101, 103, 108, 110, 102, 100], 2, q2, (result) => { assert(result, "R09 result"); equal(result.filters.find((filter) => filter.attributeId === 100)?.label, "Root", "requested locale"); }),
  record("R10", { categoryId: 3, locale: "de" }, "result", null, [104, 106, 101, 103, 108, 110, 102, 100], 2, q2, (result) => { assert(result, "R10 result"); equal(result.filters.find((filter) => filter.attributeId === 100)?.label, "Główny", "pl fallback"); }),
  record("R11", { categoryId: 3, locale: "pl" }, "result", null, [104, 100, 106, 101, 103, 108, 110, 102], 2, q2, (result) => { assert(result, "R11 result"); const f = result.filters.find((filter) => filter.attributeId === 100); equal(f?.unit, "child-unit", "child unit"); equal(f?.sortOrder, 1, "child sort"); }, async () => { await db.execute(sql`INSERT INTO category_attribute_assignments (category_id,attribute_definition_id,sort_order,is_filterable,is_visible,unit_code) VALUES (3,100,1,true,true,'child-unit')`); }),
  record("R12", { categoryId: 3, locale: "pl" }, "result", null, [104, 106, 101, 103, 108, 110, 102], 2, q2, undefined, async () => { await db.execute(sql`INSERT INTO category_attribute_assignments (category_id,attribute_definition_id,sort_order,is_filterable,is_visible) VALUES (3,100,1,false,true)`); }),
  record("R13", { categoryId: 5, locale: "pl" }, "result", null, [104, 106, 101, 103, 108, 110, 102, 100], 2, q2),
  record("R14", { categoryId: 900, locale: "pl" }, "error", "CATEGORY_ANCESTRY_CYCLE", null, 1, q1, undefined, async () => { await db.execute(sql`INSERT INTO categories (id,name,slug,parent_id) VALUES (900,'Cycle','cycle',900)`); }),
  record("R15", { categoryId: 910, locale: "pl" }, "error", "CATEGORY_ANCESTRY_CYCLE", null, 1, q1, undefined, async () => { await db.execute(sql`INSERT INTO categories (id,name,slug,parent_id) VALUES (910,'A','cycle-a',911),(911,'B','cycle-b',910)`); }),
  record("R16", { categoryId: 1000, locale: "pl" }, "result", null, [100], 2, q2, undefined, async () => { const values = Array.from({ length: 65 }, (_, index) => `(${1000 + index},'D${index}','deep-${index}',${index === 64 ? 'NULL' : 1001 + index})`).join(","); await db.execute(sql.raw(`INSERT INTO categories (id,name,slug,parent_id) VALUES ${values}`)); await db.execute(sql`INSERT INTO category_attribute_assignments (category_id,attribute_definition_id,sort_order,is_filterable,is_visible) VALUES (1064,100,1,true,true)`); }),
  record("R17", { categoryId: 2000, locale: "pl" }, "error", "CATEGORY_ANCESTRY_DEPTH_LIMIT", null, 1, q1, undefined, async () => { const values = Array.from({ length: MAX_CATEGORY_ANCESTRY_DEPTH + 2 }, (_, index) => `(${2000 + index},'L${index}','limit-${index}',${index === MAX_CATEGORY_ANCESTRY_DEPTH + 1 ? 'NULL' : 2001 + index})`).join(","); await db.execute(sql.raw(`INSERT INTO categories (id,name,slug,parent_id) VALUES ${values}`)); }),
  record("R18", { categoryId: 3, locale: "pl" }, "result", null, [104, 106, 101, 103, 108, 110, 102, 100], 2, q2, (_result, entries) => { const first = entries[0]; assert(/WITH RECURSIVE/i.test(first.query) && /ROW_NUMBER\(\) OVER/i.test(first.query) && /PARTITION BY assignment\.attribute_definition_id/i.test(first.query) && /ORDER BY ancestry\.depth ASC/i.test(first.query) && /NULLS LAST/i.test(first.query), "SQL proof"); assert(first.params.includes(3) && first.params.includes("pl"), "bound category and locale"); }),
  record("R19", { categoryId: 7, locale: "pl" }, "result", null, [101], 1, q1),
  record("R20", { categoryId: 6, locale: "pl" }, "result", null, [], 1, q1, undefined, async () => { await db.execute(sql`INSERT INTO category_attribute_assignments (category_id,attribute_definition_id,sort_order,is_filterable,is_visible) VALUES (6,100,1,false,true)`); }),
  record("R21", { categoryId: 1.5, locale: "pl" }, "error", "INVALID_CATEGORY_ID", null, 0, q0),
  record("R22", { categoryId: Number.NaN, locale: "pl" }, "error", "INVALID_CATEGORY_ID", null, 0, q0),
  record("R23", { categoryId: Infinity, locale: "pl" }, "error", "INVALID_CATEGORY_ID", null, 0, q0),
  record("R24", { categoryId: 3, locale: "pl" }, "result", null, [104, 106, 101, 103, 108, 110, 102, 100], 2, q2, undefined, async () => { await db.execute(sql`INSERT INTO category_attribute_assignments (category_id,attribute_definition_id,sort_order,is_filterable,is_visible) VALUES (5,109,1,true,true)`); }),
];

function testValidators() {
  const rejected = [new Date(), BigInt(1), undefined, new Map(), new Set(), new WeakMap(), new WeakSet(), () => undefined, Symbol("x"), new Uint8Array([1]), Object.create({ x: 1 }), [1, , 3], Number.NaN, Infinity];
  for (const value of rejected) { let failed = false; try { assertPlainJsonDTO(value); } catch { failed = true; } assert(failed, `plain guard ${String(value)}`); }
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic; let cyclicFailed = false; try { assertPlainJsonDTO(cyclic); } catch { cyclicFailed = true; } assert(cyclicFailed, "cycle plain guard");
  const accessor: Record<string, unknown> = {}; Object.defineProperty(accessor, "value", { enumerable: true, get: () => "must not execute" }); let accessorFailed = false; try { assertPlainJsonDTO(accessor); } catch { accessorFailed = true; } assert(accessorFailed, "accessor rejected without invocation");
  for (const value of ["9007199254740992", "1.5", "1x", 0, -1]) { let failed = false; try { parsePositiveSafeId(value); } catch { failed = true; } assert(failed, `id parser ${String(value)}`); }
  let domainFailed = false; try { assertCatalogFilterConfigurationDTO({ categoryId: 1, filters: [{ attributeId: 2, filterKind: "number", label: "x", unit: null, sortOrder: 0, options: [{ optionId: 3, label: "bad" }] }] }); } catch { domainFailed = true; } assert(domainFailed, "scalar options rejected");
}

async function main() {
  testValidators();
  const source = readFileSync(new URL(import.meta.url), "utf8");
  for (const record of matrix) await execute(record);
  const idsInMatrix = matrix.map((record) => record.id); const assertions = matrix.map((record) => record.assertionId);
  const duplicateIds = idsInMatrix.filter((id, index) => idsInMatrix.indexOf(id) !== index); const duplicateAssertions = assertions.filter((id, index) => assertions.indexOf(id) !== index);
  const missing = idsInMatrix.filter((id) => !executed.has(id)); const unknown = [...executed].filter((id) => !idsInMatrix.includes(id)); const missed = idsInMatrix.filter((id) => !reached.has(id));
  const unconditional = (source.match(/console\.log\([^\n]*\|PASS\|/g) ?? []).filter((line) => !line.includes("record.id")).length;
  console.log(`LM48_MATRIX_RECORDS=${matrix.length}`); console.log(`LM48_EXECUTED_RECORDS=${executed.size}`); console.log(`LM48_UNIQUE_IDS=${new Set(idsInMatrix).size}`); console.log(`LM48_UNIQUE_ASSERTION_IDS=${new Set(assertions).size}`); console.log(`LM48_MISSING_IDS=${missing.length}`); console.log(`LM48_UNKNOWN_IDS=${unknown.length}`); console.log(`LM48_DUPLICATE_IDS=${duplicateIds.length}`); console.log(`LM48_DUPLICATE_ASSERTION_IDS=${duplicateAssertions.length}`); console.log(`LM48_RUNTIME_ASSERTIONS_MISSED=${missed.length}`); console.log(`LM48_UNCONDITIONAL_PASS_FINDINGS=${unconditional}`);
  assert(duplicateIds.length === 0 && duplicateAssertions.length === 0 && missing.length === 0 && unknown.length === 0 && missed.length === 0 && unconditional === 0, "matrix authenticity");
  await pool.end(); if (failures) process.exit(1);
}
main().catch(async (error) => { console.error(error); await pool.end(); process.exit(1); });
