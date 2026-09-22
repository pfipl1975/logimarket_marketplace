import { z } from "zod";
import type { FulfillmentResult } from "@/lib/seller-order/seller-order-workflow";

export type PartnerFulfillmentUiState =
  | "idle"
  | "fulfillment_in_progress"
  | "fulfilled"
  | "state_changed"
  | "not_allowed"
  | "system_error"
  | "invalid_request";

export const PartnerFulfillmentFormSchema = z.object({
  sellerOrderId: z.string().regex(/^[1-9]\d*$/).refine(
    (val) => {
      const num = Number(val);
      return Number.isSafeInteger(num) && num > 0;
    },
    { message: "Must be a safe positive integer" }
  ),
  action: z.enum(["start_fulfillment", "complete_fulfillment"]),
});

export function mapFulfillmentResultToUiState(
  action: "start_fulfillment" | "complete_fulfillment",
  result: FulfillmentResult
): PartnerFulfillmentUiState {
  if (result.ok) {
    return action === "start_fulfillment" ? "fulfillment_in_progress" : "fulfilled";
  }

  switch (result.code) {
    case "SELLER_ORDER_NOT_FOUND":
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return "not_allowed";
    case "SELLER_ORDER_INVALID_STATE":
      return "state_changed";
    case "SYSTEM_ERROR":
      return "system_error";
    default:
      return "system_error";
  }
}

export type FulfillmentExecutors = {
  markSellerOrderFulfillmentInProgress: (id: number) => Promise<FulfillmentResult>;
  markSellerOrderFulfilled: (id: number) => Promise<FulfillmentResult>;
};

export async function executeFulfillmentActionCore(
  formData: FormData,
  executors: FulfillmentExecutors
): Promise<PartnerFulfillmentUiState> {
  const rawId = formData.get("sellerOrderId");
  const rawAction = formData.get("action");

  if (typeof rawId !== "string" || typeof rawAction !== "string") {
    return "invalid_request";
  }

  const parsed = PartnerFulfillmentFormSchema.safeParse({
    sellerOrderId: rawId,
    action: rawAction,
  });

  if (!parsed.success) {
    return "invalid_request";
  }

  const { sellerOrderId, action } = parsed.data;
  const idNum = Number(sellerOrderId);

  const result = action === "start_fulfillment"
    ? await executors.markSellerOrderFulfillmentInProgress(idNum)
    : await executors.markSellerOrderFulfilled(idNum);

  return mapFulfillmentResultToUiState(action, result);
}
