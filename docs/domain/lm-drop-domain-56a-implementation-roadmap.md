# LOGIMARKET — ROADMAPA IMPLEMENTACJI MODUŁU DROPSHIPPINGU (LM-DROP-DOMAIN-56A-R1)

**Wersja:** 1.1.0 (R1 — Refined Dependency Architecture & Decomposed Schema Roadmap)
**Data:** 2026-07-22
**Status:** PROPOSAL / ROADMAP
**Moduł:** Dropshipping Implementation Roadmap

---

## 1. STRATEGIA WDROŻENIA I ETAPOWANIE

Wdrożenie pełnego kontraktu domenowego dropshippingu w LogiMarket zostało podzielone na wyizolowane, sekwencyjne sprinty techniczne.

### Nadrzędne Zasady Wdrożenia:
1. **Współzależność od Zamknięcia Decyzji (Decisions First)**: Żaden sprint bazodanowy (`56B1+`) ani aplikacyjny nie może wystartować przed formalnym zamknięciem otwartych decyzji blokujących w sprincie `LM-DROP-DOMAIN-56A-R2`.
2. **Dekompozycja Zmian Bazodanowych**: Zmiany schematu bazy danych zostały rozbite na 7 mikrostroków (`56B0` do `56B6`), unikając monolitycznej migracji.
3. **Audyt i RBAC Przed Mutacjami Administracyjnymi**: Fundamenty uprawnień RBAC i rejestracji audytowej muszą wyprzedzać mutacje danych w panelu administracyjnym LogiMarket.
4. **Wsteczna Kompatybilność**: Zachowanie 100% sprawności istniejących modeli ofert (`rfq`, `ecommerce`, `outbound`).

---

## 2. SEKWENCJA SPRINTÓW IMPLEMENTACYJNYCH

```
+-----------------------------------------------------------------------------------+
|                        DROPSHIPPING IMPLEMENTATION ROADMAP                        |
+-----------------------------------------------------------------------------------+
| LM-DROP-DOMAIN-56A-R1: Contract Review & B2B Capability Boundaries [NINIEJSZY]    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| LM-DROP-DOMAIN-56A-R2A: Business Decision Closure (MoR, SoR, Payment)             |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| LM-DROP-DOMAIN-56A-R2B: Legal & Tax Gates (Terms, Returns, VAT, Carrier)          |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| LM-DROP-DATA-MODEL-56B0: Logical Data Model, Invariants & Aggregate Specifications|
| (Dokumentacja modeli danych. Brak zmian w schema.ts / brak migracji SQL)           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| LM-DROP-SCHEMA-56B1: Core Fulfillment & Supplier-Order Schema                     |
| LM-DROP-SCHEMA-56B2: Shipment & Courier Tracking Schema                           |
| LM-DROP-SCHEMA-56B3: Payment, Refund & Settlement Ledger Schema                   |
| LM-DROP-SCHEMA-56B4: Returns & Quality Complaints Schema                          |
| LM-DROP-SCHEMA-56B5: Audit & Security Support Structures                          |
| LM-DROP-SCHEMA-56B6: Controlled Migration Execution & Production Verification    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| LM-ADMIN-57A: Admin MVP Architecture and Access Control (RBAC Foundation)        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| LM-DROP-ORDER-56C: Order Core & Multi-Supplier Split Engine                       |
| LM-DROP-SUPPLIER-56D: Supplier Handoff & Confirmation Workflow                    |
| LM-DROP-PAYMENT-56E: Payment Integration & Capture / Refund State Machine         |
| LM-DROP-FULFILLMENT-56F: Shipment & Courier Tracking Management Core              |
| LM-DROP-RETURNS-56G: B2B Cancellations, Returns & Quality Complaints Module       |
| LM-DROP-AUDIT-56H: Domain Audit Trail & Operator RBAC Controls                    |
| LM-DROP-QA-56I: QA, Integration Testing & Production Hardening                    |
+-----------------------------------------------------------------------------------+
```

---

## 3. SZCZEGÓŁOWY OPIS SPRINTÓW ZAMKNIĘCIA I ARCHITEKTURY

---

### SPRINT: LM-DROP-DOMAIN-56A-R2A — BUSINESS DECISION CLOSURE
* **CEL**: Przygotowanie kontrolowanego pakietu decyzji dla Właściciela Biznesowego i Dyrektora Finansowego.
* **ZALEŻNOŚCI**: Pomyślne odebranie LM-DROP-DOMAIN-56A-R1.
* **SCOPE**:
  - Formalne zatwierdzenie wyboru Merchant of Record (DEC-DROP-01) i Seller of Record (DEC-DROP-02).
  - Zatwierdzenie modelu rozliczeń (odsprzedaż vs agencja) oraz fakturowania (DEC-DROP-03).
  - Rozstrzygnięcie modelu podmiotu pobierającego płatność (DEC-DROP-04) oraz własności środków (DEC-DROP-05).
* **FORBIDDEN SCOPE**: Edycja kodu źródłowego, zmiana schema.ts, tworzenie migracji.
* **ACCEPTANCE CRITERIA**: Uzyskanie udokumentowanych wpisów CLOSED.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: TAK.

---

### SPRINT: LM-DROP-DOMAIN-56A-R2B — LEGAL & TAX GATES CLOSURE
* **CEL**: Zatwierdzenie aspektów prawno-podatkowych dropshippingu przez Kancelarię i Doradcę Podatkowego.
* **ZALEŻNOŚCI**: Pomyślne zamknięcie biznesowe w LM-DROP-DOMAIN-56A-R2A.
* **SCOPE**:
  - Podpisanie ramowych wzorców umów partnerskich i warunków zwrotów B2B (DEC-DROP-11, DEC-DROP-14).
  - Regulaminy, dokumentacja VAT i rozliczeń celnych.
* **FORBIDDEN SCOPE**: Edycja kodu źródłowego.
* **ACCEPTANCE CRITERIA**: Zamknięcie wymaganych bramek LEG-GATE.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: TAK.

* **CEL**: Przygotowanie kontrolowanego pakietu decyzji dla Właściciela Biznesowego, Dyrektora Finansowego oraz Kancelarii Prawnej w celu formalnego rozstrzygnięcia otwartych kwestii blokujących.
* **ZALEŻNOŚCI**: Pomyślne odebranie `LM-DROP-DOMAIN-56A-R1`.
* **SCOPE**:
  - Formalne zatwierdzenie wyboru Merchant of Record (`DEC-DROP-01`) i Seller of Record (`DEC-DROP-02`).
  - Zatwierdzenie modelu rozliczeń (odsprzedaż vs agencja) oraz fakturowania (`DEC-DROP-03`).
  - Rozstrzygnięcie modelu podmiotu pobierającego płatność (`DEC-DROP-04`) oraz własności środków (`DEC-DROP-05`).
  - Podpisanie ramowych wzorców umów partnerskich i warunków zwrotów B2B (`DEC-DROP-11`, `DEC-DROP-14`).
  - Formalne zatwierdzenie podziału zamówień wielopartnerskich w koszyku MVP (`DEC-DROP-17`).
* **FORBIDDEN SCOPE**: Edycja kodu źródłowego, zmiana schema.ts, tworzenie migracji.
* **ACCEPTANCE CRITERIA**: Uzyskanie udokumentowanych wpisów `DECIDED` wraz z podaniem `APPROVED_BY`, `APPROVED_AT` oraz `APPROVAL_SOURCE` dla decyzji blokujących.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: TAK.

---

### SPRINT: LM-DROP-DATA-MODEL-56B0 — LOGICAL DATA MODEL SPECIFICATION
* **CEL**: Zdefiniowanie logiki relacyjnej, agregatów, kluczy obcych i niezmienników (invariants) nowego modelu danych w postaci dokumentacji technicznej przed wykonaniem zmian w Drizzle ORM.
* **ZALEŻNOŚCI**: Zatwierdzenie `LM-DROP-DOMAIN-56A-R2`.
* **SCOPE**:
  - Przygotowanie kompletnego dokumentu ERD i specyfikacji tabel (`supplier_profiles`, `supplier_orders`, `order_items` snapshot, `shipments`, `payment_transactions`, `domain_audit_logs`).
  - Określenie ograniczeń integralnościowych (CHECK constraints, FOREIGN KEY rules, UNIQUE indexes).
  - Opracowanie odwracalnego planu migracji bazodanowej.
* **FORBIDDEN SCOPE**: Edycja kodu `src/lib/schema.ts`, uruchamianie migracji SQL na bazie produkcyjnej.
* **ACCEPTANCE CRITERIA**: Kompletny dokument specyfikacji logiki danych zwoływany do przeglądu architektonicznego.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: NIE.

---

### SPRINTY ZMIAN SCHEMATU BAZY DANYCH (`56B1` do `56B6`)

1. **LM-DROP-SCHEMA-56B1 — Core Fulfillment & Supplier-Order Schema**: Utworzenie tabel `supplier_profiles`, `supplier_orders` oraz dodanie kolumny `fulfillment_model` do `offers`.
2. **LM-DROP-SCHEMA-56B2 — Shipment & Courier Tracking Schema**: Utworzenie tabeli `shipments` powiązanej relacją z `supplier_orders`.
3. **LM-DROP-SCHEMA-56B3 — Payment, Refund & Settlement Ledger Schema**: Utworzenie tabel `payment_transactions` oraz `settlement_records` (*dopiero po zatwierdzeniu decyzji finansowych*).
4. **LM-DROP-SCHEMA-56B4 — Returns & Quality Complaints Schema**: Utworzenie tabel `return_requests` i `complaints`.
5. **LM-DROP-SCHEMA-56B5 — Audit & Security Support Structures**: Utworzenie tabeli `domain_audit_logs` wspierającej nieedytowalny rejestr zdarzeń.
6. **LM-DROP-SCHEMA-56B6 — Controlled Migration Execution**: Wykonanie zweryfikowanych transakcyjnie migracji Drizzle w środowisku Supabase/PostgreSQL i walidacja danych.

---

### SPRINT: LM-ADMIN-57A — ADMIN MVP ARCHITECTURE & ACCESS CONTROL (RBAC)
* **CEL**: Opracowanie architektury panelu operatora LogiMarket oraz wdrożenie bezpiecznego modelu kontroli dostępu opartego na rolach (RBAC) i audycie.
* **ZALEŻNOŚCI**: Odbiór `LM-DROP-DOMAIN-56A-R1` oraz `LM-DROP-SCHEMA-56B5`.
* **SCOPE**:
  - Projekt architektury modułu Admin MVP w ramach Next.js App Router (`/src/app/admin` lub odpowiedniej ścieżki).
  - Implementacja kontroli uprawnień (Operator, Finance Admin, Support Agent).
  - Powiązanie akcji administracyjnych z nieedytowalnym logiem audytowym (`domain_audit_logs`).
* **FORBIDDEN SCOPE**: Tworzenie panelu self-service dla dostawców.

---

## 4. MACIERZ ZALEŻNOŚCI SPRINTÓW I BRAMEK KONTROLNYCH

| SPRINT | WYMAGANE DECYZJE BIZNESOWE | WYMAGANE BRAMKI PRAWNE | WYMAGANA BAZA BEZPIECZEŃSTWA | ZALEŻNOŚCI TECHNICZNE | ZAKAZANE PRZEDWCZESNE ZAŁOŻENIA |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `56A-R2` | Wszystkie decyzje open | Wytyczne MoR/SoR/VAT | N/A | `56A-R1` | Zakładanie zatwierdzenia rekomendacji |
| `56B0` | `DEC-DROP-01, 02, 04, 17` | `LEG-GATE-01, 02` | N/A | `56A-R2` | Pisanie kodu schema.ts przed specyfikacją |
| `56B1` | `DEC-DROP-17` | `LEG-GATE-03` | N/A | `56B0` | Modyfikowanie istniejącego offerModel |
| `56B2` | `DEC-DROP-11` | `LEG-GATE-06` | N/A | `56B1` | Używanie /go/[id] do śledzenia paczek |
| `56B3` | `DEC-DROP-01, 04, 06, 08` | `LEG-GATE-01, 02, 09` | Transakcyjny Ledger | `56B1` | Zakładanie konkretnego dostawcy PSP |
| `56B4` | `DEC-DROP-09, 12, 14` | `LEG-GATE-04, 05` | Audit Log | `56B1` | Bezwarunkowe zwroty konsumenckie w B2B |
| `56B5` | Brak | `LEG-GATE-07, 08` | Immutability check | `56B0` | Możliwość edycji historii logów |
| `56B6` | Brak | Brak | Backup & Rollback plan | `56B1..56B5` | Wykonywanie migracji bez sprawdzania braku destruktywności |
| `57A` | Brak | Brak | RBAC & Audit | `56B5` | Dostęp bez uwierzytelnienia operacyjnego |

---

## 5. REJESTR BRAMEK PRAWNYCH (LEGAL GATES REGISTER)

| LEGAL_GATE_ID | SUBJECT | BLOCKED_SPRINTS | OWNER | REQUIRED_DELIVERABLE | STATUS | APPROVAL_EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `LEG-GATE-01` | Podmiotowość MoR i SoR | `56B3, 56C, 56E` | Legal Counsel | Opinia prawna określająca status sprzedawcy | `OPEN` | NULL |
| `LEG-GATE-02` | Klasyfikacja Podatkowa VAT i KSeF | `56B3, 56C` | Tax Advisor | Analiza schematu fakturowania i matrycy VAT | `OPEN` | NULL |
| `LEG-GATE-03` | Umowa Ramowa Dropshippingu | `56B1, 56D` | Legal Counsel | Wzorzec umowy partnerskiej z dostawcami | `OPEN` | NULL |
| `LEG-GATE-04` | Warunki Zwrotów i Odstąpień B2B | `56B4, 56G` | Legal Counsel | Regulamin zwrotów i reklamacji B2B | `OPEN` | NULL |
| `LEG-GATE-05` | Warunki Rękojmi i Gwarancji | `56B4, 56G` | Legal Counsel | Zapisy dotyczące odpowiedzialności za wady | `OPEN` | NULL |
| `LEG-GATE-06` | Odpowiedzialność Przewozowa | `56B2, 56F` | Legal / Ops | Ustalenia odpowiedzialności za szkody w transporcie | `OPEN` | NULL |
| `LEG-GATE-07` | Powierzenie i Przetwarzanie PII | `56B5, 56D` | DPO / Legal | Umowa powierzenia danych osobowych (RODO) | `OPEN` | NULL |
| `LEG-GATE-08` | Polityka Retencji Danych | `56B5, 56H` | DPO / Legal | Zasady okresu przechowywania danych transakcyjnych | `OPEN` | NULL |
| `LEG-GATE-09` | Odpowiedzialność za Chargeback | `56B3, 56E` | Legal / CFO | Procedura obsługi sporów kartowych z PSP | `OPEN` | NULL |

---

## 6. ROADMAPA PRZYSZŁYCH CAPABILITIES B2B (`FUTURE B2B CAPABILITY ROADMAP`)

| CAPABILITY_ID | CAPABILITY_NAME | MVP_SCOPE_CLASSIFICATION | DEPENDENT_ON | PROPOSED_SPRINT | BLOCKS_DROP_CORE |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| `CAP-B2B-ACCOUNT-01` | Corporate B2B Accounts & Approvals | NO | YES | Konta Użytkowników | `LM-B2B-ACCOUNT-58A` | NO |
| `CAP-B2B-FREIGHT-02` | Heavy Freight & Deferred Quote | NO | YES | System Transportowy | `LM-DROP-FREIGHT-57B` | NO |
| `CAP-B2B-CREDIT-03` | Trade Credit & Deferred Payment | NO | YES | `56E`, Partner Finansowy | `LM-DROP-CREDIT-57C` | NO |
| `CAP-CATALOG-ATTR-04`| Technical Attribute Normalization | NO | YES | `LM-CAT-FILTER-54B` | `LM-CAT-ATTR-54C` | NO |
| `CAP-DROP-SLA-05` | Supplier Performance & SLA Engine | NO | YES | `56H` Audit Trail | `LM-DROP-SLA-57D` | NO |

---

*Koniec roadmapy implementacyjnej.*
