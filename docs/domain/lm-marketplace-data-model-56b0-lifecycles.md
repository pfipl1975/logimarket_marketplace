# LIFECYCLES (LM-MARKETPLACE-DATA-MODEL-56B0)

This document drafts the logical state machines for domain concepts.
UNRESOLVED_LEGAL_EFFECTS_EXPLICIT=YES
CROSS_AGGREGATE_AUTHORITATIVE_STATES=0
OFFER_MODEL_LIFECYCLE_INDEPENDENT=YES
CONTRACT_MODEL_LIFECYCLE_INDEPENDENT=YES
CROSS_AXIS_AUTOMATIC_TRANSITIONS=0

## 1. Seller eligibility
- LIFECYCLE_ID: LC-01
- SUBJECT: SellerProfile
- INITIAL_STATE: pending_verification
- NON_TERMINAL_STATES: verified, suspended
- TERMINAL_STATES: deactivated
- ALLOWED_TRANSITIONS:
  pending_verification -> verified
  verified -> suspended
  suspended -> verified
  verified -> deactivated
- REJECTED_TRANSITIONS: deactivated -> verified
- TRANSITION_OWNER: Compliance
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 2A. OfferConversionClassification lifecycle (offerModel axis)
- LIFECYCLE_ID: LC-02A
- SUBJECT: OfferConversionClassification (canonical business key: offerModel)
- INDEPENDENT_FROM_CONTRACT_MODEL_LIFECYCLE: YES
- NOTE: Changing offerModel does NOT automatically change contractModel. These are independent axes.
- INITIAL_STATE: draft
- NON_TERMINAL_STATES: active, suspended
- TERMINAL_STATES: archived
- ALLOWED_TRANSITIONS:
  draft -> active
  active -> suspended
  suspended -> active
  active -> archived
  suspended -> archived
- REJECTED_TRANSITIONS: archived -> active
- TRANSITION_OWNER: LogiMarket
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 2B. OfferContractClassification lifecycle (contractModel axis)
- LIFECYCLE_ID: LC-02B
- SUBJECT: OfferContractClassification
- INDEPENDENT_FROM_CONVERSION_MODEL_LIFECYCLE: YES
- NOTE: Changing contractModel does NOT automatically change offerModel. These are independent axes.
- INITIAL_STATE: classification_pending
- NON_TERMINAL_STATES: classification_active, classification_suspended
- TERMINAL_STATES: classification_retired
- ALLOWED_TRANSITIONS:
  classification_pending -> classification_active
  classification_active -> classification_suspended
  classification_suspended -> classification_active
  classification_active -> classification_retired
  classification_suspended -> classification_retired
- REJECTED_TRANSITIONS: classification_retired -> classification_active
- TRANSITION_OWNER: LogiMarket
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 3. RfqRequest
- LIFECYCLE_ID: LC-03
- SUBJECT: RfqRequest
- INITIAL_STATE: request_drafted
- NON_TERMINAL_STATES: request_submitted, routed_to_partner
- TERMINAL_STATES: partner_responded, expired, cancelled
- ALLOWED_TRANSITIONS:
  request_drafted -> request_submitted
  request_submitted -> routed_to_partner
  routed_to_partner -> partner_responded
  routed_to_partner -> expired
  request_submitted -> cancelled
  request_drafted -> cancelled
- REJECTED_TRANSITIONS: partner_responded -> routed_to_partner
- NOTE: partner_responded is a terminal state that records the existence of a RfqPartnerResponse. It does NOT imply contract formation. LEGAL_EFFECT=UNRESOLVED. No SellerOrder or payment created.
- TRANSITION_OWNER: System (Platform Orchestration)
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-02 (RFQ_CONTRACT_FORMATION_EVENT_UNRESOLVED — mapped to RfqRequest and RfqPartnerResponse)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 4. Marketplace order orchestration
- LIFECYCLE_ID: LC-04
- SUBJECT: MarketplaceOrder
- INITIAL_STATE: intent_created
- NON_TERMINAL_STATES: checkout_submitted, pending_seller_review
- TERMINAL_STATES: completed, cancelled
- ALLOWED_TRANSITIONS:
  intent_created -> checkout_submitted
  checkout_submitted -> pending_seller_review
  pending_seller_review -> completed
  pending_seller_review -> cancelled
  checkout_submitted -> cancelled
- REJECTED_TRANSITIONS: completed -> pending_seller_review
- NOTE: Payment-related statuses are derived roll-up projections from PaymentOrchestration and PaymentAllocation. Not authoritative MarketplaceOrder lifecycle states.
- TRANSITION_OWNER: System (Platform Orchestration)
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-01 (CONTRACT_FORMATION_EVENT_UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 5. Seller order
- LIFECYCLE_ID: LC-05
- SUBJECT: SellerOrder
- INITIAL_STATE: submitted
- NON_TERMINAL_STATES: seller_accepted, fulfillment_in_progress
- TERMINAL_STATES: fulfilled, seller_rejected, cancelled
- ALLOWED_TRANSITIONS:
  submitted -> seller_accepted
  submitted -> seller_rejected
  seller_accepted -> fulfillment_in_progress
  fulfillment_in_progress -> fulfilled
  submitted -> cancelled
  seller_accepted -> cancelled
- REJECTED_TRANSITIONS: seller_rejected -> seller_accepted
- NOTE: Payment allocation status is DERIVED_PROJECTION_FROM_PAYMENT_AND_ALLOCATION. PAYMENT_ALLOCATION_STATUS_AUTHORITATIVE_IN_SELLER_ORDER=NO
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-01 (CONTRACT_FORMATION_EVENT_UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 6. Seller acceptance decision (e-commerce only)
- LIFECYCLE_ID: LC-06
- SUBJECT: SellerAcceptanceDecision
- SCOPE: E-COMMERCE_FLOW_ONLY (offerModel=ecommerce)
- NOTE: SellerAcceptanceDecision applies to e-commerce SellerOrder only. RFQ contract-formation evidence is represented by RfqPartnerResponse.
- INITIAL_STATE: pending_seller_review
- NON_TERMINAL_STATES: (none)
- TERMINAL_STATES: seller_accepted, seller_rejected, expired
- ALLOWED_TRANSITIONS:
  pending_seller_review -> seller_accepted
  pending_seller_review -> seller_rejected
  pending_seller_review -> expired
- REJECTED_TRANSITIONS: seller_accepted -> seller_rejected
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-01 (CONTRACT_FORMATION_EVENT_UNRESOLVED — e-commerce only)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 7. Payment orchestration
- LIFECYCLE_ID: LC-07
- SUBJECT: PaymentOrchestration
- INITIAL_STATE: intent_registered
- NON_TERMINAL_STATES: abstract_psp_pending
- TERMINAL_STATES: abstract_psp_success, abstract_psp_void, abstract_psp_failure
- ALLOWED_TRANSITIONS:
  intent_registered -> abstract_psp_pending
  abstract_psp_pending -> abstract_psp_success
  abstract_psp_pending -> abstract_psp_failure
  abstract_psp_pending -> abstract_psp_void
- REJECTED_TRANSITIONS: abstract_psp_success -> abstract_psp_void
- EXTERNAL_EVENT_SOURCE: LICENSED_PSP_CAPABILITY
- DOMAIN_TRANSITION_OWNER: PLATFORM_ORCHESTRATION
- FINANCIAL_ALLOCATION_OWNER: UNRESOLVED
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-03, OMQ-MKT-04, OMQ-MKT-05
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 8. Payment allocation
- LIFECYCLE_ID: LC-08
- SUBJECT: PaymentAllocation
- INITIAL_STATE: pending_allocation
- NON_TERMINAL_STATES: (none)
- TERMINAL_STATES: abstract_allocation_confirmed, abstract_allocation_failed
- ALLOWED_TRANSITIONS:
  pending_allocation -> abstract_allocation_confirmed
  pending_allocation -> abstract_allocation_failed
- REJECTED_TRANSITIONS: abstract_allocation_confirmed -> pending_allocation
- EXTERNAL_EVENT_SOURCE: LICENSED_PSP_CAPABILITY
- DOMAIN_TRANSITION_OWNER: PLATFORM_ORCHESTRATION
- FINANCIAL_ALLOCATION_OWNER: UNRESOLVED
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-05
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 9. Shipment
- LIFECYCLE_ID: LC-09
- SUBJECT: Shipment
- INITIAL_STATE: pending_dispatch
- NON_TERMINAL_STATES: in_transit, out_for_delivery
- TERMINAL_STATES: delivered, returned_to_sender, lost
- ALLOWED_TRANSITIONS:
  pending_dispatch -> in_transit
  in_transit -> out_for_delivery
  out_for_delivery -> delivered
  in_transit -> returned_to_sender
  in_transit -> lost
- REJECTED_TRANSITIONS: delivered -> in_transit
- TRANSITION_OWNER: Partner (with logistics/courier events)
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 10. Return case
- LIFECYCLE_ID: LC-10
- SUBJECT: ReturnCase
- INITIAL_STATE: requested
- NON_TERMINAL_STATES: authorized, item_received, under_inspection
- TERMINAL_STATES: accepted, rejected, cancelled
- ALLOWED_TRANSITIONS:
  requested -> authorized
  authorized -> item_received
  item_received -> under_inspection
  under_inspection -> accepted
  under_inspection -> rejected
  requested -> cancelled
- REJECTED_TRANSITIONS: accepted -> rejected
- FINANCIAL_LIABILITY_OWNER: PARTNER
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- LEGAL_GATE_CONTEXT: LEG-MKT-07, LEG-MKT-08
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 11A. Goods complaint case
- LIFECYCLE_ID: LC-11A
- SUBJECT: GoodsComplaintCase
- GOODS_AND_PLATFORM_COMPLAINT_MODELS_DISTINCT: YES
- RESPONSIBILITY_OWNER: PARTNER
- NOTE: Handles product quality complaints. Independent from PlatformServiceComplaintCase. Do not merge.
- INITIAL_STATE: submitted
- NON_TERMINAL_STATES: under_review, awaiting_buyer_info
- TERMINAL_STATES: resolved_accepted, resolved_rejected, dismissed
- ALLOWED_TRANSITIONS:
  submitted -> under_review
  under_review -> awaiting_buyer_info
  awaiting_buyer_info -> under_review
  under_review -> resolved_accepted
  under_review -> resolved_rejected
  under_review -> dismissed
- REJECTED_TRANSITIONS: dismissed -> under_review
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- LEGAL_GATE_CONTEXT: LEG-MKT-07
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 11B. Platform service complaint case
- LIFECYCLE_ID: LC-11B
- SUBJECT: PlatformServiceComplaintCase
- GOODS_AND_PLATFORM_COMPLAINT_MODELS_DISTINCT: YES
- RESPONSIBILITY_OWNER: LOGIMARKET
- NOTE: Handles platform governance complaints (P2B, rankings, suspension, seller governance). Independent from GoodsComplaintCase. Do not merge.
- INITIAL_STATE: submitted
- NON_TERMINAL_STATES: under_platform_review, pending_escalation
- TERMINAL_STATES: resolved, dismissed, escalated_external
- ALLOWED_TRANSITIONS:
  submitted -> under_platform_review
  under_platform_review -> pending_escalation
  pending_escalation -> escalated_external
  under_platform_review -> resolved
  under_platform_review -> dismissed
- REJECTED_TRANSITIONS: resolved -> under_platform_review
- TRANSITION_OWNER: LogiMarket
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- LEGAL_GATE_CONTEXT: LEG-MKT-04
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 12. Refund case
- LIFECYCLE_ID: LC-12
- SUBJECT: RefundCase
- FINANCIAL_LIABILITY_OWNER: PARTNER
- BUSINESS_DECISION_OWNER: PARTNER
- PLATFORM_ORCHESTRATION_ROLE: LOGIMARKET
- TECHNICAL_EXECUTOR: UNRESOLVED
- INITIAL_STATE: refund_requested
- NON_TERMINAL_STATES: abstract_approval_granted, abstract_execution_pending
- TERMINAL_STATES: abstract_execution_success, abstract_execution_failed, refund_rejected
- ALLOWED_TRANSITIONS:
  refund_requested -> abstract_approval_granted
  abstract_approval_granted -> abstract_execution_pending
  abstract_execution_pending -> abstract_execution_success
  abstract_execution_pending -> abstract_execution_failed
  refund_requested -> refund_rejected
- REJECTED_TRANSITIONS: abstract_execution_success -> abstract_execution_failed
- NOTE: Orchestration states recorded by LogiMarket; technical executor not selected.
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-08 (REFUND_TECHNICAL_EXECUTOR_UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 13. Chargeback dispute
- LIFECYCLE_ID: LC-13
- SUBJECT: ChargebackDispute
- INITIAL_STATE: chargeback_received
- NON_TERMINAL_STATES: evidence_submitted, abstract_psp_review
- TERMINAL_STATES: won, lost, uncontested
- ALLOWED_TRANSITIONS:
  chargeback_received -> evidence_submitted
  evidence_submitted -> abstract_psp_review
  abstract_psp_review -> won
  abstract_psp_review -> lost
  chargeback_received -> uncontested
- REJECTED_TRANSITIONS: won -> lost
- EXTERNAL_EVENT_SOURCE: LICENSED_PSP_CAPABILITY
- DOMAIN_TRANSITION_OWNER: UNRESOLVED
- FINANCIAL_ALLOCATION_OWNER: UNRESOLVED
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-09
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 14. Platform revenue record
- LIFECYCLE_ID: LC-14
- SUBJECT: PlatformRevenueRecord
- INITIAL_STATE: pending_calculation
- NON_TERMINAL_STATES: calculated, pending_invoice
- TERMINAL_STATES: invoiced, voided
- ALLOWED_TRANSITIONS:
  pending_calculation -> calculated
  calculated -> pending_invoice
  pending_invoice -> invoiced
  calculated -> voided
- REJECTED_TRANSITIONS: invoiced -> pending_calculation
- TRANSITION_OWNER: LogiMarket
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-06, OMQ-MKT-07
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 15. Seller settlement reference
- LIFECYCLE_ID: LC-15
- SUBJECT: SellerSettlementReference
- INITIAL_STATE: pending_abstract_payout
- NON_TERMINAL_STATES: (none)
- TERMINAL_STATES: abstract_payout_completed, abstract_payout_failed
- ALLOWED_TRANSITIONS:
  pending_abstract_payout -> abstract_payout_completed
  pending_abstract_payout -> abstract_payout_failed
- REJECTED_TRANSITIONS: abstract_payout_completed -> abstract_payout_failed
- EXTERNAL_EVENT_SOURCE: LICENSED_PSP_CAPABILITY
- DOMAIN_TRANSITION_OWNER: UNRESOLVED
- SELLER_PAYOUT_MODEL: UNRESOLVED
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-05
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 16. Future reseller activation
- LIFECYCLE_ID: LC-16
- SUBJECT: FutureResellerActivationPolicy
- INITIAL_STATE: uninitialized
- NON_TERMINAL_STATES: inactive, active
- TERMINAL_STATES: retired
- ALLOWED_TRANSITIONS:
  uninitialized -> inactive
  inactive -> active
  active -> inactive
  inactive -> retired
  active -> retired
- REJECTED_TRANSITIONS: retired -> active
- NOTE: Initial MVP state is always inactive. Activation requires explicit per-offer decision.
- TRANSITION_OWNER: LogiMarket
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-12
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 17. RfqPartnerResponse
- LIFECYCLE_ID: LC-17
- SUBJECT: RfqPartnerResponse
- LEGAL_EFFECT: UNRESOLVED
- CREATES_SELLER_ORDER: NO
- CREATES_PAYMENT: NO
- INITIAL_STATE: pending_partner_response
- NON_TERMINAL_STATES: (none)
- TERMINAL_STATES: response_received, no_response
- ALLOWED_TRANSITIONS:
  pending_partner_response -> response_received
  pending_partner_response -> no_response
- REJECTED_TRANSITIONS: response_received -> no_response
- NOTE: response_received records partner commercial response. Does not create SellerOrder or imply contract formation.
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-02 (RFQ_CONTRACT_FORMATION_EVENT_UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1
