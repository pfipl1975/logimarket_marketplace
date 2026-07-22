# LOGIMARKET — ROADMAPA IMPLEMENTACJI MODUŁU DROPSHIPPINGU (LM-DROP-DOMAIN-56A)

**Wersja:** 1.0.0  
**Data:** 2026-07-22  
**Status:** PROPOSAL / ROADMAP  
**Moduł:** Dropshipping Implementation Roadmap  

---

## 1. STRATEGIA WDROŻENIA I ETAPOWANIE

Wdrożenie pełnego kontraktu domenowego dropshippingu w LogiMarket zostało podzielone na 8 wyspecjalizowanych, sekwencyjnych sprintów technicznych (`56B` do `56I`).

Prace realizowane są w myśl zasady **Fail-Fast & Zero-Regression**:
1. Żaden sprint bazodanowy lub aplikacyjny nie może wystartować przed zatwierdzeniem otwartych decyzji blokujących biznesowo-prawnych z dokumentu `lm-drop-domain-56a-decision-register.md`.
2. Każdy sprint dostarcza autonomiczny, zweryfikowany fragment funkcjonalności z zachowaniem 100% wstecznej kompatybilności dla istniejących modeli ofert (`rfq`, `ecommerce`, `outbound`).
3. Kod źródłowy oraz migracje bazy danych są wprowadzane przy użyciu transakcyjnych i odwracalnych kroków.

---

## 2. SEKWENCJA SPRINTÓW IMPLEMENTACYJNYCH

```
+-----------------------------------------------------------------------------------+
|                        DROPSHIPPING IMPLEMENTATION ROADMAP                        |
+-----------------------------------------------------------------------------------+
| 56A: Business Domain Contract & Decision Register [NINIEJSZY SPRINT - ARCHITEKTURA]|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 56B: Database Schema Extension & Drizzle Migrations (Tables & FKs)                |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 56C: Order Core & Multi-Supplier Split Engine (Cart & Checkout Actions)           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 56D: Supplier Handoff & Manual/Email Confirmation Workflow                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 56E: Payment Integration & Capture / Refund State Machine                         |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 56F: Shipment & Courier Tracking Management Core                                  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 56G: B2B Cancellations, Returns & Quality Complaints Module                       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 56H: Domain Audit Trail & Operator RBAC Controls                                   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 56I: QA, E2E Integration Testing & Production Hardening                           |
+-----------------------------------------------------------------------------------+
```

---

## 3. SZCZEGÓŁOWA SPECYFIKACJA SPRINTÓW

---

### SPRINT: LM-DROP-SCHEMA-56B — DATABASE SCHEMA EXTENSION

* **CEL**: Utworzenie tabel bazy danych i relacji Drizzle ORM dla poparcia kontraktu dropshippingu (bez zmiany zachowania istniejących zapytań).
* **ZALEŻNOŚCI**: Zatwierdzenie `LM-DROP-DOMAIN-56A` oraz rozstrzygnięcie decyzji `DEC-DROP-01`, `DEC-DROP-04`, `DEC-DROP-17`.
* **SCOPE**:
  - Dodanie kolumny `fulfillment_model` do tabeli `offers` (z domyślną wartością `'logimarket_stock'`).
  - Utworzenie nowej tabeli `supplier_profiles` (powiązanej z `partners`).
  - Utworzenie tabeli `supplier_orders` (sub-zamówienia dostawców).
  - Rozszerzenie tabeli `order_items` o pola snapshotu (`unit_buy_price_brutto`, `supplier_order_id`, `sku_snapshot`).
  - Utworzenie tabel `shipments`, `payment_transactions`, `domain_audit_logs`.
  - Przygotowanie bezpiecznej migracji SQL i uruchomienie w środowisku Supabase/PostgreSQL.
* **FORBIDDEN SCOPE**:
  - Brak zmian w kodzie UI ani Server Actions w tym sprincie.
  - Brak zmian wartości domyślnych istniejących rekordów w bazie.
* **ACCEPTANCE CRITERIA**:
  - `npm run build` i `tsc --noEmit` przechodzą bez błędów.
  - Migracja Drizzle generuje czysty SQL i daje się transakcyjnie wycofać.
  - Istniejące testy oraz zapytania katalogowe działają w 100% bez zmian.
* **RISKS**: Konflikty kluczy obcych lub naruszenie unikalności przy rozszerzaniu istniejących tabel.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: TAK (`DEC-DROP-01`, `DEC-DROP-04`, `DEC-DROP-17`).

---

### SPRINT: LM-DROP-ORDER-56C — ORDER CORE & MULTI-SUPPLIER SPLIT

* **CEL**: Zaimplementowanie silnika rozbicia koszyka i koszykowego checkoutu na odrębne sub-zamówienia dostawców (*Supplier Orders*).
* **ZALEŻNOŚCI**: `LM-DROP-SCHEMA-56B`.
* **SCOPE**:
  - Aktualizacja formularza w `CheckoutModal.tsx` o kompletne dane adresowe B2B i NIP.
  - Aktualizacja Server Action `submitCheckout` w `/src/app/actions.ts`:
    - Generowanie głównego zamówienia `orders` (*Master Order*).
    - Grupowanie pozycji koszyka wg `partner_id` oferty.
    - Tworzenie dedykowanych rekordów `supplier_orders` dla każdego partnera.
    - Kopiowanie nieedytowalnych snapshotów cen, nazw i SKU do `order_items`.
* **FORBIDDEN SCOPE**:
  - Modyfikacja mechanizmu RFQ lub Outbound (`/go/[id]`).
  - Tworzenie portalu dostawcy.
* **ACCEPTANCE CRITERIA**:
  - Zamówienie z produktami 2 różnych dostawców tworzy 1 `order` oraz 2 obiekty `supplier_orders`.
  - Czyszczenie koszyka po udanym checkoucie działa poprawnie.
* **RISKS**: Błędy zaokrągleń przy wyliczaniu sum końcowych rozbitych pozycji.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: NIE.

---

### SPRINT: LM-DROP-SUPPLIER-56D — SUPPLIER HANDOFF & CONFIRMATION WORKFLOW

* **CEL**: Zaimplementowanie mechanizmu powiadamiania partnerów o nowym zamówieniu oraz rejestracji ich potwierdzenia/odrzucenia.
* **ZALEŻNOŚCI**: `LM-DROP-ORDER-56C`.
* **SCOPE**:
  - Generator powiadomień e-mail / specyfikacji zamówienia dla Dostawcy.
  - Implementacja akcji potwierdzenia (`supplier_confirmed`) oraz odrzucenia (`supplier_rejected`) w logice serwerowej.
  - Mechanizm automatycznej eskalacji do Operatora po przekroczeniu SLA odpowiedzi (np. 24h).
* **FORBIDDEN SCOPE**:
  - Automatyczne integracje EDI/REST API z zewnętrznymi systemami ERP dostawców w 1. fazie.
* **ACCEPTANCE CRITERIA**:
  - Operator może w systemie odnotować potwierdzenie od dostawcy.
  - Odrzucenie zamówienia przez dostawcę zmienia status sub-zamówienia i generuje wpis w logu zdarzeń.
* **RISKS**: Nieterminowe odpowiedzi partnerów generujące opóźnienia realizacji.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: NIE.

---

### SPRINT: LM-DROP-PAYMENT-56E — PAYMENT INTEGRATION & CAPTURE ENGINE

* **CEL**: Podłączenie bramki płatności (np. Stripe) i wdrożenie transakcyjnej maszyny stanów (Autoryzacja → Pobranie → Refund).
* **ZALEŻNOŚCI**: `LM-DROP-ORDER-56C`.
* **SCOPE**:
  - Utworzenie autoryzacji płatności (`payment_authorized`) przy checkoucie.
  - Automatyczne pobranie środków (`payment_captured`) po potwierdzeniu dostawy przez dostawcę lub nadaniu przesyłki.
  - Webhooki transakcyjne PSP i obsługa błędów autoryzacji.
  - Dedykowana obsługa pełnego i częściowego refundu.
* **FORBIDDEN SCOPE**:
  - Zapisywanie danych kart płatniczych po stronie bazy LogiMarket (zgodność z PCI-DSS).
* **ACCEPTANCE CRITERIA**:
  - Webhooki bramki bezbłędnie aktualizują `payment_status` zamówienia.
  - Wycofanie autoryzacji przy odrzuceniu przez dostawcę następuje bezobsługowo.
* **RISKS**: Problemy z wywołaniami webhooków w środowiskach deweloperskich/lokalnych.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: TAK (`DEC-DROP-01`, `DEC-DROP-04`, `DEC-DROP-12`).

---

### SPRINT: LM-DROP-FULFILLMENT-56F — SHIPMENTS & TRACKING CORE

* **CEL**: Wdrożenie obsługi wysyłek, rejestru paczek/palet oraz udostępnienie linków śledzenia dla kupującego.
* **ZALEŻNOŚCI**: `LM-DROP-SUPPLIER-56D`.
* **SCOPE**:
  - Obsługa encji `shipments` powiązanej z `supplier_orders`.
  - Wprowadzanie numeru listu przewozowego (`tracking_number`) oraz kodów przewoźników (DHL, DPD, InPost, Geodis itp.).
  - Powiadomienie e-mail dla kupującego z bezpośrednim linkiem do śledzenia przesyłki kurierskiej.
  - Aktualizacja statusu realizacji na `shipped` oraz `delivered`.
* **FORBIDDEN SCOPE**:
  - Używanie przekierowania `/go/[id]` do śledzenia przesyłek.
* **ACCEPTANCE CRITERIA**:
  - Wprowadzenie listu przewozowego zmienia status `fulfillment_status` sub-zamówienia na `shipped`.
  - Kupujący otrzymuje link bezpośrednio do strony śledzenia wybranego kuriera.
* **RISKS**: Błędne formaty URL śledzenia poszczególnych firm kurierskich.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: NIE.

---

### SPRINT: LM-DROP-RETURNS-56G — B2B CANCELLATIONS, RETURNS & COMPLAINTS

* **CEL**: Zbudowanie modułu obsługi wyjątków transakcyjnych (anulowania, reklamacje z powodu uszkodzeń w transporcie, wady jakościowe).
* **ZALEŻNOŚCI**: `LM-DROP-PAYMENT-56E`, `LM-DROP-FULFILLMENT-56F`.
* **SCOPE**:
  - Dedykowane formularze zgłoszeń reklamacyjnych / zwrotnych B2B dla Operatora.
  - Procedura zatwierdzania zwrotu i generowania protokołu reklamacyjnego.
  - Integracja z silnikiem refundów finansowych z `56E`.
* **FORBIDDEN SCOPE**:
  - Automatyczne uznawanie zwrotów konsumenckich bez weryfikacji warunków B2B.
* **ACCEPTANCE CRITERIA**:
  - Przeprocesowanie reklamacji aktualizuje status `return_complaint_status` i rejestruje korektę finansową.
* **RISKS**: Brak spójności proceduralnej między regulaminem LogiMarket a umowami dostawców.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: TAK (`DEC-DROP-09`, `DEC-DROP-11`, `DEC-DROP-14`).

---

### SPRINT: LM-DROP-AUDIT-56H — DOMAIN AUDIT TRAIL & OPERATOR RBAC CONTROLS

* **CEL**: Wdrożenie ścieżki audytowej i zabezpieczeń RBAC dla działań operatorów w panelu administracyjnym.
* **ZALEŻNOŚCI**: `LM-DROP-SCHEMA-56B` do `56G`.
* **SCOPE**:
  - Nieedytowalny rejestr zdarzeń `domain_audit_logs` zapisujący historię każdej akcji finansowej i statusowej.
  - Kontrola uprawnień ról operacyjnych (np. Operator, Finance Admin, Support Agent).
  - Maskowanie danych wrażliwych i PII w logach systemowych.
* **FORBIDDEN SCOPE**:
  - Tworzenie panelu self-service dla dostawców.
* **ACCEPTANCE CRITERIA**:
  - Każda zmiana statusu zamówienia tworzy wpis z datą, identyfikatorem operatora i starym/nowym stanem.
  - Logi nie zawierają niezaszyfrowanych haseł ani pełnych numerów kart płatniczych.
* **RISKS**: Narzut wydajnościowy przy intensywnym zapisie audytowym.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: NIE.

---

### SPRINT: LM-DROP-QA-56I — INTEGRATION TESTING & PRODUCTION HARDENING

* **CEL**: Testy E2E pełnego cyklu życia zamówienia dropshippingowego, walidacja scenariuszy skrajnych (edge cases) oraz przygotowanie do wdrożenia produkcyjnego.
* **ZALEŻNOŚCI**: Wszystkie poprzednie sprinty `56B-56H`.
* **SCOPE**:
  - Testy symulacyjne zamówień wielopartnerskich, anulowań, odrzuceń i reklamacji.
  - Weryfikacja spójności bazy danych pod kątem kluczy obcych i spójności transakcyjnej.
  - Testy wydajnościowe i sprawdzenie skryptów roboczych Quality Gate (`npm run build`, `tsc --noEmit`, `git diff --check`).
* **FORBIDDEN SCOPE**:
  - Tworzenie nowych funkcji biznesowych nieujętych w kontrakcie.
* **ACCEPTANCE CRITERIA**:
  - 100% testów przechodzi pomyślnie w środowisku stagingowym.
  - Brak regresji dla istniejących funkcji RFQ i Outbound.
  - Wszystkie dokumenty i instrukcje operacyjne są aktualne.
* **RISKS**: Wykrycie nierozstrzygniętych scenariuszy brzegowych na etapie odbioru końcowego.
* **WYMAGA DECYZJI BIZNESOWEJ/PRAWNEJ**: NIE.

---

## 4. MACIERZ GOTOWOŚCI I ZALEŻNOŚCI DECYZYJNYCH

| Sprint | Wymagane Decyzje Blokujące z Register | Status Gotowości do Implementacji |
| :--- | :--- | :--- |
| **56B (Schema)** | `DEC-DROP-01`, `DEC-DROP-04`, `DEC-DROP-17` | **BLOKOWANY** (Wymaga akceptacji decyzji) |
| **56C (Order Core)** | `DEC-DROP-17` | **BLOKOWANY** |
| **56D (Supplier Handoff)** | Brak | Gotowy po 56C |
| **56E (Payments)** | `DEC-DROP-01`, `DEC-DROP-04`, `DEC-DROP-12` | **BLOKOWANY** |
| **56F (Shipments)** | Brak | Gotowy po 56D |
| **56G (Returns)** | `DEC-DROP-09`, `DEC-DROP-11`, `DEC-DROP-14` | **BLOKOWANY** |
| **56H (Audit)** | Brak | Gotowy po 56G |
| **56I (QA)** | Brak | Gotowy po 56H |

---

*Koniec roadmapy implementacyjnej.*
