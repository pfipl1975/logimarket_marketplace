# LOGIMARKET - INTERMEDIARY MARKETPLACE CONTRACT (LM-MARKETPLACE-DOMAIN-56A-R3)

**Version:** 1.0.0
**Date:** 2026-07-24
**Scope:** R3 Intermediary-First Architecture Reset

## 1. STRATEGIC ARCHITECTURE RESET
MVP_PLATFORM_ROLE=INTERMEDIARY_MARKETPLACE

The global "Reseller-first" (Model A) assumption is superseded. The architecture is now a hybrid marketplace where the default MVP channel is intermediary (Partner is the Seller).

## 2. HYBRID CONTRACT MODEL
- `offerModel` dictates user interaction: `rfq`, `ecommerce`, `outbound`.
- `contractModel` dictates legal and settlement relationship: `partner_marketplace`, `logimarket_reseller`, `external_redirect`.
These two dimensions are structurally independent.

## 3. ACTIVE MVP COMBINATIONS
1. offerModel=rfq, contractModel=partner_marketplace
   - Customer submits RFQ. Partner provides quote. Partner is Seller.
2. offerModel=ecommerce, contractModel=partner_marketplace
   - Customer adds to cart. Partner is Seller. LogiMarket is Intermediary.
3. offerModel=outbound, contractModel=external_redirect
   - Customer clicks out. External Partner is Seller.

## 4. FUTURE CAPABILITIES
- logimarket_reseller capability is preserved for future use but is explicitly `active_in_initial_mvp=NO`.
- Trade credit, financing, KSeF integration, and automated regulatory reporting remain future capabilities.

## 5. REPOSITORY FACTS
As of this sprint:
- `offerModel` exists in `offers` schema (`rfq`, `ecommerce`, `outbound`).
- `contractModel` does NOT yet exist in the database.
- No legal compliance features are implemented.

## 6. VALIDATION GATES
Formal legal, tax, accounting, and PSP validation are PENDING. Schema implementation cannot proceed until validation is complete.

## 7. PROHIBITIONS
Modifying schema, application logic, or asserting compliance is prohibited in this documentation sprint.
