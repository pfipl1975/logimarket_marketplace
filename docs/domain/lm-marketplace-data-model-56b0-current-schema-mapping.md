# CURRENT SCHEMA MAPPING (LM-MARKETPLACE-DATA-MODEL-56B0)

CURRENT_SCHEMA_IS_NOT_THE_NORMATIVE_FUTURE_MODEL=YES
CURRENT_BEHAVIOR_MUST_BE_MAPPED_BEFORE_EXTENSION=YES
PHYSICAL_CHANGE_ALLOWED_IN_56B0=NO

CURRENT_STORAGE_CONTRACT:
offers.offerModel = legacy raw classification
values: rfq | marketplace

offers.conversionType = legacy raw conversion direction
values: inbound | outbound

PUBLIC/CANONICAL MODEL:
computed by resolveCanonicalOfferModel(offerModel, conversionType)

canonical result:
rfq | ecommerce | outbound | unknown

CURRENT_CONTRACT_MODEL_FIELD_EXISTS=NO
OFFER_MODEL_AND_CONTRACT_MODEL_CONFLATION_ALLOWED=NO
OFFER_MODEL_AND_CONTRACT_MODEL_ARE_INDEPENDENT=YES
CONTRACT_MODEL_DERIVED_BY_CANONICAL_OFFER_RESOLVER=NO
- contractModel is NOT offerModel.
- contractModel is NOT conversionType.
- contractModel is NOT legal agency qualification.

VERIFIED_DATA_TYPES:
- partners.id = BIGSERIAL PRIMARY KEY
- offers.id = BIGSERIAL PRIMARY KEY
- offers.partnerId = BIGINT (no database-level FK declared; application-level join only via leftJoin partners on offers.partnerId = partners.id)
- offers.offerModel = varchar(20), default 'rfq', no CHECK constraint
- offers.conversionType = varchar(20), default 'outbound'
- rfqLeads.id = BIGSERIAL PRIMARY KEY
- rfqLeads.offerId = BIGINT
- rfqLeads.partnerId = BIGINT
- orders.id = BIGSERIAL PRIMARY KEY
- orderItems.id = BIGSERIAL PRIMARY KEY
- orderItems.orderId = BIGINT
- orderItems.offerId = BIGINT
- clicks.id = BIGSERIAL PRIMARY KEY
- clicks.offerId = BIGINT
- clicks.partnerId = BIGINT

OFFERS_PARTNER_ID_DATABASE_FK_DECLARED=NO
APPLICATION_QUERY_RELATIONSHIP_EXISTS=YES

All rows: PHYSICAL_CHANGE_ALLOWED_IN_56B0=NO

| ROW | CURRENT_ELEMENT | CURRENT_PATH | CURRENT_SYMBOL | CURRENT_BEHAVIOR | R3_LOGICAL_ELEMENT | MAPPING_CLASSIFICATION | EVIDENCE_CLASSIFICATION | REUSE_RISK | MIGRATION_RISK | OPEN_QUESTION |
|-----|-----------------|--------------|----------------|------------------|--------------------|------------------------|-------------------------|------------|----------------|---------------|
| 01 | Offer identity | src/lib/schema.ts | offers.id (bigserial PK) | BIGSERIAL primary key for offers table. Referenced by orderItems.offerId (bigint), rfqLeads.offerId (bigint), clicks.offerId (bigint), cartItems.offerId (bigint). | Offer | DIRECT_REUSE_CANDIDATE | VERIFIED_CURRENT_FACT | Low | Low | None. |
| 02 | offerModel field | src/lib/schema.ts | offers.offerModel (varchar(20), default 'rfq', no CHECK constraint) | CURRENT_STORAGE_CONTRACT: legacy raw classification (values: rfq \| marketplace). Does NOT directly contain ecommerce/outbound. | OfferConversionClassification | EXTENSION_CANDIDATE | VERIFIED_CURRENT_FACT | Medium | Medium | Computed by resolveCanonicalOfferModel(offerModel, conversionType) to yield rfq \| ecommerce \| outbound \| unknown. |
| 03 | conversionType field | src/lib/schema.ts | offers.conversionType (varchar(20), default 'outbound') | CURRENT_STORAGE_CONTRACT: legacy raw conversion direction (values: inbound \| outbound). | ConversionTypeField (audit-only) | EXTENSION_CANDIDATE | VERIFIED_CURRENT_FACT | Medium | Medium | Semantic relationship is strictly resolved via resolveCanonicalOfferModel. |
| 04 | contractModel absence | src/lib/schema.ts | (none) | CURRENT_CONTRACT_MODEL_FIELD_EXISTS=NO. contractModel is NOT offerModel, NOT conversionType, NOT legal agency qualification. | OfferContractClassification | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | High | A physical representation of OfferContractClassification is required for future implementation. |
| 05 | Partner relationship | src/lib/schema.ts, src/app/actions.ts | offers.partnerId (bigint, NOT NULL); leftJoin partners on offers.partnerId = partners.id | Application-level join; no database FK declared. partners.id is BIGSERIAL PK. partnerId not validated as immutable at DB level. | OfferSellerAssignment | EXTENSION_CANDIDATE | VERIFIED_CURRENT_FACT | Medium | Medium | Referential-integrity and historical-snapshot strategy must be selected during physical schema design; no database FK implementation is selected in 56B0. |
| 06 | Partner legal identity | src/lib/schema.ts | partners (bigserial PK, company_name, logo_url, website_url, contact_email, created_at) | partners table exists. No KYB/KYC, legal identity, NIP, VAT or regulatory fields observed. | SellerLegalIdentity | REQUIRES_FURTHER_AUDIT | REQUIRES_FURTHER_AUDIT | Medium | High | Partner legal identity fields must be audited before onboarding flow design. |
| 07 | RFQ flow — dialog | src/components/RfqDialog.tsx | RfqDialog | React component presenting RFQ form to buyer. Invokes submitRfq server action on submit. | RfqRequest | EXTENSION_CANDIDATE | VERIFIED_CURRENT_FACT | Medium | Medium | No MarketplaceOrder, SellerOrder or payment created by this flow. |
| 08 | RFQ flow — action | src/app/actions.ts | submitRfq | Server action. Fetches offer by id (isActive+published). Inserts rfqLeads row (bigserial PK, offerId bigint, partnerId bigint). Returns {ok:true, code:"RFQ_SENT"}. No offerModel=rfq enforcement. No MarketplaceOrder, SellerOrder or PaymentOrchestration created. | RfqRequest | EXTENSION_CANDIDATE | VERIFIED_CURRENT_FACT | Medium | High | offerModel=rfq enforcement gap. Must align with RfqRequest aggregate in future; current behavior preserved per DEC-MKT-18. |
| 09 | Cart | src/app/actions.ts, src/lib/schema.ts | addToCart, cartItems | addToCart fetches offer by id (isActive+published only; no offerModel check). Inserts or updates cartItems (bigserial PK, offerId bigint, sessionHash varchar(64)). offerModel=ecommerce NOT enforced. | MarketplaceOrder | CURRENT_ENFORCEMENT_GAP | CURRENT_ENFORCEMENT_GAP | High | High | offerModel=ecommerce enforcement gap; session-only buyer identity. Behavior preserved per DEC-MKT-18. |
| 10 | Checkout / orders | src/app/actions.ts, src/lib/schema.ts | submitCheckout, orders | submitCheckout inserts one orders row (bigserial PK, sessionHash varchar(64), status varchar(20) default 'new', totalAmount numeric). No seller-specific split. Clears cart. title and unitPrice supplied by client input without server-side revalidation. | MarketplaceOrder | EXTENSION_CANDIDATE | VERIFIED_CURRENT_FACT | High | High | Must support multi-seller split and immutable commercial snapshots. Behavior preserved per DEC-MKT-18. |
| 11 | Order items | src/lib/schema.ts, src/app/actions.ts | orderItems | orderItems (bigserial PK, orderId bigint, offerId bigint, title varchar(255), quantity integer, unitPrice numeric). No sellerId, no contractModel snapshot, no seller responsibility snapshot. | SellerOrderItem | EXTENSION_CANDIDATE | VERIFIED_CURRENT_FACT | High | High | Needs seller-level grouping and snapshot fields. |
| 12A | Buyer/session identity | src/lib/schema.ts, src/app/actions.ts | orders.sessionHash; cartItems.sessionHash; getSessionHash | Session hash cookie used to identify buyer. No authenticated user identity. | BuyerIdentityReference | EXTENSION_CANDIDATE | VERIFIED_CURRENT_FACT | High | High | Authenticated identity required for B2B compliance. |
| 12B | E-commerce buyer legal context absence | (none) | (none) | No E-commerce buyer legal context snapshot exists. | EcommerceBuyerLegalContextSnapshot | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | High | Authenticated legal context required for B2B compliance. |
| 12C | RFQ buyer legal context absence | (none) | (none) | No RFQ buyer legal context snapshot exists. | RfqBuyerLegalContextSnapshot | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | High | Authenticated legal context required for B2B compliance. |
| 13A | RFQ Seller disclosure | (none) | (none) | No seller disclosure snapshot captured before RFQ submission. | RfqSellerDisclosureSnapshot | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | High | Required for LEG-MKT-03 compliance. |
| 13B | Ecommerce Seller disclosure | (none) | (none) | No seller disclosure snapshot captured before e-commerce checkout. | EcommerceSellerDisclosureSnapshot | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | High | Required for LEG-MKT-03 compliance. |
| 14 | clicks table | src/lib/schema.ts | clicks (bigserial PK, offerId bigint, partnerId bigint, clickedAt timestamp, sessionHash varchar(64), ipHash varchar(64), isUnique24h boolean) | Table exists with tracking fields. Has offerId, partnerId, sessionHash, ipHash, isUnique24h. | OutboundRedirectEvent, OutboundRedirectAuditLog | REQUIRES_FURTHER_AUDIT | REQUIRES_FURTHER_AUDIT | Medium | Medium | /go/[id] does NOT insert into clicks (see row 15). Table ready for tracking but not currently wired. |
| 15 | /go/[id] route behavior | src/app/go/[id]/route.ts | /go/[id] route | Fetches offer by id (isActive+published; no offerModel=outbound check). Reads offers.outboundUrl. Issues 302 redirect. Does NOT insert into clicks table. Does NOT enforce offerModel=outbound. | OutboundRedirectEvent, ExternalRedirectReference | CURRENT_ENFORCEMENT_GAP | CURRENT_ENFORCEMENT_GAP | High | Medium | Two gaps: offerModel=outbound not enforced; click insert not performed. Behavior preserved per DEC-MKT-18. |
| 16 | Audit support | src/lib/schema.ts | createdAt, updatedAt timestamps on some tables | Timestamp columns only. No formal domain audit log table. | DomainAuditEvent, AuditJournal | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Medium | New audit journal required for domain events. |
| 17 | Idempotency support | (none) | (none) | No idempotency registry exists in schema or application code. | IdempotencyRecord, IdempotencyRegistry | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Low | New requirement; needed for safe retry and deduplication. |
| 18 | Payment structures | (none) | (none) | No PaymentOrchestration, payment intent or PSP transaction reference exists. | PaymentOrchestration, PSPTransactionReference | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Low | New requirement; blocked on OMQ-MKT-03, OMQ-MKT-04, OMQ-MKT-05. |
| 19 | Allocation structures | (none) | (none) | No PaymentAllocation or abstract fund-allocation record exists. | PaymentAllocation | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Low | New requirement; blocked on OMQ-MKT-05. |
| 20 | Settlement structures | (none) | (none) | No SellerSettlementReference or payout reference exists. | SellerSettlementReference | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Low | New requirement; blocked on OMQ-MKT-05. SELLER_PAYOUT_MODEL=UNRESOLVED |
| 21 | Shipment structures | (none) | (none) | No Shipment or ShipmentItemAllocation exists. | Shipment, ShipmentItemAllocation | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Low | New requirement. |
| 22 | Return structures | (none) | (none) | No ReturnCase exists. | ReturnCase | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Low | New requirement. FINANCIAL_LIABILITY_OWNER=PARTNER |
| 23 | Goods complaint structures | (none) | (none) | No GoodsComplaintCase exists. Separate from platform-service complaint. | GoodsComplaintCase | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Low | New requirement. RESPONSIBILITY_OWNER=PARTNER |
| 24 | Platform-service complaint structures | (none) | (none) | No PlatformServiceComplaintCase exists. Separate from goods complaint. | PlatformServiceComplaintCase | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Low | New requirement. RESPONSIBILITY_OWNER=LOGIMARKET |
| 25 | Refund structures | (none) | (none) | No RefundCase exists. | RefundCase | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Low | New requirement; blocked on OMQ-MKT-08. FINANCIAL_LIABILITY_OWNER=PARTNER; TECHNICAL_EXECUTOR=UNRESOLVED |
| 26 | Chargeback structures | (none) | (none) | No ChargebackDispute exists. | ChargebackDispute | NO_CURRENT_ELEMENT | VERIFIED_ABSENCE | N/A | Low | New requirement; blocked on OMQ-MKT-09. CHARGEBACK_RESPONSIBILITY_OWNER=UNRESOLVED |
