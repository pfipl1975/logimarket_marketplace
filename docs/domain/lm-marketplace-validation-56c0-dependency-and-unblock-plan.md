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
- supporting reviewers: Internal Product
- dependencies: None. Foundation for all other workstreams.
- decisions produced: LEG-MKT-01, LEG-MKT-02, LEG-MKT-03, LEG-MKT-04, OMQ-MKT-01, OMQ-MKT-02
- affected model areas: SELLER_AND_OFFER_CLASSIFICATION, MARKETPLACE_ORDER_ORCHESTRATION, SELLER_ORDER
- blocked implementation areas: Initial-MVP physical schema.
- parallelizable activities: Can be reviewed in parallel with Workstream E.
- sequencing constraints: Must conclude before Workstream B, C, and D can finalize decisions on liability.
- completion criteria: Written definitions of contract formation and intermediary limits.
- reopening criteria: Legal changes requiring joint-seller or Merchant-of-Record role.

### Workstream B — PSP, KYB/KYC, payment allocation and payouts
- inputs: Workstream A decisions, PSD2 laws, PSP APIs.
- owner: Legal Counsel
- supporting reviewers: PSP Specialist, Internal Product
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
- supporting reviewers: PSP Specialist, Internal Product
- dependencies: Depends on Workstream A and Workstream B.
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
- supporting reviewers: Legal Counsel
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
- supporting reviewers: DPO
- dependencies: None.
- decisions produced: LEG-MKT-08, LEG-MKT-09, OMQ-MKT-11
- affected model areas: MARKETPLACE_ORDER_ORCHESTRATION, AUDIT_IDEMPOTENCY_AND_PRIVACY, AFTER_SALES_AND_DISPUTES
- blocked implementation areas: Initial-MVP physical schema.
- parallelizable activities: Can be run fully in parallel to A, B, C, and D.
- sequencing constraints: None.
- completion criteria: Controller roles, buyer definitions, and retention periods verified.
- reopening criteria: GDPR non-compliance detected in logical flows.

### Workstream F — Future reseller activation
- inputs: None currently active.
- owner: Legal Counsel
- supporting reviewers: Internal Product
- dependencies: None for MVP.
- decisions produced: LEG-MKT-10, OMQ-MKT-12
- affected model areas: FUTURE_LOGIMARKET_RESELLER_EXTENSION
- blocked implementation areas: Future-reseller physical schema only.
- parallelizable activities: Can be deferred entirely.
- sequencing constraints: Deferred until reseller sprint scheduled.
- completion criteria: Future reseller terms approved.
- reopening criteria: Decision to activate reseller model.

## Dependency Matrix

| Gate / Item | Parallelizable With | Depends On | Blocks MVP Schema | Blocks Future Schema | May Reopen 56B0 | Absorbed in 56B1 |
|-------------|---------------------|------------|-------------------|----------------------|-----------------|------------------|
| LEG-MKT-01  | Workstream E        | None       | YES               | YES                  | YES             | NO               |
| LEG-MKT-02  | Workstream E        | None       | YES               | YES                  | YES             | NO               |
| LEG-MKT-03  | Workstream E        | None       | YES               | YES                  | YES             | NO               |
| LEG-MKT-04  | Workstream E        | None       | YES               | YES                  | YES             | NO               |
| LEG-MKT-05  | Workstream C        | WS A       | YES               | YES                  | YES             | NO               |
| LEG-MKT-06  | Workstream B        | WS A       | YES               | YES                  | NO              | YES              |
| LEG-MKT-07  | Workstream D        | WS A, B    | YES               | YES                  | YES             | NO               |
| LEG-MKT-08  | Workstream A, B     | None       | YES               | YES                  | NO              | YES              |
| LEG-MKT-09  | Workstream A, B     | None       | YES               | YES                  | NO              | YES              |
| LEG-MKT-10  | None                | None       | NO                | YES                  | YES             | NO               |
| OMQ-MKT-01  | Workstream E        | None       | YES               | YES                  | NO              | YES              |
| OMQ-MKT-02  | Workstream E        | None       | YES               | YES                  | NO              | YES              |
| OMQ-MKT-03  | Workstream C        | WS A       | YES               | YES                  | NO              | YES              |
| OMQ-MKT-04  | Workstream C        | WS A       | YES               | YES                  | NO              | YES              |
| OMQ-MKT-05  | Workstream C        | WS A       | YES               | YES                  | NO              | YES              |
| OMQ-MKT-06  | Workstream B        | WS A       | YES               | YES                  | NO              | YES              |
| OMQ-MKT-07  | Workstream B        | WS A       | YES               | YES                  | NO              | YES              |
| OMQ-MKT-08  | Workstream D        | WS A, B    | YES               | YES                  | NO              | YES              |
| OMQ-MKT-09  | Workstream D        | WS A, B    | YES               | YES                  | NO              | YES              |
| OMQ-MKT-10  | Workstream B        | WS A       | YES               | YES                  | NO              | YES              |
| OMQ-MKT-11  | Workstream A, B     | None       | YES               | YES                  | NO              | YES              |
| OMQ-MKT-12  | None                | None       | NO                | YES                  | NO              | NO               |
