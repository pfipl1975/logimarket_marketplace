import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  buyerOrganizationAddresses, buyerOrganizationMemberships, buyerOrganizations,
  buyerTaxIdentifiers, buyerUserProfiles,
} from "@/lib/schema";
import type { BuyerTrustDb } from "@/lib/buyer-trust/service-core";
import { loadTrustedBuyerIdentity } from "@/lib/buyer-trust/service-core";
import { deriveBuyerProfileReadiness } from "@/lib/buyer-account/core";
import { isValidPlNip, normalizePlNip } from "@/lib/buyer/buyer-identity-core";
import {
  evaluateBuyerOrderIntentReadiness, selectSingleBuyerOrganization,
  type BuyerOrderIntentContext, type BuyerOrderIntentFailure,
} from "./buyer-order-intent";

export type BuyerOrderIntentResolution =
  | { ok: true; context: BuyerOrderIntentContext }
  | { ok: false; code: BuyerOrderIntentFailure };

/** The caller must supply the UUID obtained from server-side Supabase getUser(). */
export async function resolveBuyerOrderIntentContext(
  authUserId: string,
  database: BuyerTrustDb = db,
): Promise<BuyerOrderIntentResolution> {
  if (!authUserId.trim()) return { ok: false, code: "BUYER_NOT_READY" };
  try {
    const memberships = await database.select({
      organizationId: buyerOrganizations.id,
      legalName: buyerOrganizations.legalName,
      country: buyerOrganizations.jurisdictionCountry,
      status: buyerOrganizations.verificationStatus,
    }).from(buyerOrganizationMemberships)
      .innerJoin(buyerOrganizations, eq(buyerOrganizations.id, buyerOrganizationMemberships.buyerOrganizationId))
      .where(and(
        eq(buyerOrganizationMemberships.authUserId, authUserId),
        eq(buyerOrganizationMemberships.membershipStatus, "active"),
        isNull(buyerOrganizationMemberships.endedAt),
      ));
    const selected = selectSingleBuyerOrganization(memberships);
    if (typeof selected === "string") return { ok: false, code: selected };
    if (selected.status !== "pending" && selected.status !== "verified" || selected.country !== "PL") {
      return { ok: false, code: "BUYER_NOT_READY" };
    }

    const [taxRows, addressRows, profileRows] = await Promise.all([
      database.select().from(buyerTaxIdentifiers).where(and(
        eq(buyerTaxIdentifiers.buyerOrganizationId, selected.organizationId),
        eq(buyerTaxIdentifiers.identifierType, "tax_id"),
        eq(buyerTaxIdentifiers.countryCode, "PL"),
        eq(buyerTaxIdentifiers.canonicalIdentityClass, "PL:NIP"),
        isNull(buyerTaxIdentifiers.retiredAt),
      )),
      database.select().from(buyerOrganizationAddresses).where(and(
        eq(buyerOrganizationAddresses.buyerOrganizationId, selected.organizationId),
        eq(buyerOrganizationAddresses.addressType, "registered"),
        isNull(buyerOrganizationAddresses.retiredAt),
      )),
      database.select().from(buyerUserProfiles).where(eq(buyerUserProfiles.authUserId, authUserId)),
    ]);
    if (taxRows.length !== 1 || addressRows.length !== 1 || profileRows.length !== 1) {
      return { ok: false, code: "BUYER_NOT_READY" };
    }
    const tax = taxRows[0];
    const address = addressRows[0];
    const profile = profileRows[0];
    if (tax.identifierValue !== tax.canonicalIdentifierValue ||
        normalizePlNip(tax.canonicalIdentifierValue) !== tax.canonicalIdentifierValue ||
        !isValidPlNip(tax.canonicalIdentifierValue) || address.countryCode !== "PL") {
      return { ok: false, code: "BUYER_NOT_READY" };
    }
    const readiness = deriveBuyerProfileReadiness({
      legalName: selected.legalName,
      nip: tax.canonicalIdentifierValue,
      jurisdictionCountry: selected.country,
      address,
      contact: profile,
    });
    if (!readiness.profileComplete) return { ok: false, code: "BUYER_PROFILE_REQUIRED" };

    const trusted = selected.status === "verified"
      ? await loadTrustedBuyerIdentity(database, authUserId, selected.organizationId)
      : null;
    if (selected.status === "verified" && (!trusted?.ok ||
        trusted.value.taxIdentifierValue !== tax.identifierValue ||
        trusted.value.businessName !== selected.legalName)) {
      return { ok: false, code: "BUYER_NOT_READY" };
    }
    const legal: BuyerOrderIntentContext["legal"] = {
      businessName: selected.legalName,
      countryCode: "PL",
      taxIdentifierType: "tax_id",
      taxIdentifierValue: tax.canonicalIdentifierValue,
      registryIdentifierType: trusted?.ok ? trusted.value.registryIdentifierType : null,
      registryIdentifierValue: trusted?.ok ? trusted.value.registryIdentifierValue : null,
      businessVerificationStatus: selected.status === "verified" ? "verified" : "unverified",
      businessVerificationMethod: trusted?.ok ? trusted.value.businessVerificationMethod : null,
      businessVerificationSource: trusted?.ok ? trusted.value.businessVerificationSource : null,
      businessVerifiedAt: trusted?.ok ? trusted.value.businessVerifiedAt : null,
      professionalPurposeEvidence: null,
      categoryBStatus: "unknown",
      legalContextReviewState: "no_review_needed",
    };
    const context: BuyerOrderIntentContext = {
      authUserId,
      buyerOrganizationId: selected.organizationId,
      organizationStatus: selected.status,
      legal,
      contact: {
        contactName: `${profile.firstName} ${profile.lastName}`,
        email: profile.contactEmail,
        phone: profile.phone,
      },
      invoice: {
        legalName: selected.legalName,
        taxIdentifierType: "tax_id",
        taxIdentifierValue: tax.canonicalIdentifierValue,
        street: address.street,
        buildingNumber: address.buildingNumber,
        unitNumber: address.unitNumber,
        postalCode: address.postalCode,
        city: address.city,
        countryCode: "PL",
      },
    };
    return evaluateBuyerOrderIntentReadiness(context)
      ? { ok: true, context }
      : { ok: false, code: "BUYER_NOT_READY" };
  } catch {
    return { ok: false, code: "BUYER_ACCOUNT_UNAVAILABLE" };
  }
}
