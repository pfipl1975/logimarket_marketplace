import { agreementVersions } from "@/lib/schema";
import { desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type AgreementVersionReadDto = {
  id: number;
  version: string;
  agreementType: string;
  canonicalTemplateHashSha256: string;
  status: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type AgreementVersionsReadModel = {
  activeVersion: AgreementVersionReadDto | null;
  hasActiveVersion: boolean;
  versions: AgreementVersionReadDto[];
};

export async function getAdminAgreementVersions(db: NodePgDatabase<Record<string, unknown>>): Promise<AgreementVersionsReadModel> {
  const records = await db
    .select({
      id: agreementVersions.id,
      version: agreementVersions.version,
      agreementType: agreementVersions.agreementType,
      canonicalTemplateHashSha256: agreementVersions.canonicalTemplateHashSha256,
      status: agreementVersions.status,
      effectiveFrom: agreementVersions.effectiveFrom,
      effectiveTo: agreementVersions.effectiveTo,
      publishedAt: agreementVersions.publishedAt,
      createdAt: agreementVersions.createdAt,
    })
    .from(agreementVersions)
    .orderBy(desc(agreementVersions.createdAt), desc(agreementVersions.id));

  const versions: AgreementVersionReadDto[] = records.map(r => ({
    ...r,
    effectiveFrom: r.effectiveFrom ? r.effectiveFrom.toISOString() : null,
    effectiveTo: r.effectiveTo ? r.effectiveTo.toISOString() : null,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  const activeVersion = versions.find(v => v.status === "active") ?? null;

  return {
    activeVersion,
    hasActiveVersion: activeVersion !== null,
    versions,
  };
}
