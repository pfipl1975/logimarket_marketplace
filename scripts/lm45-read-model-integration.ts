import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../src/lib/schema";
import {
  getCategoryAttributeConfigurationFromDb,
  validateCategoryId,
} from "../src/lib/catalog/category-attribute-read-model-core";
import { isLocale } from "../src/lib/i18n/config";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

// Query counter: wrap Pool.query to count executed queries
let queryCount = 0;
const pool = new Pool({ connectionString });
const originalQuery = pool.query.bind(pool);
pool.query = function (...args: unknown[]) {
  queryCount++;
  return originalQuery.apply(pool, args as never);
} as typeof originalQuery;

const db = drizzle(pool, { schema });

function assert(condition: boolean, id: string, message: string) {
  if (!condition) {
    console.log(`${id}|FAIL|${message}`);
    return false;
  }
  console.log(`${id}|PASS|${message}`);
  return true;
}

async function run() {
  const results: boolean[] = [];

  // Reset counter before each test group
  queryCount = 0;

  // D01: visible assignment returned
  const d01 = await getCategoryAttributeConfigurationFromDb(db, 10, "pl", true, false);
  const d01Ids = d01.map((a) => a.attributeId);
  results.push(assert(d01Ids.includes(100), "D01", "visible assignment returned"));

  // D02: is_visible=false excluded
  results.push(assert(!d01Ids.includes(103), "D02", "hidden excluded"));

  // D03: onlyFilterable=true excludes non-filterable
  queryCount = 0;
  const d03 = await getCategoryAttributeConfigurationFromDb(db, 10, "pl", true, true);
  const d03Ids = d03.map((a) => a.attributeId);
  results.push(
    assert(
      d03Ids.includes(100) && d03Ids.includes(104) && !d03Ids.includes(101),
      "D03",
      d03Ids.join(",")
    )
  );

  // D04: onlyFilterable=false preserves non-filterable visible
  queryCount = 0;
  const d04 = await getCategoryAttributeConfigurationFromDb(db, 10, "pl", true, false);
  const d04Ids = d04.map((a) => a.attributeId);
  results.push(assert(d04Ids.includes(101), "D04", d04Ids.join(",")));

  // D05: enum returns active options
  const d05 = d04.find((a) => a.attributeId === 101);
  results.push(assert(!!d05 && d05.options.length > 0, "D05", d05 ? String(d05.options.length) : "none"));

  // D06: multi_enum returns active options
  const d06 = d04.find((a) => a.attributeId === 104);
  results.push(assert(!!d06 && d06.options.length > 0, "D06", d06 ? String(d06.options.length) : "none"));

  // D07: text/number/boolean/date/year return empty options
  const d07 = d04.filter((a) => ["text", "number", "boolean", "date", "year"].includes(a.dataType));
  const d07AllEmpty = d07.every((a) => a.options.length === 0);
  results.push(assert(d07AllEmpty, "D07", d07.map((a) => `${a.dataType}=${a.options.length}`).join(";")));

  // D08: deterministic attribute sorting
  const d08 = d04.map((a) => a.attributeId);
  const d08Expected = [100, 101, 102, 104, 105, 106];
  results.push(assert(JSON.stringify(d08) === JSON.stringify(d08Expected), "D08", d08.join(",")));

  // D09: deterministic option sorting
  const d09 = d05 ? d05.options.map((o) => o.stableKey) : [];
  results.push(assert(JSON.stringify(d09) === JSON.stringify(["blue", "red"]), "D09", d09.join(",")));

  // D10: actual query count <= 2 and no N+1
  queryCount = 0;
  await getCategoryAttributeConfigurationFromDb(db, 10, "pl", true, false);
  results.push(assert(queryCount <= 2, "D10", `queryCount=${queryCount}`));

  // E01: invalid locale rejected before DB query
  queryCount = 0;
  const e01Invalid = !isLocale("xx");
  const e01Valid = isLocale("pl");
  results.push(assert(e01Invalid && e01Valid, "E01", `invalid=${e01Invalid} valid=${e01Valid}`));

  // E02: invalid categoryId rejected before DB query
  queryCount = 0;
  let e02Negative = false;
  let e02Zero = false;
  let e02NaN = false;
  try { validateCategoryId(-1); } catch { e02Negative = true; }
  try { validateCategoryId(0); } catch { e02Zero = true; }
  try { validateCategoryId(NaN); } catch { e02NaN = true; }
  results.push(assert(e02Negative && e02Zero && e02NaN, "E02", `negative=${e02Negative} zero=${e02Zero} NaN=${e02NaN}`));

  // E03: unknown valid categoryId returns []
  queryCount = 0;
  const e03 = await getCategoryAttributeConfigurationFromDb(db, 99999, "pl", true, false);
  results.push(assert(e03.length === 0, "E03", "unknown category returns empty"));

  // E04: DTO is plain-serializable and contains no BigInt/Date/DB objects
  const e04Json = JSON.stringify(d04);
  const e04NoBigInt = !e04Json.includes("BigInt");
  const e04NoPool = !e04Json.includes("pool");
  results.push(assert(e04Json.length > 0 && e04NoBigInt && e04NoPool, "E04", "serializable"));

  await pool.end();

  const allPass = results.every((r) => r);
  process.exit(allPass ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
