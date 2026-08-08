export type CheckoutActionResult =
  | { ok: null; code: "IDLE" }
  | {
      ok: true;
      code: "CHECKOUT_ORDER_CREATED";
      orderId: number;
    }
  | {
      ok: false;
      code:
        | "CHECKOUT_VALIDATION_ERROR"
        | "CHECKOUT_CART_EMPTY"
        | "CHECKOUT_CART_CHANGED"
        | "SYSTEM_ERROR";
    };
