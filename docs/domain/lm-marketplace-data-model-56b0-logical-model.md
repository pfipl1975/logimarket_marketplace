# LOGIMARKET MARKETPLACE LOGICAL DATA MODEL (LM-MARKETPLACE-DATA-MODEL-56B0)

DOCUMENT_ROLE=NORMATIVE_LOGICAL_DATA_MODEL_DRAFT
DOCUMENT_STATUS=READY_FOR_INDEPENDENT_LOGICAL_MODEL_REVIEW
SPRINT_TYPE=DOCUMENTATION_ONLY
PHYSICAL_SCHEMA_STATUS=NOT_DESIGNED
APPLICATION_IMPLEMENTATION_STATUS=NOT_STARTED

## 1. SCOPE AND EXCLUSIONS
This normative logical data model defines the Intermediary-First Marketplace architecture (R3). It establishes aggregate boundaries, elements, lifecycles, and invariants for multi-seller commerce. It excludes physical database schema (tables, Drizzle), which remains blocked pending independent logical-model review. 

## 2. NORMATIVE SOURCE PRECEDENCE
1. R3 business approval record
2. R3 intermediary-first contract
3. R3 decision overlay
4. R3 implementation roadmap
5. historical R2B documents only where not superseded
6. current repository implementation facts

## 3. CANONICAL TERMINOLOGY
MVP_PLATFORM_ROLE=INTERMEDIARY_MARKETPLACE
MODEL_A_ACTIVE_IN_INITIAL_MVP=NO
FUTURE_RESELLER_CHANNEL_SUPPORTED=YES
FUTURE_RESELLER_CHANNEL_ENABLED=NO

## 4. APPROVED COMBINATION MATRIX

### Active MVP Combinations
1.
offerModel=rfq
contractModel=partner_marketplace
seller=Partner

2.
offerModel=ecommerce
contractModel=partner_marketplace
seller=Partner

3.
offerModel=outbound
contractModel=external_redirect
seller=External Partner

### Future Combinations
4.
offerModel=rfq
contractModel=logimarket_reseller
seller=LogiMarket
active_in_initial_mvp=NO

5.
offerModel=ecommerce
contractModel=logimarket_reseller
seller=LogiMarket
active_in_initial_mvp=NO

OFFER_MODEL_AND_CONTRACT_MODEL_ARE_INDEPENDENT=YES
OUTBOUND_RESELLER_COMBINATION_ALLOWED=NO
AUTOMATIC_CONTRACT_MODEL_INFERENCE=NO
GLOBAL_RESELLER_SWITCH=NO

## 5. AGGREGATE BOUNDARIES

### Active Aggregate Boundaries (8)
1. SELLER_AND_OFFER_CLASSIFICATION
2. MARKETPLACE_ORDER_ORCHESTRATION
3. SELLER_ORDER
4. PAYMENT_AND_ALLOCATION
5. PLATFORM_REVENUE_AND_SELLER_SETTLEMENT_REFERENCE
6. FULFILLMENT_AND_SHIPMENT
7. AFTER_SALES_AND_DISPUTES
8. AUDIT_IDEMPOTENCY_AND_PRIVACY

### Future Extension Boundaries (1)
FUTURE_LOGIMARKET_RESELLER_EXTENSION

## 6. LOGICAL INVARIANTS

INV-MKT-01: Every active partner-marketplace offer has one explicitly assigned seller identity and one explicitly assigned contractModel.
INV-MKT-02: The assignment may change prospectively, but historical commercial records retain immutable snapshots.
INV-MKT-03: A marketplace order is an orchestration envelope and is not itself proof of one buyer-to-all-sellers sales contract.
INV-MKT-04: A marketplace order may contain one or more seller orders.
INV-MKT-05: Each seller order belongs to exactly one seller.
INV-MKT-06: Each seller order contains items belonging only to its seller.
INV-MKT-07: Each seller order stores a contractModel snapshot.
INV-MKT-08: Each seller order stores seller identity and responsibility snapshots.
INV-MKT-09: Seller acceptance and contract formation must remain separately representable.
INV-MKT-10: Contract formation semantics remain unresolved until OMQ-MKT-01 and OMQ-MKT-02 are closed.
INV-MKT-11: Partner owns partner-marketplace goods revenue.
INV-MKT-12: Partner is responsible for the buyer goods invoice.
INV-MKT-13: LogiMarket platform revenue is separate from partner goods revenue.
INV-MKT-14: Platform revenue can be commission or a platform-service fee; final monetization remains unresolved.
INV-MKT-15: Payment allocation must be representable without LogiMarket self-custody or LogiMarket-operated escrow.
INV-MKT-16: The logical model must not require direct payment to Partner, split payment, net settlement or gross settlement.
INV-MKT-17: A refund has separate financial-liability and technical-execution concepts.
INV-MKT-18: Partner carries refund financial liability for partner marketplace.
INV-MKT-19: Technical refund executor remains unresolved.
INV-MKT-20: Goods complaints and platform-service complaints are distinct.
INV-MKT-21: A seller order may have one-to-many shipments.
INV-MKT-22: Partial fulfillment requires buyer acceptance and must not occur silently.
INV-MKT-23: Parcel and pallet are selected MVP shipment modes.
INV-MKT-24: Manual/deferred freight e-commerce remains inactive.
INV-MKT-25: Outbound offers create no LogiMarket seller order or payment record.
INV-MKT-26: Outbound redirects use only /go/[id].
INV-MKT-27: Buyer legal context must not be inferred solely from NIP.
INV-MKT-28: Privacy-controller roles remain unresolved and configurable.
INV-MKT-29: Future reseller activation is explicit, offer-specific and disabled.
INV-MKT-30: No initial-MVP aggregate depends on activation of the future reseller channel.

## 7. LOGICAL CARDINALITIES & OWNERSHIP
- MarketplaceOrder 1:N SellerOrder
- SellerOrder N:1 SellerProfile
- SellerOrder 1:N SellerOrderItem
- SellerOrder 1:N Shipment
- MarketplaceOrder 1:N PaymentAllocation

## 8. SNAPSHOT POLICY
SNAPSHOT_POLICY_REQUIRED=YES
HISTORICAL_RECORDS_FOLLOW_CURRENT_OFFER_ASSIGNMENT=NO

Required Immutable Snapshots at conversion or seller-order creation:
- seller legal identity;
- seller display identity;
- contractModel;
- Seller of Record responsibility;
- invoice responsibility;
- delivery responsibility;
- complaint responsibility;
- return responsibility;
- refund financial liability;
- offer identity;
- offer title;
- manufacturer and model where applicable;
- technical-data source reference;
- original partner-content language;
- quantity;
- unit price;
- currency;
- tax context where available;
- buyer legal-context evidence;
- customer PO number where supplied.

## 9. TRANSACTION AND CONSISTENCY BOUNDARIES
- marketplace-order creation boundary;
- seller-order creation boundary;
- seller acceptance boundary;
- payment-reference boundary;
- payment-allocation boundary;
- shipment boundary;
- refund boundary;
- complaint boundary;
- chargeback boundary;
- audit/event boundary.

Representation uses domain events, idempotency keys, webhook inbox, outbox, retry-safe external references. No one cross-seller database transaction for external PSP. No event bus or broker.

## 10. PSP ABSTRACTION
- seller KYB/KYC status reference;
- buyer payment intent;
- PSP transaction reference;
- seller-order allocation;
- partial allocation;
- partial refund;
- chargeback reference;
- reconciliation identifier;
- idempotency;
- webhook ingestion;
- payout/settlement reference.

NO_LOGIMARKET_SELF_CUSTODY=YES
NO_LOGIMARKET_OPERATED_ESCROW=YES
PSP_PROVIDER_SELECTED=NO
PSP_ARCHITECTURE_SELECTED=NO

## 11. FUTURE RESELLER ISOLATION
FUTURE_RESELLER_ACTIVE_IN_INITIAL_MVP=NO
AUTOMATIC_RESELLER_ACTIVATION=NO
GLOBAL_RESELLER_SWITCH=NO
OUTBOUND_RESELLER_COMBINATION_ALLOWED=NO
FUTURE_RESELLER_ACTIVATION_SPRINT=NOT_YET_SCHEDULED

## 12. LOGICAL MERMAID DIAGRAM
```mermaid
erDiagram
    MarketplaceOrder ||--|{ SellerOrder : contains
    MarketplaceOrder ||--o{ PaymentOrchestration : triggers
    SellerOrder ||--|{ SellerOrderItem : includes
    SellerOrder }o--|| SellerProfile : assigned_to
    PaymentOrchestration ||--|{ PaymentAllocation : allocates_to
    SellerOrder ||--o{ Shipment : fulfilled_by
    SellerOrder ||--o{ RefundCase : may_have
    SellerOrder ||--o{ ComplaintCase : may_have
    SellerProfile ||--o{ OfferSellerAssignment : provides
```

## 13. READINESS SUMMARY
The logical data model defines requirements and rules safely supporting MVP combinations while explicitly managing unresolved decisions through snapshotting and PSP abstractions.
