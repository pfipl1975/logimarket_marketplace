import { and, asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import * as schema from "@/lib/schema";

const partnerId = z.number().int().positive().safe();
const userId = z.uuid();

export const grantPartnerAccessSchema = z.strictObject({
  partnerId,
  authUserId: userId,
  email: z.string().trim().toLowerCase().email().max(254),
  expectedStatus: z.enum(["none", "revoked"]),
});

export const revokePartnerAccessSchema = z.strictObject({
  partnerId,
  authUserId: userId,
  expectedStatus: z.literal("active"),
});

export type GrantPartnerAccessInput = z.infer<typeof grantPartnerAccessSchema>;
export type RevokePartnerAccessInput = z.infer<typeof revokePartnerAccessSchema>;
export type PartnerAccessResult =
  | { ok: true; code: "GRANTED" | "REVOKED" }
  | { ok: false; code: "INVALID_INPUT" | "CONFLICT" | "PARTNER_NOT_FOUND" | "ACCOUNT_UNAVAILABLE" | "IDENTITY_NOT_VERIFIED" | "SYSTEM_ERROR" };

type AuthAccount = { id: string; email?: string | null; email_confirmed_at?: string | null } | null;

/** Both the stable Supabase Auth UUID and a separately entered confirmed email must match. */
export function matchesConfirmedAuthAccount(account: AuthAccount, input: GrantPartnerAccessInput): boolean {
  return !!account &&
    account.id.toLowerCase() === input.authUserId.toLowerCase() &&
    account.email?.trim().toLowerCase() === input.email &&
    typeof account.email_confirmed_at === "string" &&
    account.email_confirmed_at.length > 0;
}

type PartnerDatabase = NodePgDatabase<typeof schema>;

export async function grantPartnerAccessCore(
  database: PartnerDatabase, input: GrantPartnerAccessInput
): Promise<PartnerAccessResult> {
  try {
    return await database.transaction(async (tx) => {
      const existingPartner = await tx.select({ id: schema.partners.id })
        .from(schema.partners).where(eq(schema.partners.id, input.partnerId)).limit(1);
      if (!existingPartner.length) return { ok: false as const, code: "PARTNER_NOT_FOUND" as const };

      const predicate = and(
        eq(schema.partnerUserMemberships.partnerId, input.partnerId),
        eq(schema.partnerUserMemberships.authUserId, input.authUserId),
      );
      const rows = await tx.select({ status: schema.partnerUserMemberships.membershipStatus })
        .from(schema.partnerUserMemberships).where(predicate).for("update");
      const actual = rows[0]?.status ?? "none";
      if (actual !== input.expectedStatus) return { ok: false as const, code: "CONFLICT" as const };

      if (actual === "none") {
        await tx.insert(schema.partnerUserMemberships).values({
          partnerId: input.partnerId,
          authUserId: input.authUserId,
          membershipStatus: "active",
          canAcceptOrders: false,
          revokedAt: null,
        });
      } else {
        await tx.update(schema.partnerUserMemberships).set({
          membershipStatus: "active",
          canAcceptOrders: false,
          revokedAt: null,
          updatedAt: new Date(),
        }).where(predicate);
      }
      return { ok: true as const, code: "GRANTED" as const };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return { ok: false, code: "CONFLICT" };
    }
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function revokePartnerAccessCore(
  database: PartnerDatabase, input: RevokePartnerAccessInput
): Promise<PartnerAccessResult> {
  try {
    return await database.transaction(async (tx) => {
      const predicate = and(
        eq(schema.partnerUserMemberships.partnerId, input.partnerId),
        eq(schema.partnerUserMemberships.authUserId, input.authUserId),
      );
      const rows = await tx.select({ status: schema.partnerUserMemberships.membershipStatus })
        .from(schema.partnerUserMemberships).where(predicate).for("update");
      if (rows[0]?.status !== "active") return { ok: false as const, code: "CONFLICT" as const };
      await tx.update(schema.partnerUserMemberships).set({
        membershipStatus: "revoked",
        canAcceptOrders: false,
        revokedAt: new Date(),
        updatedAt: new Date(),
      }).where(predicate);
      return { ok: true as const, code: "REVOKED" as const };
    });
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function getPartnerAccessListCore(database: PartnerDatabase, partnerIdValue: number) {
  return database.select({
    authUserId: schema.partnerUserMemberships.authUserId,
    membershipStatus: schema.partnerUserMemberships.membershipStatus,
    canAcceptOrders: schema.partnerUserMemberships.canAcceptOrders,
    createdAt: schema.partnerUserMemberships.createdAt,
    updatedAt: schema.partnerUserMemberships.updatedAt,
    revokedAt: schema.partnerUserMemberships.revokedAt,
  })
    .from(schema.partnerUserMemberships)
    .where(eq(schema.partnerUserMemberships.partnerId, partnerIdValue))
    .orderBy(asc(schema.partnerUserMemberships.createdAt));
}
