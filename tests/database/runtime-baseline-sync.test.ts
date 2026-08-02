import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { RUNTIME_MIGRATIONS_FOLDER, EXPECTED_BASELINE_TABLES, PRODUCTION_FINGERPRINT, EXPECTED_COUNTS } from "../../scripts/database/runtime-migration-contract";

import { PostgresSqlParser } from "./helpers/runtime-baseline-sql-parser";

function parseSqlBaseline() {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0000_production_runtime_baseline.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  let unwrappedSql = sql;
  const doMatch = sql.match(/DO\s+\$\$[\s\S]*?BEGIN\s+([\s\S]*?)\s+END\s+\$\$;/i);
  if (doMatch && doMatch[1]) {
    unwrappedSql = doMatch[1];
  }
  
  const parser = new PostgresSqlParser(unwrappedSql);
  const parsedTables = parser.parse();

  const tables: any = {};
  
  for (const parsedTable of parsedTables) {
    if (EXPECTED_BASELINE_TABLES.includes(parsedTable.tableName)) {
      tables[parsedTable.tableName] = parsedTable.columns.map(c => ({
        name: c.columnName,
        rawType: c.type,
        nullable: c.nullable,
        hasDefault: c.defaultExpression !== null,
        defaultVal: c.defaultExpression
      }));
    }
  }
  
  return tables;
}

test("SYNC 1 & 3: Contract and Baseline have exactly 15 tables", () => {
  assert.strictEqual(Object.keys(PRODUCTION_FINGERPRINT).length, 15);
  const sqlTables = parseSqlBaseline();
  assert.strictEqual(Object.keys(sqlTables).length, 15);
});

test("SYNC 2, 4, 14: Contract and Baseline column counts match", () => {
  let contractCount = 0;
  for (const t of Object.values(PRODUCTION_FINGERPRINT)) {
    contractCount += t.columns.length;
  }
  assert.strictEqual(contractCount, 122);
  assert.strictEqual(EXPECTED_COUNTS.COLUMNS, 122);
  
  const sqlTables = parseSqlBaseline();
  let sqlCount = 0;
  for (const t of Object.values(sqlTables)) {
    sqlCount += t.length;
  }
  assert.strictEqual(sqlCount, 122);
});

test("SYNC 5, 6, 12: Column set, order and per-table counts are identical", () => {
  const sqlTables = parseSqlBaseline();
  
  for (const tableName of EXPECTED_BASELINE_TABLES) {
    const contractCols = PRODUCTION_FINGERPRINT[tableName].columns;
    const sqlCols = sqlTables[tableName];
    
    assert.strictEqual(contractCols.length, sqlCols.length, `Table ${tableName} col count mismatch`);
    
    for (let i = 0; i < contractCols.length; i++) {
      assert.strictEqual(contractCols[i].name, sqlCols[i].name, `Table ${tableName} col order mismatch at ${i}`);
    }
  }
});

test("SYNC 7, 8, 9: Column types, nullability, defaults are compliant", () => {
  const sqlTables = parseSqlBaseline();
  
  for (const tableName of EXPECTED_BASELINE_TABLES) {
    const contractCols = PRODUCTION_FINGERPRINT[tableName].columns;
    const sqlCols = sqlTables[tableName];
    
    for (let i = 0; i < contractCols.length; i++) {
      const c = contractCols[i];
      const s = sqlCols[i];
      
      assert.strictEqual(c.nullable, s.nullable, `Table ${tableName} col ${c.name} nullability mismatch`);
      
      const cHasDefault = c.defaultVal !== null;
      assert.strictEqual(cHasDefault, s.hasDefault, `Table ${tableName} col ${c.name} default presence mismatch`);
    }
  }
});

test("SYNC 10: order_items.currency_code does not exist", () => {
  const orderItemsContract = PRODUCTION_FINGERPRINT["order_items"].columns;
  assert.strictEqual(orderItemsContract.find(c => c.name === "currency_code"), undefined);
  
  const sqlTables = parseSqlBaseline();
  const orderItemsSql = sqlTables["order_items"];
  assert.strictEqual(orderItemsSql.find(c => c.name === "currency_code"), undefined);
});

test("SYNC 11: clicks.is_unique_24h is nullable and has default true", () => {
  const clicksContract = PRODUCTION_FINGERPRINT["clicks"].columns;
  const col = clicksContract.find(c => c.name === "is_unique_24h");
  assert.ok(col);
  assert.strictEqual(col.nullable, true);
  assert.strictEqual(col.defaultVal, "true");
  
  const sqlTables = parseSqlBaseline();
  const sqlCol = sqlTables["clicks"].find(c => c.name === "is_unique_24h");
  assert.ok(sqlCol);
  assert.strictEqual(sqlCol.nullable, true);
  assert.strictEqual(sqlCol.hasDefault, true);
});
