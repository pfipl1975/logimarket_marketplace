import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  buildBuyerOrderDetail,
  parseBuyerOrderDetailId,
  resolveOwnedBuyerOrderDetail,
  type BuyerOrderDetailContactRow,
  type BuyerOrderDetailDependencies,
  type BuyerOrderDetailInput,
  type BuyerOrderDetailItemRow,
  type BuyerOrderDetailSellerRow,
} from "../../src/lib/buyer-orders/detail-read-model-core";

const CREATED = new Date("2026-09-16T08:00:00.000Z");
const ROUTED = new Date("2026-09-16T08:01:00.000Z");
const RESOLVED = new Date("2026-09-16T09:00:00.000Z");

function contact(
  overrides: Partial<BuyerOrderDetailContactRow> = {},
): BuyerOrderDetailContactRow {
  return {
    contactName: "Ada Buyer",
    email: "ada@example.test",
    phone: "+48 500 600 700",
    message: "Please confirm availability.",
    ...overrides,
  };
}

function seller(
  overrides: Partial<BuyerOrderDetailSellerRow> = {},
): BuyerOrderDetailSellerRow {
  return {
    sellerOrderId: 10,
    status: "submitted",
    routedAt: ROUTED,
    sellerLegalName: "Seller Legal sp. z o.o.",
    sellerDisplayName: "Seller Display",
    jurisdictionCountry: "PL",
    registeredAddress: "ul. Testowa 1, Warszawa",
    firmContactEmail: "sales@seller.example",
    taxIdentifierType: "NIP",
    taxIdentifierValue: "1234567890",
    registryIdentifierType: "KRS",
    registryIdentifierValue: "0000123456",
    decisionStatus: "pending_seller_review",
    decisionResolvedAt: null,
    acceptedAt: null,
    expiresAt: new Date("2026-09-17T08:01:00.000Z"),
    ...overrides,
  };
}

function item(
  overrides: Partial<BuyerOrderDetailItemRow> = {},
): BuyerOrderDetailItemRow {
  return {
    itemId: 100,
    sellerOrderId: 10,
    offerTitle: "Industrial component",
    manufacturer: "Acme",
    model: "X-1",
    quantity: 2,
    unitPrice: "123.4500",
    currency: "PLN",
    ...overrides,
  };
}

function input(
  overrides: Partial<BuyerOrderDetailInput> = {},
): BuyerOrderDetailInput {
  return {
    parent: {
      orderId: 42,
      createdAt: CREATED,
      customerPoNumber: "PO-2026-42",
    },
    contacts: [contact()],
    sellers: [seller()],
    items: [item()],
    ...overrides,
  };
}

test("route ID parser accepts only positive safe integer references", () => {
  assert.strictEqual(parseBuyerOrderDetailId("42"), 42);
  for (const value of [undefined, null, "", "0", "-1", "1.2", "01", "abc", "9007199254740992"]) {
    assert.strictEqual(parseBuyerOrderDetailId(value), null);
  }
});

test("invalid route ID performs no ownership or child lookup", async () => {
  const calls: string[] = [];
  const deps: BuyerOrderDetailDependencies = {
    async findOwnedParent() {
      calls.push("parent");
      return null;
    },
    async loadContacts() {
      calls.push("contacts");
      return [];
    },
    async loadSellers() {
      calls.push("sellers");
      return [];
    },
    async loadItems() {
      calls.push("items");
      return [];
    },
  };

  assert.deepStrictEqual(
    await resolveOwnedBuyerOrderDetail(deps, 0, "auth-user-1"),
    { ok: false, reason: "INVALID_ORDER_ID" },
  );
  assert.deepStrictEqual(calls, []);
});

test("ownership query receives both order ID and trusted auth user ID before child loads", async () => {
  const calls: Array<[string, number, string?]> = [];
  const deps: BuyerOrderDetailDependencies = {
    async findOwnedParent(orderId, authUserId) {
      calls.push(["parent", orderId, authUserId]);
      return input().parent;
    },
    async loadContacts(orderId) {
      calls.push(["contacts", orderId]);
      return [contact()];
    },
    async loadSellers(orderId) {
      calls.push(["sellers", orderId]);
      return [seller()];
    },
    async loadItems(orderId) {
      calls.push(["items", orderId]);
      return [item()];
    },
  };

  const result = await resolveOwnedBuyerOrderDetail(deps, 42, "trusted-auth-user");
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(calls[0], ["parent", 42, "trusted-auth-user"]);
  assert.deepStrictEqual(
    calls.slice(1).map(([name, orderId]) => [name, orderId]).sort(),
    [["contacts", 42], ["items", 42], ["sellers", 42]],
  );
});

test("unowned and nonexistent parent share NOT_FOUND and never load child rows", async () => {
  const childCalls: string[] = [];
  const deps: BuyerOrderDetailDependencies = {
    async findOwnedParent(orderId, authUserId) {
      assert.strictEqual(orderId, 42);
      assert.strictEqual(authUserId, "trusted-auth-user");
      return null;
    },
    async loadContacts() {
      childCalls.push("contacts");
      return [];
    },
    async loadSellers() {
      childCalls.push("sellers");
      return [];
    },
    async loadItems() {
      childCalls.push("items");
      return [];
    },
  };

  assert.deepStrictEqual(
    await resolveOwnedBuyerOrderDetail(deps, 42, "trusted-auth-user"),
    { ok: false, reason: "NOT_FOUND" },
  );
  assert.deepStrictEqual(childCalls, []);
});

test("one SellerOrder and one item project immutable Buyer-facing detail", () => {
  const detail = buildBuyerOrderDetail(input());

  assert.strictEqual(detail.orderId, 42);
  assert.strictEqual(detail.customerPoNumber, "PO-2026-42");
  assert.deepStrictEqual(detail.buyerContact, contact());
  assert.strictEqual(detail.sellers[0].decision, "pending_seller_review");
  assert.deepStrictEqual(detail.sellers[0].seller.taxIdentifier, {
    type: "NIP",
    value: "1234567890",
  });
  assert.deepStrictEqual(detail.sellers[0].items[0], {
    itemId: 100,
    offerTitle: "Industrial component",
    manufacturer: "Acme",
    model: "X-1",
    quantity: 2,
    unitPrice: "123.4500",
    currency: "PLN",
  });
  assert.strictEqual("sellerOrderId" in detail.sellers[0].items[0], false);
  assert.notStrictEqual(detail.createdAt, CREATED);
  assert.notStrictEqual(detail.sellers[0].routedAt, ROUTED);
});

test("multiple sellers and items are sorted deterministically without mutating source order", () => {
  const sellers = Object.freeze([
    Object.freeze(seller({
      sellerOrderId: 20,
      status: "seller_rejected",
      decisionStatus: "seller_rejected",
      decisionResolvedAt: RESOLVED,
    })),
    Object.freeze(seller({ sellerOrderId: 10 })),
  ]);
  const items = Object.freeze([
    Object.freeze(item({ itemId: 202, sellerOrderId: 20 })),
    Object.freeze(item({ itemId: 102, sellerOrderId: 10 })),
    Object.freeze(item({ itemId: 101, sellerOrderId: 10 })),
    Object.freeze(item({ itemId: 201, sellerOrderId: 20 })),
  ]);

  const detail = buildBuyerOrderDetail(input({ sellers, items }));
  assert.deepStrictEqual(detail.sellers.map((entry) => entry.sellerOrderId), [10, 20]);
  assert.deepStrictEqual(detail.sellers[0].items.map((entry) => entry.itemId), [101, 102]);
  assert.deepStrictEqual(detail.sellers[1].items.map((entry) => entry.itemId), [201, 202]);
  assert.deepStrictEqual(sellers.map((entry) => entry.sellerOrderId), [20, 10]);
  assert.deepStrictEqual(items.map((entry) => entry.itemId), [202, 102, 101, 201]);
});

test("nullable manufacturer and model remain explicit nulls", () => {
  const detail = buildBuyerOrderDetail(input({
    items: [item({ manufacturer: null, model: null })],
  }));
  assert.strictEqual(detail.sellers[0].items[0].manufacturer, null);
  assert.strictEqual(detail.sellers[0].items[0].model, null);
});

test("canonical SellerOrder and decision combinations preserve decision history", () => {
  const cases: Array<[string, string | null, string]> = [
    ["submitted", null, "not_routed"],
    ["submitted", "pending_seller_review", "pending_seller_review"],
    ["seller_accepted", "seller_accepted", "seller_accepted"],
    ["fulfillment_in_progress", "seller_accepted", "seller_accepted"],
    ["fulfilled", "seller_accepted", "seller_accepted"],
    ["seller_rejected", "seller_rejected", "seller_rejected"],
    ["expired", "expired", "expired"],
    ["cancelled", null, "unavailable"],
  ];

  for (const [status, decisionStatus, expected] of cases) {
    const detail = buildBuyerOrderDetail(input({
      sellers: [seller({ status, decisionStatus })],
    }));
    assert.strictEqual(detail.sellers[0].decision, expected, status);
  }
});

test("unknown or conflicting statuses fail closed", () => {
  assert.throws(
    () => buildBuyerOrderDetail(input({ sellers: [seller({ status: "unknown" })] })),
    /Unknown SellerOrder status/,
  );
  assert.throws(
    () => buildBuyerOrderDetail(input({ sellers: [seller({ decisionStatus: "unknown" })] })),
    /Unknown seller decision status/,
  );
  assert.throws(
    () => buildBuyerOrderDetail(input({
      sellers: [seller({ status: "submitted", decisionStatus: "seller_accepted" })],
    })),
    /Conflicting submitted/,
  );
  assert.throws(
    () => buildBuyerOrderDetail(input({
      sellers: [seller({ status: "fulfilled", decisionStatus: null })],
    })),
    /missing its accepted decision/,
  );
});

test("duplicate or structurally conflicting snapshot state fails closed", () => {
  assert.throws(
    () => buildBuyerOrderDetail(input({ contacts: [contact(), contact()] })),
    /exactly one buyer contact snapshot/,
  );
  assert.throws(
    () => buildBuyerOrderDetail(input({
      sellers: [seller(), seller()],
      items: [item()],
    })),
    /duplicate SellerOrder snapshot/,
  );
  assert.throws(
    () => buildBuyerOrderDetail(input({
      sellers: [seller({ taxIdentifierType: "NIP", taxIdentifierValue: null })],
    })),
    /Conflicting seller tax identifier/,
  );
});

test("missing immutable seller snapshot among multiple SellerOrders fails closed", () => {
  assert.throws(
    () => buildBuyerOrderDetail(input({
      sellers: [
        seller(),
        seller({
          sellerOrderId: 20,
          sellerLegalName: null,
          sellerDisplayName: null,
          jurisdictionCountry: null,
          registeredAddress: null,
          firmContactEmail: null,
          taxIdentifierType: null,
          taxIdentifierValue: null,
          registryIdentifierType: null,
          registryIdentifierValue: null,
        }),
      ],
      items: [item(), item({ itemId: 200, sellerOrderId: 20 })],
    })),
    /missing its immutable seller snapshot/,
  );
});

test("invalid IDs, quantities, prices and orphaned items fail closed", () => {
  assert.throws(
    () => buildBuyerOrderDetail(input({ parent: { ...input().parent, orderId: 0 } })),
    /Invalid MarketplaceOrder ID/,
  );
  assert.throws(
    () => buildBuyerOrderDetail(input({ items: [item({ quantity: 0 })] })),
    /item quantity/,
  );
  assert.throws(
    () => buildBuyerOrderDetail(input({ items: [item({ unitPrice: "NaN" })] })),
    /item price/,
  );
  assert.throws(
    () => buildBuyerOrderDetail(input({ items: [item({ sellerOrderId: 999 })] })),
    /at least one item/,
  );
});

test("presentation excludes ownership and internal seller decision fields", () => {
  const unsafeContact = {
    ...contact(),
    buyerAuthUserId: "11111111-1111-4111-8111-111111111111",
    sessionHash: "private-session",
  };
  const unsafeSeller = {
    ...seller(),
    partnerId: 77,
    decisionSource: "internal-admin",
    authUserId: "22222222-2222-4222-8222-222222222222",
  };

  const detail = buildBuyerOrderDetail(input({
    contacts: [unsafeContact],
    sellers: [unsafeSeller],
  }));
  const serialized = JSON.stringify(detail);
  for (const forbidden of [
    "buyerAuthUserId",
    "sessionHash",
    "private-session",
    "partnerId",
    "decisionSource",
    "internal-admin",
    "authUserId",
  ]) {
    assert.strictEqual(serialized.includes(forbidden), false, forbidden);
  }
});
