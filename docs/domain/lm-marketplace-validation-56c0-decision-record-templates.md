# DECISION RECORD TEMPLATES (LM-MARKETPLACE-VALIDATION-56C0)

MASTER_TEMPLATE_COUNT=1
LEG_MKT_DECISION_STUB_COUNT=10
OMQ_MKT_DECISION_STUB_COUNT=12
CROSS_GATE_TEMPLATE_COUNT=1
SOURCE_CONTRADICTION_TEMPLATE_COUNT=1
MODEL_REOPENING_TEMPLATE_COUNT=1
PREPOPULATED_DECISIONS=0

## Master Decision Record Template
```markdown
- gate ID: [ID]
- canonical question or meaning: [MEANING]
- current safe default: [DEFAULT]
- status: OPEN
- decision owner: [OWNER]
- supporting reviewers: [REVIEWERS]
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: [AGGREGATES]
- affected elements: [ELEMENTS]
- affected lifecycles: [LIFECYCLES]
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

## LEG-MKT Decision Stubs

### Stub for LEG-MKT-01
```markdown
- gate ID: LEG-MKT-01
- canonical question or meaning: intermediary legal qualification and terms
- current safe default: LOGIMARKET_INTERMEDIARY_ONLY; NO_SELLER_ROLE_FOR_PARTNER_MARKETPLACE
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: SELLER_AND_OFFER_CLASSIFICATION
- affected elements: OfferMarketplaceClassification, OfferSellerAssignment, OfferConversionClassification, OfferContractClassification
- affected lifecycles: LC-01, LC-02A, LC-02B, LC-02C
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for LEG-MKT-02
```markdown
- gate ID: LEG-MKT-02
- canonical question or meaning: contract formation for RFQ and e-commerce
- current safe default: CONTRACT_FORMATION_EVENT_UNRESOLVED; MODEL_ORDER_INTENT_AND_SELLER_ACCEPTANCE_SEPARATELY; MODEL_RFQ_REQUEST_AND_PARTNER_RESPONSE_SEPARATELY
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: MARKETPLACE_ORDER_ORCHESTRATION, SELLER_ORDER
- affected elements: RfqRequest, RfqPartnerResponse, MarketplaceOrder, SellerOrder, SellerOrderItem, SellerAcceptanceDecision
- affected lifecycles: LC-03, LC-04, LC-05, LC-06, LC-17
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for LEG-MKT-03
```markdown
- gate ID: LEG-MKT-03
- canonical question or meaning: seller identity and pre-contract disclosure
- current safe default: DISPLAY_SELLER_IDENTITY_AND_RESPONSIBILITY_BEFORE_CONVERSION
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: MARKETPLACE_ORDER_ORCHESTRATION, SELLER_ORDER
- affected elements: RfqSellerDisclosureSnapshot, EcommerceSellerDisclosureSnapshot
- affected lifecycles: LC-03, LC-04
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for LEG-MKT-04
```markdown
- gate ID: LEG-MKT-04
- canonical question or meaning: P2B terms, rankings, suspension and complaints
- current safe default: NO_AUTOMATIC_RANKING_PENALTY_OR_SUSPENSION_EFFECT_WITHOUT_VALIDATED_RULES
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: SELLER_AND_OFFER_CLASSIFICATION; AFTER_SALES_AND_DISPUTES
- affected elements: SellerEligibility; PlatformServiceComplaintCase
- affected lifecycles: LC-01; LC-11B
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for LEG-MKT-05
```markdown
- gate ID: LEG-MKT-05
- canonical question or meaning: PSP architecture, KYB/KYC, allocations and payouts
- current safe default: NO_SELF_CUSTODY; NO_LOGIMARKET_ESCROW; ABSTRACT_PSP_ALLOCATION_AND_PAYOUT
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: PSP Specialist
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: PAYMENT_AND_ALLOCATION, AUDIT_IDEMPOTENCY_AND_PRIVACY
- affected elements: PaymentOrchestration, PSPTransactionReference, PaymentAllocation, SellerSettlementReference, IdempotencyRecord, WebhookInboxMessage
- affected lifecycles: LC-01, LC-07, LC-08, LC-15
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for LEG-MKT-06
```markdown
- gate ID: LEG-MKT-06
- canonical question or meaning: VAT, accounting and KSeF split
- current safe default: PARTNER_GOODS_INVOICE; LOGIMARKET_PLATFORM_SERVICE_INVOICE; NO_DELEGATED_INVOICING
- status: OPEN
- decision owner: Tax Advisor
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: SELLER_ORDER, PLATFORM_REVENUE_AND_SELLER_SETTLEMENT_REFERENCE
- affected elements: GoodsInvoiceResponsibilitySnapshot, PlatformRevenueRecord, PlatformServiceInvoiceReference
- affected lifecycles: LC-05, LC-14
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for LEG-MKT-07
```markdown
- gate ID: LEG-MKT-07
- canonical question or meaning: refund, chargeback and seller liability
- current safe default: PARTNER_REFUND_LIABILITY; TECHNICAL_EXECUTOR_UNRESOLVED; CHARGEBACK_RESPONSIBILITY_UNRESOLVED
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: AFTER_SALES_AND_DISPUTES, SELLER_ORDER
- affected elements: ReturnCase, GoodsComplaintCase, RefundCase, ChargebackDispute, SellerResponsibilitySnapshot
- affected lifecycles: LC-10, LC-11A, LC-12, LC-13
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for LEG-MKT-08
```markdown
- gate ID: LEG-MKT-08
- canonical question or meaning: B2B and entrepreneur-with-consumer-rights analysis
- current safe default: DO_NOT_CLASSIFY_BUYER_STATUS_FROM_NIP_ONLY
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: MARKETPLACE_ORDER_ORCHESTRATION; SELLER_ORDER; AFTER_SALES_AND_DISPUTES
- affected elements: BuyerIdentityReference; RfqBuyerLegalContextSnapshot; EcommerceBuyerLegalContextSnapshot; ReturnCase; RefundCase
- affected lifecycles: LC-03; LC-04; LC-10; LC-12
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for LEG-MKT-09
```markdown
- gate ID: LEG-MKT-09
- canonical question or meaning: privacy roles and retention
- current safe default: NO_PREDETERMINED_CONTROLLER_ROLE; DOCUMENT_DATA_FLOWS; CONFIGURABLE_RETENTION
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: DPO
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: AUDIT_IDEMPOTENCY_AND_PRIVACY
- affected elements: DomainAuditEvent, RetentionPolicySnapshot, PrivacyProcessingContext
- affected lifecycles: no dedicated lifecycle; map audit/privacy elements explicitly
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for LEG-MKT-10
```markdown
- gate ID: LEG-MKT-10
- canonical question or meaning: future reseller activation
- current safe default: LOGIMARKET_RESELLER_DISABLED
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: FUTURE_LOGIMARKET_RESELLER_EXTENSION
- affected elements: FutureResellerActivationPolicy
- affected lifecycles: LC-16
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

## OMQ-MKT Decision Stubs

### Stub for OMQ-MKT-01
```markdown
- gate ID: OMQ-MKT-01
- canonical question or meaning: e-commerce contract-formation moment
- current safe default: CONTRACT_FORMATION_EVENT_UNRESOLVED
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: MARKETPLACE_ORDER_ORCHESTRATION, SELLER_ORDER
- affected elements: MarketplaceOrder; SellerOrder; SellerAcceptanceDecision
- affected lifecycles: separate order intent and seller acceptance lifecycle
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-02
```markdown
- gate ID: OMQ-MKT-02
- canonical question or meaning: RFQ contract-formation moment
- current safe default: RFQ_CONTRACT_FORMATION_EVENT_UNRESOLVED
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: MARKETPLACE_ORDER_ORCHESTRATION
- affected elements: RfqRequest; RfqPartnerResponse
- affected lifecycles: separate RFQ request and Partner response lifecycle
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-03
```markdown
- gate ID: OMQ-MKT-03
- canonical question or meaning: PSP marketplace architecture
- current safe default: ABSTRACT_PSP_ALLOCATION_AND_PAYOUT
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: PSP Specialist
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: PAYMENT_AND_ALLOCATION; AUDIT_IDEMPOTENCY_AND_PRIVACY
- affected elements: PaymentOrchestration; PSPTransactionReference; PaymentAllocation; SellerSettlementReference; WebhookInboxMessage; IdempotencyRecord
- affected lifecycles: abstract licensed-PSP references, allocation and settlement capabilities
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-04
```markdown
- gate ID: OMQ-MKT-04
- canonical question or meaning: seller KYB/KYC responsibilities
- current safe default: PENDING_PSP_AND_LEGAL_VALIDATION
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: PSP Specialist
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: SELLER_AND_OFFER_CLASSIFICATION; PAYMENT_AND_ALLOCATION
- affected elements: SellerLegalIdentity; SellerEligibility; PaymentOrchestration
- affected lifecycles: abstract seller legal identity, eligibility and KYB/KYC status reference
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-05
```markdown
- gate ID: OMQ-MKT-05
- canonical question or meaning: payment allocation and seller payout
- current safe default: NO_SELF_CUSTODY_NO_ESCROW
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: PSP Specialist
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: PAYMENT_AND_ALLOCATION
- affected elements: PaymentOrchestration; PaymentAllocation; SellerSettlementReference
- affected lifecycles: abstract allocation and settlement references with no selected payout architecture
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-06
```markdown
- gate ID: OMQ-MKT-06
- canonical question or meaning: monetization and commission/platform-service-fee model
- current safe default: COMMISSION_OR_PLATFORM_SERVICE_FEE
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: PLATFORM_REVENUE_AND_SELLER_SETTLEMENT_REFERENCE
- affected elements: PlatformRevenueRecord
- affected lifecycles: configurable platform-revenue policy
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-07
```markdown
- gate ID: OMQ-MKT-07
- canonical question or meaning: commission tax/accounting recognition
- current safe default: PENDING_TAX_AND_ACCOUNTING_VALIDATION
- status: OPEN
- decision owner: Tax Advisor
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: PLATFORM_REVENUE_AND_SELLER_SETTLEMENT_REFERENCE
- affected elements: PlatformRevenueRecord; PlatformServiceInvoiceReference
- affected lifecycles: externally validated tax and accounting policy
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-08
```markdown
- gate ID: OMQ-MKT-08
- canonical question or meaning: refund technical execution
- current safe default: REFUND_TECHNICAL_EXECUTOR_UNRESOLVED
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: PSP Specialist
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: AFTER_SALES_AND_DISPUTES
- affected elements: RefundCase
- affected lifecycles: separate financial liability, business decision, platform orchestration and unresolved technical executor
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-09
```markdown
- gate ID: OMQ-MKT-09
- canonical question or meaning: chargeback responsibility and allocation
- current safe default: CHARGEBACK_ALLOCATION_UNRESOLVED
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: PSP Specialist
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: AFTER_SALES_AND_DISPUTES
- affected elements: ChargebackDispute
- affected lifecycles: abstract dispute record with unresolved responsibility and allocation
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-10
```markdown
- gate ID: OMQ-MKT-10
- canonical question or meaning: seller goods invoice and KSeF exchange
- current safe default: NO_DELEGATED_INVOICING
- status: OPEN
- decision owner: Tax Advisor
- supporting reviewers: UNASSIGNED
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: SELLER_ORDER
- affected elements: GoodsInvoiceResponsibilitySnapshot
- affected lifecycles: invoice-responsibility snapshot and external invoice/KSeF reference
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-11
```markdown
- gate ID: OMQ-MKT-11
- canonical question or meaning: privacy-role allocation and retention
- current safe default: NO_PREDETERMINED_CONTROLLER_ROLE
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: DPO
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: AUDIT_IDEMPOTENCY_AND_PRIVACY
- affected elements: PrivacyProcessingContext; RetentionPolicySnapshot; DomainAuditEvent
- affected lifecycles: configurable privacy-processing context and retention snapshot
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

### Stub for OMQ-MKT-12
```markdown
- gate ID: OMQ-MKT-12
- canonical question or meaning: future reseller activation
- current safe default: LOGIMARKET_RESELLER_DISABLED
- status: OPEN
- decision owner: Legal Counsel
- supporting reviewers: DPO
- date: [DATE]
- jurisdiction: [JURISDICTION]
- evidence reviewed: NOT_ATTACHED
- decision: NOT_RECORDED
- rationale: [RATIONALE]
- rejected alternatives: [REJECTED]
- assumptions: [ASSUMPTIONS]
- affected aggregates: FUTURE_LOGIMARKET_RESELLER_EXTENSION
- affected elements: FutureResellerActivationPolicy; OfferContractClassification
- affected lifecycles: isolated disabled future-extension policy
- required 56B0 changes: [CHANGES]
- required 56B1 changes: [CHANGES]
- required application changes: [CHANGES]
- privacy impact: [IMPACT]
- tax/accounting impact: [IMPACT]
- PSP impact: [IMPACT]
- operational impact: [IMPACT]
- rollback or reopening conditions: [CONDITIONS]
- approval signatures: NOT_GRANTED
```

## Cross-Gate Decision Template
```markdown
- affected gate IDs: [IDS]
- description: [DESC]
- decision owner: [OWNER]
- date: [DATE]
- decision: NOT_RECORDED
- status: OPEN
- evidence reviewed: NOT_ATTACHED
- approval signatures: NOT_GRANTED
```

## Source-Contradiction Resolution Template
```markdown
- contradiction ID: [ID]
- conflicting sources: [SOURCES]
- resolution: NOT_RECORDED
- status: OPEN
- approval signatures: NOT_GRANTED
```

## 56B0 Reopening Assessment Template
```markdown
- reopening condition triggered: [CONDITION]
- required 56B0 change: [CHANGE]
- approval: NOT_GRANTED
```
