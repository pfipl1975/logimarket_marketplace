import crypto from "crypto";

export const KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH = "6abf4a87f7e5f8f9f41c3b7e5fe99786de7a0fbadcae7ad3471679cfedbb774b";

export function getPortableHashes(sqlBuffer: Buffer): { rawHash: string; lfHash: string; crlfHash: string } {
  const rawHash = crypto.createHash("sha256").update(sqlBuffer).digest("hex");
  const text = sqlBuffer.toString("utf8");
  
  // Normalize to LF
  // Also handling lone CR just in case
  const lfText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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
  
  // Only explicitly recognized safe states for B1, e.g. MIGRATABLE_POST_0002 or EXACT_EXISTING_POST_0003 or EXACT_EXISTING
  if (
    schemaClassificationState === "UNKNOWN" ||
    schemaClassificationState === "PARTIAL_OR_DRIFTED" ||
    schemaClassificationState === "MIGRATABLE_BASELINE"
  ) {
    return false;
  }
  
  return true;
}

