import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import * as schema from "../../src/lib/schema";
import { getTableConfig } from "drizzle-orm/pg-core";
import { PostgresSqlParser } from "./helpers/runtime-baseline-sql-parser";

describe("Drizzle Schema vs Production Baseline Sync", () => {
  test("should match 15 runtime tables and exactly 122 columns with exact structure", () => {
    // 1. Load the production baseline
    const baselinePath = path.join(process.cwd(), "drizzle-runtime", "0000_production_runtime_baseline.sql");
    const baselineSql = fs.readFileSync(baselinePath, "utf-8");

    // Extract real script from DO $$ block
    let unwrappedSql = baselineSql;
    const doBlockMatch = baselineSql.match(/DO\s+\$\$[\s\S]*?BEGIN\s+([\s\S]*?)\s+END\s+\$\$;/i);
    if (doBlockMatch) {
      unwrappedSql = doBlockMatch[1];
    }

    const parser = new PostgresSqlParser(unwrappedSql);
    const contractTables = parser.parse();

    // 2. Load Drizzle Schema
    const allExports = Object.values(schema).filter(v => v && typeof v === "object" && Symbol.for("drizzle:Name") in v);
    const drizzleRuntimeTables = allExports.filter(t => !getTableConfig(t).name.startsWith("migration_"));

    // Expected numbers
    assert.strictEqual(drizzleRuntimeTables.length, 15);
    assert.strictEqual(contractTables.length, 15);

    let drizzleColCount = 0;

    // 3. Compare tables and columns
    for (const dTable of drizzleRuntimeTables) {
      const dConfig = getTableConfig(dTable);
      const tableName = dConfig.name;

      const cTable = contractTables.find(t => t.tableName === tableName);
      assert.ok(cTable);
      if (!cTable) continue;

      const drizzleCols = dConfig.columns;
      drizzleColCount += drizzleCols.length;
      assert.strictEqual(drizzleCols.length, cTable.columns.length);

      cTable.columns.forEach((cCol, idx) => {
        const dCol = drizzleCols.find(d => (d as any).name === cCol.columnName) as any;
        assert.ok(dCol);
        if (!dCol) return;

        // Ordinal Check
        assert.strictEqual(drizzleCols.indexOf(dCol) + 1, idx + 1);

        // Nullability
        assert.strictEqual(!dCol.notNull, cCol.nullable);

        // Types
        let dType = dCol.getSQLType().toLowerCase().replace(/\s+/g, "");
        let cType = cCol.type.toLowerCase().replace(/\s+/g, "");

        if (dType === "bigserial") dType = "bigint";
        if (dType.startsWith("varchar")) dType = dType.replace("varchar", "charactervarying");
        if (dType === "timestamp") dType = "timestampwithouttimezone";

        if (dType !== cType) console.error("Type mismatch", tableName, cCol.columnName, dType, cType);
        assert.strictEqual(dType, cType);

        // Defaults
        const hasDrizzleDefault = dCol.hasDefault;
        const hasContractDefault = cCol.defaultExpression !== null;
        if (hasDrizzleDefault !== hasContractDefault) console.error("Default mismatch", tableName, cCol.columnName, hasDrizzleDefault, hasContractDefault);
        assert.strictEqual(hasDrizzleDefault, hasContractDefault);
      });
    }

    assert.strictEqual(drizzleColCount, 122);
  });
});
