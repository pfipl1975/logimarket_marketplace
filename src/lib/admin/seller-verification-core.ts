import { z } from "zod";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import {
  sellerLegalIdentities,
  sellerTaxIdentifiers,
  sellerRegistryIdentifiers,
  sellerVerificationEvents,
} from "@/lib/schema";
import {
  buildLegalIdentitySnapshot,
  LegalIdentitySnapshot,
  TaxIdentifierSnapshot,
  RegistryIdentifierSnapshot,
  buildTaxIdentifierSnapshot,
  buildRegistryIdentifierSnapshot,
} from "@/lib/verification/events-core";
import type * as schema from "@/lib/schema";

export const AdminSellerVerificationInputSchema = z.object({
  partnerId: z.number().int().positive().safe(),
  subjectType: z.enum(["legal_identity", "tax_identifier", "registry_identifier"]),
  subjectId: z.number().int().positive().safe().optional(),
  expectedStatus: z.enum(["unverified", "rejected"]),
  sourceType: z.enum(["admin_manual", "public_registry_manual", "partner_document"]),
  sourceName: z.string().trim().min(1).max(100),
  sourceReference: z.string().trim().min(1).max(255),
});

export type AdminSellerVerificationInput = z.infer<typeof AdminSellerVerificationInputSchema>;

export type AdminSellerVerificationResult =
  | { ok: true }
  | { ok: false; code: "INVALID_INPUT" | "UNAUTHORIZED" | "SUBJECT_NOT_FOUND" | "VERIFICATION_CONFLICT" | "SYSTEM_ERROR" | "OWNERSHIP_MISMATCH" };

export async function executeAdminSellerVerification(
  db: NodePgDatabase<typeof schema>,
  input: AdminSellerVerificationInput,
  deps: { actorUserId: string }
): Promise<AdminSellerVerificationResult> {
  if (!deps.actorUserId.trim()) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  try {
    return await db.transaction(async (tx) => {
      let snapshotData: Record<string, unknown> | null = null;
      let previousStatus: string | null = null;
      let previousVerifiedAt: Date | null = null;
      let previousSource: string | null = null;
      let previousReference: string | null = null;

      const derivedVerificationSource = input.sourceName;
      const derivedVerificationReference = input.sourceReference;

      if (input.subjectType === "legal_identity") {
        const rows = await tx
          .select()
          .from(sellerLegalIdentities)
          .where(eq(sellerLegalIdentities.partnerId, input.partnerId))
          .for("update");

        if (rows.length === 0) return { ok: false, code: "SUBJECT_NOT_FOUND" };
        const row = rows[0];

        if (row.verificationStatus !== input.expectedStatus) {
          return { ok: false, code: "VERIFICATION_CONFLICT" };
        }

        snapshotData = buildLegalIdentitySnapshot(row);
        previousStatus = row.verificationStatus;
        previousVerifiedAt = row.verifiedAt;
        previousSource = row.verificationSource;
        previousReference = row.verificationReference;

        const [event] = await tx.insert(sellerVerificationEvents).values({
          subjectType: "legal_identity",
          legalIdentityPartnerId: input.partnerId,
          eventType: "verified",
          actorType: "admin",
          actorUserId: deps.actorUserId,
          sourceType: input.sourceType,
          sourceName: input.sourceName,
          sourceReference: input.sourceReference,
          subjectSnapshot: snapshotData as LegalIdentitySnapshot,
          previousVerificationStatus: previousStatus,
          previousVerifiedAt: previousVerifiedAt,
          previousVerificationSource: previousSource,
          previousVerificationReference: previousReference,
        }).returning({ id: sellerVerificationEvents.id });

        await tx
          .update(sellerLegalIdentities)
          .set({
            verificationStatus: "verified",
            verifiedAt: sql`CURRENT_TIMESTAMP`,
            verificationSource: derivedVerificationSource,
            verificationReference: derivedVerificationReference,
            currentVerificationEventId: event.id,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(sellerLegalIdentities.partnerId, input.partnerId));

      } else if (input.subjectType === "tax_identifier") {
        if (!input.subjectId) return { ok: false, code: "INVALID_INPUT" };

        const rows = await tx
          .select()
          .from(sellerTaxIdentifiers)
          .where(eq(sellerTaxIdentifiers.id, input.subjectId))
          .for("update");

        if (rows.length === 0) return { ok: false, code: "SUBJECT_NOT_FOUND" };
        const row = rows[0];

        if (row.partnerId !== input.partnerId) return { ok: false, code: "OWNERSHIP_MISMATCH" };
        if (row.verificationStatus !== input.expectedStatus) return { ok: false, code: "VERIFICATION_CONFLICT" };

        snapshotData = buildTaxIdentifierSnapshot(row);
        previousStatus = row.verificationStatus;
        previousVerifiedAt = row.verifiedAt;
        previousSource = row.verificationSource;
        previousReference = row.verificationReference;

        const [event] = await tx.insert(sellerVerificationEvents).values({
          subjectType: "tax_identifier",
          taxIdentifierId: input.subjectId,
          eventType: "verified",
          actorType: "admin",
          actorUserId: deps.actorUserId,
          sourceType: input.sourceType,
          sourceName: input.sourceName,
          sourceReference: input.sourceReference,
          subjectSnapshot: snapshotData as TaxIdentifierSnapshot,
          previousVerificationStatus: previousStatus,
          previousVerifiedAt: previousVerifiedAt,
          previousVerificationSource: previousSource,
          previousVerificationReference: previousReference,
        }).returning({ id: sellerVerificationEvents.id });

        await tx
          .update(sellerTaxIdentifiers)
          .set({
            verificationStatus: "verified",
            verifiedAt: sql`CURRENT_TIMESTAMP`,
            verificationSource: derivedVerificationSource,
            verificationReference: derivedVerificationReference,
            currentVerificationEventId: event.id,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(sellerTaxIdentifiers.id, input.subjectId));

      } else if (input.subjectType === "registry_identifier") {
        if (!input.subjectId) return { ok: false, code: "INVALID_INPUT" };

        const rows = await tx
          .select()
          .from(sellerRegistryIdentifiers)
          .where(eq(sellerRegistryIdentifiers.id, input.subjectId))
          .for("update");

        if (rows.length === 0) return { ok: false, code: "SUBJECT_NOT_FOUND" };
        const row = rows[0];

        if (row.partnerId !== input.partnerId) return { ok: false, code: "OWNERSHIP_MISMATCH" };
        if (row.verificationStatus !== input.expectedStatus) return { ok: false, code: "VERIFICATION_CONFLICT" };

        snapshotData = buildRegistryIdentifierSnapshot(row);
        previousStatus = row.verificationStatus;
        previousVerifiedAt = row.verifiedAt;
        previousSource = row.verificationSource;
        previousReference = row.verificationReference;

        const [event] = await tx.insert(sellerVerificationEvents).values({
          subjectType: "registry_identifier",
          registryIdentifierId: input.subjectId,
          eventType: "verified",
          actorType: "admin",
          actorUserId: deps.actorUserId,
          sourceType: input.sourceType,
          sourceName: input.sourceName,
          sourceReference: input.sourceReference,
          subjectSnapshot: snapshotData as RegistryIdentifierSnapshot,
          previousVerificationStatus: previousStatus,
          previousVerifiedAt: previousVerifiedAt,
          previousVerificationSource: previousSource,
          previousVerificationReference: previousReference,
        }).returning({ id: sellerVerificationEvents.id });

        await tx
          .update(sellerRegistryIdentifiers)
          .set({
            verificationStatus: "verified",
            verifiedAt: sql`CURRENT_TIMESTAMP`,
            verificationSource: derivedVerificationSource,
            verificationReference: derivedVerificationReference,
            currentVerificationEventId: event.id,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(sellerRegistryIdentifiers.id, input.subjectId));
      } else {
        return { ok: false, code: "INVALID_INPUT" };
      }

      return { ok: true };
    });
  } catch (error) {
    console.error("[executeAdminSellerVerification] error:", error);
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
