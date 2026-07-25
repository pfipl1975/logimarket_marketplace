# CURRENT SCHEMA MAPPING (LM-MARKETPLACE-DATA-MODEL-56B0)

CURRENT_SCHEMA_IS_NOT_THE_NORMATIVE_FUTURE_MODEL=YES
CURRENT_BEHAVIOR_MUST_BE_MAPPED_BEFORE_EXTENSION=YES
PHYSICAL_CHANGE_ALLOWED_IN_56B0=NO

| CURRENT_ELEMENT | CURRENT_PATH | CURRENT_SYMBOL | CURRENT_BEHAVIOR | R3_LOGICAL_ELEMENT | MAPPING_CLASSIFICATION | REUSE_RISK | MIGRATION_RISK | OPEN_QUESTION |
|-----------------|--------------|----------------|------------------|--------------------|------------------------|------------|----------------|---------------|
| offer identity | src/lib/schema.ts | offers.id | Primary key for offers. | Offer | DIRECT_REUSE_CANDIDATE | Low | Low | - |
| offerModel rep. | src/lib/schema.ts | offers.offerModel | Stores 'rfq', 'ecommerce'. | OfferContractClassification | EXTENSION_CANDIDATE | Low | Medium | Does it currently imply contract model? |
| partner rel. | src/lib/schema.ts | offers.partnerId | Links offer to a partner. | OfferSellerAssignment | EXTENSION_CANDIDATE | Medium | Medium | Needs immutable snapshots. |
| RFQ flow | src/lib/schema.ts | rfqLeads | Captures lead data from RFQ. | SellerOrder | EXTENSION_CANDIDATE | High | High | Needs alignment with unified order model. |
| cart flow | src/lib/schema.ts | cartItems | Stores items by session. | MarketplaceOrder | EXTENSION_CANDIDATE | Medium | High | Cart needs buyer identity binding. |
| checkout state | src/lib/schema.ts | orders.sessionHash | Links order to anonymous user. | MarketplaceOrder | REQUIRES_FURTHER_AUDIT | High | High | Lacks authenticated user context. |
| outbound click | src/lib/schema.ts | clicks | Tracks outbound link usage. | OutboxMessage / Audit | BEHAVIOR_TO_PRESERVE | Low | Low | - |
| order structs | src/lib/schema.ts | orders, orderItems | Global order table, no split. | MarketplaceOrder, SellerOrder | EXTENSION_CANDIDATE | High | High | Must support multi-seller splitting. |
| pricing fields | src/lib/schema.ts | offers.priceBrutto | Stores numeric price. | Offer | EXTENSION_CANDIDATE | Low | Low | Currency is implicit. |
| priceOnRequest | src/lib/schema.ts | offers.priceOnRequest | Boolean flag for RFQ pricing. | Offer | BEHAVIOR_TO_PRESERVE | Low | Low | - |
| user identity | src/lib/schema.ts | orders.sessionHash | Uses session hash for guest. | BuyerLegalContextSnapshot | EXTENSION_CANDIDATE | High | High | Needs formal buyer context. |
| audit support | src/lib/schema.ts | timestamps | createdAt/updatedAt only. | DomainAuditEvent | NEW_LOGICAL_ELEMENT | Low | Medium | Needs formal audit log table. |
| idempotency | - | - | Not implemented. | IdempotencyRecord | NEW_LOGICAL_ELEMENT | Low | Low | New requirement. |
| payment structs | - | - | Not implemented. | PaymentOrchestration | NEW_LOGICAL_ELEMENT | Low | Low | New requirement. |
| shipment structs| - | - | Not implemented. | Shipment | NEW_LOGICAL_ELEMENT | Low | Low | New requirement. |
| return structs | - | - | Not implemented. | ReturnCase | NEW_LOGICAL_ELEMENT | Low | Low | New requirement. |
