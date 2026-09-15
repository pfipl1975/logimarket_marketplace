import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PartnerDecisionFormSchema,
  mapDecisionResultToUiState,
  executeDecisionActionCore
} from "@/lib/partner-orders/decision-action-core";
import type { AcceptRejectResult } from "@/lib/seller-order/seller-order-workflow";

test("PARSER: strict input validation", () => {
  const validAccept = PartnerDecisionFormSchema.safeParse({ sellerOrderId: "123", decision: "accept" });
  assert.equal(validAccept.success, true);
  
  const validReject = PartnerDecisionFormSchema.safeParse({ sellerOrderId: "123", decision: "reject" });
  assert.equal(validReject.success, true);

  const zero = PartnerDecisionFormSchema.safeParse({ sellerOrderId: "0", decision: "accept" });
  assert.equal(zero.success, false);

  const negative = PartnerDecisionFormSchema.safeParse({ sellerOrderId: "-5", decision: "accept" });
  assert.equal(negative.success, false);

  const decimal = PartnerDecisionFormSchema.safeParse({ sellerOrderId: "1.2", decision: "accept" });
  assert.equal(decimal.success, false);

  const nonnumeric = PartnerDecisionFormSchema.safeParse({ sellerOrderId: "abc", decision: "accept" });
  assert.equal(nonnumeric.success, false);

  const unsafeInt = PartnerDecisionFormSchema.safeParse({ sellerOrderId: "9007199254740992", decision: "accept" }); // MAX_SAFE_INTEGER + 1
  assert.equal(unsafeInt.success, false);

  const invalidDecision = PartnerDecisionFormSchema.safeParse({ sellerOrderId: "123", decision: "maybe" });
  assert.equal(invalidDecision.success, false);
});

test("MAPPING: domain errors to public states", () => {
  type ErrorCode = Extract<AcceptRejectResult, {ok: false}>["code"];
  const t = (code: ErrorCode | undefined, expected: string, ok: boolean = false) => {
    const res = ok ? { ok: true } : { ok: false, code };
    assert.equal(mapDecisionResultToUiState("accept", res as any), ok ? "accepted" : expected);
  };

  t(undefined, "accepted", true);
  
  t("SELLER_ORDER_NOT_FOUND", "not_allowed");
  t("UNAUTHORIZED", "not_allowed");
  t("FORBIDDEN", "not_allowed");
  
  t("SELLER_ORDER_EXPIRED", "expired");
  
  t("SELLER_ORDER_NOT_ROUTED", "state_changed");
  t("SELLER_ORDER_NOT_ELIGIBLE", "state_changed");
  t("SELLER_ORDER_ALREADY_ACCEPTED", "state_changed");
  t("SELLER_ORDER_ALREADY_REJECTED", "state_changed");
  t("SELLER_ORDER_DECISION_CONFLICT", "state_changed");
  
  t("SYSTEM_ERROR", "system_error");
});

test("EXECUTION: pure adapter delegation", async () => {
  let acceptCalls = 0;
  let rejectCalls = 0;
  let passedId = 0;

  const mockExecutors = {
    acceptSellerOrder: async (id: number) => {
      acceptCalls++;
      passedId = id;
      return { ok: true } as const;
    },
    rejectSellerOrder: async (id: number) => {
      rejectCalls++;
      passedId = id;
      return { ok: true } as const;
    }
  };

  const acceptFormData = new FormData();
  acceptFormData.set("sellerOrderId", "42");
  acceptFormData.set("decision", "accept");

  const res1 = await executeDecisionActionCore(acceptFormData, mockExecutors);
  assert.equal(res1, "accepted");
  assert.equal(acceptCalls, 1);
  assert.equal(rejectCalls, 0);
  assert.equal(passedId, 42);

  const rejectFormData = new FormData();
  rejectFormData.set("sellerOrderId", "99");
  rejectFormData.set("decision", "reject");

  const res2 = await executeDecisionActionCore(rejectFormData, mockExecutors);
  assert.equal(res2, "rejected");
  assert.equal(acceptCalls, 1);
  assert.equal(rejectCalls, 1);
  assert.equal(passedId, 99);
});

test("CLIENT: structural and logic constraints", () => {
  const componentPath = path.join(process.cwd(), "src/components/partner-orders/PartnerOrderDecisionPanel.tsx");
  const content = fs.readFileSync(componentPath, "utf-8");

  assert.match(content, /setShowAcceptConfirm\(true\)/, "Must require explicit accept confirm");
  assert.match(content, /setShowRejectConfirm\(true\)/, "Must require explicit reject confirm");
  assert.doesNotMatch(content, /useOptimistic/, "Must NOT use optimistic UI updates");
  assert.match(content, /disabled=\{isPending\}/, "Must disable controls while pending");
  assert.match(content, /const isTerminal = state === "accepted" \|\| state === "rejected" \|\| state === "expired" \|\| state === "state_changed" \|\| state === "not_allowed";/, "Must have strict terminal state check");
  assert.match(content, /\{!isTerminal &&/, "Terminal states must not re-enable forms");
  assert.doesNotMatch(content, /\|\| "/, "No hardcoded string fallbacks in UI");
  assert.doesNotMatch(content, /\|\| '/, "No hardcoded string fallbacks in UI");
});

test("VISIBILITY: server-side view integration", () => {
  const pagePath = path.join(process.cwd(), "src/app/(pl)/partner/[partnerId]/zamowienia/[sellerOrderId]/page.tsx");
  const content = fs.readFileSync(pagePath, "utf-8");

  assert.match(content, /await requirePartnerOrderDecisionAuthority\(parsedPartnerId\)/, "Must re-check presentation authority");
  assert.match(content, /order\.effectiveStatus === "pending_decision" && order\.decisionWindowOpen/, "Must check both pending and window open");
  assert.match(content, /canMakeDecision={canMakeDecision}/, "Must pass capability down to panel");
});

test("I18N: exact string keys in dictionaries", () => {
  const langs = ['en', 'de', 'es', 'fr', 'pl', 'uk', 'zh'];
  const requiredKeys = [
    'acceptOrder', 'rejectOrder', 'acceptConfirmTitle', 'acceptConfirmText',
    'rejectConfirmTitle', 'rejectConfirmText', 'confirmAcceptButton', 'confirmRejectButton',
    'cancelButton', 'decisionSubmitting', 'decisionExpired', 'decisionStateChanged',
    'decisionNotAllowed', 'decisionError', 'decisionPermissionMissing'
  ];

  for (const lang of langs) {
    const jsonPath = path.join(process.cwd(), `src/messages/${lang}.json`);
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const workspace = data.PartnerWorkspace;
    for (const key of requiredKeys) {
      assert.ok(workspace[key], `Dictionary ${lang} missing key ${key}`);
    }
  }
});
