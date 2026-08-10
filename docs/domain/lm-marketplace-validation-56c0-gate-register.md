# CANONICAL GATE REGISTER (LM-MARKETPLACE-VALIDATION-56C0)

LEG_MKT_GATE_COUNT=10
OMQ_MKT_GATE_COUNT=12
TOTAL_VALIDATION_ITEMS=22

## LEG-MKT ITEMS

### LEG-MKT-01
STATUS=APPROVED_WITH_CONDITIONS
- ID: LEG-MKT-01
- exact canonical meaning: intermediary legal qualification and terms
- exact current safe documentation default: LOGIMARKET_INTERMEDIARY_ONLY; NO_SELLER_ROLE_FOR_PARTNER_MARKETPLACE
- primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregate boundaries: SELLER_AND_OFFER_CLASSIFICATION
- affected model elements: OfferMarketplaceClassification, OfferSellerAssignment, OfferConversionClassification, OfferContractClassification
- affected lifecycles: LC-01, LC-02A, LC-02B, LC-02C
- initial-MVP physical-schema blocker: NO
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- acceptance criteria: Written confirmation of LogiMarket's intermediary status.
- decision options supported by source documents: INTERMEDIARY_FIRST
- explicitly prohibited assumptions: LOGIMARKET_AS_GLOBAL_SELLER
- downstream artifacts affected: Physical schema, Application code

### LEG-MKT-02
STATUS=APPROVED_WITH_CONDITIONS
- ID: LEG-MKT-02
- exact canonical meaning: contract formation for RFQ and e-commerce
- exact current safe documentation default: E2=BUYER_ORDER_INTENT; E3=TECHNICAL_RECEIPT_ACKNOWLEDGEMENT; E6=ROUTED_TO_PARTNER; E7=EXPLICIT_PARTNER_ACCEPTANCE; CONTRACT_FORMATION_EVENT=E7; SILENCE_IS_ACCEPTANCE=NO; RFQ_NONBINDING_BY_DEFAULT=YES; RFQ_SUBMISSION_CREATES_MARKETPLACE_CONTRACT=NO
- primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregate boundaries: MARKETPLACE_ORDER_ORCHESTRATION, SELLER_ORDER
- affected model elements: RfqRequest, RfqPartnerResponse, MarketplaceOrder, SellerOrder, SellerOrderItem, SellerAcceptanceDecision
- affected lifecycles: LC-03, LC-04, LC-05, LC-06, LC-17
- initial-MVP physical-schema blocker: NO
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- acceptance criteria: Written definition of contract formation moments.
- decision options supported by source documents: SEPARATE_ORDER_AND_ACCEPTANCE
- explicitly prohibited assumptions: DEFAULT_AUTOMATIC_ACCEPTANCE
- downstream artifacts affected: Physical schema, Application code (56B2 implications remain)

### LEG-MKT-03
STATUS=APPROVED_WITH_CONDITIONS
- ID: LEG-MKT-03
- exact canonical meaning: seller identity and pre-contract disclosure
- exact current safe documentation default: DISPLAY_SELLER_IDENTITY_AND_RESPONSIBILITY_BEFORE_CONVERSION
- primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregate boundaries: MARKETPLACE_ORDER_ORCHESTRATION, SELLER_ORDER
- affected model elements: RfqSellerDisclosureSnapshot, EcommerceSellerDisclosureSnapshot
- affected lifecycles: LC-03, LC-04
- initial-MVP physical-schema blocker: NO
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- acceptance criteria: Written rules for seller disclosure timing and content.
- decision options supported by source documents: PRE_CONVERSION_DISCLOSURE
- explicitly prohibited assumptions: SILENT_SELLER_ASSIGNMENT
- downstream artifacts affected: Physical schema, UI/UX, Application code (seller disclosure requirements remain downstream implementation obligations)

### LEG-MKT-04
STATUS=NOT_APPLICABLE_WHILE_PURE_B2B
- ID: LEG-MKT-04
- exact canonical meaning: P2B terms, rankings, suspension and complaints
- exact current safe documentation default: NO_AUTOMATIC_RANKING_PENALTY_OR_SUSPENSION_EFFECT_WITHOUT_VALIDATED_RULES
- primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregate boundaries: SELLER_AND_OFFER_CLASSIFICATION; AFTER_SALES_AND_DISPUTES
- affected model elements: SellerEligibility; PlatformServiceComplaintCase
- affected lifecycles: LC-01; LC-11B
- initial-MVP physical-schema blocker: NO
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- acceptance criteria: Validated P2B compliance rules. (reopen trigger = business model ceases to be pure B2B / P2B becomes applicable)
- decision options supported by source documents: EXPLICIT_PLATFORM_COMPLAINTS, EXPLICIT_SUSPENSION_REASONS
- explicitly prohibited assumptions: ARBITRARY_SUSPENSION
- downstream artifacts affected: Physical schema, Application code

### LEG-MKT-05
STATUS=OPEN
- ID: LEG-MKT-05
- exact canonical meaning: PSP architecture, KYB/KYC, allocations and payouts
- exact current safe documentation default: NO_SELF_CUSTODY; NO_LOGIMARKET_ESCROW; ABSTRACT_PSP_ALLOCATION_AND_PAYOUT
- primary evidence owner: Legal Counsel
- supporting reviewer: PSP Specialist
- affected aggregate boundaries: PAYMENT_AND_ALLOCATION, AUDIT_IDEMPOTENCY_AND_PRIVACY
- affected model elements: PaymentOrchestration, PSPTransactionReference, PaymentAllocation, SellerSettlementReference, IdempotencyRecord, WebhookInboxMessage
- affected lifecycles: LC-01, LC-07, LC-08, LC-15
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- acceptance criteria: Validated PSP integration model complying with PSD2/payment laws.
- decision options supported by source documents: LICENSED_PSP_DELEGATION
- explicitly prohibited assumptions: LOGIMARKET_ESCROW, SELF_CUSTODY
- downstream artifacts affected: Physical schema, Application code, PSP Integration

### LEG-MKT-06
STATUS=OPEN
- ID: LEG-MKT-06
- exact canonical meaning: VAT, accounting and KSeF split
- exact current safe documentation default: PARTNER_GOODS_INVOICE; LOGIMARKET_PLATFORM_SERVICE_INVOICE; NO_DELEGATED_INVOICING
- primary evidence owner: Tax Advisor
- supporting reviewer: UNASSIGNED
- affected aggregate boundaries: SELLER_ORDER, PLATFORM_REVENUE_AND_SELLER_SETTLEMENT_REFERENCE
- affected model elements: GoodsInvoiceResponsibilitySnapshot, PlatformRevenueRecord, PlatformServiceInvoiceReference
- affected lifecycles: LC-05, LC-14
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- acceptance criteria: Validated VAT and invoicing responsibility rules.
- decision options supported by source documents: NO_DELEGATED_INVOICING
- explicitly prohibited assumptions: LOGIMARKET_GOODS_INVOICE_FOR_PARTNER_MARKETPLACE
- downstream artifacts affected: Physical schema, Application code, Finance/Accounting

### LEG-MKT-07
STATUS=OPEN
- ID: LEG-MKT-07
- exact canonical meaning: refund, chargeback and seller liability
- exact current safe documentation default: PARTNER_REFUND_LIABILITY; TECHNICAL_EXECUTOR_UNRESOLVED; CHARGEBACK_RESPONSIBILITY_UNRESOLVED
- primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregate boundaries: AFTER_SALES_AND_DISPUTES, SELLER_ORDER
- affected model elements: ReturnCase, GoodsComplaintCase, RefundCase, ChargebackDispute, SellerResponsibilitySnapshot
- affected lifecycles: LC-10, LC-11A, LC-12, LC-13
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- acceptance criteria: Clear responsibility and liability mapping for refunds and chargebacks.
- decision options supported by source documents: PARTNER_REFUND_LIABILITY
- explicitly prohibited assumptions: PSP_EXECUTES_REFUND_SELECTED
- downstream artifacts affected: Physical schema, Application code

### LEG-MKT-08
STATUS=OPEN
- ID: LEG-MKT-08
- exact canonical meaning: B2B and entrepreneur-with-consumer-rights analysis
- exact current safe documentation default: DO_NOT_CLASSIFY_BUYER_STATUS_FROM_NIP_ONLY
- primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregate boundaries: MARKETPLACE_ORDER_ORCHESTRATION; SELLER_ORDER; AFTER_SALES_AND_DISPUTES
- affected model elements: BuyerIdentityReference; RfqBuyerLegalContextSnapshot; EcommerceBuyerLegalContextSnapshot; ReturnCase; RefundCase
- affected lifecycles: LC-03; LC-04; LC-10; LC-12
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- acceptance criteria: Written methodology for classifying buyer status.
- decision options supported by source documents: EXPLICIT_BUYER_DECLARATION
- explicitly prohibited assumptions: BUYER_STATUS_FROM_NIP_ONLY
- downstream artifacts affected: Physical schema, Application code, Registration UX

### LEG-MKT-09
STATUS=APPROVED_WITH_CONDITIONS
- ID: LEG-MKT-09
- exact canonical meaning: privacy roles and retention
- exact current safe documentation default: NO_PREDETERMINED_CONTROLLER_ROLE; DOCUMENT_DATA_FLOWS; CONFIGURABLE_RETENTION; PRIVACY_IMPLEMENTATION_EVIDENCE=OPEN_BEFORE_GO_LIVE
- primary evidence owner: Legal Counsel
- supporting reviewer: DPO
- affected aggregate boundaries: AUDIT_IDEMPOTENCY_AND_PRIVACY
- affected model elements: DomainAuditEvent, RetentionPolicySnapshot, PrivacyProcessingContext
- affected lifecycles: no dedicated lifecycle; map audit/privacy elements explicitly
- initial-MVP physical-schema blocker: NO (DPO_ARCHITECTURAL_BLOCKER_FOR_56B1=CLEARED)
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- acceptance criteria: Defined controller/processor roles and retention periods. (implementation/privacy evidence remains before go-live)
- decision options supported by source documents: EXPLICIT_ROLES_PER_AGGREGATE
- explicitly prohibited assumptions: JOINT_CONTROLLERSHIP_CONFIRMED
- downstream artifacts affected: Physical schema, Application code, GDPR artifacts

### LEG-MKT-10
STATUS=OPEN
- ID: LEG-MKT-10
- exact canonical meaning: future reseller activation
- exact current safe documentation default: LOGIMARKET_RESELLER_DISABLED
- primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregate boundaries: FUTURE_LOGIMARKET_RESELLER_EXTENSION
- affected model elements: FutureResellerActivationPolicy
- affected lifecycles: LC-16
- initial-MVP physical-schema blocker: NO
- initial-MVP application blocker: NO
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- acceptance criteria: Reseller policy terms when/if activated.
- decision options supported by source documents: EXPLICIT_ACTIVATION_ONLY
- explicitly prohibited assumptions: GLOBAL_RESELLER_SWITCH
- downstream artifacts affected: Future schemas, Future code

## OMQ-MKT ITEMS

### OMQ-MKT-01
STATUS=APPROVED_WITH_CONDITIONS
- ID: OMQ-MKT-01
- exact unresolved question: e-commerce contract-formation moment
- exact safe documentation default: E7=EXPLICIT_PARTNER_ACCEPTANCE
- exact primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregates: MARKETPLACE_ORDER_ORCHESTRATION, SELLER_ORDER
- affected elements: MarketplaceOrder; SellerOrder; SellerAcceptanceDecision
- logical representation strategy: separate order intent and seller acceptance lifecycle
- logical-model blocker: NO
- 56B1_PHYSICAL_SCHEMA_BLOCKER=NO
- initial-MVP physical-schema blocker: NO
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Verified definition of when the contract is formed.
- rejected premature conclusions: DEFAULT_AUTOMATIC_ACCEPTANCE
- downstream artifacts affected: Physical schema, Application code

### OMQ-MKT-02
STATUS=APPROVED_WITH_CONDITIONS
- ID: OMQ-MKT-02
- exact unresolved question: RFQ contract-formation moment
- exact safe documentation default: RFQ_NONBINDING_BY_DEFAULT=YES
- exact primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregates: MARKETPLACE_ORDER_ORCHESTRATION
- affected elements: RfqRequest; RfqPartnerResponse
- logical representation strategy: separate RFQ request and Partner response lifecycle
- logical-model blocker: NO
- 56B1_PHYSICAL_SCHEMA_BLOCKER=NO
- initial-MVP physical-schema blocker: NO
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Verified RFQ finalization process and contract event.
- rejected premature conclusions: DEFAULT_AUTOMATIC_ACCEPTANCE
- downstream artifacts affected: Physical schema, Application code

### OMQ-MKT-03
STATUS=OPEN
- ID: OMQ-MKT-03
- exact unresolved question: PSP marketplace architecture
- exact safe documentation default: ABSTRACT_PSP_ALLOCATION_AND_PAYOUT
- exact primary evidence owner: Legal Counsel
- supporting reviewer: PSP Specialist
- affected aggregates: PAYMENT_AND_ALLOCATION; AUDIT_IDEMPOTENCY_AND_PRIVACY
- affected elements: PaymentOrchestration; PSPTransactionReference; PaymentAllocation; SellerSettlementReference; WebhookInboxMessage; IdempotencyRecord
- logical representation strategy: abstract licensed-PSP references, allocation and settlement capabilities
- logical-model blocker: NO
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: PSP integration model selected and legally validated.
- rejected premature conclusions: SELF_CUSTODY, ESCROW
- downstream artifacts affected: Physical schema, Application code, Integration specs

### OMQ-MKT-04
STATUS=OPEN
- ID: OMQ-MKT-04
- exact unresolved question: seller KYB/KYC responsibilities
- exact safe documentation default: PENDING_PSP_AND_LEGAL_VALIDATION
- exact primary evidence owner: Legal Counsel
- supporting reviewer: PSP Specialist
- affected aggregates: SELLER_AND_OFFER_CLASSIFICATION; PAYMENT_AND_ALLOCATION
- affected elements: SellerLegalIdentity; SellerEligibility; PaymentOrchestration
- logical representation strategy: abstract seller legal identity, eligibility and KYB/KYC status reference
- logical-model blocker: NO
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Verified KYB responsibilities and onboarding flow.
- rejected premature conclusions: PSP_PERFORMS_ALL_KYB_SILENTLY
- downstream artifacts affected: Physical schema, Application code

### OMQ-MKT-05
STATUS=OPEN
- ID: OMQ-MKT-05
- exact unresolved question: payment allocation and seller payout
- exact safe documentation default: NO_SELF_CUSTODY_NO_ESCROW
- exact primary evidence owner: Legal Counsel
- supporting reviewer: PSP Specialist
- affected aggregates: PAYMENT_AND_ALLOCATION
- affected elements: PaymentOrchestration; PaymentAllocation; SellerSettlementReference
- logical representation strategy: abstract allocation and settlement references with no selected payout architecture
- logical-model blocker: NO
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Payout timing, methods, and authorization defined.
- rejected premature conclusions: DIRECT_PAYMENT_TO_PARTNER_SELECTED, SPLIT_PAYMENT_SELECTED
- downstream artifacts affected: Physical schema, Application code

### OMQ-MKT-06
STATUS=OPEN
- ID: OMQ-MKT-06
- exact unresolved question: monetization and commission/platform-service-fee model
- exact safe documentation default: COMMISSION_OR_PLATFORM_SERVICE_FEE
- exact primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregates: PLATFORM_REVENUE_AND_SELLER_SETTLEMENT_REFERENCE
- affected elements: PlatformRevenueRecord
- logical representation strategy: configurable platform-revenue policy
- logical-model blocker: NO
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Monetization approach validated.
- rejected premature conclusions: TRADING_MARGIN_AS_DEFAULT_MARKETPLACE_REVENUE
- downstream artifacts affected: Physical schema, Application code

### OMQ-MKT-07
STATUS=OPEN
- ID: OMQ-MKT-07
- exact unresolved question: commission tax/accounting recognition
- exact safe documentation default: PENDING_TAX_AND_ACCOUNTING_VALIDATION
- exact primary evidence owner: Tax Advisor
- supporting reviewer: UNASSIGNED
- affected aggregates: PLATFORM_REVENUE_AND_SELLER_SETTLEMENT_REFERENCE
- affected elements: PlatformRevenueRecord; PlatformServiceInvoiceReference
- logical representation strategy: externally validated tax and accounting policy
- logical-model blocker: NO
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Accounting recognition policies mapped.
- rejected premature conclusions: CUSTOMER_PAYMENT_AS_LOGIMARKET_GOODS_REVENUE
- downstream artifacts affected: Physical schema, Application code, Accounting system

### OMQ-MKT-08
STATUS=OPEN
- ID: OMQ-MKT-08
- exact unresolved question: refund technical execution
- exact safe documentation default: REFUND_TECHNICAL_EXECUTOR_UNRESOLVED
- exact primary evidence owner: Legal Counsel
- supporting reviewer: PSP Specialist
- affected aggregates: AFTER_SALES_AND_DISPUTES
- affected elements: RefundCase
- logical representation strategy: separate financial liability, business decision, platform orchestration and unresolved technical executor
- logical-model blocker: NO
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Refund initiation and execution responsibilities verified.
- rejected premature conclusions: PSP_EXECUTES_REFUND_SELECTED
- downstream artifacts affected: Physical schema, Application code

### OMQ-MKT-09
STATUS=OPEN
- ID: OMQ-MKT-09
- exact unresolved question: chargeback responsibility and allocation
- exact safe documentation default: CHARGEBACK_ALLOCATION_UNRESOLVED
- exact primary evidence owner: Legal Counsel
- supporting reviewer: PSP Specialist
- affected aggregates: AFTER_SALES_AND_DISPUTES
- affected elements: ChargebackDispute
- logical representation strategy: abstract dispute record with unresolved responsibility and allocation
- logical-model blocker: NO
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Dispute liability and handling rules verified.
- rejected premature conclusions: UNVERIFIED_CHARGEBACK_RESPONSIBILITY
- downstream artifacts affected: Physical schema, Application code

### OMQ-MKT-10
STATUS=OPEN
- ID: OMQ-MKT-10
- exact unresolved question: seller goods invoice and KSeF exchange
- exact safe documentation default: NO_DELEGATED_INVOICING
- exact primary evidence owner: Tax Advisor
- supporting reviewer: UNASSIGNED
- affected aggregates: SELLER_ORDER
- affected elements: GoodsInvoiceResponsibilitySnapshot
- logical representation strategy: invoice-responsibility snapshot and external invoice/KSeF reference
- logical-model blocker: NO
- initial-MVP physical-schema blocker: YES
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Invoicing capabilities and mandates verified.
- rejected premature conclusions: LOGIMARKET_GOODS_INVOICE_FOR_PARTNER_MARKETPLACE
- downstream artifacts affected: Physical schema, Application code

### OMQ-MKT-11
STATUS=APPROVED_WITH_CONDITIONS
- ID: OMQ-MKT-11
- exact unresolved question: privacy-role allocation and retention
- exact safe documentation default: DPO_ARCHITECTURAL_BLOCKER_FOR_56B1=CLEARED; PRIVACY_IMPLEMENTATION_EVIDENCE=OPEN_BEFORE_GO_LIVE
- exact primary evidence owner: Legal Counsel
- supporting reviewer: DPO
- affected aggregates: AUDIT_IDEMPOTENCY_AND_PRIVACY
- affected elements: PrivacyProcessingContext; RetentionPolicySnapshot; DomainAuditEvent
- logical representation strategy: configurable privacy-processing context and retention snapshot
- logical-model blocker: NO
- initial-MVP physical-schema blocker: NO
- initial-MVP application blocker: YES
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Privacy terms, roles and data flows mapped.
- rejected premature conclusions: JOINT_CONTROLLERSHIP_CONFIRMED
- downstream artifacts affected: Physical schema, Application code

### OMQ-MKT-12
STATUS=OPEN
- ID: OMQ-MKT-12
- exact unresolved question: future reseller activation
- exact safe documentation default: LOGIMARKET_RESELLER_DISABLED
- exact primary evidence owner: Legal Counsel
- supporting reviewer: UNASSIGNED
- affected aggregates: FUTURE_LOGIMARKET_RESELLER_EXTENSION
- affected elements: FutureResellerActivationPolicy; OfferContractClassification
- logical representation strategy: isolated disabled future-extension policy
- logical-model blocker: NO
- initial-MVP physical-schema blocker: NO
- initial-MVP application blocker: NO
- future-reseller physical-schema blocker: YES
- future-reseller application blocker: YES
- evidence required: EXTERNAL_EVIDENCE_REQUIRED
- closure criteria: Activation terms specified and accepted.
- rejected premature conclusions: LOGIMARKET_AS_GLOBAL_SELLER
- downstream artifacts affected: Physical schema, Application code (future phase)
