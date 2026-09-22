import test from "node:test";
import assert from "node:assert/strict";
import { parseOfferDraftCreateInput } from "../../src/lib/offers/draft-core";

test("Partner offer create input parsing", () => {
  const valid = parseOfferDraftCreateInput({
    partnerId: "123",
    categoryId: "456",
    title: "Partner draft",
    adminOfferType: "rfq",
  });
  
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.partnerId, 123);
    assert.equal(valid.data.categoryId, 456);
    assert.equal(valid.data.title, "Partner draft");
    assert.equal(valid.data.adminOfferType, "rfq");
  }

  const invalidType = parseOfferDraftCreateInput({
    partnerId: 1,
    categoryId: 1,
    title: "X",
    adminOfferType: "invalid_type",
  });
  assert.equal(invalidType.ok, false);
});
