# LOGIMARKET — LEGAL AND TAX QUESTIONNAIRE (LM-DROP-DOMAIN-56A-R2A)

**Wersja:** 1.0.0
**Data:** 2026-07-22
**Cel:** Kompletny zestaw 14 zapytań prawnych (LEGAL GATES) dla kancelarii i doradcy podatkowego.

## LEG-GATE-01: MoR and SoR
* **LEGAL_GATE_ID**: LEG-GATE-01
* **QUESTION**: Jakie licencje są wymagane, jeśli LogiMarket będzie podmiotem pobierającym wpłaty, a na kim spoczywać będzie obowiązek dokumentowania faktur sprzedaży?
* **BUSINESS_CONTEXT**: Projektujemy model, gdzie LogiMarket pośredniczy w płatności za towar wystawiany przez Partnera Dropshippingowego.
* **OPTIONS_OR_VARIANTS**: Model A (LogiMarket jako SoR/MoR), Model B (Partner jako SoR, LogiMarket jako MoR).
* **DOCUMENTS_TO_REVIEW**: Propozycja regulaminu zakupów B2B.
* **EXPECTED_DELIVERABLE**: Opinia prawna
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3
* **APPROVAL_EVIDENCE_FORMAT**: Formalna Opinia (PDF)
* **OWNER_PROPOSED_RESOLUTION**: LOGIMARKET_AS_MOR; LOGIMARKET_AS_SELLER_OF_RECORD; BUY_SELL_BACK_TO_BACK
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: Opinia prawna
* **EVIDENCE_OWNER**: Legal Counsel
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3
* **R2B_NOTES**: Gate explanation: Validating MoR model structure

## LEG-GATE-02: VAT and KSeF
* **LEGAL_GATE_ID**: LEG-GATE-02
* **QUESTION**: Kiedy i u kogo powstaje obowiązek podatkowy VAT i jak ma być rejestrowany w KSeF w scenariuszu back-to-back?
* **BUSINESS_CONTEXT**: Platforma B2B potrzebuje jednoznacznej strategii fiskalizacji transakcji.
* **OPTIONS_OR_VARIANTS**: LogiMarket wystawia FV vs Partner wystawia FV.
* **DOCUMENTS_TO_REVIEW**: Propozycje workflow dokumentów.
* **EXPECTED_DELIVERABLE**: Opinia prawna
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3
* **APPROVAL_EVIDENCE_FORMAT**: Formalna Opinia (PDF)
* **OWNER_PROPOSED_RESOLUTION**: LOGIMARKET_ISSUES_CUSTOMER_INVOICE; SUPPLIER_ISSUES_WHOLESALE_INVOICE_TO_LOGIMARKET
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: Opinia prawna
* **EVIDENCE_OWNER**: Legal Counsel
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3
* **R2B_NOTES**: Gate explanation: Validating SoR tax status

## LEG-GATE-03: Dropshipping Partner Agreement
* **LEGAL_GATE_ID**: LEG-GATE-03
* **QUESTION**: Jakie klauzule muszą znaleźć się w umowie z dostawcą dropshippingowym, by skutecznie przenieść ryzyko realizacji?
* **BUSINESS_CONTEXT**: LogiMarket angażuje niezależnych dostawców przemysłowych do wysyłki na rzecz swoich klientów.
* **OPTIONS_OR_VARIANTS**: Umowa ramowa online vs kontrakt podpisywany pisemnie.
* **DOCUMENTS_TO_REVIEW**: Draft umowy (T&C).
* **EXPECTED_DELIVERABLE**: Wzór umowy
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-SCHEMA-56B1
* **APPROVAL_EVIDENCE_FORMAT**: Zaakceptowany Draft Umowy (DOCX)
* **OWNER_PROPOSED_RESOLUTION**: Standardowa umowa handlowa zakupu B2B z Dostawcą
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: Wzór umowy
* **EVIDENCE_OWNER**: Legal Counsel
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-SCHEMA-56B1
* **R2B_NOTES**: Gate explanation: Supplier contract template

## LEG-GATE-04: B2B Returns
* **LEGAL_GATE_ID**: LEG-GATE-04
* **QUESTION**: Na jakich zasadach platforma ma prawo wyłączyć 14-dniowe prawo zwrotu dla spółek kupujących towary przemysłowe?
* **BUSINESS_CONTEXT**: Unikanie nadmiarowych logistyk zwrotnych dla dużych maszyn/materiałów eksploatacyjnych w relacjach B2B.
* **OPTIONS_OR_VARIANTS**: Całkowity zakaz zwrotów B2B vs Opcjonalne za opłatą.
* **DOCUMENTS_TO_REVIEW**: Regulamin sklepu.
* **EXPECTED_DELIVERABLE**: Opinia prawna
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-SCHEMA-56B4
* **APPROVAL_EVIDENCE_FORMAT**: Zapis w Regulaminie
* **OWNER_PROPOSED_RESOLUTION**:
  - Article 7aa Consumer Rights Act;
  - Article 385(5) KC as separate prohibited-clause protection;
  - protected sole trader;
  - pure B2B;
  - statutory withdrawal;
  - voluntary return;
  - rękojmia;
  - commercial warranty;
  - Article 558 KC limitation;
  - fraudulent concealment exception.
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: T&C Update, Return Policy
* **EVIDENCE_OWNER**: Legal Counsel
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-SCHEMA-56B4
* **R2B_NOTES**: Gate explanation: Validating return flow and policies

## LEG-GATE-05: Warranty and Complaints
* **LEGAL_GATE_ID**: LEG-GATE-05
* **QUESTION**: Kto odpowiada za rozpatrzenie reklamacji (rękojmi), jeśli LogiMarket jest jedynie pośrednikiem?
* **BUSINESS_CONTEXT**: Klienci B2B wymagają jasnej drogi roszczeń z tytułu wad ukrytych towarów.
* **OPTIONS_OR_VARIANTS**: LogiMarket pierwsza linia vs Dostawca pierwsza linia.
* **DOCUMENTS_TO_REVIEW**: Regulamin reklamacyjny.
* **EXPECTED_DELIVERABLE**: Opinia prawna
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-SCHEMA-56B4
* **APPROVAL_EVIDENCE_FORMAT**: Formalna Opinia (PDF)
* **OWNER_PROPOSED_RESOLUTION**:
  - LogiMarket is customer-facing seller;
  - supplier responsibility is internal recourse;
  - distinguish complaint, rękojmia and commercial warranty.
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: T&C Update, Warranty Policy
* **EVIDENCE_OWNER**: Legal Counsel
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-SCHEMA-56B4
* **R2B_NOTES**: Gate explanation: Validating warranty and claims

## LEG-GATE-06: Carrier Liability
* **LEGAL_GATE_ID**: LEG-GATE-06
* **QUESTION**: Kiedy dokładnie przechodzi ryzyko utraty towaru na kupującego podczas wysyłki kurierem wynajętym przez dostawcę?
* **BUSINESS_CONTEXT**: LogiMarket nie widzi towaru ani listu przewozowego fizycznie.
* **OPTIONS_OR_VARIANTS**: EXW u dostawcy vs DAP u klienta.
* **DOCUMENTS_TO_REVIEW**: Zasady odpowiedzialności za dostawę.
* **EXPECTED_DELIVERABLE**: Opinia prawna
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-SCHEMA-56B2
* **APPROVAL_EVIDENCE_FORMAT**: Formalna Opinia (PDF)
* **OWNER_PROPOSED_RESOLUTION**: CUSTOMER_FACING_SELLER_RESPONSIBILITY=LOGIMARKET; SUPPLIER_INTERNAL_FULFILLMENT_RESPONSIBILITY=PARTNER; SUPPLIER_RECOURSE_AND_INDEMNITY=REQUIRED; DELIVERY_TERM=DAP_NAMED_PLACE_INCOTERMS_2020
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: Legal Opinion on DAP
* **EVIDENCE_OWNER**: Legal Counsel
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-SCHEMA-56B2
* **R2B_NOTES**: Gate explanation: Validating Incoterms DAP rules

## LEG-GATE-07: PII Processing and Sharing
* **LEGAL_GATE_ID**: LEG-GATE-07
* **QUESTION**: Jak skonstruować umowę powierzenia przetwarzania danych osobowych (dane pracowników B2B na etykiecie) między LogiMarket a Dostawcą?
* **BUSINESS_CONTEXT**: Etykieta kurierska dostawcy z danymi osoby zamawiającej B2B z platformy.
* **OPTIONS_OR_VARIANTS**: DPA w T&C platformy vs odrębne umowy DPA.
* **DOCUMENTS_TO_REVIEW**: Zapisy RODO/GDPR.
* **EXPECTED_DELIVERABLE**: Umowa powierzenia
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-SCHEMA-56B5
* **APPROVAL_EVIDENCE_FORMAT**: Draft DPA (DOCX)
* **OWNER_PROPOSED_RESOLUTION**: Do not preselect DPA as the only legal relationship. Controller, processor, independent-controller and data-sharing roles remain pending privacy/legal review.
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: Privacy Policy Update, DPA
* **EVIDENCE_OWNER**: Legal Counsel
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-SCHEMA-56B5
* **R2B_NOTES**: Gate explanation: Validating data protection rules

## LEG-GATE-08: Data Retention
* **LEGAL_GATE_ID**: LEG-GATE-08
* **QUESTION**: Jak długo musimy przechowywać dane bilingowe i wysyłkowe w przypadku B2B oraz zgłoszeń dostawców (Ledger/Audit Logs)?
* **BUSINESS_CONTEXT**: Tworzenie zautomatyzowanych mechanizmów soft/hard delete w bazie danych.
* **OPTIONS_OR_VARIANTS**: 5 lat podatkowych vs Inne terminy KC.
* **DOCUMENTS_TO_REVIEW**: Architektura bazy - polityka retencji.
* **EXPECTED_DELIVERABLE**: Polityka retencji
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-SCHEMA-56B5
* **APPROVAL_EVIDENCE_FORMAT**: Tabela Retencji Danych
* **OWNER_PROPOSED_RESOLUTION**: RETENTION_POLICY=MATRIX_BY_DATA_CATEGORY; PERSONAL_OPERATIONAL_LOGS=TIME_LIMITED; SECURITY_LOGS=TIME_LIMITED_WITH_PERIODIC_REVIEW; ACCOUNTING_RECORDS=STATUTORY_RETENTION_SUBJECT_TO_TAX_CONFIRMATION; KSEF_INVOICES=KSEF_STATUTORY_RETENTION_10_YEARS; LEGAL_HOLD=SUPPORTED; ANONYMISATION_AFTER_RETENTION=REQUIRED_WHERE_APPLICABLE; RETENTION_PERIODS_REQUIRE_FORMAL_APPROVAL=YES
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: Data Retention Matrix Approval
* **EVIDENCE_OWNER**: Legal Counsel, Tax Advisor
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-SCHEMA-56B5
* **R2B_NOTES**: Gate explanation: Validating data retention policies

## LEG-GATE-09: Chargeback Responsibility
* **LEGAL_GATE_ID**: LEG-GATE-09
* **QUESTION**: Czy dostawca dropshippingowy może zostać skutecznie pociągnięty do regresu z tytułu chargebacku klienta B2B?
* **BUSINESS_CONTEXT**: Karta służbowa zostaje użyta, a następnie dochodzi do chargebacku u PSP na koncie LogiMarket.
* **OPTIONS_OR_VARIANTS**: Regres w Umowie Dropshippingowej vs LogiMarket ponosi koszt.
* **DOCUMENTS_TO_REVIEW**: Umowa Partnerska i Umowa z PSP.
* **EXPECTED_DELIVERABLE**: Opinia prawna
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-SCHEMA-56B3
* **APPROVAL_EVIDENCE_FORMAT**: Formalna Opinia (PDF)
* **OWNER_PROPOSED_RESOLUTION**: SUPPLIER_RECOURSE_CONDITIONAL
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: Legal & PSP Confirmation on Set-off
* **EVIDENCE_OWNER**: Legal Counsel, PSP
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-PAYMENT-56E
* **R2B_NOTES**: Gate explanation: Validating set-off rules

## LEG-GATE-10: Payment Flow and Funds Handling
* **LEGAL_GATE_ID**: LEG-GATE-10
* **QUESTION**: Czy przetrzymywanie środków na koncie technicznym platformy stanowi działalność regulowaną i wymaga rachunków powierniczych?
* **BUSINESS_CONTEXT**: Pieniądze od klienta oczekują na wypłatę (settlement) po 14 dniach.
* **OPTIONS_OR_VARIANTS**: Konto zwykłe vs Konto Escrow vs Subkonto PSP.
* **DOCUMENTS_TO_REVIEW**: Architektura cashflow.
* **EXPECTED_DELIVERABLE**: Opinia prawna
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E
* **APPROVAL_EVIDENCE_FORMAT**: Formalna Opinia (PDF)
* **OWNER_PROPOSED_RESOLUTION**: CUSTOMER_PAYMENT_IS_PAYMENT_FOR_LOGIMARKET_SALE; SUPPLIER_CLAIM_IS_SEPARATE_TRADE_PAYABLE; LOGIMARKET_IS_CONTRACTUAL_SELLER; PAYMENT_DISCHARGES_BUYER_DEBT_TO_LOGIMARKET; SUPPLIER_HAS_NO_DIRECT_PAYMENT_CLAIM_TO_BUYER; PSP_ACCEPTS_THE_MODEL=PENDING; FORMAL_LEGAL_CONFIRMATION=PENDING
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: Legal Opinion & PSP Validation
* **EVIDENCE_OWNER**: Legal Counsel, PSP
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-PAYMENT-56E
* **R2B_NOTES**: Gate explanation: Validating payment flow and MoR model

## LEG-GATE-11: Refund Responsibility and Financial Corrections
* **LEGAL_GATE_ID**: LEG-GATE-11
* **QUESTION**: Jak realizować prawne korekty faktur w łańcuchu trzech podmiotów w chwili zwrotu uszkodzonego towaru?
* **BUSINESS_CONTEXT**: Klient oczekuje 100% kwoty, prowizja zostaje cofnięta, towar zutylizowany u dostawcy.
* **OPTIONS_OR_VARIANTS**: Korekty obustronne (SoR) vs Centralna korekta platformy.
* **DOCUMENTS_TO_REVIEW**: Algorytmy korekt dla KSeF.
* **EXPECTED_DELIVERABLE**: Procedura refundacji
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-SCHEMA-56B3, LM-DROP-SCHEMA-56B4, LM-DROP-PAYMENT-56E, LM-DROP-RETURNS-56G
* **APPROVAL_EVIDENCE_FORMAT**: Dokument procedur dla Księgowości
* **OWNER_PROPOSED_RESOLUTION**: CENTRALISED_REFUND_CONTROL
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: Legal, Tax, Accounting & PSP Validation
* **EVIDENCE_OWNER**: Cross-functional
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-PAYMENT-56E
* **R2B_NOTES**: Gate explanation: Validating centralised refunds

## LEG-GATE-12: Trade Credit and External Financing
* **LEGAL_GATE_ID**: LEG-GATE-12
* **QUESTION**: Kto przejmuje ryzyko braku spłaty faktury z terminem wydłużonym (30 dni) w module B2B?
* **BUSINESS_CONTEXT**: Klienci B2B preferują zakupy z limitem kredytowym (Deferred Payment).
* **OPTIONS_OR_VARIANTS**: Faktoring pełny zewnętrzny vs Kredyt LogiMarket.
* **DOCUMENTS_TO_REVIEW**: Umowa cesji / ubezpieczenia.
* **EXPECTED_DELIVERABLE**: Umowa ramowa kredytu kupieckiego
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-PAYMENT-56E
* **APPROVAL_EVIDENCE_FORMAT**: Dokument Prawny (DOCX)
* **OWNER_PROPOSED_RESOLUTION**: INTERNAL_TRADE_CREDIT_NOT_IN_MVP
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: FUTURE_LEGAL_AND_PROVIDER_REVIEW_NOT_MVP_BLOCKER
* **EVIDENCE_OWNER**: Legal Counsel, CFO
* **MVP_APPLICABILITY**: OUT_OF_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-CREDIT-57C
* **R2B_NOTES**: Gate explanation: Validating exclusion of trade credit

## LEG-GATE-13: Credit Risk Ownership and Debt Collection
* **LEGAL_GATE_ID**: LEG-GATE-13
* **QUESTION**: Jak przebiega prawnie wiążący proces blokady kupującego i miękkiej/twardej windykacji w B2B na platformie?
* **BUSINESS_CONTEXT**: Niezapłacone faktury zalegające na kontach użytkowników po przekroczeniu terminów.
* **OPTIONS_OR_VARIANTS**: Automatyczna windykacja zewnętrzna KRD vs Wewnętrzne monity.
* **DOCUMENTS_TO_REVIEW**: Proces windykacyjny.
* **EXPECTED_DELIVERABLE**: Procedura windykacyjna
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-PAYMENT-56E
* **APPROVAL_EVIDENCE_FORMAT**: Wpis do Regulaminu / Procedury Wewnętrznej
* **OWNER_PROPOSED_RESOLUTION**: INTERNAL_DEFERRED_PAYMENT_NOT_IN_MVP
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: FUTURE_POLICY_NOT_MVP_BLOCKER
* **EVIDENCE_OWNER**: Legal Counsel
* **MVP_APPLICABILITY**: NOT_APPLICABLE_TO_CURRENT_PAYMENT_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-CREDIT-57C
* **R2B_NOTES**: Gate explanation: Validating exclusion of deferred payment

## LEG-GATE-14: Supplier Scoring and P2B Ranking Transparency
* **LEGAL_GATE_ID**: LEG-GATE-14
* **QUESTION**: Czy automatyczny spadek w pozycjach wyszukiwania (ranking) dostawcy o wysokiej stopie anulowań wymaga opisania w osobnym regulaminie P2B?
* **BUSINESS_CONTEXT**: Optymalizacja konwersji poprzez promowanie rzetelnych dostawców, spadek dostawców odrzucających zamówienia.
* **OPTIONS_OR_VARIANTS**: Brak transparentności (algorytm tajny) vs Wymóg dyrektywy P2B.
* **DOCUMENTS_TO_REVIEW**: Mechanizmy pozycjonowania (Search Engine).
* **EXPECTED_DELIVERABLE**: Regulamin plasowania ofert (P2B)
* **OWNER**: Legal Counsel
* **BLOCKED_SPRINTS**: LM-DROP-SUPPLIER-56D
* **APPROVAL_EVIDENCE_FORMAT**: Zapis w Regulaminie Partnerskim (P2B)
* **OWNER_PROPOSED_RESOLUTION**: SUPPLIER_SCORING_NEGATIVE_EVENT=YES; AUTOMATIC_CONTRACTUAL_PENALTY=NO_IN_MVP
* **APPROVAL_STATUS**: PROPOSED_RESOLUTION_PENDING_FORMAL_EVIDENCE
* **FORMAL_EVIDENCE_STATUS**: PENDING
* **LEGAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **TAX_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **ACCOUNTING_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PSP_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **PRIVACY_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE
* **REQUIRED_EXTERNAL_DELIVERABLE**: Legal Validation of P2B Compliance
* **EVIDENCE_OWNER**: Legal Counsel
* **MVP_APPLICABILITY**: IN_SCOPE
* **BLOCKING_SCOPE**: LM-DROP-SUPPLIER-56D
* **R2B_NOTES**: Gate explanation: Validating P2B compliance for scoring

