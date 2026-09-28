import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { legalDocuments, legalDocumentVersions, legalPackVersions } from "@/lib/schema";

export const PUBLIC_CORE_LEGAL_PACK_CODE = "CORE_PARTNER_LEGAL_PACK";

export interface PublicLegalDocument {
  code: string;
  status: string;
  title: string;
  version: string;
  language: string;
  effectiveFrom: Date;
  sha256: string | null;
}

export interface PublicLegalPackSummary {
  version: string;
  language: string;
  effectiveFrom: Date;
  rootSha256: string;
  hashAlgorithm: string;
  canonicalizationScheme: string;
}

export interface PublicLegalCenter {
  currentDocuments: PublicLegalDocument[];
  upcomingDocuments: PublicLegalDocument[];
  history: PublicLegalDocument[];
  currentPacks: PublicLegalPackSummary[];
  upcomingPacks: PublicLegalPackSummary[];
}

export interface LegalDocumentRow {
  code: string;
  title: string;
  documentType: string;
  version: string;
  language: string;
  status: string;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  sha256: string | null;
}

export interface LegalPackRow {
  code: string;
  version: string;
  language: string;
  status: string;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  rootSha256: string | null;
  hashAlgorithm: string;
  canonicalizationScheme: string;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function selectPublicLegalCenter(
  documentRows: readonly LegalDocumentRow[],
  packRows: readonly LegalPackRow[],
  now: Date,
): PublicLegalCenter {
  const currentDocuments: PublicLegalDocument[] = [];
  const upcomingDocuments: PublicLegalDocument[] = [];
  const history: PublicLegalDocument[] = [];

  const eligibleDocuments = documentRows
    .filter((row) =>
      row.documentType === "public_legal" &&
      row.effectiveFrom !== null &&
      (row.status === "active" || ((row.status === "superseded" || row.status === "archived") && row.effectiveFrom <= now)),
    )
    .sort((a, b) =>
      b.effectiveFrom!.getTime() - a.effectiveFrom!.getTime() ||
      compareText(a.code, b.code) ||
      compareText(a.language, b.language) ||
      compareText(a.version, b.version),
    );

  for (const row of eligibleDocuments) {
    const item: PublicLegalDocument = {
      code: row.code,
      status: row.status,
      title: row.title,
      version: row.version,
      language: row.language,
      effectiveFrom: row.effectiveFrom!,
      sha256: row.sha256,
    };
    if (row.status !== "active") history.push(item);
    else if (row.effectiveFrom! > now) upcomingDocuments.push(item);
    else if (row.effectiveUntil === null || row.effectiveUntil > now) currentDocuments.push(item);
  }

  const eligiblePacks = packRows
    .filter((row) =>
      row.code === PUBLIC_CORE_LEGAL_PACK_CODE && row.status === "active" &&
      row.effectiveFrom !== null &&
      row.rootSha256 !== null,
    )
    .sort((a, b) =>
      b.effectiveFrom!.getTime() - a.effectiveFrom!.getTime() ||
      compareText(a.language, b.language) || compareText(a.version, b.version),
    )
  const currentPacks: PublicLegalPackSummary[] = [];
  const upcomingPacks: PublicLegalPackSummary[] = [];
  for (const row of eligiblePacks) {
    const item: PublicLegalPackSummary = {
      version: row.version,
      language: row.language,
      effectiveFrom: row.effectiveFrom!,
      rootSha256: row.rootSha256!,
      hashAlgorithm: row.hashAlgorithm,
      canonicalizationScheme: row.canonicalizationScheme,
    };
    if (row.effectiveFrom! > now) upcomingPacks.push(item);
    else if (row.effectiveUntil === null || row.effectiveUntil > now) currentPacks.push(item);
  }

  return { currentDocuments, upcomingDocuments, history, currentPacks, upcomingPacks };
}

export async function getPublicLegalCenter(
  database: typeof db = db,
  now = new Date(),
): Promise<PublicLegalCenter> {
  const [documentRows, packRows] = await Promise.all([
    database.select({
      code: legalDocuments.code,
      title: legalDocuments.titlePl,
      documentType: legalDocuments.documentType,
      version: legalDocumentVersions.version,
      language: legalDocumentVersions.language,
      status: legalDocumentVersions.status,
      effectiveFrom: legalDocumentVersions.effectiveFrom,
      effectiveUntil: legalDocumentVersions.effectiveUntil,
      sha256: legalDocumentVersions.sha256,
    })
      .from(legalDocumentVersions)
      .innerJoin(legalDocuments, eq(legalDocumentVersions.legalDocumentId, legalDocuments.id))
      .where(and(
        eq(legalDocuments.documentType, "public_legal"),
        inArray(legalDocumentVersions.status, ["active", "superseded", "archived"]),
        isNotNull(legalDocumentVersions.effectiveFrom),
      ))
      .orderBy(
        desc(legalDocumentVersions.effectiveFrom),
        asc(legalDocuments.code),
        asc(legalDocumentVersions.language),
        asc(legalDocumentVersions.version),
      ),
    database.select({
      code: legalPackVersions.code,
      version: legalPackVersions.version,
      language: legalPackVersions.language,
      status: legalPackVersions.status,
      effectiveFrom: legalPackVersions.effectiveFrom,
      effectiveUntil: legalPackVersions.effectiveUntil,
      rootSha256: legalPackVersions.rootSha256,
      hashAlgorithm: legalPackVersions.hashAlgorithm,
      canonicalizationScheme: legalPackVersions.canonicalizationScheme,
    })
      .from(legalPackVersions)
      .where(and(
        eq(legalPackVersions.code, PUBLIC_CORE_LEGAL_PACK_CODE),
        eq(legalPackVersions.status, "active"),
        isNotNull(legalPackVersions.effectiveFrom),
        isNotNull(legalPackVersions.rootSha256),
      ))
      .orderBy(desc(legalPackVersions.effectiveFrom), asc(legalPackVersions.language), asc(legalPackVersions.version)),
  ]);

  return selectPublicLegalCenter(documentRows, packRows, now);
}
