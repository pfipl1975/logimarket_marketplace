import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { offers } from "@/lib/schema";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";
import { parseDecimalToMinorUnits } from "@/lib/checkout/money";
import { parseOutboundDestination } from "@/lib/outbound/outbound-core";

export type PhysicalOfferPublicationStatus = "draft" | "published" | "archived";
export type AdminOfferPublicationTarget = "published" | "archived";

export type PublishEligibilityReason =
  | "OFFER_INACTIVE"
  | "TITLE_INVALID"
  | "MODEL_UNKNOWN"
  | "ECOMMERCE_PRICE_INVALID"
  | "OUTBOUND_URL_INVALID";

export type AdminOfferPublicationResult =
  | {
      ok: true;
      code: "OFFER_PUBLISHED" | "OFFER_ARCHIVED";
      changed: boolean;
    }
  | {
      ok: false;
      code:
        | "OFFER_INVALID_INPUT"
        | "OFFER_NOT_FOUND"
        | "OFFER_INVALID_TRANSITION"
        | "OFFER_TRANSITION_CONFLICT"
        | "OFFER_PUBLISH_NOT_ELIGIBLE"
        | "SYSTEM_ERROR";
      reason?: PublishEligibilityReason;
    };

export interface AdminOfferPublicationInput {
  offerId: number;
  expectedStatus: PhysicalOfferPublicationStatus;
  targetStatus: AdminOfferPublicationTarget;
}

export function parseAdminOfferPublicationInput(rawInput: unknown): AdminOfferPublicationInput | null {
  if (typeof rawInput !== "object" || rawInput === null || Array.isArray(rawInput)) {
    return null;
  }

  const { offerId, expectedStatus, targetStatus } = rawInput as Record<string, unknown>;

  if (typeof offerId !== "string" || !/^[1-9]\d*$/.test(offerId)) {
    return null;
  }
  const idNum = Number(offerId);
  if (!Number.isSafeInteger(idNum) || String(idNum) !== offerId) {
    return null;
  }

  const validExpected = ["draft", "published", "archived", "hidden", "deleted"];
  const validTarget = ["published", "archived"];

  if (
    typeof expectedStatus !== "string" ||
    typeof targetStatus !== "string" ||
    !validExpected.includes(expectedStatus) ||
    !validTarget.includes(targetStatus)
  ) {
    return null;
  }

  return {
    offerId: idNum,
    expectedStatus: expectedStatus as PhysicalOfferPublicationStatus,
    targetStatus: targetStatus as AdminOfferPublicationTarget,
  };
}

export type TransitionResult =
  | { kind: "PROCEED_PUBLISH" }
  | { kind: "PROCEED_ARCHIVE" }
  | { kind: "IDEMPOTENT_PUBLISHED" }
  | { kind: "IDEMPOTENT_ARCHIVED" }
  | { kind: "CONFLICT" }
  | { kind: "INVALID_TRANSITION" };

export function evaluateOfferPublicationTransition(
  currentStatus: string,
  expectedStatus: PhysicalOfferPublicationStatus,
  targetStatus: AdminOfferPublicationTarget
): TransitionResult {
  // Invalid targets (draft cannot be target)
  if (targetStatus !== "published" && targetStatus !== "archived") {
    return { kind: "INVALID_TRANSITION" };
  }

  // Same-state / idempotency
  if (currentStatus === targetStatus) {
    return targetStatus === "published"
      ? { kind: "IDEMPOTENT_PUBLISHED" }
      : { kind: "IDEMPOTENT_ARCHIVED" };
  }

  // Conflict (stale expected)
  if (currentStatus !== expectedStatus) {
    return { kind: "CONFLICT" };
  }

  // Allowed transitions
  if (currentStatus === "draft" && targetStatus === "published") {
    return { kind: "PROCEED_PUBLISH" };
  }
  if (currentStatus === "published" && targetStatus === "archived") {
    return { kind: "PROCEED_ARCHIVE" };
  }

  // Everything else is invalid (e.g. draft->archived, archived->published)
  return { kind: "INVALID_TRANSITION" };
}

export function evaluateOfferPublishEligibility(input: {
  isActive: boolean;
  title: string | null;
  offerModel: string;
  conversionType: string;
  priceOnRequest: boolean;
  normalizedPrice: string | null;
  outboundUrl: string | null;
}): { eligible: true } | { eligible: false; reason: PublishEligibilityReason } {
  if (!input.isActive) return { eligible: false, reason: "OFFER_INACTIVE" };
  if (!input.title || input.title.trim().length === 0) return { eligible: false, reason: "TITLE_INVALID" };

  const canonicalModel = resolveCanonicalOfferModel(input.offerModel, input.conversionType);
  if (canonicalModel === "unknown") return { eligible: false, reason: "MODEL_UNKNOWN" };

  if (canonicalModel === "ecommerce") {
    if (input.priceOnRequest || !input.normalizedPrice) {
      return { eligible: false, reason: "ECOMMERCE_PRICE_INVALID" };
    }
    try {
      const minorUnits = parseDecimalToMinorUnits(input.normalizedPrice);
      if (minorUnits <= BigInt(0)) throw new Error();
    } catch {
      return { eligible: false, reason: "ECOMMERCE_PRICE_INVALID" };
    }
  }

  if (canonicalModel === "outbound") {
    if (!input.outboundUrl) return { eligible: false, reason: "OUTBOUND_URL_INVALID" };
    const dest = parseOutboundDestination(input.outboundUrl);
    if (!dest) return { eligible: false, reason: "OUTBOUND_URL_INVALID" };
  }

  return { eligible: true };
}

export async function executeOfferPublicationStateChange(
  db: NodePgDatabase<typeof schema>,
  input: AdminOfferPublicationInput
): Promise<AdminOfferPublicationResult> {
  // Pre-DB transition check
  const preCheck = evaluateOfferPublicationTransition(
    input.expectedStatus, // we optimistically assume current = expected
    input.expectedStatus,
    input.targetStatus
  );
  if (preCheck.kind === "INVALID_TRANSITION") {
    return { ok: false, code: "OFFER_INVALID_TRANSITION" };
  }

  try {
    return await db.transaction(async (tx) => {
      // 1. SELECT FOR UPDATE
      const offerRows = await tx
        .select({
          id: offers.id,
          publicationStatus: offers.publicationStatus,
          isActive: offers.isActive,
          title: offers.title,
          offerModel: offers.offerModel,
          conversionType: offers.conversionType,
          priceOnRequest: offers.priceOnRequest,
          normalizedPrice: sql<string | null>`${offers.priceBrutto}::text`,
          outboundUrl: offers.outboundUrl,
        })
        .from(offers)
        .where(eq(offers.id, input.offerId))
        .for("update");

      if (offerRows.length === 0) {
        return { ok: false, code: "OFFER_NOT_FOUND" };
      }

      const offer = offerRows[0];

      // 2. Evaluate Pure Transition Decision
      const decision = evaluateOfferPublicationTransition(
        offer.publicationStatus as string,
        input.expectedStatus,
        input.targetStatus
      );

      switch (decision.kind) {
        case "INVALID_TRANSITION":
          return { ok: false, code: "OFFER_INVALID_TRANSITION" };
        case "CONFLICT":
          return { ok: false, code: "OFFER_TRANSITION_CONFLICT" };
        case "IDEMPOTENT_PUBLISHED":
          return { ok: true, code: "OFFER_PUBLISHED", changed: false };
        case "IDEMPOTENT_ARCHIVED":
          return { ok: true, code: "OFFER_ARCHIVED", changed: false };
        case "PROCEED_PUBLISH":
          break;
        case "PROCEED_ARCHIVE":
          break;
      }

      // 3. Publish Eligibility Check (draft -> published)
      if (decision.kind === "PROCEED_PUBLISH") {
        const eligibility = evaluateOfferPublishEligibility({
          isActive: offer.isActive,
          title: offer.title,
          offerModel: offer.offerModel,
          conversionType: offer.conversionType,
          priceOnRequest: offer.priceOnRequest,
          normalizedPrice: offer.normalizedPrice,
          outboundUrl: offer.outboundUrl,
        });

        if (!eligibility.eligible) {
          return { ok: false, code: "OFFER_PUBLISH_NOT_ELIGIBLE", reason: eligibility.reason };
        }

        await tx
          .update(offers)
          .set({
            publicationStatus: "published",
            publishedAt: sql`CURRENT_TIMESTAMP`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(offers.id, offer.id));

        return { ok: true, code: "OFFER_PUBLISHED", changed: true };
      }

      // 4. Archive Check (published -> archived)
      if (decision.kind === "PROCEED_ARCHIVE") {
        await tx
          .update(offers)
          .set({
            publicationStatus: "archived",
            archivedAt: sql`CURRENT_TIMESTAMP`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(offers.id, offer.id));

        return { ok: true, code: "OFFER_ARCHIVED", changed: true };
      }

      return { ok: false, code: "SYSTEM_ERROR" };
    });
  } catch (error) {
    console.error(`[offer-lifecycle] stage=transition errorName=${error instanceof Error ? error.name : "Unknown"}`);
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
