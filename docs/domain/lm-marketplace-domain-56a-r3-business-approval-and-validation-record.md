# LOGIMARKET - BUSINESS APPROVAL AND VALIDATION RECORD (LM-MARKETPLACE-DOMAIN-56A-R3)

**Version:** 1.0.0
**Date:** 2026-07-24
**Approval Source:** R3_INTERMEDIARY_FIRST_RESET

R3_SUPERSEDES_MODEL_A_AS_GLOBAL_MVP_DEFAULT=YES
MODEL_A_RETAINED_AS_FUTURE_RESELLER_CHANNEL=YES
MODEL_A_ACTIVE_IN_INITIAL_MVP=NO

## 1. BUSINESS DECISION APPROVAL
BUSINESS_DECISION_STATUS=APPROVED
BUSINESS_APPROVER=Piotr Fiszer
BUSINESS_APPROVER_ROLE=Business Owner
APPROVAL_DATE=2026-07-24

MVP_PLATFORM_ROLE=INTERMEDIARY_MARKETPLACE

RFQ_DEFAULT_CONTRACT_MODEL=PARTNER_MARKETPLACE
ECOMMERCE_DEFAULT_CONTRACT_MODEL=PARTNER_MARKETPLACE
OUTBOUND_DEFAULT_CONTRACT_MODEL=EXTERNAL_REDIRECT

LOGIMARKET_RESELLER_CAPABILITY=SUPPORTED_FOR_FUTURE
LOGIMARKET_RESELLER_ACTIVE_IN_INITIAL_MVP=NO

## 2. EXTERNAL VALIDATION STATUS
LEGAL_VALIDATION_STATUS=PENDING_FORMAL_EVIDENCE
PSP_VALIDATION_STATUS=PENDING_FORMAL_EVIDENCE
TAX_VALIDATION_STATUS=PENDING_FORMAL_EVIDENCE
ACCOUNTING_VALIDATION_STATUS=PENDING_FORMAL_EVIDENCE
PRIVACY_VALIDATION_STATUS=PENDING_FORMAL_EVIDENCE

READY_FOR_LOGICAL_DATA_MODEL_RESET=YES_CONDITIONALLY
READY_FOR_SCHEMA_IMPLEMENTATION=NO
READY_FOR_PRODUCTION_IMPLEMENTATION=NO

## 3. SCOPE AND DECISION AUTHORITY
The purpose is to replace the global reseller-first assumption with a hybrid marketplace architecture whose initial MVP is intermediary-first.

## 4. EXACT APPROVED BUSINESS MODEL
- offerModel and contractModel are independent.
- ACTIVE MVP COMBINATIONS:
  1. offerModel=rfq, contractModel=partner_marketplace, seller=partner
  2. offerModel=ecommerce, contractModel=partner_marketplace, seller=partner
  3. offerModel=outbound, contractModel=external_redirect, seller=external_partner
- FUTURE CHANNEL COMBINATIONS:
  4. offerModel=rfq, contractModel=logimarket_reseller, seller=LogiMarket (active_in_initial_mvp=NO)
  5. offerModel=ecommerce, contractModel=logimarket_reseller, seller=LogiMarket (active_in_initial_mvp=NO)

## 5. SOURCE PRECEDENCE
1. R3 business approval and validation record
2. R3 intermediary-first contract
3. R3 decision-register overlay
4. R2B and R2A documents only where not superseded by R3
5. current repository implementation facts

Conflicting R2B or R2A statements are historical and non-normative for the intermediary-first MVP.

## 6. SUPERSESSION RULES
The previous logical data model assumed LogiMarket as the global Seller of Record. The approved strategic direction is now hybrid intermediary-first: Partner is the default seller for RFQ and e-commerce, while LogiMarket reseller capability remains a future, offer-specific channel.

## 7. VALIDATION DEPENDENCIES
Formal legal, PSP, tax and accounting evidence remains pending.

## 8. IMPLEMENTATION PROHIBITIONS
Do not implement contractModel in the database during this sprint. No application behavior modifications. Do not claim that the platform is legally compliant with DSA, P2B, payment-services, tax, accounting or KSeF requirements. LogiMarket must not independently hold or safeguard customer funds unless a formally approved regulatory model permits it.

## 9. ROLLBACK AND REOPENING CONDITIONS
Validation failures from legal, tax, accounting, or PSP bodies will require reopening specific business decisions and generating subsequent R-series records.
