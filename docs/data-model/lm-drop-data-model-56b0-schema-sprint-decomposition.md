# SCHEMA SPRINT DECOMPOSITION (LM-DROP-DATA-MODEL-56B0)

**Wersja:** 1.0.0
**Status:** PENDING_EXTERNAL_VALIDATION
**Moduł:** Dropshipping Schema Decomposition

**READY_FOR_SCHEMA_IMPLEMENTATION=NO**

Dopóki nie zostaną zamknięte blokujące furtki prawne i biznesowe (formal evidence), system zakazuje realizacji fizycznych mikro-sprintów dekompozycji w `src/lib/schema.ts` oraz wykonywania SQL. Ochrona mechanizmu `/go/[id]` zostaje bezwzględnie zachowana na użytek kliknięć (outbound tracking), a tracking przesyłek będzie oparty na nowej domenie. Offer model jest chroniony przed automatycznymi mutacjami.

## 1. MICRO-SPRINT DEFINITIONS

### LM-DROP-SCHEMA-56B1 — Core Fulfillment & Supplier-Order Schema
- **Scope**: Utworzenie encji odpowiedzialnych za modelowanie split-order na dostawców.
- **Included Entities**: `supplier_order`, `supplier_order_item`, rozszerzenia `partners` (profil hurtowy), immutable snapshots dla adresów i stron.
- **Excluded Entities**: Płatności, faktury, trackingu paczek.
- **Dependencies**: Brak wcześniejszych mikro-sprintów bazodanowych.
- **Mapped Decisions/Gates**: `DEC-DROP-17`, `LEG-GATE-03`.
- **Schema Readiness**: NOT READY (Blocked by legal).
- **Migration Strategy**: Stworzenie relacji opcjonalnych z istniejącymi `orders` w celu bezinwazyjnego przejścia.
- **Rollback Strategy**: DOWN migration drop tables/columns (baza jest pusta w tych kolumnach dla istniejących zamówień rfq/ecommerce).
- **Backfill/Compatibility**: Brak konieczności przerabiania historycznych RFQ. Ochrona offerModel (NO_AUTOMATIC_OFFER_MODEL_CHANGE).
- **Test Fixtures**: Testowanie więzów integralności dla unikalności pozycji.
- **PR Isolation Rule**: Dedykowany PR z testami ORM dla tej jednej małej domeny.

### LM-DROP-SCHEMA-56B2 — Shipment & Courier Tracking Schema
- **Scope**: Moduł realizacji fizycznej i wysyłek DAP.
- **Included Entities**: `shipment`, `shipment_item`, `tracking_event`.
- **Excluded Entities**: Rozliczenia szkód, zwroty, `freight_quote` (POST_MVP).
- **Dependencies**: Wymaga ukończenia `56B1`.
- **Mapped Decisions/Gates**: `DEC-DROP-11`, `DEC-DROP-16`, `DEC-DROP-22`, `LEG-GATE-06`.
- **Schema Readiness**: NOT READY.

### LM-DROP-SCHEMA-56B3 — Payment, Refund & Settlement Ledger Schema
- **Scope**: Pełny cykl życia pieniądza od pre-autoryzacji (PSP), przejęcia środków w LogiMarket, obsługę zwrotów i zobowiązań do dostawcy. Zastąpienie koncepcji prowizyjnych (commission/escrow) na rzecz rzetelnego księgowania Trade Payables.
- **Included Entities**: `payment`, `refund`, `customer_invoice`, `supplier_invoice`, `supplier_payable`, `ksef_submission`.
- **Excluded Entities**: Moduły limitów kupieckich (`LM-DROP-CREDIT-57C`).
- **Dependencies**: Wymaga ukończenia `56B1`.
- **Mapped Decisions/Gates**: `DEC-DROP-01` do `08`, `DEC-DROP-12`, `DEC-DROP-18`, `DEC-DROP-21`, `LEG-GATE-01`, `02`, `09`, `10`.
- **Schema Readiness**: NOT READY (Krytyczne blokady prawne i podatkowe).
- **Integrity Assertions**: Wykorzystanie constraints dla zabezpieczenia przed duplikacją operacji finansowych.

### LM-DROP-SCHEMA-56B4 — Returns & Quality Complaints Schema
- **Scope**: Zwroty od firm (B2B Returns) i obsługa rękojmi.
- **Included Entities**: `return_request`, `complaint`, `cancellation_request`.
- **Excluded Entities**: Operacje czysto prawne, procesy windykacyjne z zewnętrznymi firmami.
- **Dependencies**: Wymaga ukończenia `56B1` i `56B2`.
- **Mapped Decisions/Gates**: `DEC-DROP-09`, `DEC-DROP-12` do `14`, `LEG-GATE-04`, `05`, `11`.
- **Schema Readiness**: NOT READY.

### LM-DROP-SCHEMA-56B5 — Audit & Security Support Structures
- **Scope**: Audytowanie mutacji danych na produkcji, struktury pod GDPR.
- **Included Entities**: `domain_audit_log`, `webhook_delivery`, struktury Legal Hold, retencji danych.
- **Dependencies**: Brak technicznych. Logicznie zależne od wypracowania polityk w Legal Gates.
- **Mapped Decisions/Gates**: `LEG-GATE-07`, `LEG-GATE-08`.
- **Schema Readiness**: NOT READY.

### LM-DROP-SCHEMA-56B6 — Controlled Migration Execution & Production Verification
- **PROPOSED_NAME — NOT YET APPROVED** (Może ulec zmianie po konsultacjach na środowisku stage).
- **Scope**: Finalna egzekucja skryptów tworzenia schematu na Supabase.
- **PR Isolation Rule**: Zebranie testów z poprzednich faz na wspólnym środowisku dev. Brak pushu przed zakończeniem faz biznesowych. Wdrożenie na staging i symulacje obciążenia.

---

## 2. DECISION TRACEABILITY MATRIX (DECISION_COVERAGE_ROWS=23)

| Decision ID | Affected Aggregate | Affected Entities | Invariants / Transitions | Readiness | Sprint | External Dep |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-01` | Payment | `payment` | Capture goes to MoR | `READY_CONDITIONALLY` | `56B3` | `LEG-GATE-01` |
| `DEC-DROP-02` | Customer Invoice | `customer_invoice` | Buy-Sell back to back | `READY_CONDITIONALLY` | `56B3` | `LEG-GATE-01` |
| `DEC-DROP-03` | Customer Invoice | `customer_invoice`, `supplier_invoice` | LogiMarket issues invoice | `READY_CONDITIONALLY` | `56B3` | `LEG-GATE-02` |
| `DEC-DROP-04` | Payment | `payment` | Funds go to Op Account | `READY_CONDITIONALLY` | `56B3` | `LEG-GATE-10` |
| `DEC-DROP-05` | Supplier Payable | `supplier_payable` | Supplier claim = trade payable | `READY_CONDITIONALLY` | `56B3` | `LEG-GATE-10` |
| `DEC-DROP-06` | Supplier Payable | `supplier_order_item` | Revenue = Trading Margin | `READY_CONDITIONALLY` | `56B3` | Tax Adv. |
| `DEC-DROP-07` | Supplier Payable | `supplier_payable` | Operationally recognized at Shipped | `READY_CONDITIONALLY` | `56B3` | Tax Adv. |
| `DEC-DROP-08` | Supplier Settlement| `supplier_settlement_run` | Plan settlement day 1/15 | `READY_CONDITIONALLY` | `56B3` | Tax Adv. |
| `DEC-DROP-09` | Order / Refund | `customer_order`, `domain_audit_log`| Price error suspension | `READY_CONDITIONALLY` | `56B4` | `LEG-GATE-09` |
| `DEC-DROP-10` | Supplier Order | `supplier_order` | Overselling rejected | `READY_CONDITIONALLY` | `56B1` | `LEG-GATE-14` |
| `DEC-DROP-11` | Shipment | `shipment` | DAP Named Place LogiMarket | `READY_CONDITIONALLY` | `56B2` | `LEG-GATE-06` |
| `DEC-DROP-12` | Refund | `refund` | Centralized refund | `READY_CONDITIONALLY` | `56B3`, `56B4` | `LEG-GATE-11` |
| `DEC-DROP-13` | Complaint | `complaint` | First line = LogiMarket | `READY_CONDITIONALLY` | `56B4` | `LEG-GATE-05` |
| `DEC-DROP-14` | Return | `return_request` | Supplier warehouse dest | `READY_CONDITIONALLY` | `56B4` | `LEG-GATE-04` |
| `DEC-DROP-15` | Supplier Order | `supplier_confirmation` | Partial requires buyer auth | `READY_CONDITIONALLY` | `56B1` | None |
| `DEC-DROP-16` | Shipment | `shipment` | Split shipment supported | `READY_CONDITIONALLY` | `56B2` | None |
| `DEC-DROP-17` | Order | `customer_order`, `supplier_order`| Multi-partner carts | `READY_CONDITIONALLY` | `56B1` | None |
| `DEC-DROP-18` | Invoice | `customer_invoice` | Domestic PL-PL only | `READY_CONDITIONALLY` | `56B3` | Tax Adv. |
| `DEC-DROP-19` | Order | `delivery_address_snapshot` | PL delivery only | `READY_CONDITIONALLY` | `56B1` | None |
| `DEC-DROP-20` | Order | `customer_order` | Currency = PLN | `READY_CONDITIONALLY` | `56B1` | None |
| `DEC-DROP-21` | Payment | `payment` | Immed Capture / Proforma | `READY_CONDITIONALLY` | `56B3` | PSP / Legal |
| `DEC-DROP-22` | Shipment | `shipment` | Parcel/Pallet. No def freight | `READY_CONDITIONALLY` | `56B2` | None |
| `DEC-DROP-23` | Order | `customer_order` | Customer PO = Optional | `READY_CONDITIONALLY` | `56B1` | None |

---

## 3. LEGAL GATE TRACEABILITY MATRIX (LEGAL_GATE_COVERAGE_ROWS=14)

| Legal Gate ID | Affected Aggregates | Affected Entities/Fields | Conditional Model Assumptions | Blocked Physical Sprint | Evidence Owner | 56B0 Documentation Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `LEG-GATE-01` | Payment, Invoice | `payment`, `customer_invoice` | Model A Buy-Sell Back to Back | `56B3` | Legal Counsel | Fully modeled, physically blocked |
| `LEG-GATE-02` | Invoice | `ksef_submission`, `supplier_invoice`| LogiMarket VAT responsibilities | `56B3` | Legal Counsel | KSeF modeled |
| `LEG-GATE-03` | Supplier Order | `supplier_order` | Dropship Contract execution | `56B1` | Legal Counsel | Aggregate mapped |
| `LEG-GATE-04` | Return | `return_request`, `company_legal_name` | PURE_B2B_WITHOUT_PROTECTION vs stat | `56B4` | Legal Counsel | Requires conditional snapshot |
| `LEG-GATE-05` | Complaint | `complaint` | Commercial warranty vs Rękojmia | `56B4` | Legal Counsel | Modes modeled |
| `LEG-GATE-06` | Shipment | `delivery_term_snapshot` | DAP implementation responsibility | `56B2` | Legal Counsel | Delivery snapshot |
| `LEG-GATE-07` | Audit | `domain_audit_log` | PII minimisation rules | `56B5` | Legal Counsel | PII minimisation in payload |
| `LEG-GATE-08` | Audit | `domain_audit_log` | Retention Matrix, Legal Hold | `56B5` | Legal Counsel | Retention policy rules mapped |
| `LEG-GATE-09` | Payment | `payment_attempt` | Supplier regress on chargeback | `56B3` | Legal Counsel | Escrow excluded |
| `LEG-GATE-10` | Payment, Settlem | `payment`, `supplier_payable` | Payment goes to Op Account | `56B3` | Legal Counsel | Escrow excluded |
| `LEG-GATE-11` | Refund, Invoice | `refund`, `invoice_correction` | Centralised refund orchestration | `56B3`, `56B4` | Legal Counsel | Workflow defined |
| `LEG-GATE-12` | Payment | N/A | External Financing (POST-MVP) | `LM-DROP-CREDIT-57C`| Legal Counsel | Excluded from MVP ERD |
| `LEG-GATE-13` | Payment | N/A | Trade Credit (POST-MVP) | `LM-DROP-CREDIT-57C`| Legal Counsel | Excluded from MVP ERD |
| `LEG-GATE-14` | Supplier Order | `supplier_confirmation` | Supplier Scoring metrics P2B | `LM-DROP-SUPPLIER-56D`| Legal Counsel | Penalties conditionally excluded |

---

## 4. KSeF COVERAGE MATRIX (KSEF_REQUIREMENT_ROWS=17)

| Requirement | Entity | Logical Field | Lifecycle | Uniqueness | Retention | Correction Rel. | Tax Dep. | Sprint |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1. KSEF_INVOICE_ID | `ksef_submission` | `ksef_invoice_id` | Set on acceptance | UNIQUE | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 2. KSEF_REFERENCE_NUMBER | `ksef_submission` | `ksef_reference_number` | Generated | UNIQUE | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 3. KSEF_STATUS | `ksef_submission` | `ksef_status` | Mutable state | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 4. KSEF_SUBMISSION_MODE | `ksef_submission` | `submission_mode` | Set on creation | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 5. KSEF_SUBMITTED_AT | `ksef_submission` | `submitted_at` | Set on creation | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 6. KSEF_ACCEPTED_AT | `ksef_submission` | `accepted_at` | Nullable/Set on acc | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 7. KSEF_REJECTED_AT | `ksef_submission` | `rejected_at` | Nullable/Set on rej | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 8. KSEF_ERROR_CODE | `ksef_submission` | `error_code` | Nullable | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 9. KSEF_ERROR_MESSAGE | `ksef_submission` | `error_message` | Nullable | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 10. KSEF_INVOICE_VERSION | `customer_invoice` | `invoice_version` | Snapshot | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 11. INVOICE_CORRECTION_RELATION | `invoice_correction` | `corrected_invoice_id`| FK Reference | N/A | 10 YRS | Yes (Parent) | `LEG-GATE-02` | `56B3` |
| 12. CORRECTED_INVOICE_ID | `invoice_correction` | `correction_id` | FK Reference | UNIQUE | 10 YRS | Yes (Child) | `LEG-GATE-02` | `56B3` |
| 13. KSEF_OFFLINE_OR_FAILURE_MODE | `ksef_submission` | `failure_mode_used` | Boolean | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 14. KSEF_QR_OR_VERIFICATION_REFERENCE| `ksef_submission` | `qr_reference_url` | Nullable | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 15. INVOICE_ISSUER_SNAPSHOT | `invoice_document_snapshot`| `issuer_data` | Immutable | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B3` |
| 16. CUSTOMER_TAX_ID_SNAPSHOT | `billing_address_snapshot`| `tax_identifier` | Immutable | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B1` |
| 17. SUPPLIER_TAX_ID_SNAPSHOT | `supplier_profile` | `tax_identifier` | Immutable | N/A | 10 YRS | N/A | `LEG-GATE-02` | `56B1` |
