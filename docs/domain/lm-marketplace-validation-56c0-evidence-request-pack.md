# EVIDENCE REQUEST PACK (LM-MARKETPLACE-VALIDATION-56C0)

This pack defines external review requests needed to unblock physical schema and application implementation for the LogiMarket Marketplace.

## 1. Legal Counsel

- purpose: Validate contract formation, P2B terms, PSP legal structure, refund liability, and buyer legal context.
- scope: Initial Intermediary-First MVP and Future LogiMarket Reseller Activation.
- exact LEG-MKT and OMQ-MKT IDs: LEG-MKT-01, LEG-MKT-02, LEG-MKT-03, LEG-MKT-04, LEG-MKT-05, LEG-MKT-07, LEG-MKT-08, LEG-MKT-09, LEG-MKT-10, OMQ-MKT-01, OMQ-MKT-02, OMQ-MKT-03, OMQ-MKT-04, OMQ-MKT-05, OMQ-MKT-06, OMQ-MKT-08, OMQ-MKT-09, OMQ-MKT-11, OMQ-MKT-12.
- approved business-model assumptions and intended operating constraints:
- External reviewers must identify whether applicable law, accounting rules, tax rules, privacy requirements, PSP terms, scheme rules or operational constraints invalidate, narrow or require modification of these assumptions. LogiMarket is an intermediary for the partner marketplace. Partners own commercial content and goods refund liability. PSP integration must not involve self-custody or LogiMarket escrow.
- unresolved questions: Contract formation moment, KYB requirements, chargeback allocation, privacy controller roles.
- requested written opinion or evidence: EXTERNAL_EVIDENCE_REQUIRED
- required jurisdiction and market scope: JURISDICTION_TO_CONFIRM
- required assumptions: Intermediary-first model applies to MVP.
- prohibited assumptions: LOGIMARKET_AS_GLOBAL_SELLER, BUYER_STATUS_FROM_NIP_ONLY, JOINT_CONTROLLERSHIP_CONFIRMED, PSP_EXECUTES_REFUND_SELECTED.
- expected response format: Completed Decision Record templates.
- required decision date field: DECISION_DATE_TO_COMPLETE
- reviewer identity and qualification field: REVIEWER_TO_COMPLETE
- evidence attachments field: EXTERNAL_EVIDENCE_REQUIRED
- dependencies on other reviews: Privacy / DPO Review for LEG-MKT-09. Tax Advisor for monetization decisions.
- downstream implementation impact: Physical schema, Terms and Conditions, Registration Flow.

### Initial MVP Evidence Required
- LEG-MKT-01, 02, 03, 04, 05, 07, 08, 09
- OMQ-MKT-01, 02, 03, 04, 05, 06, 08, 09, 11

### Future Reseller Activation Evidence Required
- LEG-MKT-10
- OMQ-MKT-12

---

## 2. Tax and Accounting Advisor

- purpose: Validate VAT, invoicing responsibilities, and KSeF split.
- scope: Initial Intermediary-First MVP.
- exact LEG-MKT and OMQ-MKT IDs: LEG-MKT-06, OMQ-MKT-07, OMQ-MKT-10.
- approved business-model assumptions and intended operating constraints:
- External reviewers must identify whether applicable law, accounting rules, tax rules, privacy requirements, PSP terms, scheme rules or operational constraints invalidate, narrow or require modification of these assumptions. LogiMarket issues platform-service invoices; Partners issue goods invoices.
- unresolved questions: Commission tax recognition, seller goods invoice and KSeF exchange.
- requested written opinion or evidence: EXTERNAL_EVIDENCE_REQUIRED
- required jurisdiction and market scope: JURISDICTION_TO_CONFIRM
- required assumptions: Split goods and platform-service revenue streams.
- prohibited assumptions: LOGIMARKET_GOODS_INVOICE_FOR_PARTNER_MARKETPLACE, CUSTOMER_PAYMENT_AS_LOGIMARKET_GOODS_REVENUE.
- expected response format: Completed Decision Record templates.
- required decision date field: DECISION_DATE_TO_COMPLETE
- reviewer identity and qualification field: REVIEWER_TO_COMPLETE
- evidence attachments field: EXTERNAL_EVIDENCE_REQUIRED
- dependencies on other reviews: Legal Counsel for contract formation.
- downstream implementation impact: Physical schema, Accounting System Integrations.

### Initial MVP Evidence Required
- LEG-MKT-06
- OMQ-MKT-07, OMQ-MKT-10

### Future Reseller Activation Evidence Required
- None

---

## 3. PSP / Marketplace Payments Specialist

- purpose: Provide integration evidence for PSP marketplace architecture.
- scope: Initial Intermediary-First MVP.
- exact LEG-MKT and OMQ-MKT IDs: LEG-MKT-05, OMQ-MKT-03, OMQ-MKT-04, OMQ-MKT-05, OMQ-MKT-08, OMQ-MKT-09.
- approved business-model assumptions and intended operating constraints:
- External reviewers must identify whether applicable law, accounting rules, tax rules, privacy requirements, PSP terms, scheme rules or operational constraints invalidate, narrow or require modification of these assumptions. No LogiMarket self-custody or operated escrow.
- unresolved questions: Technical executor for refunds, chargeback mechanisms, payment allocation architecture, marketplace account model, seller onboarding, PSP KYB/KYC capabilities, beneficial-owner verification, onboarding statuses, capability restrictions, remediation requirements, webhook/API evidence, responsibility split between PSP, LogiMarket, and Partner (OMQ-MKT-04).
- requested written opinion or evidence: EXTERNAL_EVIDENCE_REQUIRED
- required jurisdiction and market scope: JURISDICTION_TO_CONFIRM
- required assumptions: Licensed PSP delegation.
- prohibited assumptions: LOGIMARKET_ESCROW, SELF_CUSTODY.
- expected response format: Completed Decision Record templates and vendor API documentation.
- required decision date field: DECISION_DATE_TO_COMPLETE
- reviewer identity and qualification field: REVIEWER_TO_COMPLETE
- evidence attachments field: EXTERNAL_EVIDENCE_REQUIRED
- dependencies on other reviews: Legal Counsel for KYB/KYC rules.
- downstream implementation impact: Physical schema, PSP Integration Code.

### Initial MVP Evidence Required
- LEG-MKT-05
- OMQ-MKT-03, OMQ-MKT-04, OMQ-MKT-05, OMQ-MKT-08, OMQ-MKT-09

### Future Reseller Activation Evidence Required
- None

---

## 4. Privacy / DPO Reviewer

- purpose: Validate privacy roles, data flows, and retention limits.
- scope: Initial Intermediary-First MVP.
- exact LEG-MKT and OMQ-MKT IDs: LEG-MKT-09, OMQ-MKT-11.
- approved business-model assumptions and intended operating constraints:
- External reviewers must identify whether applicable law, accounting rules, tax rules, privacy requirements, PSP terms, scheme rules or operational constraints invalidate, narrow or require modification of these assumptions. Configurable retention and abstract processing context.
- unresolved questions: Controller/processor allocation per flow.
- requested written opinion or evidence: EXTERNAL_EVIDENCE_REQUIRED
- required jurisdiction and market scope: JURISDICTION_TO_CONFIRM
- required assumptions: Data flows map exactly to logical boundaries.
- prohibited assumptions: JOINT_CONTROLLERSHIP_CONFIRMED.
- expected response format: Completed Decision Record templates.
- required decision date field: DECISION_DATE_TO_COMPLETE
- reviewer identity and qualification field: REVIEWER_TO_COMPLETE
- evidence attachments field: EXTERNAL_EVIDENCE_REQUIRED
- dependencies on other reviews: Legal Counsel.
- downstream implementation impact: Physical schema, GDPR tooling, Privacy Policies.

### Initial MVP Evidence Required
- LEG-MKT-09
- OMQ-MKT-11

### Future Reseller Activation Evidence Required
- None

---

## 5. Internal Product and Engineering Review

- purpose: Ensure external validations translate to viable product and technical implementation.
- scope: Initial Intermediary-First MVP and Future LogiMarket Reseller Activation.
- exact LEG-MKT and OMQ-MKT IDs: All LEG-MKT and OMQ-MKT IDs.
- approved business-model assumptions and intended operating constraints:
- External reviewers must identify whether applicable law, accounting rules, tax rules, privacy requirements, PSP terms, scheme rules or operational constraints invalidate, narrow or require modification of these assumptions. Approved Logical Model Data semantics.
- unresolved questions: Technical schema impact of all legal/PSP decisions.
- requested written opinion or evidence: EXTERNAL_EVIDENCE_REQUIRED
- required jurisdiction and market scope: JURISDICTION_TO_CONFIRM
- required assumptions: Implementation must honor validated constraints.
- prohibited assumptions: PHYSICAL_SCHEMA_READY.
- expected response format: Engineering implementation plans.
- required decision date field: DECISION_DATE_TO_COMPLETE
- reviewer identity and qualification field: REVIEWER_TO_COMPLETE
- evidence attachments field: EXTERNAL_EVIDENCE_REQUIRED
- dependencies on other reviews: Depends on all Legal, Tax, PSP, and Privacy reviews.
- downstream implementation impact: Entire Physical Schema and Application Implementation.

### Initial MVP Evidence Required
- All MVP scoped items.

### Future Reseller Activation Evidence Required
- All Future scoped items.
