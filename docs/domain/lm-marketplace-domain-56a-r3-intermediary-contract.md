# LOGIMARKET - NORMATIVE INTERMEDIARY-FIRST DOMAIN CONTRACT

DOCUMENT_ROLE=NORMATIVE_INTERMEDIARY_FIRST_DOMAIN_CONTRACT
DOCUMENT_STATUS=BUSINESS_APPROVED_CONDITIONALLY
LEGAL_VALIDATION_STATUS=PENDING_FORMAL_EVIDENCE
PSP_VALIDATION_STATUS=PENDING_FORMAL_EVIDENCE
TAX_VALIDATION_STATUS=PENDING_FORMAL_EVIDENCE
ACCOUNTING_VALIDATION_STATUS=PENDING_FORMAL_EVIDENCE
PRIVACY_VALIDATION_STATUS=PENDING_FORMAL_EVIDENCE

## 1. SOURCE PRECEDENCE

1. R3 business approval and validation record
2. R3 intermediary-first contract
3. R3 decision overlay
4. older R2B/R2A documents only where not superseded
5. current repository implementation facts

R3_SUPERSEDES_MODEL_A_AS_GLOBAL_MVP_DEFAULT=YES
MODEL_A_RETAINED_AS_FUTURE_RESELLER_CHANNEL=YES
MODEL_A_ACTIVE_IN_INITIAL_MVP=NO

## 2. CANONICAL TERMINOLOGY

PLATFORM_OPERATOR=
LogiMarket

BUYER=
Business customer or other legally eligible customer using the platform.

PARTNER=
Curated marketplace seller managed centrally by LogiMarket.

EXTERNAL_PARTNER=
Partner completing the transaction outside LogiMarket after outbound redirect.

CONTRACTUAL_SELLER=
Entity entering the goods or services sales contract with the buyer.

SELLER_OF_RECORD=
Entity identified to the buyer as seller and responsible for the seller-side transaction.

PLATFORM_SERVICE_PROVIDER=
LogiMarket as provider of marketplace infrastructure and orchestration.

PSP=
Licensed payment services provider.

MARKETPLACE_ORDER=
Platform-level checkout grouping that may contain one or more seller orders.

SELLER_ORDER=
Seller-specific commercial relationship between buyer and one Partner.

**Terminology Usage Rules:**
Do not use supplier interchangeably with seller in the active partner_marketplace contract.
Supplier terminology is allowed only for the future reseller channel or historical Model A references.
Do not assign Merchant of Record status to LogiMarket, Partner or PSP without formal PSP/legal validation.

## 3. INDEPENDENT MODEL AXES

**offerModel:**
- rfq
- ecommerce
- outbound

**contractModel:**
- partner_marketplace
- logimarket_reseller
- external_redirect

Normative invariant:
OFFER_MODEL_AND_CONTRACT_MODEL_ARE_INDEPENDENT=YES

**offerModel controls:**
- CTA;
- interaction;
- conversion path;
- cart eligibility;
- redirect behavior.

**contractModel controls:**
- contractual seller;
- Seller of Record;
- invoice issuer;
- goods revenue owner;
- product responsibility;
- fulfillment responsibility;
- complaint and return responsibility;
- payment architecture;
- seller settlement;
- platform revenue model.

**Assignment Restrictions:**
contractModel must not be inferred automatically from:
- offerModel;
- category;
- price;
- partner identity;
- external URL;
- fulfillment mode;
- checkout availability.

Future assignment must be explicit and centrally administered.

## 4. ALLOWED COMBINATION MATRIX

### ACTIVE_MVP COMBINATIONS (3)

A.
offerModel=rfq
contractModel=partner_marketplace
seller=Partner

B.
offerModel=ecommerce
contractModel=partner_marketplace
seller=Partner

C.
offerModel=outbound
contractModel=external_redirect
seller=External Partner

### FUTURE_CHANNEL COMBINATIONS (2)

D.
offerModel=rfq
contractModel=logimarket_reseller
seller=LogiMarket
active_in_initial_mvp=NO

E.
offerModel=ecommerce
contractModel=logimarket_reseller
seller=LogiMarket
active_in_initial_mvp=NO

### EXPLICIT LIMITATIONS

offerModel=outbound + contractModel=logimarket_reseller = NOT_ALLOWED

**Combination Requirements Met:**
ACTIVE_MVP_COMBINATIONS=3
FUTURE_CHANNEL_COMBINATIONS=2
OUTBOUND_RESELLER_COMBINATION_ALLOWED=NO

## 5. PARTNER MARKETPLACE RESPONSIBILITY MATRIX

For contractModel=partner_marketplace define:

CONTRACTUAL_SELLER=PARTNER
SELLER_OF_RECORD=PARTNER
CUSTOMER_SALES_CONTRACT=BUYER_TO_PARTNER
GOODS_REVENUE_OWNER=PARTNER
CUSTOMER_GOODS_INVOICE_ISSUER=PARTNER

**Partner responsibility:**
PRODUCT_DESCRIPTION_RESPONSIBILITY=PARTNER
TECHNICAL_SPECIFICATION_RESPONSIBILITY=PARTNER
PRODUCT_LEGAL_COMPLIANCE_RESPONSIBILITY=PARTNER
PRICE_RESPONSIBILITY=PARTNER
AVAILABILITY_RESPONSIBILITY=PARTNER
ORDER_ACCEPTANCE_RESPONSIBILITY=PARTNER
FULFILLMENT_RESPONSIBILITY=PARTNER
PACKAGING_RESPONSIBILITY=PARTNER
DELIVERY_RESPONSIBILITY=PARTNER
GOODS_COMPLAINT_RESPONSIBILITY=PARTNER
RETURN_RESPONSIBILITY=PARTNER
REFUND_FINANCIAL_LIABILITY=PARTNER
WARRANTY_RESPONSIBILITY=PARTNER

**LogiMarket responsibility:**
PLATFORM_OPERATION=LOGIMARKET
SELLER_IDENTIFICATION_DISPLAY=LOGIMARKET
OFFER_PRESENTATION_INFRASTRUCTURE=LOGIMARKET
RFQ_ROUTING=LOGIMARKET
ORDER_ROUTING=LOGIMARKET
CHECKOUT_ORCHESTRATION=LOGIMARKET
PAYMENT_PROCESS_ORCHESTRATION=LOGIMARKET
COMMUNICATION_TOOLS=LOGIMARKET
DISPUTE_INTAKE_AND_SUPPORT=LOGIMARKET
PLATFORM_SECURITY=LOGIMARKET
PLATFORM_DATA_PROCESSING=LOGIMARKET
PLATFORM_RULE_ENFORCEMENT=LOGIMARKET
SELLER_SLA_MONITORING=LOGIMARKET

PLATFORM_INTERMEDIARY_STATUS_DOES_NOT_MEAN_ZERO_PLATFORM_RESPONSIBILITY

LogiMarket remains responsible for its own platform service and any non-excludable legal duties.
Do not state that Partner carries unqualified "full liability".

## 6. RFQ CONTRACT

For:
offerModel=rfq
contractModel=partner_marketplace

Preserve:
CTA=Zapytaj o wycenę
INTERACTION_COMPONENT=RfqDialog.tsx
ADD_TO_CART=NO

**Process flow:**
1. Buyer submits an RFQ through LogiMarket.
2. LogiMarket stores, routes and facilitates the RFQ.
3. Partner reviews requirements.
4. Partner prepares or authorizes the commercial offer.
5. Partner must be identified as prospective contractual seller.
6. LogiMarket may facilitate communication and SLA monitoring.
7. LogiMarket does not become seller solely by receiving or routing RFQ.
8. Exact contract-formation event remains unresolved.
9. Initial RFQ MVP does not require marketplace payment.
10. RFQ-to-seller-order conversion is future workflow unless separately approved.

**Configuration:**
RFQ_CONTRACT_FORMATION_EVENT=UNRESOLVED
RFQ_PAYMENT_IN_INITIAL_MVP=NOT_REQUIRED
RFQ_TO_SELLER_ORDER_CONVERSION=FUTURE_WORKFLOW

## 7. E-COMMERCE CONTRACT

For:
offerModel=ecommerce
contractModel=partner_marketplace

Preserve:
CTA=Dodaj do koszyka
CART_LOGIC=UNCHANGED_DURING_R3
SESSION_COOKIE_LOGIC=UNCHANGED_DURING_R3

**Definitions:**
BUYER_CONTRACT=BUYER_TO_PARTNER
GOODS_REVENUE=PARTNER
PLATFORM_REVENUE_MODEL=COMMISSION_OR_PLATFORM_SERVICE_FEE
FINAL_MONETIZATION_MODEL=UNRESOLVED

A multi-seller cart may create:
marketplace_order
├── seller_order_A
├── seller_order_B
└── seller_order_C

Each seller order must have its own:
- seller identity;
- contractModel snapshot;
- seller responsibility snapshot;
- items;
- acceptance status;
- fulfillment;
- shipments;
- goods invoice responsibility;
- complaints;
- returns;
- refund allocation;
- payment allocation reference;
- seller settlement reference.

Do not implement these entities during R1B.

**Configuration:**
ECOMMERCE_CONTRACT_FORMATION_EVENT=UNRESOLVED
MODEL_ORDER_INTENT_AND_SELLER_ACCEPTANCE_SEPARATELY=YES

Do not state that the existing checkout already implements seller-order splitting.

## 8. OUTBOUND CONTRACT

For:
offerModel=outbound
contractModel=external_redirect

Define:
CONTRACTUAL_SELLER=EXTERNAL_PARTNER
TRANSACTION_LOCATION=PARTNER_WEBSITE
PAYMENT_LOCATION=OUTSIDE_LOGIMARKET
CUSTOMER_INVOICE_ISSUER=EXTERNAL_PARTNER
LOGIMARKET_ROLE=REFERRAL_AND_CLICK_TRACKING
REDIRECT_ROUTE=/go/[id]

Preserve `/go/[id]` exclusively for outbound redirect tracking.

OUTBOUND_PAYMENT_ON_LOGIMARKET=NO
OUTBOUND_SELLER_ORDER_ON_LOGIMARKET=NO
OUTBOUND_SHIPMENT_TRACKING_VIA_GO_ROUTE=NO

## 9. FUTURE LOGIMARKET RESELLER CONTRACT

Define:
contractModel=logimarket_reseller
CHANNEL_STATUS=FUTURE
ACTIVE_IN_INITIAL_MVP=NO

Only for an explicitly approved offer:
CONTRACTUAL_SELLER=LOGIMARKET
SELLER_OF_RECORD=LOGIMARKET
CUSTOMER_GOODS_INVOICE_ISSUER=LOGIMARKET
PRODUCT_RESPONSIBILITY=LOGIMARKET
REFUND_FINANCIAL_LIABILITY=LOGIMARKET
REVENUE_MODEL=TRADING_MARGIN

Activation requires:
- explicit offer-level administrative assignment;
- legal approval;
- PSP approval;
- tax approval;
- accounting approval;
- privacy review where required;
- customer-facing seller disclosure;
- operational readiness;
- schema readiness;
- application readiness.

AUTOMATIC_RESELLER_ACTIVATION=NO
GLOBAL_RESELLER_SWITCH=NO
OUTBOUND_RESELLER_COMBINATION_ALLOWED=NO

## 10. PAYMENT AND FUNDS FLOW

For partner_marketplace define:
PAYMENT_ARCHITECTURE=PENDING_PSP_VALIDATION
PSP_PROVIDER_SELECTED=NO
PSP_ARCHITECTURE_SELECTED=NO
PAYMENT_ALLOCATION_MODEL=UNRESOLVED
SELLER_PAYOUT_MODEL=UNRESOLVED
PAYMENT_TIMING=UNRESOLVED
CHARGEBACK_ALLOCATION=UNRESOLVED

NO_LOGIMARKET_SELF_CUSTODY=YES
NO_LOGIMARKET_OPERATED_ESCROW=YES

Do not assume:
- direct payment to Partner;
- split payment;
- seller balance;
- net settlement;
- gross settlement;
- payout timing;
- reserve account;
- PSP as Merchant of Record.

Define abstract required PSP capabilities:
- seller KYB/KYC support;
- buyer payment processing;
- seller-specific allocation;
- settlement or payout capability;
- partial refund capability;
- chargeback evidence and allocation;
- reconciliation identifiers;
- idempotency and webhook support.

ABSTRACT_PSP_MODEL_ALLOWED_IN_LOGICAL_DATA_MODEL=YES
PHYSICAL_PAYMENT_SCHEMA_READY=NO

## 11. INVOICING AND KSEF

Define three separate contexts.

A. Partner marketplace goods sale:
PARTNER -> BUYER
DOCUMENT=GOODS_INVOICE
ISSUER=PARTNER

B. Platform service:
LOGIMARKET -> PARTNER
DOCUMENT=COMMISSION_OR_PLATFORM_SERVICE_INVOICE
ISSUER=LOGIMARKET

C. Future reseller:
LOGIMARKET -> BUYER
DOCUMENT=GOODS_INVOICE
CHANNEL=FUTURE_ONLY

DELEGATED_SELLER_INVOICING=NOT_SELECTED_FOR_INITIAL_MVP
PARTNER_KSEF_RESPONSIBILITY=PENDING_TAX_AND_LEGAL_VALIDATION
LOGIMARKET_PLATFORM_SERVICE_KSEF_RESPONSIBILITY=PENDING_TAX_AND_ACCOUNTING_VALIDATION

Do not claim that LogiMarket technically integrates partner invoices with KSeF in initial MVP.

## 12. RETURNS, COMPLAINTS, REFUNDS AND DISPUTES

For partner_marketplace:
GOODS_COMPLAINT_OWNER=PARTNER
RETURN_OWNER=PARTNER
REFUND_FINANCIAL_LIABILITY=PARTNER
REFUND_TECHNICAL_EXECUTOR=UNRESOLVED
CHARGEBACK_OPERATIONAL_OWNER=UNRESOLVED
CHARGEBACK_FINANCIAL_ALLOCATION=UNRESOLVED

LogiMarket may provide:
- complaint intake;
- communication;
- evidence storage;
- dispute support;
- seller SLA monitoring;
- platform-rule enforcement.

Distinguish:
GOODS_COMPLAINT=buyer claim concerning Partner goods or fulfillment
PLATFORM_SERVICE_COMPLAINT=claim concerning LogiMarket platform operation

Do not describe PSP as automatically executing refunds.

## 13. SHIPPING AND FULFILLMENT

Preserve:
PARCEL=SELECTED
PALLET=SELECTED
MANUAL_FREIGHT_ECOMMERCE=NOT_SELECTED
DEFERRED_FREIGHT_ECOMMERCE=NOT_SELECTED
NO_AUTOMATIC_OFFER_MODEL_CHANGE=YES

For partner_marketplace:
FULFILLMENT_RESPONSIBILITY=PARTNER
PACKAGING_RESPONSIBILITY=PARTNER
DELIVERY_RESPONSIBILITY=PARTNER

Allow:
PARTIAL_FULFILLMENT=ONLY_WITH_BUYER_ACCEPTANCE
SPLIT_SHIPMENT=SUPPORTED_AS_ONE_TO_MANY_FROM_SELLER_ORDER

Do not use `/go/[id]` for shipment tracking.

## 14. BUYER LEGAL CONTEXT

Define:
BUYER_LEGAL_CONTEXT_CLASSIFICATION=REQUIRES_EXPLICIT_EVIDENCE
DO_NOT_CLASSIFY_BUYER_STATUS_FROM_NIP_ONLY=YES

The logical model must be able to distinguish at least:
- legal-person B2B buyer;
- organizational entity buyer;
- natural-person entrepreneur;
- natural-person entrepreneur with statutory consumer-like protection where applicable;
- consumer, only if later permitted by platform scope.

Do not determine the final legal classification rules during R1B.

## 15. SELLER DISCLOSURE AND UI REQUIREMENTS

Define disclosure requirements for:
- offer detail;
- RFQ dialog;
- cart;
- checkout;
- order confirmation;
- order history;
- complaint and return flows.

Before conversion or contract formation display at least:
SELLER_LEGAL_NAME
SELLER_ROLE
CUSTOMER_GOODS_INVOICE_ISSUER
DELIVERY_RESPONSIBLE_PARTY
COMPLAINT_RESPONSIBLE_PARTY
RETURN_RESPONSIBLE_PARTY
LOGIMARKET_PLATFORM_ROLE

Example business labels:
Sprzedawca: [nazwa partnera]
Fakturę wystawia: [partner]
Dostawę realizuje: [partner]
Reklamacje i zwroty obsługuje: [partner]
Platforma: LogiMarket.eu

Treat these as business requirements, not final translated UI copy.
Do not claim automatic DSA or P2B compliance.

## 16. DATA AND PRIVACY BOUNDARIES

Define:
PRIVACY_ROLE_ALLOCATION=PENDING_PRIVACY_VALIDATION
NO_PREDETERMINED_CONTROLLER_ROLE=YES

Document expected data flows between:
- Buyer;
- LogiMarket;
- Partner;
- PSP;
- carrier;
- accounting and invoice systems.

Retention must remain configurable.

Do not state that parties are automatically:
- joint controllers;
- independent controllers;
- controller and processor.

## 17. OPEN MODEL QUESTIONS

| OPEN_MODEL_QUESTION_ID | QUESTION | SAFE_DOCUMENTATION_DEFAULT | OWNER | DEPENDENT_LEGAL_GATE | BLOCKED_FUTURE_SPRINT | LOGICAL_DATA_MODEL_IMPACT | PHYSICAL_SCHEMA_IMPACT |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `OMQ-MKT-01` | e-commerce contract-formation moment | `CONTRACT_FORMATION_EVENT_UNRESOLVED` | Legal Counsel | LEG-MKT-02 | LM-MARKETPLACE-SCHEMA-56B1 | Abstract lifecycle | Block final checkout |
| `OMQ-MKT-02` | RFQ contract-formation moment | `RFQ_CONTRACT_FORMATION_EVENT_UNRESOLVED` | Legal Counsel | LEG-MKT-02 | LM-MARKETPLACE-SCHEMA-56B1 | Abstract lifecycle | Block final RFQ flow |
| `OMQ-MKT-03` | PSP marketplace architecture | `ABSTRACT_PSP_ALLOCATION_AND_PAYOUT` | Legal Counsel | LEG-MKT-05 | LM-MARKETPLACE-PAYMENT-56E | Abstract payment id | Block PSP logic |
| `OMQ-MKT-04` | seller KYB/KYC responsibilities | `PENDING_PSP_AND_LEGAL_VALIDATION` | Legal Counsel | LEG-MKT-05 | LM-MARKETPLACE-PAYMENT-56E | KYC status flag | Block onboarding |
| `OMQ-MKT-05` | payment allocation and seller payout | `NO_SELF_CUSTODY_NO_ESCROW` | Legal Counsel | LEG-MKT-05 | LM-MARKETPLACE-PAYMENT-56E | Allocation model | Block payout logic |
| `OMQ-MKT-06` | monetization and commission/service-fee model | `COMMISSION_OR_PLATFORM_SERVICE_FEE` | Legal Counsel | LEG-MKT-06 | LM-MARKETPLACE-SCHEMA-56B3 | Fee calculation | Block revenue |
| `OMQ-MKT-07` | commission tax/accounting recognition | `PENDING_TAX_AND_ACCOUNTING_VALIDATION` | Tax Advisor | LEG-MKT-06 | LM-MARKETPLACE-SCHEMA-56B3 | Abstract revenue | Block accounting |
| `OMQ-MKT-08` | refund technical execution | `REFUND_TECHNICAL_EXECUTOR_UNRESOLVED` | Legal Counsel | LEG-MKT-07 | LM-MARKETPLACE-SCHEMA-56B4 | Refund capability | Block refund flows |
| `OMQ-MKT-09` | chargeback responsibility and allocation | `CHARGEBACK_ALLOCATION_UNRESOLVED` | Legal Counsel | LEG-MKT-07 | LM-MARKETPLACE-SCHEMA-56B4 | Dispute tracking | Block webhooks |
| `OMQ-MKT-10` | seller goods invoice and KSeF exchange | `NO_DELEGATED_INVOICING` | Tax Advisor | LEG-MKT-06 | LM-MARKETPLACE-SCHEMA-56B3 | Document storage | Block automation |
| `OMQ-MKT-11` | privacy-role allocation and retention | `NO_PREDETERMINED_CONTROLLER_ROLE` | Legal Counsel | LEG-MKT-09 | LM-MARKETPLACE-SCHEMA-56B1 | Config retention | Block anonymization |
| `OMQ-MKT-12` | future reseller activation | `LOGIMARKET_RESELLER_DISABLED` | Legal Counsel | LEG-MKT-10 | LM-DROP-SCHEMA-56B3 | Offer decoupling | Block reseller UI |

## 18. IMPLEMENTATION READINESS

INTERMEDIARY_FIRST_BUSINESS_MODEL=APPROVED
LEGAL_VALIDATION=PENDING_FORMAL_EVIDENCE
PSP_VALIDATION=PENDING_FORMAL_EVIDENCE
TAX_VALIDATION=PENDING_FORMAL_EVIDENCE
ACCOUNTING_VALIDATION=PENDING_FORMAL_EVIDENCE
PRIVACY_VALIDATION=PENDING_FORMAL_EVIDENCE

READY_FOR_LOGICAL_DATA_MODEL_RESET=YES_CONDITIONALLY
READY_FOR_SCHEMA_IMPLEMENTATION=NO
READY_FOR_PRODUCTION_IMPLEMENTATION=NO

State explicitly:
R1B_DOES_NOT_IMPLEMENT_CONTRACT_MODEL=YES
R1B_DOES_NOT_CHANGE_APPLICATION_BEHAVIOR=YES
