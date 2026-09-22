import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function createCanonicalRuntimeMigrationDirectory(
  diskJournalText: string,
  diskJournalObj: { entries: { tag: string; when: number }[] },
  getMigrationBuffer: (tag: string) => Buffer
): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-migrations-"));
  try {
    const tempMetaDir = path.join(tempDir, "meta");
    fs.mkdirSync(tempMetaDir);
    
    fs.writeFileSync(path.join(tempMetaDir, "_journal.json"), typeof diskJournalText === "string" ? diskJournalText : JSON.stringify(diskJournalText), "utf8");

    for (const entry of diskJournalObj.entries) {
      const sqlBuffer = getMigrationBuffer(entry.tag);
      const text = sqlBuffer.toString("utf8");
      const lfText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      fs.writeFileSync(path.join(tempDir, `${entry.tag}.sql`), lfText, { encoding: "utf8" });
    }

    return tempDir;
  } catch (err) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw err;
  }
}

export function cleanupCanonicalRuntimeMigrationDirectory(tempDir: string): void {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

