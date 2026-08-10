# LOGIMARKET HYBRID INTERMEDIARY-FIRST MARKETPLACE IMPLEMENTATION ROADMAP

TITLE=LOGIMARKET HYBRID INTERMEDIARY-FIRST MARKETPLACE IMPLEMENTATION ROADMAP
DOCUMENT_ROLE=NORMATIVE_MARKETPLACE_IMPLEMENTATION_ROADMAP
DOCUMENT_STATUS=R3_ROADMAP_CORRECTION_IN_PROGRESS
MVP_PLATFORM_ROLE=INTERMEDIARY_MARKETPLACE

R3_SUPERSEDES_RESELLER_FIRST_ROADMAP=YES
HISTORICAL_MODEL_A_ROADMAP_PRESERVED_BY_REFERENCE=YES
MODEL_A_ACTIVE_IN_INITIAL_MVP=NO

VERSION=2.0.0
EFFECTIVE_DATE=2026-07-25

## 1. STRATEGIC IMPLEMENTATION PRINCIPLES

1. Domain decisions before logical modeling.
2. Logical modeling before physical schema.
3. Physical schema before application workflow implementation.
4. offerModel and contractModel remain independent.
5. Partner is default seller for RFQ and e-commerce.
6. Outbound remains external redirect through /go/[id].
7. Future LogiMarket reseller capability remains isolated and disabled.
8. Payment implementation requires approved abstract PSP architecture.
9. No LogiMarket self-custody or LogiMarket-operated escrow.
10. Partner onboarding remains centrally curated.
11. No automated vendor registration.
12. No seller self-service or multi-vendor dashboard in initial MVP.
13. Existing RFQ, cart and outbound behavior must remain operational.
14. Each sprint requires separate review, selective staging and explicit authorization.

## 2. COMPLETED AND SUPERSEDED HISTORY

LM-DROP-DOMAIN-56A-R2A=HISTORICAL_COMPLETED
LM-DROP-DOMAIN-56A-R2B=SUPERSEDED_AS_GLOBAL_MVP_DEFAULT
LM-DROP-DATA-MODEL-56B0=SUPERSEDED
PR_16=SUPERSEDED_AND_CLOSED
PR_16_MERGED=NO

LM-MARKETPLACE-DOMAIN-56A-R3=DONE
LM-MARKETPLACE-DATA-MODEL-56B0=DONE
LM-MARKETPLACE-VALIDATION-56C0=DONE
LM-MARKETPLACE-READINESS-56C0A=DONE

Former Model A remains:
FUTURE_LOGIMARKET_RESELLER_CHANNEL

## 3. NEXT SPRINT

NEXT_SCHEMA_CANDIDATE=LM-MARKETPLACE-SCHEMA-56B1
TITLE=MARKETPLACE PHYSICAL SCHEMA FOUNDATION
TYPE=PHYSICAL_SCHEMA_FOUNDATION
APPLICATION_WORKFLOW_IMPLEMENTATION=OUT_OF_SCOPE
STATUS=READY_CANDIDATE_PENDING_56C0B_MERGE_AND_OWNER_REVIEW

CURRENT_56C0B_DOCUMENTATION_CHANGE_SCOPE:
APPLICATION_CODE_CHANGED=NO
SCHEMA_CHANGED=NO
MIGRATIONS_CHANGED=NO
DATABASE_CHANGED=NO

The next sprint must design ONLY the approved 56B1 scope:

56B1 IN:
- curated SellerProfile foundation
- SellerLegalIdentity
- seller legal/company name
- country / jurisdiction
- neutral tax identifiers where applicable
- VAT identifier where applicable
- registry identifiers
- verification status / metadata / source reference
- offer -> seller relationship
- OfferContractClassification
- explicit contractModel:
    partner_marketplace
    external_redirect
    logimarket_reseller [future disabled]

56B1 OUT:
- MarketplaceOrder
- SellerOrder
- SellerOrderItem
- SellerAcceptanceDecision
- BuyerLegalContext
- E2/E3/E6/E7 runtime workflow
- payment / PSP / preauth / capture
- DAC7 reporting
- KSeF
- invoices
- refunds / chargebacks
- fulfillment / shipments
- retention automation
- Partner Portal

READY_FOR_LOGICAL_DATA_MODEL_RESET=DONE
LM_MARKETPLACE_SCHEMA_56B1_BLOCKED=NO
LM_MARKETPLACE_SCHEMA_56B1_READY_CANDIDATE=YES

## 4. LOGICAL DATA-MODEL REVIEW GATE

LM-MARKETPLACE-DATA-MODEL-56B0-R1=INDEPENDENT_LOGICAL_MODEL_REVIEW

Required before physical schema:
- aggregate boundaries reviewed;
- entity catalog reviewed;
- invariants reviewed;
- lifecycle/state machines reviewed;
- snapshot policy reviewed;
- current-schema mapping reviewed;
- unresolved PSP decisions represented abstractly;
- future reseller isolated;
- no supplier-payable semantics in partner marketplace;
- business approval recorded.

LOGICAL_MODEL_REVIEW_REQUIRED=YES
PHYSICAL_SCHEMA_BEFORE_LOGICAL_MODEL_REVIEW=NO

## 5. ACTIVE PHYSICAL SCHEMA ROADMAP

1. LM-MARKETPLACE-SCHEMA-56B1
   SELLER IDENTITY AND OFFER CONTRACT CLASSIFICATION

   Scope:
   - curated seller identity;
   - offer-to-seller relationship;
   - explicit contractModel;
   - seller and contract snapshots;
   - no automated registration;
   - no seller dashboard.

2. LM-MARKETPLACE-SCHEMA-56B2
   MARKETPLACE ORDER AND SELLER-ORDER CORE

   Scope:
   - marketplace order;
   - seller orders;
   - seller-order items;
   - seller acceptance lifecycle;
   - multi-seller grouping;
   - preserve current cart behavior until application sprint.

3. LM-MARKETPLACE-SCHEMA-56B3
   PAYMENT ABSTRACTION, PLATFORM FEES AND SELLER SETTLEMENT REFERENCES

   Scope:
   - PSP-neutral payment records;
   - allocation references;
   - payout/settlement references;
   - platform fee or commission records;
   - no self-custody;
   - no LogiMarket escrow;
   - no specific PSP assumption.

4. LM-MARKETPLACE-SCHEMA-56B4
   INVOICING, REFUNDS, CHARGEBACKS AND DISPUTES

   Scope:
   - partner goods-invoice responsibility;
   - LogiMarket platform-service invoices;
   - refund financial liability;
   - technical refund execution abstraction;
   - chargeback and dispute evidence.

5. LM-MARKETPLACE-SCHEMA-56B5
   FULFILLMENT, SHIPMENTS, RETURNS AND COMPLAINTS

   Scope:
   - partner fulfillment responsibility;
   - seller-order shipments;
   - parcel and pallet;
   - returns;
   - goods complaints;
   - platform-service complaints;
   - no `/go/[id]` shipment tracking.

6. LM-MARKETPLACE-SCHEMA-56B6
   AUDIT, IDEMPOTENCY, PRIVACY AND RETENTION

   Scope:
   - audit records;
   - domain events;
   - idempotency;
   - webhook inbox/outbox support;
   - configurable retention;
   - no predetermined privacy-controller role.

7. LM-MARKETPLACE-SCHEMA-56B7
   CONTROLLED MIGRATION AND DATA VERIFICATION

   Scope:
   - reviewed Drizzle migrations;
   - rollback plan;
   - fixtures;
   - integrity assertions;
   - non-destructive migration verification;
   - explicit production authorization.

Every schema sprint must be:
STATUS=BLOCKED
until its own dependencies and external gates are satisfied.

## 6. APPLICATION WORKFLOW ROADMAP

LM-MARKETPLACE-ORDER-56C
Marketplace order and seller-order orchestration

LM-MARKETPLACE-SELLER-56D
Curated seller handoff, acceptance and SLA workflow

LM-MARKETPLACE-PAYMENT-56E
Licensed-PSP integration, allocation, refund and reconciliation

LM-MARKETPLACE-FULFILLMENT-56F
Partner fulfillment and shipment orchestration

LM-MARKETPLACE-RETURNS-56G
Returns, goods complaints and platform dispute support

LM-MARKETPLACE-AUDIT-56H
Audit read models, reports, anomaly detection and retention operations

LM-MARKETPLACE-QA-56I
Integration testing, end-to-end testing and launch hardening

LM-ADMIN-57A
Admin dashboard and seller-management foundations

SELLER_SELF_SERVICE_DASHBOARD_IN_INITIAL_MVP=NO
AUTOMATED_VENDOR_REGISTRATION_IN_INITIAL_MVP=NO

## 7. DEPENDENCY MATRIX

| SPRINT | DOMAIN_DECISIONS | LEGAL_OR_EXTERNAL_GATES | TECHNICAL_DEPENDENCIES | SAFE_DEFAULTS | FORBIDDEN_PREMATURE_ASSUMPTIONS | STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| LM-MARKETPLACE-DATA-MODEL-56B0 | DEC-MKT-01 to 18, OMQ-MKT-01 to 12 | MAY_REMAIN_PENDING_IF_REPRESENTED_AS_ABSTRACT_OR_CONFIGURABLE | LM-MARKETPLACE-DOMAIN-56A-R3 | ABSTRACT_PSP_ALLOCATION_AND_PAYOUT | SPECIFIC_PSP_PROVIDER | DONE |
| LM-MARKETPLACE-DATA-MODEL-56B0-R1 | (Logical Model Review stage) | N/A | LM-MARKETPLACE-DATA-MODEL-56B0 | N/A | N/A | DONE |
| LM-MARKETPLACE-SCHEMA-56B1 | DEC-MKT-01 to 18 | LEG-MKT-01, LEG-MKT-02, LEG-MKT-03, LEG-MKT-04, LEG-MKT-09 | LM-MARKETPLACE-DATA-MODEL-56B0-R1 | N/A | AUTOMATED_VENDOR_REGISTRATION | READY_CANDIDATE_PENDING_56C0B_MERGE_AND_OWNER_REVIEW |
| LM-MARKETPLACE-SCHEMA-56B2 | DEC-MKT-01 to 18 | LEG-MKT-01, LEG-MKT-02, LEG-MKT-03, LEG-MKT-08, LEG-MKT-09 | LM-MARKETPLACE-SCHEMA-56B1 | N/A | SUPPLIER_ORDER_AS_ACTIVE_MVP_CORE | BLOCKED |
| LM-MARKETPLACE-SCHEMA-56B3 | DEC-MKT-01 to 18, OMQ-MKT-03, OMQ-MKT-04, OMQ-MKT-05, OMQ-MKT-06, OMQ-MKT-07, OMQ-MKT-08, OMQ-MKT-09 | LEG-MKT-05, LEG-MKT-06, LEG-MKT-07 | LM-MARKETPLACE-SCHEMA-56B2 | ABSTRACT_PSP_ALLOCATION_AND_PAYOUT; PSP_PROVIDER_SELECTED=NO; ABSTRACT_PSP_ARCHITECTURE_REQUIRED=YES | DIRECT_PAYMENT_TO_PARTNER_SELECTED | BLOCKED |
| LM-MARKETPLACE-SCHEMA-56B4 | DEC-MKT-01 to 18, OMQ-MKT-06, OMQ-MKT-07, OMQ-MKT-08, OMQ-MKT-09, OMQ-MKT-10 | LEG-MKT-06, LEG-MKT-07, LEG-MKT-08 | LM-MARKETPLACE-SCHEMA-56B3 | REFUND_TECHNICAL_EXECUTOR_UNRESOLVED | PSP_EXECUTES_REFUND_SELECTED | BLOCKED |
| LM-MARKETPLACE-SCHEMA-56B5 | DEC-MKT-01 to 18 | LEG-MKT-01, LEG-MKT-03, LEG-MKT-08, LEG-MKT-09 | LM-MARKETPLACE-SCHEMA-56B4 | N/A | GO_ROUTE_FOR_SHIPMENT_TRACKING | BLOCKED |
| LM-MARKETPLACE-SCHEMA-56B6 | DEC-MKT-01 to 18 | LEG-MKT-04, LEG-MKT-09 | LM-MARKETPLACE-SCHEMA-56B5 | N/A | JOINT_CONTROLLERSHIP_CONFIRMED | BLOCKED |
| LM-MARKETPLACE-SCHEMA-56B7 | DEC-MKT-01 to 18 | LEG-MKT-01, LEG-MKT-02, LEG-MKT-03, LEG-MKT-04, LEG-MKT-05, LEG-MKT-06, LEG-MKT-07, LEG-MKT-08, LEG-MKT-09 | LM-MARKETPLACE-SCHEMA-56B6 | N/A | PRODUCTION_READY_WITHOUT_REVIEW | BLOCKED |
| LM-ADMIN-57A | DEC-MKT-01 to 18 | LEG-MKT-03, LEG-MKT-04, LEG-MKT-09 | LM-MARKETPLACE-SCHEMA-56B7, LM-MARKETPLACE-AUDIT-56H | N/A | N/A | BLOCKED |
| LM-MARKETPLACE-ORDER-56C | DEC-MKT-01 to 18 | LEG-MKT-01, LEG-MKT-02, LEG-MKT-03, LEG-MKT-08, LEG-MKT-09 | LM-MARKETPLACE-SCHEMA-56B7 | N/A | N/A | BLOCKED |
| LM-MARKETPLACE-SELLER-56D | DEC-MKT-01 to 18 | LEG-MKT-03, LEG-MKT-04, LEG-MKT-09 | LM-MARKETPLACE-ORDER-56C | N/A | N/A | BLOCKED |
| LM-MARKETPLACE-PAYMENT-56E | DEC-MKT-01 to 18, OMQ-MKT-03, OMQ-MKT-04, OMQ-MKT-05, OMQ-MKT-06, OMQ-MKT-07, OMQ-MKT-08, OMQ-MKT-09 | LEG-MKT-05, LEG-MKT-06, LEG-MKT-07 | LM-MARKETPLACE-SELLER-56D | N/A | N/A | BLOCKED |
| LM-MARKETPLACE-FULFILLMENT-56F | DEC-MKT-01 to 18 | LEG-MKT-01, LEG-MKT-03, LEG-MKT-08, LEG-MKT-09 | LM-MARKETPLACE-PAYMENT-56E | N/A | N/A | BLOCKED |
| LM-MARKETPLACE-RETURNS-56G | DEC-MKT-01 to 18 | LEG-MKT-07, LEG-MKT-08, LEG-MKT-09 | LM-MARKETPLACE-FULFILLMENT-56F | N/A | N/A | BLOCKED |
| LM-MARKETPLACE-AUDIT-56H | DEC-MKT-01 to 18 | LEG-MKT-04, LEG-MKT-09 | LM-MARKETPLACE-RETURNS-56G | N/A | N/A | BLOCKED |
| LM-MARKETPLACE-QA-56I | DEC-MKT-01 to 18 | LEG-MKT-01, LEG-MKT-02, LEG-MKT-03, LEG-MKT-04, LEG-MKT-05, LEG-MKT-06, LEG-MKT-07, LEG-MKT-08, LEG-MKT-09 | LM-MARKETPLACE-AUDIT-56H | N/A | N/A | BLOCKED |

## 8. LEGAL AND EXTERNAL GATE REGISTER

HISTORICAL_GATE_REGISTER=YES
CANONICAL_CURRENT_GATE_REGISTER=docs/domain/lm-marketplace-validation-56c0-gate-register.md

| GATE_ID | SUBJECT | OWNER | REQUIRED_EVIDENCE | BLOCKED_FUTURE_SPRINT | SAFE_DOCUMENTATION_DEFAULT | STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| LEG-MKT-01 | intermediary legal qualification and terms | Legal Counsel | Formal Terms of Service | LM-MARKETPLACE-ORDER-56C | LOGIMARKET_INTERMEDIARY_ONLY; NO_SELLER_ROLE_FOR_PARTNER_MARKETPLACE | PENDING_FORMAL_EVIDENCE |
| LEG-MKT-02 | contract formation for RFQ and e-commerce | Legal Counsel | Formal Legal Memo | LM-MARKETPLACE-SCHEMA-56B1 | CONTRACT_FORMATION_EVENT_UNRESOLVED; MODEL_ORDER_INTENT_AND_SELLER_ACCEPTANCE_SEPARATELY | PENDING_FORMAL_EVIDENCE |
| LEG-MKT-03 | seller identity and pre-contract disclosure | Legal Counsel | Verification Procedure | LM-MARKETPLACE-SCHEMA-56B2 | DISPLAY_SELLER_IDENTITY_AND_RESPONSIBILITY_BEFORE_CONVERSION | PENDING_FORMAL_EVIDENCE |
| LEG-MKT-04 | P2B terms, rankings, suspension and complaints | Legal Counsel | Formal Seller Agreement | LM-MARKETPLACE-SELLER-56D | NO_AUTOMATIC_RANKING_PENALTY_OR_SUSPENSION_EFFECT_WITHOUT_VALIDATED_RULES | PENDING_FORMAL_EVIDENCE |
| LEG-MKT-05 | PSP architecture, KYB/KYC, allocations and payouts | Legal Counsel, FinOps | ABSTRACT_PSP_ARCHITECTURE_AND_FEASIBILITY_EVIDENCE; SPECIFIC_PSP_PROVIDER_CONTRACT | LM-MARKETPLACE-PAYMENT-56E | NO_SELF_CUSTODY; NO_LOGIMARKET_ESCROW; ABSTRACT_PSP_ALLOCATION_AND_PAYOUT | PENDING_FORMAL_EVIDENCE |
| LEG-MKT-06 | VAT, accounting and KSeF split | Tax Advisor, Accounting | Tax Opinion | LM-MARKETPLACE-SCHEMA-56B3 | PARTNER_GOODS_INVOICE; LOGIMARKET_PLATFORM_SERVICE_INVOICE; NO_DELEGATED_INVOICING | PENDING_FORMAL_EVIDENCE |
| LEG-MKT-07 | refund, chargeback and seller liability | Legal Counsel, FinOps | Approved PSP Flow & Terms | LM-MARKETPLACE-SCHEMA-56B4 | PARTNER_REFUND_LIABILITY; TECHNICAL_EXECUTOR_UNRESOLVED | PENDING_FORMAL_EVIDENCE |
| LEG-MKT-08 | B2B and entrepreneur-with-consumer-rights analysis | Legal Counsel | Authorized Process Policy | LM-MARKETPLACE-RETURNS-56G | DO_NOT_CLASSIFY_BUYER_STATUS_FROM_NIP_ONLY | PENDING_FORMAL_EVIDENCE |
| LEG-MKT-09 | privacy roles and retention | Data Protection Officer | RoPA & Privacy Policy Update | LM-MARKETPLACE-SCHEMA-56B1 | NO_PREDETERMINED_CONTROLLER_ROLE; DOCUMENT_DATA_FLOWS; CONFIGURABLE_RETENTION | PENDING_FORMAL_EVIDENCE |
| LEG-MKT-10 | future reseller activation | Legal Counsel | Complete Activation Readiness | INITIAL_MVP_BLOCKING=NO; FUTURE_RESELLER_ONLY=YES; FUTURE_LOGIMARKET_RESELLER_ACTIVATION_SPRINT=NOT_YET_SCHEDULED | LOGIMARKET_RESELLER_DISABLED | PENDING_FORMAL_EVIDENCE |

LEGACY_GATE_STATUS=MAPPED_THROUGH_R3_DECISION_OVERLAY

## 9. FUTURE B2B CAPABILITIES

CUSTOMER_PO_NUMBER=MVP_OPTIONAL
CORPORATE_ACCOUNT_HIERARCHY=POST_MVP
PURCHASE_APPROVAL_WORKFLOW=POST_MVP
HEAVY_FREIGHT_AND_DEFERRED_QUOTE=POST_MVP_OR_SEPARATE_RFQ_SCOPE
TRADE_CREDIT_AND_DEFERRED_PAYMENT=OUT_OF_INITIAL_MVP
TECHNICAL_ATTRIBUTE_NORMALIZATION=SEPARATE_CATALOG_ROADMAP
SELLER_RAW_EVENT_CAPTURE=MVP_REQUIRED_WHERE_IMPLEMENTED
AUTOMATIC_SELLER_SCORING=POST_MVP
RANKING_INFLUENCE=POST_MVP_AND_LEGAL_REVIEW_REQUIRED

## 10. READINESS

R3_DOMAIN_RESET_STATUS=DONE
NEXT_SCHEMA_CANDIDATE=LM-MARKETPLACE-SCHEMA-56B1
NEXT_SPRINT_TYPE=PHYSICAL_SCHEMA_FOUNDATION
READY_FOR_LOGICAL_DATA_MODEL_RESET=DONE
LM_MARKETPLACE_SCHEMA_56B1_READY_CANDIDATE=YES
READY_FOR_PRODUCTION_IMPLEMENTATION=NO
PR_17_READY_TO_MERGE=DONE
