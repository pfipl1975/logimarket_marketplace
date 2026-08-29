import test from "node:test";
import assert from "node:assert";
import { groupLinesByPartner } from "@/lib/marketplace/partner-grouping";
import type { AuthoritativeMarketplaceLine } from "@/lib/marketplace/order-orchestration-types";

function createLine(partnerId: number, offerId: number): AuthoritativeMarketplaceLine {
  return {
    offerId,
    partnerId,
    title: "Test",
    quantity: 1,
    offerModel: "marketplace",
    conversionType: "inbound",
    publicationStatus: "published",
    isActive: true,
    priceOnRequest: false,
    unitPriceMinor: 100n,
    contractModel: "partner_marketplace",
    currency: "PLN",
  };
}

test("GROUP_01_SINGLE_PARTNER", () => {
  const lines = [createLine(10, 1), createLine(10, 2)];
  const res = groupLinesByPartner(lines);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.strictEqual(res.groups.length, 1);
    assert.strictEqual(res.groups[0].partnerId, 10);
    assert.strictEqual(res.groups[0].lines.length, 2);
  }
});

test("GROUP_02_MULTIPLE_PARTNERS", () => {
  const lines = [createLine(10, 1), createLine(20, 2), createLine(10, 3)];
  const res = groupLinesByPartner(lines);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.strictEqual(res.groups.length, 2);
    // Keys sorted 10 then 20
    assert.strictEqual(res.groups[0].partnerId, 10);
    assert.strictEqual(res.groups[0].lines.length, 2);
    assert.strictEqual(res.groups[1].partnerId, 20);
    assert.strictEqual(res.groups[1].lines.length, 1);
  }
});

test("GROUP_03_SAME_PARTNER_ONE_GROUP", () => {
  const lines = [createLine(5, 1), createLine(5, 2)];
  const res = groupLinesByPartner(lines);
  assert.strictEqual(res.ok, true);
  if (res.ok) assert.strictEqual(res.groups.length, 1);
});

test("GROUP_04_INVALID_PARTNER_REJECTED", () => {
  const lines = [createLine(0, 1)];
  const res = groupLinesByPartner(lines);
  assert.strictEqual(res.ok, false);
});

test("GROUP_05_DETERMINISTIC_GROUP_ORDER", () => {
  const lines = [createLine(50, 1), createLine(10, 2), createLine(30, 3)];
  const res = groupLinesByPartner(lines);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.strictEqual(res.groups[0].partnerId, 10);
    assert.strictEqual(res.groups[1].partnerId, 30);
    assert.strictEqual(res.groups[2].partnerId, 50);
  }
});

test("GROUP_06_DETERMINISTIC_LINE_ORDER", () => {
  const lines = [createLine(10, 3), createLine(10, 1), createLine(10, 2)];
  const res = groupLinesByPartner(lines);
  assert.strictEqual(res.ok, true);
  if (res.ok) {
    assert.strictEqual(res.groups[0].lines[0].offerId, 3);
    assert.strictEqual(res.groups[0].lines[1].offerId, 1);
    assert.strictEqual(res.groups[0].lines[2].offerId, 2);
  }
});

test("GROUP_07_INPUT_NOT_MUTATED", () => {
  const lines = [createLine(20, 1), createLine(10, 2)];
  const copy = [...lines];
  groupLinesByPartner(lines);
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0], copy[0]);
  assert.strictEqual(lines[1], copy[1]);
});
