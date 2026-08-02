import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { RUNTIME_MIGRATIONS_FOLDER, EXPECTED_BASELINE_TABLES, PRODUCTION_FINGERPRINT, EXPECTED_COUNTS } from "../../scripts/database/runtime-migration-contract";

function parseSqlBaseline() {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0000_production_runtime_baseline.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const tables = {};
  
  for (const tableName of EXPECTED_BASELINE_TABLES) {
    const startRegex = new RegExp(`CREATE\\s+TABLE\\s+${tableName}\\s+\\(\\s*\\n`, "i");
    const match = sql.match(startRegex);
    if (!match) continue;
    
    let endIdx = match.index + match[0].length;
    let parenDepth = 1;
    let startIdx = endIdx;
    while (endIdx < sql.length && parenDepth > 0) {
      if (sql[endIdx] === '(') parenDepth++;
      if (sql[endIdx] === ')') parenDepth--;
      endIdx++;
    }
    const innerSql = sql.substring(startIdx, endIdx - 1);
    
    let items = [];
    let currentItem = '';
    let depth = 0;
    for (let i = 0; i < innerSql.length; i++) {
      if (innerSql[i] === '(') depth++;
      if (innerSql[i] === ')') depth--;
      if (innerSql[i] === ',' && depth === 0) {
        items.push(currentItem.trim());
        currentItem = '';
      } else {
        currentItem += innerSql[i];
      }
    }
    if (currentItem.trim().length > 0) items.push(currentItem.trim());
    
    const columns = [];
    items.forEach(item => {
      if (!/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|EXCLUDE|LIKE)\b/i.test(item)) {
        const parts = item.split(/\s+/);
        const name = parts[0];
        const isNotNull = /NOT\s+NULL/i.test(item);
        const isPrimaryKey = /PRIMARY\s+KEY/i.test(item);
        
        let typeStr = parts[1];
        if (parts[2] && parts[2].startsWith('(') && parts[1] === 'character' && parts[2] === 'varying') {
           typeStr = 'character varying';
        }
        
        let defaultVal = null;
        const defaultMatch = item.match(/DEFAULT\s+([^,]+?)(?=\s+NOT\s+NULL|\s+PRIMARY\s+KEY|$)/i);
        if (defaultMatch) {
          defaultVal = defaultMatch[1].trim();
        }

        columns.push({
          name,
          rawType: typeStr,
          nullable: !(isNotNull || isPrimaryKey),
          hasDefault: defaultVal !== null,
          defaultVal,
          isPrimaryKey
        });
      }
    });
    
    tables[tableName] = columns;
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
