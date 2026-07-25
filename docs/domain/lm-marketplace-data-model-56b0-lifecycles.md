# LIFECYCLES (LM-MARKETPLACE-DATA-MODEL-56B0)

This document drafts the logical state machines for domain concepts.
UNRESOLVED_LEGAL_EFFECTS_EXPLICIT=YES

## 1. Seller eligibility
- LIFECYCLE_ID: LC-01
- SUBJECT: SellerProfile
- INITIAL_STATE: pending_verification
- NON_TERMINAL_STATES: verified, suspended
- TERMINAL_STATES: deactivated
- ALLOWED_TRANSITIONS: pending_verification -> verified, verified -> suspended, suspended -> verified, verified -> deactivated
- REJECTED_TRANSITIONS: deactivated -> verified
- TRANSITION_OWNER: Compliance
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 2. Offer seller/contract assignment
- LIFECYCLE_ID: LC-02
- SUBJECT: OfferContractClassification
- INITIAL_STATE: draft_assignment
- NON_TERMINAL_STATES: active_assignment, suspended_assignment
- TERMINAL_STATES: historical_snapshot
- ALLOWED_TRANSITIONS: draft_assignment -> active_assignment, active_assignment -> suspended_assignment, suspended_assignment -> active_assignment, active_assignment -> historical_snapshot, suspended_assignment -> historical_snapshot
- REJECTED_TRANSITIONS: historical_snapshot -> active_assignment
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
- ALLOWED_TRANSITIONS: request_drafted -> request_submitted, request_submitted -> routed_to_partner, routed_to_partner -> partner_responded, routed_to_partner -> expired, request_submitted -> cancelled
- REJECTED_TRANSITIONS: partner_responded -> routed_to_partner
- TRANSITION_OWNER: System
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-02 (RFQ_CONTRACT_FORMATION_EVENT_UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 4. Marketplace order orchestration
- LIFECYCLE_ID: LC-04
- SUBJECT: MarketplaceOrder
- INITIAL_STATE: intent_created
- NON_TERMINAL_STATES: checkout_submitted, pending_seller_review
- TERMINAL_STATES: completed, cancelled
- ALLOWED_TRANSITIONS: intent_created -> checkout_submitted, checkout_submitted -> pending_seller_review, pending_seller_review -> completed, pending_seller_review -> cancelled, checkout_submitted -> cancelled
- REJECTED_TRANSITIONS: completed -> pending_seller_review
- TRANSITION_OWNER: System
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-01 (CONTRACT_FORMATION_EVENT_UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 5. Seller order
- LIFECYCLE_ID: LC-05
- SUBJECT: SellerOrder
- INITIAL_STATE: submitted
- NON_TERMINAL_STATES: seller_accepted, fulfillment_in_progress, derived_payment_allocated
- TERMINAL_STATES: fulfilled, seller_rejected, cancelled
- ALLOWED_TRANSITIONS: submitted -> seller_accepted, submitted -> seller_rejected, seller_accepted -> derived_payment_allocated, derived_payment_allocated -> fulfillment_in_progress, seller_accepted -> fulfillment_in_progress, fulfillment_in_progress -> fulfilled, submitted -> cancelled, seller_accepted -> cancelled
- REJECTED_TRANSITIONS: seller_rejected -> seller_accepted
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-01
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 6. Seller acceptance decision
- LIFECYCLE_ID: LC-06
- SUBJECT: SellerAcceptanceDecision
- INITIAL_STATE: pending_seller_review
- NON_TERMINAL_STATES: -
- TERMINAL_STATES: seller_accepted, seller_rejected, expired
- ALLOWED_TRANSITIONS: pending_seller_review -> seller_accepted, pending_seller_review -> seller_rejected, pending_seller_review -> expired
- REJECTED_TRANSITIONS: seller_accepted -> seller_rejected
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-01, OMQ-MKT-02 (CONTRACT_FORMATION_EVENT_UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 7. Payment orchestration
- LIFECYCLE_ID: LC-07
- SUBJECT: PaymentOrchestration
- INITIAL_STATE: intent_registered
- NON_TERMINAL_STATES: abstract_psp_pending
- TERMINAL_STATES: abstract_psp_success, abstract_psp_void, abstract_psp_failure
- ALLOWED_TRANSITIONS: intent_registered -> abstract_psp_pending, abstract_psp_pending -> abstract_psp_success, abstract_psp_pending -> abstract_psp_failure, abstract_psp_pending -> abstract_psp_void
- REJECTED_TRANSITIONS: abstract_psp_success -> abstract_psp_void
- TRANSITION_OWNER: PSP
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-03 (ABSTRACT_PSP_ALLOCATION_AND_PAYOUT), OMQ-MKT-04, OMQ-MKT-05
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 8. Payment allocation
- LIFECYCLE_ID: LC-08
- SUBJECT: PaymentAllocation
- INITIAL_STATE: pending_allocation
- NON_TERMINAL_STATES: -
- TERMINAL_STATES: abstract_allocation_confirmed, abstract_allocation_failed
- ALLOWED_TRANSITIONS: pending_allocation -> abstract_allocation_confirmed, pending_allocation -> abstract_allocation_failed
- REJECTED_TRANSITIONS: abstract_allocation_confirmed -> pending_allocation
- TRANSITION_OWNER: System
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-05 (NO_SELF_CUSTODY_NO_ESCROW)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 9. Shipment
- LIFECYCLE_ID: LC-09
- SUBJECT: Shipment
- INITIAL_STATE: pending_dispatch
- NON_TERMINAL_STATES: in_transit, out_for_delivery
- TERMINAL_STATES: delivered, returned_to_sender, lost
- ALLOWED_TRANSITIONS: pending_dispatch -> in_transit, in_transit -> out_for_delivery, out_for_delivery -> delivered, in_transit -> returned_to_sender, in_transit -> lost
- REJECTED_TRANSITIONS: delivered -> in_transit
- TRANSITION_OWNER: Logistics
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
- ALLOWED_TRANSITIONS: requested -> authorized, authorized -> item_received, item_received -> under_inspection, under_inspection -> accepted, under_inspection -> rejected, requested -> cancelled
- REJECTED_TRANSITIONS: accepted -> rejected
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 11. Complaint case
- LIFECYCLE_ID: LC-11
- SUBJECT: ComplaintCase
- INITIAL_STATE: submitted
- NON_TERMINAL_STATES: under_review, awaiting_buyer_info
- TERMINAL_STATES: resolved_in_favor_of_buyer, resolved_in_favor_of_seller, dismissed
- ALLOWED_TRANSITIONS: submitted -> under_review, under_review -> awaiting_buyer_info, awaiting_buyer_info -> under_review, under_review -> resolved_in_favor_of_buyer, under_review -> resolved_in_favor_of_seller, under_review -> dismissed
- REJECTED_TRANSITIONS: dismissed -> under_review
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 12. Refund case
- LIFECYCLE_ID: LC-12
- SUBJECT: RefundCase
- INITIAL_STATE: refund_requested
- NON_TERMINAL_STATES: abstract_approval_granted, abstract_execution_pending
- TERMINAL_STATES: abstract_execution_success, abstract_execution_failed, refund_rejected
- ALLOWED_TRANSITIONS: refund_requested -> abstract_approval_granted, abstract_approval_granted -> abstract_execution_pending, abstract_execution_pending -> abstract_execution_success, abstract_execution_pending -> abstract_execution_failed, refund_requested -> refund_rejected
- REJECTED_TRANSITIONS: abstract_execution_success -> abstract_execution_failed
- TRANSITION_OWNER: System
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
- ALLOWED_TRANSITIONS: chargeback_received -> evidence_submitted, evidence_submitted -> abstract_psp_review, abstract_psp_review -> won, abstract_psp_review -> lost, chargeback_received -> uncontested
- REJECTED_TRANSITIONS: won -> lost
- TRANSITION_OWNER: PSP
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-09 (CHARGEBACK_ALLOCATION_UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 14. Platform revenue record
- LIFECYCLE_ID: LC-14
- SUBJECT: PlatformRevenueRecord
- INITIAL_STATE: pending_calculation
- NON_TERMINAL_STATES: calculated, pending_invoice
- TERMINAL_STATES: invoiced, voided
- ALLOWED_TRANSITIONS: pending_calculation -> calculated, calculated -> pending_invoice, pending_invoice -> invoiced, calculated -> voided
- REJECTED_TRANSITIONS: invoiced -> pending_calculation
- TRANSITION_OWNER: LogiMarket
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-06 (COMMISSION_OR_PLATFORM_SERVICE_FEE), OMQ-MKT-07 (PENDING_TAX_AND_ACCOUNTING_VALIDATION)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 15. Seller settlement reference
- LIFECYCLE_ID: LC-15
- SUBJECT: SellerSettlementReference
- INITIAL_STATE: pending_abstract_payout
- NON_TERMINAL_STATES: -
- TERMINAL_STATES: abstract_payout_completed, abstract_payout_failed
- ALLOWED_TRANSITIONS: pending_abstract_payout -> abstract_payout_completed, pending_abstract_payout -> abstract_payout_failed
- REJECTED_TRANSITIONS: abstract_payout_completed -> abstract_payout_failed
- TRANSITION_OWNER: PSP
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-05 (NO_SELF_CUSTODY_NO_ESCROW)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 16. Future reseller activation
- LIFECYCLE_ID: LC-16
- SUBJECT: FutureResellerActivationPolicy
- INITIAL_STATE: uninitialized
- NON_TERMINAL_STATES: inactive, active
- TERMINAL_STATES: retired
- ALLOWED_TRANSITIONS: uninitialized -> inactive, inactive -> active, active -> inactive, inactive -> retired, active -> retired
- REJECTED_TRANSITIONS: retired -> active
- TRANSITION_OWNER: LogiMarket
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-12 (LOGIMARKET_RESELLER_DISABLED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1
