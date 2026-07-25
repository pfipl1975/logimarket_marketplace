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
- ALLOWED_TRANSITIONS: draft_assignment -> active_assignment, active_assignment -> suspended_assignment, active_assignment -> historical_snapshot
- REJECTED_TRANSITIONS: historical_snapshot -> active_assignment
- TRANSITION_OWNER: LogiMarket
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 3. Marketplace order orchestration
- LIFECYCLE_ID: LC-03
- SUBJECT: MarketplaceOrder
- INITIAL_STATE: intent_created
- NON_TERMINAL_STATES: payment_authorized, partial_fulfillment, pending_seller_review
- TERMINAL_STATES: completed, cancelled
- ALLOWED_TRANSITIONS: intent_created -> pending_seller_review, pending_seller_review -> payment_authorized, payment_authorized -> partial_fulfillment, payment_authorized -> completed
- REJECTED_TRANSITIONS: completed -> payment_authorized
- TRANSITION_OWNER: System
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 4. Seller order
- LIFECYCLE_ID: LC-04
- SUBJECT: SellerOrder
- INITIAL_STATE: submitted
- NON_TERMINAL_STATES: seller_accepted, fulfillment_in_progress, payment_allocated
- TERMINAL_STATES: fulfilled, seller_rejected, cancelled
- ALLOWED_TRANSITIONS: submitted -> seller_accepted, submitted -> seller_rejected, seller_accepted -> fulfillment_in_progress, fulfillment_in_progress -> fulfilled
- REJECTED_TRANSITIONS: seller_rejected -> seller_accepted
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 5. Seller acceptance decision
- LIFECYCLE_ID: LC-05
- SUBJECT: SellerAcceptanceDecision
- INITIAL_STATE: pending_seller_review
- NON_TERMINAL_STATES: -
- TERMINAL_STATES: seller_accepted, seller_rejected, expired
- ALLOWED_TRANSITIONS: pending_seller_review -> seller_accepted, pending_seller_review -> seller_rejected, pending_seller_review -> expired
- REJECTED_TRANSITIONS: seller_accepted -> seller_rejected
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-01, OMQ-MKT-02 (LEGAL_EFFECT=UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 6. Payment orchestration
- LIFECYCLE_ID: LC-06
- SUBJECT: PaymentOrchestration
- INITIAL_STATE: pending_psp_authorization
- NON_TERMINAL_STATES: authorized, partially_captured
- TERMINAL_STATES: captured, voided, failed
- ALLOWED_TRANSITIONS: pending_psp_authorization -> authorized, authorized -> captured, authorized -> voided
- REJECTED_TRANSITIONS: captured -> voided
- TRANSITION_OWNER: PSP
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 7. Payment allocation
- LIFECYCLE_ID: LC-07
- SUBJECT: PaymentAllocation
- INITIAL_STATE: pending_allocation
- NON_TERMINAL_STATES: -
- TERMINAL_STATES: allocated, allocation_failed
- ALLOWED_TRANSITIONS: pending_allocation -> allocated, pending_allocation -> allocation_failed
- REJECTED_TRANSITIONS: allocated -> pending_allocation
- TRANSITION_OWNER: System
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-08
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 8. Shipment
- LIFECYCLE_ID: LC-08
- SUBJECT: Shipment
- INITIAL_STATE: pending_dispatch
- NON_TERMINAL_STATES: in_transit, out_for_delivery
- TERMINAL_STATES: delivered, returned_to_sender, lost
- ALLOWED_TRANSITIONS: pending_dispatch -> in_transit, in_transit -> delivered, in_transit -> returned_to_sender
- REJECTED_TRANSITIONS: delivered -> in_transit
- TRANSITION_OWNER: Logistics
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: NONE
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 9. Return case
- LIFECYCLE_ID: LC-09
- SUBJECT: ReturnCase
- INITIAL_STATE: requested
- NON_TERMINAL_STATES: authorized, item_received, under_inspection
- TERMINAL_STATES: accepted, rejected, cancelled
- ALLOWED_TRANSITIONS: requested -> authorized, authorized -> item_received, item_received -> accepted, item_received -> rejected
- REJECTED_TRANSITIONS: accepted -> rejected
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-03 (LEGAL_EFFECT=UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 10. Complaint case
- LIFECYCLE_ID: LC-10
- SUBJECT: ComplaintCase
- INITIAL_STATE: submitted
- NON_TERMINAL_STATES: under_review, awaiting_buyer_info
- TERMINAL_STATES: resolved_in_favor_of_buyer, resolved_in_favor_of_seller, dismissed
- ALLOWED_TRANSITIONS: submitted -> under_review, under_review -> resolved_in_favor_of_buyer, under_review -> dismissed
- REJECTED_TRANSITIONS: dismissed -> under_review
- TRANSITION_OWNER: Partner
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-06
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 11. Refund case
- LIFECYCLE_ID: LC-11
- SUBJECT: RefundCase
- INITIAL_STATE: refund_requested
- NON_TERMINAL_STATES: approved_internally, pending_psp_execution
- TERMINAL_STATES: refund_executed, refund_failed, refund_rejected
- ALLOWED_TRANSITIONS: refund_requested -> approved_internally, approved_internally -> pending_psp_execution, pending_psp_execution -> refund_executed
- REJECTED_TRANSITIONS: refund_executed -> refund_failed
- TRANSITION_OWNER: PSP
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-04
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 12. Chargeback dispute
- LIFECYCLE_ID: LC-12
- SUBJECT: ChargebackDispute
- INITIAL_STATE: chargeback_received
- NON_TERMINAL_STATES: evidence_submitted, under_psp_review
- TERMINAL_STATES: won, lost, uncontested
- ALLOWED_TRANSITIONS: chargeback_received -> evidence_submitted, evidence_submitted -> won, evidence_submitted -> lost
- REJECTED_TRANSITIONS: won -> lost
- TRANSITION_OWNER: PSP
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-09 (LEGAL_EFFECT=UNRESOLVED)
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 13. Platform revenue record
- LIFECYCLE_ID: LC-13
- SUBJECT: PlatformRevenueRecord
- INITIAL_STATE: pending_calculation
- NON_TERMINAL_STATES: calculated, pending_invoice
- TERMINAL_STATES: invoiced, voided
- ALLOWED_TRANSITIONS: pending_calculation -> calculated, calculated -> invoiced, calculated -> voided
- REJECTED_TRANSITIONS: invoiced -> pending_calculation
- TRANSITION_OWNER: LogiMarket
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-07
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 14. Seller settlement reference
- LIFECYCLE_ID: LC-14
- SUBJECT: SellerSettlementReference
- INITIAL_STATE: pending_psp_settlement
- NON_TERMINAL_STATES: -
- TERMINAL_STATES: settled, failed
- ALLOWED_TRANSITIONS: pending_psp_settlement -> settled, pending_psp_settlement -> failed
- REJECTED_TRANSITIONS: settled -> failed
- TRANSITION_OWNER: PSP
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-05
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1

## 15. Future reseller activation
- LIFECYCLE_ID: LC-15
- SUBJECT: FutureResellerActivationPolicy
- INITIAL_STATE: inactive
- NON_TERMINAL_STATES: -
- TERMINAL_STATES: active
- ALLOWED_TRANSITIONS: inactive -> active, active -> inactive
- REJECTED_TRANSITIONS: -
- TRANSITION_OWNER: LogiMarket
- IDEMPOTENCY_REQUIREMENT: REQUIRED
- AUDIT_REQUIREMENT: REQUIRED
- OPEN_MODEL_QUESTION_DEPENDENCY: OMQ-MKT-12
- PHYSICAL_IMPLEMENTATION_STATUS: UNDECIDED_PENDING_56B0_R1
