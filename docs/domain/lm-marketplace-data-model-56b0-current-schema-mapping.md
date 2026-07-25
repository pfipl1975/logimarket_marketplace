# CURRENT SCHEMA MAPPING (LM-MARKETPLACE-DATA-MODEL-56B0)

CURRENT_SCHEMA_IS_NOT_THE_NORMATIVE_FUTURE_MODEL=YES
CURRENT_BEHAVIOR_MUST_BE_MAPPED_BEFORE_EXTENSION=YES
PHYSICAL_CHANGE_ALLOWED_IN_56B0=NO

| CURRENT_ELEMENT | CURRENT_PATH | CURRENT_SYMBOL | CURRENT_BEHAVIOR | R3_LOGICAL_ELEMENT | MAPPING_CLASSIFICATION | REUSE_RISK | MIGRATION_RISK | OPEN_QUESTION |
|-----------------|--------------|----------------|------------------|--------------------|------------------------|------------|----------------|---------------|
| offer identity | src/lib/schema.ts | offers.id | Primary key for offers. | Offer | DIRECT_REUSE_CANDIDATE | Low | Low | - |
| offerModel rep. | src/lib/schema.ts | offers.offerModel | Varchar without a database CHECK constraint; default value 'rfq'; actual allowed runtime values not enforced in schema. | OfferContractClassification | EXTENSION_CANDIDATE | Medium | Medium | Needs strict constraint and validation. |
| conversionType | src/lib/schema.ts | offers.conversionType | Parallel field exists; relationship to offerModel requires audit; possible semantic overlap/drift risk. | OfferContractClassification | REQUIRES_FURTHER_AUDIT | High | High | Semantic overlap with offerModel must be resolved. |
| partner rel. | src/lib/schema.ts | offers.partnerId | Links offer to a partner. | OfferSellerAssignment | EXTENSION_CANDIDATE | Medium | Medium | Needs immutable snapshots. |
| RFQ Flow | src/components/RfqDialog.tsx, src/app/actions.ts, src/lib/schema.ts | RfqDialog, submitRfq, rfqLeads | RfqDialog invokes submitRfq; submitRfq persists rfqLeads; no marketplace order or seller order is created. | RfqRequest | EXTENSION_CANDIDATE | Medium | Medium | Needs alignment with new orchestration, but mutually exclusive to e-commerce orders. |
| Cart | src/app/actions.ts, src/lib/schema.ts | getSessionHash, addToCart, cartItems | getSessionHash uses session_hash cookie; addToCart persists cartItems; addToCart currently checks active/published offer but does not enforce offerModel=ecommerce in the Server Action (CURRENT_ENFORCEMENT_GAP). | MarketplaceOrder | EXTENSION_CANDIDATE | High | High | Cart needs buyer identity binding and offerModel enforcement. |
| Checkout / Orders | src/app/actions.ts, src/lib/schema.ts | submitCheckout, orders, orderItems | submitCheckout creates one orders row and orderItems; no seller-specific split exists; title and unitPrice are supplied in action input; server-side commercial snapshot revalidation is not represented; cart is cleared after order creation. orders/orderItems contain no sellerId, no contractModel snapshot, no seller responsibility snapshot, no payment allocation, no shipment/return/refund model. | MarketplaceOrder | EXTENSION_CANDIDATE | High | High | Must be transformed to support multi-seller splitting and snapshots. |
| Outbound | src/app/go/[id]/route.ts, src/lib/schema.ts | clicks, /go/[id], outboundUrl | clicks table exists; /go/[id] reads outboundUrl and redirects; current route does not visibly insert a clicks record; route does not visibly enforce offerModel=outbound. | OutboundRedirectEvent | REQUIRES_FURTHER_AUDIT | High | High | Missing tracking insert and offerModel constraint. |
| pricing fields | src/lib/schema.ts | offers.priceBrutto | Stores numeric price. | Offer | EXTENSION_CANDIDATE | Low | Low | Currency is implicit. |
| priceOnRequest | src/lib/schema.ts | offers.priceOnRequest | Boolean flag for RFQ pricing. | Offer | BEHAVIOR_TO_PRESERVE | Low | Low | - |
