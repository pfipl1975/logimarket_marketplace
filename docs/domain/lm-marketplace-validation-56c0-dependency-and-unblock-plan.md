# DEPENDENCY AND UNBLOCK PLAN (LM-MARKETPLACE-VALIDATION-56C0)

PHYSICAL_SCHEMA_READY=NO
APPLICATION_IMPLEMENTATION_READY=NO
PRODUCTION_IMPLEMENTATION_READY=NO

WORKSTREAM_COUNT=6
UNMAPPED_LEG_MKT_ITEMS=0
UNMAPPED_OMQ_MKT_ITEMS=0
DEPENDENCY_CYCLES_WITHOUT_RESOLUTION=0
PREMATURE_SCHEMA_UNBLOCKS=0

## Workstreams

### Workstream A — Marketplace legal qualification and contract formation
- inputs: 56B0 Logical Data Model, R3 Intermediary-First Contract.
- owner: Legal Counsel
- supporting reviewers: Internal Product and Engineering
- dependencies: None. Foundation for all other workstreams.
- decisions produced: LEG-MKT-01, LEG-MKT-02, LEG-MKT-03, LEG-MKT-04, OMQ-MKT-01, OMQ-MKT-02
- affected model areas: SELLER_AND_OFFER_CLASSIFICATION, MARKETPLACE_ORDER_ORCHESTRATION, SELLER_ORDER
- blocked implementation areas: None for 56B1.
- parallelizable activities: Can be reviewed in parallel with Workstream E.
- sequencing constraints: Must conclude before Workstream B, C, and D can finalize decisions on liability.
- completion criteria: Written definitions of contract formation and intermediary limits.
- reopening criteria: Legal changes requiring joint-seller or Merchant-of-Record role.

### Workstream B — PSP, KYB/KYC, payment allocation and payouts
- inputs: Workstream A decisions, PSD2 laws, PSP APIs.
- owner: Legal Counsel
- supporting reviewers: PSP Specialist, Internal Product and Engineering
- dependencies: Depends on Workstream A (qualification).
- decisions produced: LEG-MKT-05, OMQ-MKT-03, OMQ-MKT-04, OMQ-MKT-05
- affected model areas: PAYMENT_AND_ALLOCATION, AUDIT_IDEMPOTENCY_AND_PRIVACY
- blocked implementation areas: Initial-MVP physical schema.
- parallelizable activities: PSP API evaluation can happen in parallel.
- sequencing constraints: Blocks Workstream C technical execution details.
- completion criteria: PSP architecture and payout mechanisms legally cleared.
- reopening criteria: PSP API limitations conflicting with legal requirements.

### Workstream C — Refunds and chargebacks
- inputs: Workstream A liability mapping, Workstream B PSP architecture.
- owner: Legal Counsel
- supporting reviewers: PSP Specialist, Internal Product and Engineering
- dependencies:
  - PARALLEL_PRELIMINARY_ANALYSIS=YES
  - FINAL_CLOSURE_IN_PARALLEL=NO
  - HARD_DEPENDENCY_FOR_CLOSURE=WORKSTREAM_B
- decisions produced: LEG-MKT-07, OMQ-MKT-08, OMQ-MKT-09
- affected model areas: AFTER_SALES_AND_DISPUTES, SELLER_ORDER
- blocked implementation areas: Initial-MVP physical schema.
- parallelizable activities: Legal liability can be reviewed while PSP execution is verified.
- sequencing constraints: Must follow PSP architecture selection (Workstream B).
- completion criteria: Clear definitions for refund and chargeback responsibilities and execution.
- reopening criteria: PSP inability to execute required refund flow.

### Workstream D — Monetization, VAT, accounting and KSeF
- inputs: Workstream A intermediary qualification.
- owner: Tax Advisor
- supporting reviewers: Legal Counsel, Internal Product and Engineering
- dependencies: Depends on Workstream A.
- decisions produced: LEG-MKT-06, OMQ-MKT-06, OMQ-MKT-07, OMQ-MKT-10
- affected model areas: PLATFORM_REVENUE_AND_SELLER_SETTLEMENT_REFERENCE, SELLER_ORDER
- blocked implementation areas: Initial-MVP physical schema.
- parallelizable activities: Independent of PSP (Workstream B) details.
- sequencing constraints: Follows Workstream A.
- completion criteria: VAT, accounting recognition, and invoicing rules validated.
- reopening criteria: Tax law changes or KSeF technical mandates.

### Workstream E — Buyer legal context and privacy
- inputs: Intermediary data flows.
- owner: Legal Counsel
- supporting reviewers: DPO, Internal Product and Engineering
- dependencies:
  - preliminary privacy mapping: none;
  - final role-allocation closure: Workstream A.
- decisions produced: LEG-MKT-08, LEG-MKT-09, OMQ-MKT-11
- affected model areas: MARKETPLACE_ORDER_ORCHESTRATION, AUDIT_IDEMPOTENCY_AND_PRIVACY, AFTER_SALES_AND_DISPUTES
- blocked implementation areas: None for 56B1. (Privacy implementation evidence remains for go-live).
- parallelizable activities: PARALLEL_PRELIMINARY_ANALYSIS=YES, FINAL_CLOSURE_IN_PARALLEL=NO
- sequencing constraints: Final closure requires Workstream A.
- completion criteria: Controller roles, buyer definitions, and retention periods verified.
- reopening criteria: GDPR non-compliance detected in logical flows.

### Workstream F — Future reseller activation
- inputs: None currently active.
- owner: Legal Counsel
- supporting reviewers: Internal Product and Engineering
- dependencies: None for MVP.
- decisions produced: LEG-MKT-10, OMQ-MKT-12
- affected model areas: FUTURE_LOGIMARKET_RESELLER_EXTENSION
- blocked implementation areas: Future-reseller physical schema only.
- parallelizable activities: Can be deferred entirely.
- sequencing constraints: Deferred until reseller sprint scheduled.
- completion criteria: Future reseller terms approved.
- reopening criteria: Decision to activate reseller model.

## Dependency Matrix

| Gate ID | Producing Workstream | Preliminary Parallel Work | Final Closure Depends On | Blocks MVP Schema | Blocks Future Schema | 56B0 Reopen Policy | Earliest Downstream Schema Sprint |
|---------|----------------------|---------------------------|--------------------------|-------------------|----------------------|--------------------|-----------------------------------|
| LEG-MKT-01 | Workstream A         | Workstream E              | None                     | NO                | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B1 |
| LEG-MKT-02 | Workstream A         | Workstream E              | None                     | NO                | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B1 |
| LEG-MKT-03 | Workstream A         | Workstream E              | None                     | NO                | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B1 |
| LEG-MKT-04 | Workstream A         | Workstream E              | None                     | NO                | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B1 |
| LEG-MKT-05 | Workstream B         | Workstream C              | Workstream A             | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B3 |
| LEG-MKT-06 | Workstream D         | Workstream B              | Workstream A             | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B3 |
| LEG-MKT-07 | Workstream C         | Workstream B              | Workstream A, Workstream B | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B3 |
| LEG-MKT-08 | Workstream E         | Workstream A, Workstream B | Workstream A             | NO                | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B2 |
| LEG-MKT-09 | Workstream E         | Workstream A, Workstream B | Workstream A             | NO                | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B1 |
| LEG-MKT-10 | Workstream F         | None                      | None                     | NO                | YES                  | FUTURE_EXTENSION_ONLY | FUTURE_RESELLER_ACTIVATION_SPRINT_NOT_SCHEDULED |
| OMQ-MKT-01 | Workstream A         | Workstream E              | None                     | NO                | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B2 |
| OMQ-MKT-02 | Workstream A         | Workstream E              | None                     | NO                | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B2 |
| OMQ-MKT-03 | Workstream B         | Workstream C              | Workstream A             | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B3 |
| OMQ-MKT-04 | Workstream B         | Workstream C              | Workstream A             | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B3 |
| OMQ-MKT-05 | Workstream B         | Workstream C              | Workstream A             | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B3 |
| OMQ-MKT-06 | Workstream D         | Workstream B              | Workstream A             | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B3 |
| OMQ-MKT-07 | Workstream D         | Workstream B              | Workstream A             | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B3 |
| OMQ-MKT-08 | Workstream C         | Workstream B              | Workstream A, Workstream B | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B3 |
| OMQ-MKT-09 | Workstream C         | Workstream B              | Workstream A, Workstream B | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B3 |
| OMQ-MKT-10 | Workstream D         | Workstream B              | Workstream A             | YES               | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B4 |
| OMQ-MKT-11 | Workstream E         | Workstream A, Workstream B | Workstream A             | NO                | YES                  | CONDITIONAL_IF_LOGICAL_MODEL_INVALIDATED | LM-MARKETPLACE-SCHEMA-56B6 |
| OMQ-MKT-12 | Workstream F         | None                      | None                     | NO                | YES                  | FUTURE_EXTENSION_ONLY | FUTURE_RESELLER_ACTIVATION_SPRINT_NOT_SCHEDULED |

Earliest Downstream Schema Sprint identifies the first schema sprint whose
scope is materially affected by closure of the gate. It does not authorize
that sprint and does not mean later schema sprints are unaffected.
