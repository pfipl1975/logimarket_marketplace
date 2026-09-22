import test from "node:test";
import assert from "node:assert/strict";
import {
  executeFulfillmentActionCore,
  mapFulfillmentResultToUiState,
  type FulfillmentExecutors,
} from "../../src/lib/partner-orders/fulfillment-action-core";

function fulfillmentForm(sellerOrderId: string, action: string): FormData {
  const form = new FormData();
  form.set("sellerOrderId", sellerOrderId);
  form.set("action", action);
  return form;
}

test("fulfillment action accepts only safe positive seller-order IDs and bounded actions", async () => {
  let calls = 0;
  const executors: FulfillmentExecutors = {
    markSellerOrderFulfillmentInProgress: async () => {
      calls += 1;
      return { ok: true };
    },
    markSellerOrderFulfilled: async () => {
      calls += 1;
      return { ok: true };
    },
  };

  for (const sellerOrderId of ["0", "-1", "1.5", "01", "9007199254740992", "not-an-id"]) {
    assert.equal(
      await executeFulfillmentActionCore(
        fulfillmentForm(sellerOrderId, "start_fulfillment"),
        executors
      ),
      "invalid_request"
    );
  }
  assert.equal(
    await executeFulfillmentActionCore(fulfillmentForm("7", "publish"), executors),
    "invalid_request"
  );
  assert.equal(calls, 0);
});

test("fulfillment action dispatches each legal command with the parsed ID", async () => {
  const seen: Array<[string, number]> = [];
  const executors: FulfillmentExecutors = {
    markSellerOrderFulfillmentInProgress: async (id) => {
      seen.push(["start", id]);
      return { ok: true };
    },
    markSellerOrderFulfilled: async (id) => {
      seen.push(["complete", id]);
      return { ok: true };
    },
  };

  assert.equal(
    await executeFulfillmentActionCore(fulfillmentForm("41", "start_fulfillment"), executors),
    "fulfillment_in_progress"
  );
  assert.equal(
    await executeFulfillmentActionCore(fulfillmentForm("41", "complete_fulfillment"), executors),
    "fulfilled"
  );
  assert.deepEqual(seen, [["start", 41], ["complete", 41]]);
});

test("fulfillment result mapping preserves authorization, state and system failures", () => {
  assert.equal(
    mapFulfillmentResultToUiState("start_fulfillment", { ok: false, code: "FORBIDDEN" }),
    "not_allowed"
  );
  assert.equal(
    mapFulfillmentResultToUiState("start_fulfillment", {
      ok: false,
      code: "SELLER_ORDER_INVALID_STATE",
    }),
    "state_changed"
  );
  assert.equal(
    mapFulfillmentResultToUiState("complete_fulfillment", { ok: false, code: "SYSTEM_ERROR" }),
    "system_error"
  );
});
