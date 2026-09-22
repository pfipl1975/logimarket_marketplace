"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { executeBuyerTrustTransition } from "./service-core";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { BuyerOrganizationVerificationStatus } from "../schema";

export async function verifyBuyerOrganizationAction(organizationId: number, taxIdentifierId: number, registryIdentifierId: number | null) {
  const adminUser = await requireAdmin();

  const result = await executeBuyerTrustTransition(db, {
    buyerOrganizationId: organizationId,
    expectedStatus: "pending", // can also verify from rejected or revoked, but let's assume pending or handle it dynamically?
    eventType: "verified",
    actorType: "admin",
    actorUserId: adminUser.id,
    sourceType: "admin_manual",
    sourceName: "LogiMarket Internal Admin",
    sourceReference: "Admin UI Review", // Simple manual review reference
    verificationMethod: "manual_admin",
    reasonCode: null,
    taxIdentifierId,
    registryIdentifierId,
  });

  if (result.ok) {
    revalidatePath("/admin/buyers");
    revalidatePath(`/admin/buyers/${organizationId}`);
  }

  return result;
}

export async function verifyBuyerOrganizationFromAnyStatusAction(organizationId: number, currentStatus: BuyerOrganizationVerificationStatus, taxIdentifierId: number, registryIdentifierId: number | null) {
  const adminUser = await requireAdmin();

  const result = await executeBuyerTrustTransition(db, {
    buyerOrganizationId: organizationId,
    expectedStatus: currentStatus,
    eventType: "verified",
    actorType: "admin",
    actorUserId: adminUser.id,
    sourceType: "admin_manual",
    sourceName: "LogiMarket Internal Admin",
    sourceReference: "Admin UI Review",
    verificationMethod: "manual_admin",
    reasonCode: null,
    taxIdentifierId,
    registryIdentifierId,
  });

  if (result.ok) {
    revalidatePath("/admin/buyers", "layout");
  }

  return result;
}

export async function rejectBuyerOrganizationAction(
  organizationId: number,
  currentStatus: BuyerOrganizationVerificationStatus,
  reasonCode: string,
  taxIdentifierId: number | null,
  registryIdentifierId: number | null,
) {
  const adminUser = await requireAdmin();

  const result = await executeBuyerTrustTransition(db, {
    buyerOrganizationId: organizationId,
    expectedStatus: currentStatus,
    eventType: "rejected",
    actorType: "admin",
    actorUserId: adminUser.id,
    sourceType: "admin_manual",
    sourceName: "LogiMarket Internal Admin",
    sourceReference: "Admin UI Rejection",
    verificationMethod: "manual_admin",
    reasonCode,
    taxIdentifierId,
    registryIdentifierId,
  });

  if (result.ok) {
    revalidatePath("/admin/buyers", "layout");
  }

  return result;
}

export async function revokeBuyerOrganizationAction(organizationId: number, currentStatus: BuyerOrganizationVerificationStatus, reasonCode: string) {
  const adminUser = await requireAdmin();

  const result = await executeBuyerTrustTransition(db, {
    buyerOrganizationId: organizationId,
    expectedStatus: currentStatus,
    eventType: "revoked",
    actorType: "admin",
    actorUserId: adminUser.id,
    sourceType: "admin_manual",
    sourceName: "LogiMarket Internal Admin",
    sourceReference: "Admin UI Revocation",
    verificationMethod: "manual_admin",
    reasonCode,
    taxIdentifierId: null, // these aren't needed for revocation
    registryIdentifierId: null,
  });

  if (result.ok) {
    revalidatePath("/admin/buyers", "layout");
  }

  return result;
}
