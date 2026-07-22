# LOGIMARKET — ROADMAPA IMPLEMENTACJI MODUŁU DROPSHIPPINGU (LM-DROP-DOMAIN-56A-R1)

**Wersja:** 1.1.0 (R1 — Refined Dependency Architecture & Decomposed Schema Roadmap)
**Data:** 2026-07-22
**Status:** PROPOSAL / ROADMAP
**Moduł:** Dropshipping Implementation Roadmap

---

## 1. STRATEGIA WDROŻENIA I ETAPOWANIE

Wdrożenie pełnego kontraktu domenowego dropshippingu w LogiMarket zostało podzielone na wyizolowane, sekwencyjne sprinty techniczne.

### Nadrzędne Zasady Wdrożenia:
1. **Współzależność od Zamknięcia Decyzji (Decisions First)**: Żaden sprint bazodanowy (`56B1+`) ani aplikacyjny nie może wystartować przed formalnym zamknięciem otwartych decyzji blokujących w sprincie `LM-DROP-DOMAIN-56A-R2B`.
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
| LM-DROP-DOMAIN-56A-R2A: Business Decision Pack Preparation
| LM-DROP-DOMAIN-56A-R2B: Approved Decision Incorporation    |
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
| LM-DROP-AUDIT-56H: audit read models, operational reports, anomaly detection, retention operations and compliance exports.                    |
| LM-DROP-QA-56I: QA, Integration Testing & Production Hardening                    |
+-----------------------------------------------------------------------------------+
```

---

## 3. SZCZEGÓŁOWY OPIS SPRINTÓW ZAMKNIĘCIA I ARCHITEKTURY

---

### SPRINT: LM-DROP-DOMAIN-56A-R2A — BUSINESS AND LEGAL DECISION PACK PREPARATION
* **CEL**: Przygotowanie kontrolowanego pakietu decyzji.
* **ZALEŻNOŚCI**: Pomyślne odebranie `LM-DROP-DOMAIN-56A-R1C`.
* **SCOPE**:
  - Agent może: przygotować formularze; porównać opcje; opisać konsekwencje; przygotować listę dokumentów; przygotować pytania dla Business Owner/CFO/Legal/Tax.
  - Agent nie może: zatwierdzać; uzyskiwać opinii; podpisywać dokumentów; ustawiać DECIDED.
* **FORBIDDEN SCOPE**: Edycja kodu źródłowego, zmiana schema.ts, tworzenie migracji.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: NIE.

---

### SPRINT: LM-DROP-DOMAIN-56A-R2B — APPROVED DECISION INCORPORATION
* **CEL**: Wprowadzenie decyzji przekazanych przez uprawnione osoby.
* **ZALEŻNOŚCI**: Odbiór `LM-DROP-DOMAIN-56A-R2A`.
* **SCOPE**:
  - Agent może: wprowadzić decyzje przekazane przez uprawnione osoby; zapisać APPROVED_BY; zapisać APPROVED_AT; zapisać APPROVAL_SOURCE.
  - Agent nie może: wymyślać zatwierdzeń.
* **FORBIDDEN SCOPE**: Edycja kodu źródłowego, zmiana schema.ts, tworzenie migracji.
* **ACCEPTANCE CRITERIA**: Uzyskanie udokumentowanych wpisów `DECIDED`.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: TAK.


---

### SPRINT: LM-DROP-DATA-MODEL-56B0 — LOGICAL DATA MODEL SPECIFICATION
* **CEL**: Zdefiniowanie logiki relacyjnej, agregatów, kluczy obcych i niezmienników (invariants) nowego modelu danych w postaci dokumentacji technicznej przed wykonaniem zmian w Drizzle ORM.
* **ZALEŻNOŚCI**: Zatwierdzenie `LM-DROP-DOMAIN-56A-R2B`.
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
5. **LM-DROP-SCHEMA-56B5 — Audit & Security Support Structures**: persistence structures and integrity constraints.
6. **LM-DROP-SCHEMA-56B6 — Controlled Migration Execution**: Wykonanie zweryfikowanych transakcyjnie migracji Drizzle w środowisku Supabase/PostgreSQL i walidacja danych.

---

### SPRINT: LM-ADMIN-57A — ADMIN MVP ARCHITECTURE & ACCESS CONTROL (RBAC)
* **CEL**: Opracowanie architektury panelu operatora LogiMarket oraz wdrożenie bezpiecznego modelu kontroli dostępu opartego na rolach (RBAC) i audycie.
* **ZALEŻNOŚCI**: Odbiór `LM-DROP-DOMAIN-56A-R1` oraz `LM-DROP-SCHEMA-56B5`.
* **SCOPE**:
  - Projekt architektury modułu Admin MVP w ramach Next.js App Router (`/src/app/admin` lub odpowiedniej ścieżki).
  - authentication, authorization, role enforcement and operator UX.
  - Powiązanie akcji administracyjnych z nieedytowalnym logiem audytowym (`domain_audit_logs`).
* **FORBIDDEN SCOPE**: Tworzenie panelu self-service dla dostawców.

---

## 4. MACIERZ ZALEŻNOŚCI SPRINTÓW I BRAMEK KONTROLNYCH

| SPRINT | WYMAGANE DECYZJE BIZNESOWE | WYMAGANE BRAMKI PRAWNE | WYMAGANA BAZA BEZPIECZEŃSTWA | ZALEŻNOŚCI TECHNICZNE | ZAKAZANE PRZEDWCZESNE ZAŁOŻENIA |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `56A-R2B` | Wszystkie decyzje open | Wytyczne MoR/SoR/VAT | N/A | `56A-R1` | Zakładanie zatwierdzenia rekomendacji |
| `LM-DROP-SCHEMA-56B0` | `DEC-DROP-01, 02, 04, 17` | `LEG-GATE-01, 02` | N/A | `56A-R2B` | Pisanie kodu schema.ts przed specyfikacją |
| `LM-DROP-SCHEMA-56B1` | `DEC-DROP-17` | `LEG-GATE-03` | N/A | `LM-DROP-SCHEMA-56B0` | Modyfikowanie istniejącego offerModel |
| `LM-DROP-SCHEMA-56B2` | `DEC-DROP-11` | `LEG-GATE-06` | N/A | `LM-DROP-SCHEMA-56B1` | Używanie /go/[id] do śledzenia paczek |
| `LM-DROP-SCHEMA-56B3` | `DEC-DROP-01, 04, 06, 08` | `LEG-GATE-01, 02, 09` | Transakcyjny Ledger | `LM-DROP-SCHEMA-56B1` | Zakładanie konkretnego dostawcy PSP |
| `LM-DROP-SCHEMA-56B4` | `DEC-DROP-09, 12, 14` | `LEG-GATE-04, 05` | Audit Log | `LM-DROP-SCHEMA-56B1` | Bezwarunkowe zwroty konsumenckie w B2B |
| `LM-DROP-SCHEMA-56B5` | Brak | `LEG-GATE-07, 08` | Immutability check | `LM-DROP-SCHEMA-56B0` | Możliwość edycji historii logów |
| `LM-DROP-SCHEMA-56B6` | Brak | Brak | Backup & Rollback plan | `56B1..56B5` | Wykonywanie migracji bez sprawdzania braku destruktywności |
| `LM-ADMIN-57A` | Brak | Brak | RBAC & Audit | `LM-DROP-SCHEMA-56B5` | Dostęp bez uwierzytelnienia operacyjnego |

---

## 5. REJESTR BRAMEK PRAWNYCH (LEGAL GATES REGISTER)

| LEGAL_GATE_ID | SUBJECT | BL&#79;CKED_SPRINTS | OWNER | REQUIRED_DELIVERABLE | STATUS | APPROVAL_EVIDENCE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `LEG-GATE-10` | Payment Flow and Funds Handling | `LM-DROP-PAYMENT-56E` | Legal Counsel | Opinia prawna | `OPEN` | NULL |
| `LEG-GATE-11` | Refund Responsibility and Financial Corrections | `LM-DROP-PAYMENT-56E, LM-DROP-RETURNS-56G` | Legal Counsel | Procedura refundacji | `OPEN` | NULL |
| `LEG-GATE-12` | Trade Credit and External Financing | `LM-DROP-PAYMENT-56E` | Legal Counsel | Umowa ramowa kredytu kupieckiego | `OPEN` | NULL |
| `LEG-GATE-13` | Credit Risk Ownership and Debt Collection | `LM-DROP-PAYMENT-56E` | Legal Counsel | Procedura windykacyjna | `OPEN` | NULL |
| `LEG-GATE-14` | Supplier Scoring and P2B Ranking Transparency | `LM-DROP-SUPPLIER-56D` | Legal Counsel | Regulamin plasowania ofert (P2B) | `OPEN` | NULL |

---

## 6. ROADMAPA PRZYSZŁYCH CAPABILITIES B2B (`FUTURE B2B CAPABILITY ROADMAP`)

| CAPABILITY_ID | CAPABILITY_NAME | MVP_REQUIRED | POST_MVP | DEPENDENT_ON | PROPOSED_SPRINT | BLOCKS_DROP_CORE |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| `CAP-B2B-ACCOUNT-01` | Corporate B2B Accounts & Approvals | NO | YES | Konta Użytkowników | `LM-B2B-ACCOUNT-58A` | NO |
| `CAP-B2B-FREIGHT-02` | Heavy Freight & Deferred Quote | NO | YES | System Transportowy | `LM-DROP-FREIGHT-57B` | NO |
| `CAP-B2B-CREDIT-03` | Trade Credit & Deferred Payment | NO | YES | `LM-DROP-PAYMENT-56E`, Partner Finansowy | `LM-DROP-CREDIT-57C` | NO |
| `CAP-CATALOG-ATTR-04`| Technical Attribute Normalization | NO | YES | `LM-CAT-FILTER-54B` | `LM-CAT-ATTR-54C` | NO |
| `CAP-DROP-SLA-05` | Supplier Performance & SLA Engine | NO | YES | `56H` Audit Trail | `LM-DROP-SLA-57D` | NO |

---

*Koniec roadmapy implementacyjnej.*
