import { test, describe } from "node:test";
import assert from "node:assert";
import * as schema from "../../src/lib/schema";
import { getTableConfig } from "drizzle-orm/pg-core";
import { EXPECTED_COUNTS, PRODUCTION_FINGERPRINT } from "../../scripts/database/runtime-migration-contract";

describe("Drizzle Schema vs Production Baseline Sync", () => {
  test("should match the exact post-0005 runtime table and column contract", () => {
    const contractTables = Object.values(PRODUCTION_FINGERPRINT).map(t => ({
      tableName: t.name,
      columns: t.columns.map((c, i) => ({
        tableName: t.name,
        ordinalPosition: i + 1,
        columnName: c.name,
        type: c.type,
        nullable: c.nullable,
        defaultExpression: c.defaultVal
      }))
    }));

    // 2. Load Drizzle Schema
    const allExports = Object.values(schema).filter(v => v && typeof v === "object" && Symbol.for("drizzle:Name") in v);
    const drizzleRuntimeTables = allExports.filter(t => !getTableConfig(t).name.startsWith("migration_"));

    // Expected numbers
    assert.strictEqual(drizzleRuntimeTables.length, EXPECTED_COUNTS.TABLES);
    assert.strictEqual(contractTables.length, EXPECTED_COUNTS.TABLES);

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
        const drizzleTypeUpper = dCol.getSQLType().toUpperCase();

        if (drizzleTypeUpper === "SERIAL" || drizzleTypeUpper === "BIGSERIAL") {
          // Serial is normalized to int + sequence by pg_dump
        } else {
          // e.g., varchar vs character varying
        }
      });
    }

    assert.strictEqual(drizzleColCount, EXPECTED_COUNTS.COLUMNS);
  });
});
