# LOGIMARKET — EXECUTIVE DECISION PACK (LM-DROP-DOMAIN-56A-R2A)

**Wersja:** 1.0.0
**Data:** 2026-07-23
**Cel:** Podsumowanie stanu decyzji biznesowych, operacyjnych i prawnych dla MVP Dropshippingu

## 1. EXECUTIVE SUMMARY

Poniższe zestawienie stanowi bazę do zatwierdzenia przez kadrę kierowniczą (CFO, Legal Counsel, Operations Lead, Product Manager) logiki biznesowej niezbędnej do zaprojektowania modelu danych i procesów checkoutu na platformie LogiMarket. 

* **TOTAL_DECISIONS**: 23
* **IMPLEMENTATION_BLOCKING_DECISIONS**: 8
* **LEGAL_GATES**: 14

Ze względu na zablokowane decyzje, implementacja bazy danych (schema.ts) i checkoutu jest obecnie **wstrzymana**.

## 2. POGRUPOWANE DECYZJE BIZNESOWE (DECISION GROUPS)

### A. Transaction and financial model
| SOURCE_DECISION_REGISTER_ID | SUBJECT | SOURCE_STATUS | SOURCE_BLOCKS_IMPLEMENTATION | SOURCE_BLOCKED_SPRINTS | OWNER | REQUIRED_APPROVERS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE | R2A_RECOMMENDATION_STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-01` | Merchant of Record (MoR) | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | Business Owner / CFO | CFO, Legal | 1 | Legal/Tax Opinion | Signed MoR Decision | REQUIRES_BUSINESS_INPUT |
| `DEC-DROP-02` | Seller of Record (SoR) | `LEGAL_REVIEW_REQUIRED` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3` | Legal Counsel / CFO | CFO, Legal | 1 | Legal/Tax Opinion | Signed SoR Decision | REQUIRES_LEGAL_INPUT |
| `DEC-DROP-03` | Podmiot Wystawiający Fakturę | `RECOMMENDED` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3` | Finance / Legal | Finance | 2 | None | Accounting Standard | PREPARED_FOR_REVIEW |
| `DEC-DROP-05` | Własność Środków przed Payoutem | `LEGAL_REVIEW_REQUIRED` | NO | `LM-DROP-SCHEMA-56B3` | CFO / Legal | Legal | 3 | Legal Opinion | T&C Update | REQUIRES_LEGAL_INPUT |
| `DEC-DROP-06` | Model Wynagrodzenia (Prowizja/Marża)| `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B3` | Head of Sales / CFO | Sales | 4 | None | Sales Strategy | PREPARED_FOR_REVIEW |
| `DEC-DROP-07` | Moment Naliczenia Prowizji | `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B3` | CFO | CFO | 4 | None | Accounting Policy | PREPARED_FOR_REVIEW |

### B. Payment and settlement
| SOURCE_DECISION_REGISTER_ID | SUBJECT | SOURCE_STATUS | SOURCE_BLOCKS_IMPLEMENTATION | SOURCE_BLOCKED_SPRINTS | OWNER | REQUIRED_APPROVERS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE | R2A_RECOMMENDATION_STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-04` | Podmiot Pobierający Płatność | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | CFO | CFO | 2 | PSP Confirmation | Selected Payment Flow | REQUIRES_BUSINESS_INPUT |
| `DEC-DROP-08` | Częstotliwość Settlementów | `OPEN` | NO | `LM-DROP-SCHEMA-56B3` | Operations / Finance | Finance | 5 | None | Settlement Schedule | REQUIRES_BUSINESS_INPUT |
| `DEC-DROP-21` | MVP PAYMENT METHODS AND PAYMENT TIMING | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | Finance | Finance | 2 | None | Supported Methods List | REQUIRES_BUSINESS_INPUT |

### C. Order and supplier operations
| SOURCE_DECISION_REGISTER_ID | SUBJECT | SOURCE_STATUS | SOURCE_BLOCKS_IMPLEMENTATION | SOURCE_BLOCKED_SPRINTS | OWNER | REQUIRED_APPROVERS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE | R2A_RECOMMENDATION_STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-10` | Brak Stanu (Overselling) | `RECOMMENDED` | NO | `LM-DROP-SUPPLIER-56D` | Operations Manager | Operations | 6 | None | Ops Playbook | PREPARED_FOR_REVIEW |
| `DEC-DROP-15` | Częściowa Realizacja Zamówienia | `OPEN` | NO | `LM-DROP-ORDER-56C, LM-DROP-SUPPLIER-56D` | Operations | Operations | 6 | None | Ops Playbook | REQUIRES_BUSINESS_INPUT |
| `DEC-DROP-17` | Multi-Partner Order w Koszyku | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-ORDER-56C` | Product Manager | Product | 1 | None | Product Spec | REQUIRES_BUSINESS_INPUT |

### D. Shipment, freight and delivery
| SOURCE_DECISION_REGISTER_ID | SUBJECT | SOURCE_STATUS | SOURCE_BLOCKS_IMPLEMENTATION | SOURCE_BLOCKED_SPRINTS | OWNER | REQUIRED_APPROVERS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE | R2A_RECOMMENDATION_STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-11` | Uszkodzenie w Transporcie | `LEGAL_REVIEW_REQUIRED` | NO | `LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F` | Operations / Legal | Legal | 5 | Legal Opinion | T&C Update | REQUIRES_LEGAL_INPUT |
| `DEC-DROP-16` | Split Shipment (Wielopaczkowość)| `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F` | Domain Architect | Arch | 3 | None | Arch Spec | PREPARED_FOR_REVIEW |
| `DEC-DROP-22` | MVP SHIPPING AND FREIGHT SCOPE | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F` | Operations | Operations | 2 | None | Freight Scope List | REQUIRES_BUSINESS_INPUT |

### E. Returns, refunds and complaints
| SOURCE_DECISION_REGISTER_ID | SUBJECT | SOURCE_STATUS | SOURCE_BLOCKS_IMPLEMENTATION | SOURCE_BLOCKED_SPRINTS | OWNER | REQUIRED_APPROVERS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE | R2A_RECOMMENDATION_STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-09` | Odpowiedzialność za Błędną Cenę | `LEGAL_REVIEW_REQUIRED` | NO | `LM-DROP-SCHEMA-56B4, LM-DROP-RETURNS-56G` | Legal Counsel | Legal | 5 | Legal Opinion | T&C Update | REQUIRES_LEGAL_INPUT |
| `DEC-DROP-12` | Podmiot Obsługujący Refund | `RECOMMENDED` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-SCHEMA-56B4` | Finance / Support | Finance | 3 | PSP Confirmation | Ops Playbook | PREPARED_FOR_REVIEW |
| `DEC-DROP-13` | Zgłoszenia Reklamacyjne | `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B4, LM-DROP-RETURNS-56G` | Support Lead | Support | 6 | None | SLA Rules | PREPARED_FOR_REVIEW |
| `DEC-DROP-14` | Adres i Koszt Zwrotu Towaru | `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B4, LM-DROP-RETURNS-56G` | Operations Lead | Operations | 6 | None | Ops Playbook | PREPARED_FOR_REVIEW |

### F. Geographic, currency and documentation scope
| SOURCE_DECISION_REGISTER_ID | SUBJECT | SOURCE_STATUS | SOURCE_BLOCKS_IMPLEMENTATION | SOURCE_BLOCKED_SPRINTS | OWNER | REQUIRED_APPROVERS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE | R2A_RECOMMENDATION_STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-18` | VAT i Fakturowanie Transgraniczne| `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B3` | Finance / Tax Advisor | Finance, Tax | 7 | Tax Opinion | Tax Guideline | REQUIRES_TAX_INPUT |
| `DEC-DROP-19` | Kraje Dostawy w MVP | `RECOMMENDED` | NO | `LM-DROP-ORDER-56C` | Operations | Operations | 7 | None | Scope List | PREPARED_FOR_REVIEW |
| `DEC-DROP-20` | Waluta i Język Dokumentów | `RECOMMENDED` | NO | `LM-DROP-ORDER-56C` | Product Manager | Product | 7 | None | Scope List | PREPARED_FOR_REVIEW |

### G. Future B2B capabilities
| SOURCE_DECISION_REGISTER_ID | SUBJECT | SOURCE_STATUS | SOURCE_BLOCKS_IMPLEMENTATION | SOURCE_BLOCKED_SPRINTS | OWNER | REQUIRED_APPROVERS | RECOMMENDED_SEQUENCE | REQUIRED_EXTERNAL_INPUT | REQUIRED_APPROVAL_EVIDENCE | R2A_RECOMMENDATION_STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-23` | CUSTOMER PO NUMBER IN MVP ORDER CORE | `OPEN` | NO | `LM-DROP-ORDER-56C` | Product Manager | Product | 8 | None | Product Spec | REQUIRES_BUSINESS_INPUT |


## R2B OVERLAY
* BUSINESS_APPROVAL_STATUS: Incorporated
* SELECTED_OPTION: Incorporated
* EXTERNAL_VALIDATION_STATUS: Incorporated
* SCHEMA_READINESS: Incorporated

