import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Logger } from "drizzle-orm/logger";
import { Pool } from "pg";
import * as schema from "../src/lib/schema";
import { queryFilteredCategoryOffers } from "../src/lib/catalog/filter-query-core";
import { parseFilterQueryInput } from "../src/lib/filters/parser";
import { normalizeFilterQuery } from "../src/lib/filters/validation-core";

class SqlLogger implements Logger {
  entries: string[] = [];
  logQuery(query: string) { this.entries.push(query.replace(/\s+/g, " ").trim()); }
  reset() { this.entries = []; }
}

const url = process.env.DATABASE_URL;
if (!url || !/^postgres:\/\/[^@/]+@(?:localhost|127\.0\.0\.1):\d+\//.test(url)) throw new Error("Disposable localhost DATABASE_URL required");
const logger = new SqlLogger();
const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema, logger });
let failures = 0;

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function seed() {
  await db.execute(sql`INSERT INTO partners (id, company_name, contact_email) VALUES (1, 'LM47 Partner', 'lm47@example.test')`);
  await db.execute(sql`INSERT INTO categories (id, name, slug, parent_id) VALUES (1,'Root','root',NULL),(2,'Child','child',1),(3,'Other','other',NULL)`);
  await db.execute(sql`INSERT INTO attribute_definitions (id,stable_key,data_type,is_active) VALUES (11,'color','enum',true),(12,'features','multi_enum',true),(13,'capacity','number',true),(14,'year','year',true),(15,'available','boolean',true),(16,'hidden_filter','number',true),(17,'disabled_filter','number',true),(18,'inactive','number',false)`);
  await db.execute(sql`INSERT INTO category_attribute_assignments (category_id,attribute_definition_id,is_filterable,is_visible) VALUES (1,11,true,true),(1,12,true,true),(1,13,true,true),(1,14,true,true),(1,15,true,true),(1,16,true,false),(1,17,false,true),(1,18,true,true)`);
  await db.execute(sql`INSERT INTO controlled_option_values (id,attribute_id,stable_key,is_active) VALUES (101,11,'red',true),(102,11,'blue',true),(103,11,'inactive',false),(201,12,'wifi',true),(202,12,'gps',true)`);
  await db.execute(sql`INSERT INTO offers (id,partner_id,category_id,title,offer_model,conversion_type,outbound_url,is_featured,is_active,publication_status,created_at) VALUES (108,1,1,'Tie RFQ','rfq','rfq',NULL,true,true,'published','2025-01-01T00:00:00Z'),(109,1,1,'Tie Ecommerce','ecommerce','ecommerce',NULL,true,true,'published','2025-01-01T00:00:00Z'),(110,1,1,'Tie Outbound','outbound','outbound','https://example.test/go',true,true,'published','2025-01-01T00:00:00Z'),(111,1,1,'Blue','rfq','rfq',NULL,false,true,'published','2024-01-01T00:00:00Z'),(112,1,2,'Child','rfq','rfq',NULL,false,true,'published','2023-01-01T00:00:00Z'),(113,1,1,'Inactive','rfq','rfq',NULL,false,false,'published','2026-01-01T00:00:00Z'),(114,1,1,'Draft','rfq','rfq',NULL,false,true,'draft','2026-01-01T00:00:00Z'),(115,1,3,'Other','rfq','rfq',NULL,false,true,'published','2026-01-01T00:00:00Z')`);
  await db.execute(sql`INSERT INTO offer_attribute_values (offer_id,attribute_id,option_id) VALUES (108,11,101),(109,11,101),(110,11,101),(111,11,102),(112,11,101)`);
  await db.execute(sql`INSERT INTO offer_attribute_option_values (offer_id,attribute_id,option_id) VALUES (108,12,201),(109,12,202),(110,12,201),(110,12,202)`);
  await db.execute(sql`INSERT INTO offer_attribute_values (offer_id,attribute_id,value_number) VALUES (108,13,2000),(109,13,2000),(110,13,2000),(111,13,1000),(112,13,1500),(108,16,1),(108,17,1)`);
  await db.execute(sql`INSERT INTO offer_attribute_values (offer_id,attribute_id,value_year) VALUES (108,14,2020),(109,14,2021),(110,14,2022),(111,14,2019),(112,14,2023)`);
  await db.execute(sql`INSERT INTO offer_attribute_values (offer_id,attribute_id,value_boolean) VALUES (108,15,true),(109,15,false),(110,15,true),(111,15,false),(112,15,false)`);
}

async function invoke(input: unknown) {
  const parsed = parseFilterQueryInput(input);
  if (!parsed.ok) return { ok: false as const, errors: parsed.errors.map((code) => ({ code })) };
  const normalized = normalizeFilterQuery(parsed.value);
  if (!normalized.ok) return normalized;
  return queryFilteredCategoryOffers(db, normalized.value);
}
async function run(id: string, input: unknown, expected: { queries: number; code?: string; total?: number; ids?: number[]; predicate?: (ids: number[]) => boolean }) {
  logger.reset();
  try {
    const result = await invoke(input);
    assert(logger.entries.length === expected.queries, `query count ${logger.entries.length}, expected ${expected.queries}; ${logger.entries.join(' || ')}`);
    if (expected.code) assert(!result.ok && result.errors.some((error) => error.code === expected.code), `expected error ${expected.code}`);
    else {
      assert(result.ok, `unexpected errors ${JSON.stringify(result)}`);
      const ids = result.rows.map((row) => row.offer.id);
      if (expected.total !== undefined) assert(result.total === expected.total, `total ${result.total}`);
      if (expected.ids) assert(JSON.stringify(ids) === JSON.stringify(expected.ids), `ids ${ids}`);
      if (expected.predicate) assert(expected.predicate(ids), `predicate failed for ${ids}`);
    }
    console.log(`${id}|PASS|queries=${logger.entries.length}|${logger.entries.map((entry) => entry.slice(0, 48)).join(' / ')}`);
  } catch (error) { failures++; console.log(`${id}|FAIL|${error instanceof Error ? error.message : String(error)}`); }
}

async function main() {
  await seed();
  // Contract/runtime: żadna z tych ścieżek nie dociera do DB.
  await run('R01', null, { queries: 0, code: 'INVALID_INPUT' });
  await run('R02', [], { queries: 0, code: 'INVALID_INPUT' });
  await run('R03', { categoryId: 0 }, { queries: 0, code: 'INVALID_IDENTIFIER' });
  await run('R04', { categoryId: 1, controlled: {} }, { queries: 0, code: 'INVALID_INPUT' });
  await run('R05', { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [] }] }, { queries: 0, code: 'INVALID_INPUT' });
  await run('R06', { categoryId: 1, numbers: [{ attributeId: 13, min: 1 }], years: [{ attributeId: 13, min: 2020 }] }, { queries: 0, code: 'DUPLICATE_ATTRIBUTE_FILTER' });
  await run('R07', { categoryId: 1, numbers: [{ attributeId: 13 }] }, { queries: 0, code: 'INVALID_RANGE' });
  await run('R08', { categoryId: 1, years: [{ attributeId: 14, min: 2020.5 }] }, { queries: 0, code: 'INVALID_RANGE' });
  await run('R09', { categoryId: 1, numbers: [{ attributeId: 13, min: Infinity }] }, { queries: 0, code: 'INVALID_RANGE' });
  await run('R10', { categoryId: 1, page: 1 }, { queries: 0, code: 'INVALID_PAGINATION' });
  await run('R11', { categoryId: 1, page: 1, pageSize: 101 }, { queries: 0, code: 'INVALID_PAGINATION' });
  // Category first, then exactly one configuration query when attributes exist.
  await run('R12', { categoryId: 999 }, { queries: 1, code: 'UNKNOWN_CATEGORY' });
  await run('R13', { categoryId: 999, numbers: [{ attributeId: 13, min: 1 }] }, { queries: 1, code: 'UNKNOWN_CATEGORY' });
  await run('R14', { categoryId: 1, numbers: [{ attributeId: 999, min: 1 }] }, { queries: 2, code: 'UNKNOWN_ATTRIBUTE' });
  await run('R15', { categoryId: 1, numbers: [{ attributeId: 18, min: 1 }] }, { queries: 2, code: 'INACTIVE_ATTRIBUTE' });
  await run('R16', { categoryId: 1, numbers: [{ attributeId: 17, min: 1 }] }, { queries: 2, code: 'INACTIVE_ASSIGNMENT' });
  await run('R17', { categoryId: 1, numbers: [{ attributeId: 16, min: 1 }] }, { queries: 4, total: 1, ids: [108] });
  await run('R18', { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [999] }] }, { queries: 2, code: 'UNKNOWN_OPTION' });
  await run('R19', { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [201] }] }, { queries: 2, code: 'OPTION_WRONG_ATTRIBUTE' });
  await run('R20', { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [103] }] }, { queries: 2, code: 'INACTIVE_OPTION' });
  await run('R21', { categoryId: 1, numbers: [{ attributeId: 11, min: 1 }] }, { queries: 2, code: 'INCOMPATIBLE_FILTER_TYPE' });
  // Catalog behaviour, controlled AND/OR, scalar filters and page slice.
  await run('R22', { categoryId: 1 }, { queries: 3, total: 5, ids: [110,109,108,111,112] });
  await run('R23', { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }] }, { queries: 4, total: 4, ids: [110,109,108,112] });
  await run('R24', { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [102,101,101] }] }, { queries: 4, total: 5 });
  await run('R25', { categoryId: 1, controlled: [{ attributeId: 12, optionIds: [202] }] }, { queries: 4, total: 2, ids: [110,109] });
  await run('R26', { categoryId: 1, numbers: [{ attributeId: 13, min: 2000 }] }, { queries: 4, total: 3, ids: [110,109,108] });
  await run('R27', { categoryId: 1, numbers: [{ attributeId: 13, max: 1500 }] }, { queries: 4, total: 2, ids: [111,112] });
  await run('R28', { categoryId: 1, numbers: [{ attributeId: 13, min: 2000, max: 2000 }] }, { queries: 4, total: 3 });
  await run('R29', { categoryId: 1, years: [{ attributeId: 14, min: 2021 }] }, { queries: 4, total: 3, ids: [110,109,112] });
  await run('R30', { categoryId: 1, years: [{ attributeId: 14, max: 2019 }] }, { queries: 4, total: 1, ids: [111] });
  await run('R31', { categoryId: 1, booleans: [{ attributeId: 15, value: true }] }, { queries: 4, total: 2, ids: [110,108] });
  await run('R32', { categoryId: 1, booleans: [{ attributeId: 15, value: false }] }, { queries: 4, total: 3, ids: [109,111,112] });
  await run('R33', { categoryId: 1, controlled: [{ attributeId: 11, optionIds: [101] }, { attributeId: 12, optionIds: [202] }], booleans: [{ attributeId: 15, value: true }] }, { queries: 4, total: 1, ids: [110] });
  await run('R34', { categoryId: 1, page: 2, pageSize: 2 }, { queries: 3, total: 5, ids: [108,111] });
  await run('R35', { categoryId: 3 }, { queries: 3, total: 1, ids: [115] });
  await run('R36', { categoryId: 1, page: 1, pageSize: 3 }, { queries: 3, total: 5, predicate: (ids) => JSON.stringify(ids) === JSON.stringify([...ids].sort((a, b) => b - a)) });
  await pool.end();
  console.log(`LM47_MATRIX_RECORDS=36 FAILURES=${failures}`);
  if (failures) process.exit(1);
}
main().catch(async (error) => { console.error(error); await pool.end(); process.exit(1); });
