import { EXPECTED_BASELINE_TABLES, PRODUCTION_FINGERPRINT, TableContract } from "./runtime-migration-contract";

export type FingerprintMatchResult = {
  isExactMatch: boolean;
  tableCount: number;
  unexpectedTables: string[];
  missingTables: string[];
  driftReasons: string[];
};

export function compareFingerprint(actual: Record<string, TableContract>, allPublicTables: string[]): FingerprintMatchResult {
  const result: FingerprintMatchResult = {
    isExactMatch: true,
    tableCount: allPublicTables.length,
    unexpectedTables: [],
    missingTables: [],
    driftReasons: []
  };

  for (const t of allPublicTables) {
    if (!EXPECTED_BASELINE_TABLES.includes(t)) {
      result.unexpectedTables.push(t);
    }
  }

  for (const expected of EXPECTED_BASELINE_TABLES) {
    if (!allPublicTables.includes(expected)) {
      result.missingTables.push(expected);
    }
  }

  if (result.unexpectedTables.length > 0 || result.missingTables.length > 0) {
    result.isExactMatch = false;
    result.driftReasons.push(`Table mismatch. Missing: ${result.missingTables.length}, Unexpected: ${result.unexpectedTables.length}`);
    return result;
  }

  // Deep comparison of exactly 15 tables
  for (const tableName of EXPECTED_BASELINE_TABLES) {
    const expected = PRODUCTION_FINGERPRINT[tableName];
    const got = actual[tableName];

    if (!got) {
      result.isExactMatch = false;
      result.driftReasons.push(`Table ${tableName} is missing in actual schema metadata`);
      continue;
    }

    if (expected.rlsEnabled !== got.rlsEnabled) {
      result.isExactMatch = false;
      result.driftReasons.push(`Table ${tableName} RLS mismatch: expected ${expected.rlsEnabled}, got ${got.rlsEnabled}`);
    }

    if (expected.columns.length !== got.columns.length) {
      result.isExactMatch = false;
      result.driftReasons.push(`Table ${tableName} column count mismatch: expected ${expected.columns.length}, got ${got.columns.length}`);
    }

    if (expected.constraints.length !== got.constraints.length) {
      result.isExactMatch = false;
      result.driftReasons.push(`Table ${tableName} constraints count mismatch: expected ${expected.constraints.length}, got ${got.constraints.length}`);
    }

    if (expected.explicitIndexes.length !== got.explicitIndexes.length) {
      result.isExactMatch = false;
      result.driftReasons.push(`Table ${tableName} explicit indexes count mismatch: expected ${expected.explicitIndexes.length}, got ${got.explicitIndexes.length}`);
    }
  }

  return result;
}
