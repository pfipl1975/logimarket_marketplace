import { z } from "zod";
import type { AcceptRejectResult } from "@/lib/seller-order/seller-order-workflow";

export type PartnerDecisionUiState =
  | "idle"
  | "accepted"
  | "rejected"
  | "expired"
  | "state_changed"
  | "not_allowed"
  | "system_error"
  | "invalid_request";

export const PartnerDecisionFormSchema = z.object({
  sellerOrderId: z.string().regex(/^[1-9]\d*$/).refine(
    (val) => {
      const num = Number(val);
      return Number.isSafeInteger(num) && num > 0;
    },
    { message: "Must be a safe positive integer" }
  ),
  decision: z.enum(["accept", "reject"]),
});

export function mapDecisionResultToUiState(
  decision: "accept" | "reject",
  result: AcceptRejectResult
): PartnerDecisionUiState {
  if (result.ok) {
    return decision === "accept" ? "accepted" : "rejected";
  }

  switch (result.code) {
    case "SELLER_ORDER_NOT_FOUND":
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return "not_allowed";
    case "SELLER_ORDER_ALREADY_ACCEPTED":
    case "SELLER_ORDER_ALREADY_REJECTED":
    case "SELLER_ORDER_DECISION_CONFLICT":
    case "SELLER_ORDER_NOT_ELIGIBLE":
    case "SELLER_ORDER_NOT_ROUTED":
      return "state_changed";
    case "SELLER_ORDER_EXPIRED":
      return "expired";
    case "SYSTEM_ERROR":
      return "system_error";
    default:
      return "system_error";
  }
}

export type DecisionExecutors = {
  acceptSellerOrder: (id: number) => Promise<AcceptRejectResult>;
  rejectSellerOrder: (id: number) => Promise<AcceptRejectResult>;
};

export async function executeDecisionActionCore(
  formData: FormData,
  executors: DecisionExecutors
): Promise<PartnerDecisionUiState> {
  const rawId = formData.get("sellerOrderId");
  const rawDecision = formData.get("decision");

  if (typeof rawId !== "string" || typeof rawDecision !== "string") {
    return "invalid_request";
  }

  const parsed = PartnerDecisionFormSchema.safeParse({
    sellerOrderId: rawId,
    decision: rawDecision,
  });

  if (!parsed.success) {
    return "invalid_request";
  }

  const { sellerOrderId, decision } = parsed.data;
  const idNum = Number(sellerOrderId);

  const result = decision === "accept"
    ? await executors.acceptSellerOrder(idNum)
    : await executors.rejectSellerOrder(idNum);

  return mapDecisionResultToUiState(decision, result);
}
