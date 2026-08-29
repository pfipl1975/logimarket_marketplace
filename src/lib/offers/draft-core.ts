import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { offers, partners, categories } from "@/lib/schema";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";
import { AdminOfferType, isAdminOfferType, deriveOfferStorageForCreate } from "@/lib/admin/offer-type";

export type OfferDraftCreateResult =
  | { ok: true; code: "OFFER_DRAFT_CREATED"; offerId: number }
  | { ok: false; code: "OFFER_INVALID_INPUT" | "PARTNER_NOT_FOUND" | "CATEGORY_NOT_FOUND" | "MODEL_UNKNOWN" | "SYSTEM_ERROR" };

export interface OfferDraftCreateInput {
  partnerId: number;
  categoryId: number;
  title: string;
  adminOfferType: AdminOfferType;
}

export function parseOfferDraftCreateInput(rawInput: unknown): { ok: true; data: OfferDraftCreateInput } | { ok: false; code: "OFFER_INVALID_INPUT" } {
  if (!rawInput || typeof rawInput !== "object" || Array.isArray(rawInput)) {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  const { partnerId, categoryId, title, adminOfferType } = rawInput as Record<string, unknown>;

  // partnerId
  if (typeof partnerId !== "string" && typeof partnerId !== "number") return { ok: false, code: "OFFER_INVALID_INPUT" };
  const pid = Number(partnerId);
  if (!Number.isSafeInteger(pid) || pid <= 0) return { ok: false, code: "OFFER_INVALID_INPUT" };

  // categoryId
  if (typeof categoryId !== "string" && typeof categoryId !== "number") return { ok: false, code: "OFFER_INVALID_INPUT" };
  const cid = Number(categoryId);
  if (!Number.isSafeInteger(cid) || cid <= 0) return { ok: false, code: "OFFER_INVALID_INPUT" };

  // title
  if (typeof title !== "string") return { ok: false, code: "OFFER_INVALID_INPUT" };
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0 || trimmedTitle.length > 255) return { ok: false, code: "OFFER_INVALID_INPUT" };

  // adminOfferType
  if (!isAdminOfferType(adminOfferType)) {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  return {
    ok: true,
    data: {
      partnerId: pid,
      categoryId: cid,
      title: trimmedTitle,
      adminOfferType,
    },
  };
}

export async function createOfferDraftCore(
  db: NodePgDatabase<typeof schema>,
  input: OfferDraftCreateInput
): Promise<OfferDraftCreateResult> {
  const { offerModel, conversionType } = deriveOfferStorageForCreate(input.adminOfferType);
  const canonicalModel = resolveCanonicalOfferModel(offerModel, conversionType);
  
  if (canonicalModel === "unknown") {
    return { ok: false, code: "MODEL_UNKNOWN" };
  }

  try {
    return await db.transaction(async (tx) => {
      const partnerRows = await tx.select({ id: partners.id }).from(partners).where(eq(partners.id, input.partnerId)).limit(1);
      if (partnerRows.length === 0) {
        return { ok: false, code: "PARTNER_NOT_FOUND" };
      }

      const categoryRows = await tx.select({ id: categories.id }).from(categories).where(eq(categories.id, input.categoryId)).limit(1);
      if (categoryRows.length === 0) {
        return { ok: false, code: "CATEGORY_NOT_FOUND" };
      }

      const insertedRows = await tx.insert(offers).values({
        partnerId: input.partnerId,
        categoryId: input.categoryId,
        title: input.title,
        offerModel,
        conversionType,
        publicationStatus: "draft",
        contractModel: null,
      }).returning({ id: offers.id });

      if (insertedRows.length === 0) {
        return { ok: false, code: "SYSTEM_ERROR" };
      }

      return { ok: true, code: "OFFER_DRAFT_CREATED", offerId: Number(insertedRows[0].id) };
    });
  } catch (error) {
    console.error(`[draft-core] stage=creation errorName=${error instanceof Error ? error.name : "Unknown"}`);
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
