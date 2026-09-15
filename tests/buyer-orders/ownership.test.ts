import { describe, it } from "node:test";
import * as assert from "node:assert";

import {
  getOwnedOrder,
  isValidMarketplaceOrderId,
  listOwnedOrders,
  type OwnedOrderSummary,
  type OwnershipAuthUser,
  type OwnershipDependencies,
} from "../../src/lib/buyer-orders/ownership-core";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const FIXED_CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

type RecordedCall = {
  method: "requireUser" | "findOwnedOrder" | "listOwnedOrders";
  args: unknown[];
};

type StubOrder = { orderId: number; ownerId: string };

function project(order: StubOrder): OwnedOrderSummary {
  return {
    orderId: order.orderId,
    status: "checkout_submitted",
    createdAt: FIXED_CREATED_AT,
  };
}

function createHarness(config: {
  user?: OwnershipAuthUser;
  authError?: unknown;
  orders?: StubOrder[];
}) {
  const calls: RecordedCall[] = [];
  const orders = config.orders ?? [];

  const deps: OwnershipDependencies = {
    async requireUser() {
      calls.push({ method: "requireUser", args: [] });
      if (config.authError !== undefined) {
        throw config.authError;
      }
      if (!config.user) {
        throw new Error("Unauthorized");
      }
      return config.user;
    },
    async findOwnedOrder(orderId, authUserId) {
      calls.push({ method: "findOwnedOrder", args: [orderId, authUserId] });
      const match = orders.find(
        (order) => order.orderId === orderId && order.ownerId === authUserId
      );
      return match ? project(match) : null;
    },
    async listOwnedOrders(authUserId) {
      calls.push({ method: "listOwnedOrders", args: [authUserId] });
      return orders
        .filter((order) => order.ownerId === authUserId)
        .map(project);
    },
  };

  return { deps, calls };
}

describe("buyer order ownership core", () => {
  it("1. allows the authenticated owner to read their own order", async () => {
    const { deps } = createHarness({
      user: { id: USER_A },
      orders: [{ orderId: 42, ownerId: USER_A }],
    });

    const result = await getOwnedOrder(deps, 42);

    assert.strictEqual(result.ok, true);
    if (!result.ok) return;
    assert.strictEqual(result.order.orderId, 42);
    assert.strictEqual(result.order.status, "checkout_submitted");
  });

  it("2. returns NOT_FOUND when another user requests the order", async () => {
    const { deps } = createHarness({
      user: { id: USER_B },
      orders: [{ orderId: 42, ownerId: USER_A }],
    });

    const result = await getOwnedOrder(deps, 42);

    assert.strictEqual(result.ok, false);
    if (result.ok) return;
    assert.strictEqual(result.reason, "NOT_FOUND");
  });

  it("3. returns the same NOT_FOUND semantic for a nonexistent order", async () => {
    const crossUser = await getOwnedOrder(
      createHarness({
        user: { id: USER_B },
        orders: [{ orderId: 42, ownerId: USER_A }],
      }).deps,
      42
    );
    const nonexistent = await getOwnedOrder(
      createHarness({ user: { id: USER_A }, orders: [] }).deps,
      999
    );

    assert.strictEqual(crossUser.ok, false);
    assert.strictEqual(nonexistent.ok, false);
    if (crossUser.ok || nonexistent.ok) return;
    assert.strictEqual(crossUser.reason, nonexistent.reason);
    assert.strictEqual(crossUser.reason, "NOT_FOUND");
  });

  it("4. propagates an unauthenticated error without converting it to NOT_FOUND", async () => {
    const { deps } = createHarness({ authError: new Error("Unauthorized") });

    await assert.rejects(
      () => getOwnedOrder(deps, 42),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.strictEqual(error.message, "Unauthorized");
        return true;
      }
    );
  });

  it("5. propagates an auth infrastructure error distinctly", async () => {
    const unauthenticated = createHarness({ authError: new Error("Unauthorized") });
    const infrastructure = createHarness({
      authError: new Error("Auth Infrastructure Unavailable"),
    });

    await assert.rejects(
      () => getOwnedOrder(unauthenticated.deps, 42),
      (error: unknown) => error instanceof Error && error.message === "Unauthorized"
    );
    await assert.rejects(
      () => getOwnedOrder(infrastructure.deps, 42),
      (error: unknown) =>
        error instanceof Error &&
        error.message === "Auth Infrastructure Unavailable"
    );

    assert.notStrictEqual(
      "Unauthorized",
      "Auth Infrastructure Unavailable"
    );
  });

  it("6. rejects invalid identifiers before any lookup occurs", async () => {
    const invalidIds: unknown[] = [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1];

    for (const invalidId of invalidIds) {
      const { deps, calls } = createHarness({
        user: { id: USER_A },
        orders: [{ orderId: 42, ownerId: USER_A }],
      });

      const result = await getOwnedOrder(deps, invalidId);

      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.reason, "INVALID_ORDER_ID");
      }
      assert.deepStrictEqual(calls, []);
    }
  });

  it("6b. accepts a safe positive integer boundary and performs the lookup", async () => {
    assert.strictEqual(isValidMarketplaceOrderId(1), true);
    assert.strictEqual(isValidMarketplaceOrderId(Number.MAX_SAFE_INTEGER), true);
    assert.strictEqual(isValidMarketplaceOrderId("42"), false);
    assert.strictEqual(isValidMarketplaceOrderId(null), false);
  });

  it("7. lists only orders owned by the authenticated user.id", async () => {
    const { deps, calls } = createHarness({
      user: { id: USER_A },
      orders: [
        { orderId: 1, ownerId: USER_A },
        { orderId: 2, ownerId: USER_B },
      ],
    });

    const orders = await listOwnedOrders(deps);

    assert.deepStrictEqual(
      orders.map((order) => order.orderId),
      [1]
    );
    assert.deepStrictEqual(calls, [
      { method: "requireUser", args: [] },
      { method: "listOwnedOrders", args: [USER_A] },
    ]);
  });

  it("8-11. never authorizes on email, NIP, company or sessionHash", async () => {
    const alternateAuthority = [
      "buyer@example.com",
      "PL-NIP-0000000000",
      "ACME LOGISTICS SPOLKA Z OGRANICZONA ODPOWIEDZIALNOSCIA",
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ];

    for (const authority of alternateAuthority) {
      const { deps, calls } = createHarness({
        user: { id: USER_A },
        orders: [{ orderId: 77, ownerId: authority }],
      });

      const result = await getOwnedOrder(deps, 77);

      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.reason, "NOT_FOUND");
      }
      assert.deepStrictEqual(calls, [
        { method: "requireUser", args: [] },
        { method: "findOwnedOrder", args: [77, USER_A] },
      ]);
      assert.ok(
        !JSON.stringify(calls).includes(authority),
        `ownership lookup must not carry ${authority}`
      );
    }
  });

  it("12. returns only the minimum ownership proof", async () => {
    const { deps } = createHarness({
      user: { id: USER_A },
      orders: [{ orderId: 42, ownerId: USER_A }],
    });

    const result = await getOwnedOrder(deps, 42);

    assert.strictEqual(result.ok, true);
    if (!result.ok) return;

    assert.deepStrictEqual(Object.keys(result.order).sort(), [
      "createdAt",
      "orderId",
      "status",
    ]);

    const serialized = JSON.stringify(result.order);
    assert.ok(!serialized.includes("sessionHash"));
    assert.ok(!serialized.includes("buyerAuthUserId"));
    assert.ok(!serialized.includes(USER_A));
  });
});