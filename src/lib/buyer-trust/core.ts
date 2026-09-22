import type {
  BuyerOrganizationMembershipRole,
  BuyerOrganizationMembershipStatus,
  BuyerOrganizationVerificationActorType,
  BuyerOrganizationVerificationEventType,
  BuyerOrganizationVerificationSourceType,
  BuyerOrganizationVerificationStatus,
} from "../schema";

export type BuyerTrustFailureCode =
  | "BUYER_AUTH_REQUIRED"
  | "BUYER_ORGANIZATION_MEMBERSHIP_REQUIRED"
  | "BUYER_ORGANIZATION_NOT_FOUND"
  | "BUYER_ORGANIZATION_NOT_VERIFIED"
  | "BUYER_IDENTIFIER_NOT_TRUSTED"
  | "BUYER_TRUST_STATE_INCONSISTENT"
  | "BUYER_TRUST_INVALID_TRANSITION"
  | "BUYER_TRUST_CONCURRENT_CONFLICT"
  | "BUYER_TRUST_INPUT_INVALID"
  | "BUYER_CANONICAL_IDENTITY_CONFLICT"
  | "SYSTEM_ERROR";

export type BuyerTrustResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: BuyerTrustFailureCode };

export type BuyerOrganizationMembershipProof = {
  buyerOrganizationId: number;
  membershipRole: BuyerOrganizationMembershipRole;
  membershipStatus: BuyerOrganizationMembershipStatus;
  endedAt: Date | string | null;
};

export function parseSafePositiveId(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

export function evaluateBuyerOrganizationMembership(
  membership: BuyerOrganizationMembershipProof | undefined,
  expectedOrganizationId: number,
): BuyerTrustResult<{ buyerOrganizationId: number; membershipRole: BuyerOrganizationMembershipRole }> {
  if (
    !membership ||
    membership.buyerOrganizationId !== expectedOrganizationId ||
    membership.membershipStatus !== "active" ||
    membership.endedAt !== null ||
    !["organization_admin", "authorized_buyer"].includes(membership.membershipRole)
  ) {
    return { ok: false, code: "BUYER_ORGANIZATION_MEMBERSHIP_REQUIRED" };
  }

  return {
    ok: true,
    value: {
      buyerOrganizationId: membership.buyerOrganizationId,
      membershipRole: membership.membershipRole,
    },
  };
}

export type BuyerTrustTransitionDecision = {
  eventType: BuyerOrganizationVerificationEventType;
  outcomeStatus: BuyerOrganizationVerificationStatus;
};

export function evaluateBuyerTrustTransition(
  currentStatus: BuyerOrganizationVerificationStatus,
  expectedStatus: BuyerOrganizationVerificationStatus,
  eventType: BuyerOrganizationVerificationEventType,
): BuyerTrustResult<BuyerTrustTransitionDecision> {
  if (currentStatus !== expectedStatus) {
    return { ok: false, code: "BUYER_TRUST_CONCURRENT_CONFLICT" };
  }

  const nextByEvent: Record<BuyerOrganizationVerificationEventType, BuyerOrganizationVerificationStatus> = {
    verified: "verified",
    rejected: "rejected",
    revoked: "revoked",
    invalidated: "pending",
  };
  const outcomeStatus = nextByEvent[eventType];

  const allowed =
    ((currentStatus === "pending" || currentStatus === "rejected" || currentStatus === "revoked") && eventType === "verified") ||
    (currentStatus === "pending" && eventType === "rejected") ||
    (currentStatus === "verified" && (eventType === "revoked" || eventType === "invalidated"));

  if (!allowed || outcomeStatus === currentStatus) {
    return { ok: false, code: "BUYER_TRUST_INVALID_TRANSITION" };
  }

  return { ok: true, value: { eventType, outcomeStatus } };
}

export type BuyerTrustEventAuthority = {
  actorType: BuyerOrganizationVerificationActorType;
  actorUserId: string | null;
  sourceType: BuyerOrganizationVerificationSourceType;
};

export function validateBuyerTrustEventAuthority(authority: BuyerTrustEventAuthority): boolean {
  const actorHasExpectedUser =
    (["admin", "buyer_user"] as BuyerOrganizationVerificationActorType[]).includes(authority.actorType)
      ? typeof authority.actorUserId === "string" && authority.actorUserId.trim().length > 0
      : authority.actorUserId === null;

  const expectedActor: Record<BuyerOrganizationVerificationSourceType, BuyerOrganizationVerificationActorType> = {
    admin_manual: "admin",
    buyer_change: "buyer_user",
    system_rule: "system",
    external_adapter: "external_adapter",
  };

  return actorHasExpectedUser && expectedActor[authority.sourceType] === authority.actorType;
}

export type TrustedBuyerOrganizationRow = {
  id: number;
  legalName: string;
  jurisdictionCountry: string;
  verificationStatus: BuyerOrganizationVerificationStatus;
  currentVerificationEventId: number | null;
  verifiedAt: Date | string | null;
};

export type TrustedBuyerVerificationEventRow = {
  id: number;
  buyerOrganizationId: number;
  eventType: BuyerOrganizationVerificationEventType;
  outcomeStatus: BuyerOrganizationVerificationStatus;
  verificationMethod: string;
  sourceType: BuyerOrganizationVerificationSourceType;
  sourceName: string | null;
  occurredAt: Date | string;
  legalNameSnapshot: string;
  jurisdictionCountrySnapshot: string;
  taxIdentifierId: number | null;
  taxIdentifierTypeSnapshot: string | null;
  taxIdentifierValueSnapshot: string | null;
  taxCountryCodeSnapshot: string | null;
  registryIdentifierId: number | null;
  registryTypeSnapshot: string | null;
  registryValueSnapshot: string | null;
  registryCountryCodeSnapshot: string | null;
};

export type TrustedBuyerTaxIdentifierRow = {
  id: number;
  buyerOrganizationId: number;
  identifierType: string;
  identifierValue: string;
  countryCode: string;
  canonicalIdentityClass: string;
  canonicalIdentifierValue: string;
  trustedByVerificationEventId: number | null;
  retiredAt: Date | string | null;
};

export type TrustedBuyerRegistryIdentifierRow = {
  id: number;
  buyerOrganizationId: number;
  registryType: string;
  registryValue: string;
  jurisdictionCountry: string;
  trustedByVerificationEventId: number | null;
  retiredAt: Date | string | null;
};

export type TrustedBuyerIdentity = {
  buyerOrganizationId: number;
  businessName: string;
  countryCode: string;
  taxIdentifierType: string;
  taxIdentifierValue: string;
  registryIdentifierType: string | null;
  registryIdentifierValue: string | null;
  businessVerificationStatus: "verified";
  businessVerificationMethod: string;
  businessVerificationSource: string;
  businessVerifiedAt: Date;
};

function sameInstant(left: Date | string | null, right: Date | string): boolean {
  if (left === null) return false;
  const leftMs = new Date(left).getTime();
  const rightMs = new Date(right).getTime();
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
}

export function evaluateTrustedBuyerIdentity(input: {
  organization: TrustedBuyerOrganizationRow;
  currentEvent: TrustedBuyerVerificationEventRow | undefined;
  taxIdentifiers: TrustedBuyerTaxIdentifierRow[];
  registryIdentifiers: TrustedBuyerRegistryIdentifierRow[];
}): BuyerTrustResult<TrustedBuyerIdentity> {
  const { organization, currentEvent, taxIdentifiers, registryIdentifiers } = input;

  if (organization.verificationStatus !== "verified") {
    return { ok: false, code: "BUYER_ORGANIZATION_NOT_VERIFIED" };
  }
  if (
    organization.currentVerificationEventId === null ||
    !currentEvent ||
    currentEvent.id !== organization.currentVerificationEventId ||
    currentEvent.buyerOrganizationId !== organization.id ||
    currentEvent.eventType !== "verified" ||
    currentEvent.outcomeStatus !== "verified" ||
    currentEvent.legalNameSnapshot !== organization.legalName ||
    currentEvent.jurisdictionCountrySnapshot !== organization.jurisdictionCountry ||
    !sameInstant(organization.verifiedAt, currentEvent.occurredAt)
  ) {
    return { ok: false, code: "BUYER_TRUST_STATE_INCONSISTENT" };
  }

  const trustedTax = taxIdentifiers.filter(
    (row) => row.retiredAt === null && row.trustedByVerificationEventId === currentEvent.id,
  );
  const trustedRegistry = registryIdentifiers.filter(
    (row) => row.retiredAt === null && row.trustedByVerificationEventId === currentEvent.id,
  );

  if (trustedTax.length !== 1 || trustedRegistry.length > 1) {
    return { ok: false, code: "BUYER_IDENTIFIER_NOT_TRUSTED" };
  }

  const tax = trustedTax[0];
  const registry = trustedRegistry[0];
  const taxMatches =
    tax.buyerOrganizationId === organization.id &&
    currentEvent.taxIdentifierId === tax.id &&
    currentEvent.taxIdentifierTypeSnapshot === tax.identifierType &&
    currentEvent.taxIdentifierValueSnapshot === tax.identifierValue &&
    currentEvent.taxCountryCodeSnapshot === tax.countryCode;
  const registryMatches = registry
    ? registry.buyerOrganizationId === organization.id &&
      currentEvent.registryIdentifierId === registry.id &&
      currentEvent.registryTypeSnapshot === registry.registryType &&
      currentEvent.registryValueSnapshot === registry.registryValue &&
      currentEvent.registryCountryCodeSnapshot === registry.jurisdictionCountry
    : currentEvent.registryIdentifierId === null &&
      currentEvent.registryTypeSnapshot === null &&
      currentEvent.registryValueSnapshot === null &&
      currentEvent.registryCountryCodeSnapshot === null;

  if (!taxMatches || !registryMatches) {
    return { ok: false, code: "BUYER_TRUST_STATE_INCONSISTENT" };
  }
  if (
    organization.jurisdictionCountry !== "PL" ||
    tax.countryCode !== "PL" ||
    tax.canonicalIdentityClass !== "PL:NIP" ||
    tax.identifierType !== "tax_id"
  ) {
    return { ok: false, code: "BUYER_IDENTIFIER_NOT_TRUSTED" };
  }

  const verifiedAt = new Date(currentEvent.occurredAt);
  if (!Number.isFinite(verifiedAt.getTime())) {
    return { ok: false, code: "BUYER_TRUST_STATE_INCONSISTENT" };
  }

  return {
    ok: true,
    value: {
      buyerOrganizationId: organization.id,
      businessName: organization.legalName,
      countryCode: organization.jurisdictionCountry,
      taxIdentifierType: tax.identifierType,
      taxIdentifierValue: tax.identifierValue,
      registryIdentifierType: registry?.registryType ?? null,
      registryIdentifierValue: registry?.registryValue ?? null,
      businessVerificationStatus: "verified",
      businessVerificationMethod: currentEvent.verificationMethod,
      businessVerificationSource: currentEvent.sourceName ?? currentEvent.sourceType,
      businessVerifiedAt: verifiedAt,
    },
  };
}
