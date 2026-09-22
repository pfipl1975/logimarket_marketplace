export const BUYER_DETAIL_SELLER_STATUSES = [
  "submitted",
  "seller_accepted",
  "fulfillment_in_progress",
  "fulfilled",
  "seller_rejected",
  "cancelled",
  "expired",
] as const;

export const BUYER_DETAIL_DECISION_STATUSES = [
  "pending_seller_review",
  "seller_accepted",
  "seller_rejected",
  "expired",
] as const;

export type BuyerDetailSellerStatus = (typeof BUYER_DETAIL_SELLER_STATUSES)[number];
export type BuyerDetailDecisionStatus = (typeof BUYER_DETAIL_DECISION_STATUSES)[number];
export type BuyerDetailDecisionPresentation =
  | BuyerDetailDecisionStatus
  | "not_routed"
  | "unavailable";

export type BuyerOrderDetailParentRow = {
  orderId: number;
  createdAt: Date;
  customerPoNumber: string | null;
};

export type BuyerOrderDetailContactRow = {
  contactName: string;
  email: string;
  phone: string | null;
  message: string | null;
};

export type BuyerOrderDetailSellerRow = {
  sellerOrderId: number;
  status: string;
  routedAt: Date | null;
  sellerLegalName: string | null;
  sellerDisplayName: string | null;
  jurisdictionCountry: string | null;
  registeredAddress: string | null;
  firmContactEmail: string | null;
  taxIdentifierType: string | null;
  taxIdentifierValue: string | null;
  registryIdentifierType: string | null;
  registryIdentifierValue: string | null;
  decisionStatus: string | null;
  decisionResolvedAt: Date | null;
  acceptedAt: Date | null;
  expiresAt: Date | null;
};

export type BuyerOrderDetailItemRow = {
  itemId: number;
  sellerOrderId: number;
  offerTitle: string;
  manufacturer: string | null;
  model: string | null;
  quantity: number;
  unitPrice: string;
  currency: string;
};

export type BuyerOrderDetailInput = {
  parent: BuyerOrderDetailParentRow;
  contacts: readonly BuyerOrderDetailContactRow[];
  sellers: readonly BuyerOrderDetailSellerRow[];
  items: readonly BuyerOrderDetailItemRow[];
};

export type BuyerOrderDetailItem = {
  itemId: number;
  offerTitle: string;
  manufacturer: string | null;
  model: string | null;
  quantity: number;
  unitPrice: string;
  currency: string;
};

export type BuyerOrderDetailSeller = {
  sellerOrderId: number;
  status: BuyerDetailSellerStatus;
  decision: BuyerDetailDecisionPresentation;
  routedAt: Date | null;
  decisionResolvedAt: Date | null;
  acceptedAt: Date | null;
  expiresAt: Date | null;
  seller: {
    displayName: string;
    legalName: string;
    jurisdictionCountry: string;
    registeredAddress: string;
    firmContactEmail: string;
    taxIdentifier: { type: string; value: string } | null;
    registryIdentifier: { type: string; value: string } | null;
  };
  items: BuyerOrderDetailItem[];
};

export type BuyerOrderDetail = {
  orderId: number;
  createdAt: Date;
  customerPoNumber: string | null;
  buyerContact: BuyerOrderDetailContactRow;
  sellers: BuyerOrderDetailSeller[];
};

export type BuyerOrderDetailDependencies = {
  findOwnedParent(orderId: number, authUserId: string): Promise<BuyerOrderDetailParentRow | null>;
  loadContacts(orderId: number): Promise<BuyerOrderDetailContactRow[]>;
  loadSellers(orderId: number): Promise<BuyerOrderDetailSellerRow[]>;
  loadItems(orderId: number): Promise<BuyerOrderDetailItemRow[]>;
};

export type BuyerOrderDetailLookup =
  | { ok: true; detail: BuyerOrderDetail }
  | { ok: false; reason: "INVALID_ORDER_ID" | "NOT_FOUND" };

function isSafePositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function requireValidDate(value: Date, field: string): Date {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error(`Invalid ${field}`);
  }
  return new Date(value.getTime());
}

function cloneOptionalDate(value: Date | null, field: string): Date | null {
  return value === null ? null : requireValidDate(value, field);
}

function requireNonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function requireSellerSnapshotValue(value: string | null, field: string): string {
  if (value === null) {
    throw new Error("SellerOrder is missing its immutable seller snapshot");
  }
  return requireNonEmpty(value, field);
}

function optionalPair(type: string | null, value: string | null, field: string) {
  if (type === null && value === null) return null;
  if (type === null || value === null) {
    throw new Error(`Conflicting ${field}`);
  }
  return {
    type: requireNonEmpty(type, `${field} type`),
    value: requireNonEmpty(value, `${field} value`),
  };
}

function isSellerStatus(value: string): value is BuyerDetailSellerStatus {
  return (BUYER_DETAIL_SELLER_STATUSES as readonly string[]).includes(value);
}

function isDecisionStatus(value: string): value is BuyerDetailDecisionStatus {
  return (BUYER_DETAIL_DECISION_STATUSES as readonly string[]).includes(value);
}

function deriveDecision(
  status: BuyerDetailSellerStatus,
  decisionStatus: string | null,
): BuyerDetailDecisionPresentation {
  if (decisionStatus !== null && !isDecisionStatus(decisionStatus)) {
    throw new Error("Unknown seller decision status");
  }

  if (status === "submitted") {
    if (decisionStatus === null) return "not_routed";
    if (decisionStatus === "pending_seller_review") return decisionStatus;
    throw new Error("Conflicting submitted SellerOrder decision");
  }

  if (
    status === "seller_accepted" ||
    status === "fulfillment_in_progress" ||
    status === "fulfilled"
  ) {
    if (decisionStatus !== "seller_accepted") {
      throw new Error("Accepted SellerOrder is missing its accepted decision");
    }
    return decisionStatus;
  }

  if (status === "seller_rejected") {
    if (decisionStatus !== "seller_rejected") {
      throw new Error("Rejected SellerOrder is missing its rejected decision");
    }
    return decisionStatus;
  }

  if (status === "expired") {
    if (decisionStatus !== "expired") {
      throw new Error("Expired SellerOrder is missing its expired decision");
    }
    return decisionStatus;
  }

  return decisionStatus ?? "unavailable";
}

export function parseBuyerOrderDetailId(value: string | undefined | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return isSafePositiveInteger(parsed) ? parsed : null;
}

export function buildBuyerOrderDetail(input: BuyerOrderDetailInput): BuyerOrderDetail {
  if (!isSafePositiveInteger(input.parent.orderId)) {
    throw new Error("Invalid MarketplaceOrder ID");
  }
  if (input.contacts.length !== 1) {
    throw new Error("MarketplaceOrder must have exactly one buyer contact snapshot");
  }
  if (input.sellers.length === 0) {
    throw new Error("MarketplaceOrder must have at least one SellerOrder");
  }

  const contact = input.contacts[0];
  const buyerContact: BuyerOrderDetailContactRow = {
    contactName: requireNonEmpty(contact.contactName, "buyer contact name"),
    email: requireNonEmpty(contact.email, "buyer contact email"),
    phone: contact.phone,
    message: contact.message,
  };

  const itemsBySeller = new Map<number, BuyerOrderDetailItem[]>();
  const seenItemIds = new Set<number>();
  for (const item of input.items) {
    if (!isSafePositiveInteger(item.itemId) || seenItemIds.has(item.itemId)) {
      throw new Error("Invalid or duplicate SellerOrder item ID");
    }
    seenItemIds.add(item.itemId);
    if (!isSafePositiveInteger(item.sellerOrderId)) {
      throw new Error("Invalid SellerOrder reference on item");
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Invalid SellerOrder item quantity");
    }
    if (!/^(0|[1-9]\d*)(?:\.\d+)?$/.test(item.unitPrice)) {
      throw new Error("Invalid SellerOrder item price");
    }
    if (!/^[A-Z]{3}$/.test(item.currency)) {
      throw new Error("Invalid SellerOrder item currency");
    }
    const projected: BuyerOrderDetailItem = {
      itemId: item.itemId,
      offerTitle: requireNonEmpty(item.offerTitle, "offer title"),
      manufacturer: item.manufacturer,
      model: item.model,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      currency: item.currency,
    };
    const sellerItems = itemsBySeller.get(item.sellerOrderId) ?? [];
    sellerItems.push(projected);
    itemsBySeller.set(item.sellerOrderId, sellerItems);
  }

  const seenSellerIds = new Set<number>();
  const sellers = input.sellers.map((row): BuyerOrderDetailSeller => {
    if (!isSafePositiveInteger(row.sellerOrderId) || seenSellerIds.has(row.sellerOrderId)) {
      throw new Error("Invalid or duplicate SellerOrder snapshot");
    }
    seenSellerIds.add(row.sellerOrderId);
    if (!isSellerStatus(row.status)) {
      throw new Error("Unknown SellerOrder status");
    }

    const sellerItems = itemsBySeller.get(row.sellerOrderId);
    if (!sellerItems?.length) {
      throw new Error("SellerOrder must have at least one item");
    }
    sellerItems.sort((a, b) => a.itemId - b.itemId);
    itemsBySeller.delete(row.sellerOrderId);

    return {
      sellerOrderId: row.sellerOrderId,
      status: row.status,
      decision: deriveDecision(row.status, row.decisionStatus),
      routedAt: cloneOptionalDate(row.routedAt, "SellerOrder routed timestamp"),
      decisionResolvedAt: cloneOptionalDate(row.decisionResolvedAt, "seller decision resolved timestamp"),
      acceptedAt: cloneOptionalDate(row.acceptedAt, "seller acceptance timestamp"),
      expiresAt: cloneOptionalDate(row.expiresAt, "seller decision expiry timestamp"),
      seller: {
        displayName: requireSellerSnapshotValue(row.sellerDisplayName, "seller display name"),
        legalName: requireSellerSnapshotValue(row.sellerLegalName, "seller legal name"),
        jurisdictionCountry: requireSellerSnapshotValue(
          row.jurisdictionCountry,
          "seller jurisdiction",
        ),
        registeredAddress: requireSellerSnapshotValue(
          row.registeredAddress,
          "seller registered address",
        ),
        firmContactEmail: requireSellerSnapshotValue(
          row.firmContactEmail,
          "seller contact email",
        ),
        taxIdentifier: optionalPair(row.taxIdentifierType, row.taxIdentifierValue, "seller tax identifier"),
        registryIdentifier: optionalPair(
          row.registryIdentifierType,
          row.registryIdentifierValue,
          "seller registry identifier",
        ),
      },
      items: sellerItems,
    };
  });

  if (itemsBySeller.size > 0) {
    throw new Error("SellerOrder item references an unknown seller");
  }
  sellers.sort((a, b) => a.sellerOrderId - b.sellerOrderId);

  return {
    orderId: input.parent.orderId,
    createdAt: requireValidDate(input.parent.createdAt, "MarketplaceOrder creation date"),
    customerPoNumber: input.parent.customerPoNumber,
    buyerContact,
    sellers,
  };
}

export async function resolveOwnedBuyerOrderDetail(
  deps: BuyerOrderDetailDependencies,
  orderId: unknown,
  authUserId: string,
): Promise<BuyerOrderDetailLookup> {
  if (typeof orderId !== "number" || !isSafePositiveInteger(orderId)) {
    return { ok: false, reason: "INVALID_ORDER_ID" };
  }

  const parent = await deps.findOwnedParent(orderId, authUserId);
  if (!parent) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const [contacts, sellers, items] = await Promise.all([
    deps.loadContacts(parent.orderId),
    deps.loadSellers(parent.orderId),
    deps.loadItems(parent.orderId),
  ]);

  return {
    ok: true,
    detail: buildBuyerOrderDetail({ parent, contacts, sellers, items }),
  };
}
