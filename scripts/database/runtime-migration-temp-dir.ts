import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { RUNTIME_MIGRATIONS_FOLDER } from "./runtime-migration-contract";

export function createCanonicalRuntimeMigrationDirectory(
  diskJournal: { entries: { tag: string; when: number }[] },
  getMigrationBuffer: (tag: string) => Buffer
): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-migrations-"));
  const tempMetaDir = path.join(tempDir, "meta");
  fs.mkdirSync(tempMetaDir);
  
  // Create a minimal fake journal if actual does not exist (for tests)
  const journalPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "meta", "_journal.json");
  if (fs.existsSync(journalPath)) {
    fs.copyFileSync(journalPath, path.join(tempMetaDir, "_journal.json"));
  } else {
    fs.writeFileSync(path.join(tempMetaDir, "_journal.json"), JSON.stringify(diskJournal), "utf8");
  }

  for (const entry of diskJournal.entries) {
    const sqlBuffer = getMigrationBuffer(entry.tag);
    const text = sqlBuffer.toString("utf8");
    const lfText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    fs.writeFileSync(path.join(tempDir, `${entry.tag}.sql`), lfText, { encoding: "utf8" });
  }

  return tempDir;
}

export function cleanupCanonicalRuntimeMigrationDirectory(tempDir: string): void {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

