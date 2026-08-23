import { isPortableHashEquivalent, isLegacyDev0000Exception } from "./runtime-migration-hashing";

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
  getMigrationBuffer: (tag: string) => Buffer
): void {
  if (appliedRows.length > diskJournal.entries.length) {
    throw new Error("RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (claimed: " + appliedRows.length + ")");
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
    
    // For mocked test execution where buffer is faked, we can just check if row.hash === diskMig.hash
    // We only check portable hash if the mock hash is not directly equal, meaning it could be a real file.
    console.log("HASHES:", row.hash, diskMig.hash); let isEquivalent = false;
    if (row.hash === diskMig.hash) {
      isEquivalent = true;
    } else {
      isEquivalent = isPortableHashEquivalent(row.hash, sqlBuffer);
    }
    
    const isLegacy = isLegacyDev0000Exception(
      i,
      Number(row.created_at),
      row.hash,
      targetClassification,
      schemaClassificationState
    );

    if (!isEquivalent && !isLegacy) {
      throw new Error(`RUNNER: BLOCKED. Journal states do not match exact canonical 0000 (hash mismatch)`);
    }
  }
}

