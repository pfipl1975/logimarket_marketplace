import { isPortableHashEquivalent, isLegacyDev0000Exception } from "./runtime-migration-hashing";

export const POST_0007_RECONCILIATION_MODE =
  "EXACT_POST_0007_JOURNAL_0000_TO_0006";
export const POST_0007_RECONCILIATION_AUTHORIZATION =
  "AUTHORIZED_PROD_POST_0007_JOURNAL_RECONCILIATION";

const POST_0007_CANONICAL_TAG = "0007_marketplace_order_rls_hardening";
const POST_0007_CANONICAL_WHEN = 1785593000000;
const POST_0007_CANONICAL_HASH =
  "be9934de38816ccf17dd9d5807d3b40d0fbd62fa14d6efcbeb6b0176c6f9c2b1";

export interface MigrationFileMeta {
  folderMillis: number;
  hash: string;
}

export function validateAppliedMigrationPrefix(
  targetClassification: string,
  schemaClassificationState: string,
  diskJournal: { entries: { tag: string; when: number }[] },
  diskMigrations: MigrationFileMeta[],
  appliedRows: { hash: string; created_at: string | number }[],
  getMigrationBuffer: (tag: string) => Buffer,
  reconciliationMode?: string,
): void {
  if (
    reconciliationMode !== undefined &&
    reconciliationMode !== POST_0007_RECONCILIATION_MODE
  ) {
    throw new Error("RUNNER: BLOCKED. Unsupported reconciliation mode");
  }

  const isKnownPost0007Reconciliation =
    reconciliationMode === POST_0007_RECONCILIATION_MODE &&
    targetClassification === "production" &&
    schemaClassificationState === "EXACT_EXISTING_POST_0007" &&
    (appliedRows.length === 7 || appliedRows.length === 8);

  if (
    reconciliationMode === POST_0007_RECONCILIATION_MODE &&
    !isKnownPost0007Reconciliation
  ) {
    throw new Error(
      "RUNNER: BLOCKED. Reconciliation requires exact POST_0007 physical state and canonical journal 0000 through 0006",
    );
  }

  // Enforce state/journal cardinality constraints
  if (schemaClassificationState === "EMPTY") {
    if (appliedRows.length !== 0) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (schema is EMPTY but journal has ${appliedRows.length} rows)`);
    }
  } else if (schemaClassificationState === "MIGRATABLE_POST_0002") {
    if (appliedRows.length !== 3) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (schema is POST_0002 but journal has ${appliedRows.length} rows)`);
    }
  } else if (schemaClassificationState === "MIGRATABLE_PREVIOUS") {
    if (appliedRows.length !== 3) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (schema is PREVIOUS but journal has ${appliedRows.length} rows)`);
    }
  } else if (schemaClassificationState === "MIGRATABLE_POST_0003") {
    if (appliedRows.length !== 4) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (schema is POST_0003 but journal has ${appliedRows.length} rows)`);
    }
  } else if (schemaClassificationState === "EXACT_EXISTING_POST_0004" || schemaClassificationState === "EXACT_EXISTING") {
    if (appliedRows.length !== 5) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (schema is EXACT_EXISTING but journal has ${appliedRows.length} rows)`);
    }
  } else if (schemaClassificationState === "EXACT_EXISTING_POST_0005") {
    if (appliedRows.length !== 6) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (schema is POST_0005 but journal has ${appliedRows.length} rows)`);
    }
  } else if (schemaClassificationState === "EXACT_EXISTING_POST_0006") {
    if (appliedRows.length !== 7) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (schema is POST_0006 but journal has ${appliedRows.length} rows)`);
    }
  } else if (schemaClassificationState === "EXACT_EXISTING_POST_0007") {
    if (appliedRows.length !== 8 && !isKnownPost0007Reconciliation) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (schema is POST_0007 but journal has ${appliedRows.length} rows)`);
    }
  } else if (schemaClassificationState === "PARTIAL_OR_DRIFTED") {
    throw new Error(`RUNNER: BLOCKED. Schema is PARTIAL_OR_DRIFTED`);
  } else if (schemaClassificationState === "MIGRATABLE_PROD_LEGACY" || schemaClassificationState === "MIGRATABLE_BASELINE") {
    if (appliedRows.length > 1) {
       throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (legacy prod/baseline must have 0 or 1 row)`);
    }
  }
  
  if (appliedRows.length > diskJournal.entries.length) {
    throw new Error("RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (claimed: " + appliedRows.length + ")");
  }

  if (reconciliationMode === POST_0007_RECONCILIATION_MODE) {
    if (diskJournal.entries.length !== 8 || diskMigrations.length !== 8) {
      throw new Error(
        "RUNNER: BLOCKED. Reconciliation requires canonical runtime head 0007",
      );
    }

    const entry0007 = diskJournal.entries[7];
    if (
      entry0007?.tag !== POST_0007_CANONICAL_TAG ||
      entry0007.when !== POST_0007_CANONICAL_WHEN
    ) {
      throw new Error(
        "RUNNER: BLOCKED. Reconciliation requires exact canonical 0007 journal metadata",
      );
    }

    const diskMigration0007 = diskMigrations.find(
      (migration) => migration.folderMillis === POST_0007_CANONICAL_WHEN,
    );
    if (!diskMigration0007) {
      throw new Error(
        "RUNNER: BLOCKED. Reconciliation requires exact canonical 0007 migration",
      );
    }

    const migration0007 = getMigrationBuffer(POST_0007_CANONICAL_TAG);
    if (!isPortableHashEquivalent(POST_0007_CANONICAL_HASH, migration0007)) {
      throw new Error(
        "RUNNER: BLOCKED. Reconciliation requires exact canonical 0007 migration hash",
      );
    }
  }

  for (let i = 0; i < appliedRows.length; i++) {
    const row = appliedRows[i];
    const diskEntry = diskJournal.entries[i];
    
    if (!diskEntry) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (missing disk entry)`);
    }

    const diskMig = diskMigrations.find(m => m.folderMillis === diskEntry.when);
    if (!diskMig) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (missing disk migration)`);
    }
    
    if (String(row.created_at) !== String(diskEntry.when)) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (timestamp mismatch: expected ${diskEntry.when}, got ${row.created_at})`);
    }
    
    const sqlBuffer = getMigrationBuffer(diskEntry.tag);
    const isEquivalent = isPortableHashEquivalent(row.hash, sqlBuffer); 
    const isLegacy = isLegacyDev0000Exception(
      i,
      Number(row.created_at),
      row.hash,
      targetClassification,
      schemaClassificationState
    );

    if (!isEquivalent && !isLegacy) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (hash mismatch): [rowHash: ${row.hash}] [isEquivalent: ${isEquivalent}] [isLegacy: ${isLegacy}]`);
    }
  }
}



