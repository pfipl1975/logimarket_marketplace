import crypto from "node:crypto";

export const KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH = "6abf4a87f7e5f8f9f41c3b7e5fe99786de7a0fbadcae7ad3471679cfedbb774b";

export function canonicalizeMigrationEol(sqlBuffer: Buffer): string {
  const text = sqlBuffer.toString("utf8");
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function getPortableHashes(sqlBuffer: Buffer): { rawHash: string; lfHash: string; crlfHash: string } {
  const rawHash = crypto.createHash("sha256").update(sqlBuffer).digest("hex");
  const lfText = canonicalizeMigrationEol(sqlBuffer);
  const lfHash = crypto.createHash("sha256").update(Buffer.from(lfText, "utf8")).digest("hex");
  const crlfText = lfText.replace(/\n/g, "\r\n");
  const crlfHash = crypto.createHash("sha256").update(Buffer.from(crlfText, "utf8")).digest("hex");
  return { rawHash, lfHash, crlfHash };
}

export function isPortableHashEquivalent(journalHash: string, migrationContent: Buffer): boolean {
  const hashes = getPortableHashes(migrationContent);
  return journalHash === hashes.rawHash || journalHash === hashes.lfHash || journalHash === hashes.crlfHash;
}

export function isLegacyDev0000Exception(
  index: number,
  folderMillis: number,
  journalHash: string,
  targetClassification: string,
  schemaClassificationState: string
): boolean {
  if (index !== 0) return false;
  if (folderMillis !== 1785589560000) return false;
  if (journalHash !== KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH) return false;
  if (targetClassification !== "development" && targetClassification !== "SHARED_DEV") return false;
  if (schemaClassificationState !== "MIGRATABLE_POST_0002") return false;
  return true;
}

