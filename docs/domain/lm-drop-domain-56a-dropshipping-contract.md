# LOGIMARKET — KONTRAKT BIZNESOWY I DOMENOWY DROPSHIPPINGU (LM-DROP-DOMAIN-56A-R1)

**Wersja:** 1.1.0 (R1 — Domain Contract Review Fixes & B2B Capability Boundaries)
**Data:** 2026-07-22
**Status:** PROPOSAL / SPECIFICATION FOR DOMAIN REVIEW
**Moduł:** LogiMarket Marketplace Domain Contract

---

## 1. EXECUTIVE SUMMARY & KLASYFIKACJA INFORMACJI

Niniejszy dokument stanowi specyfikację domenową i biznesową dla obsługi modelu **Dropshipping** w marketplace **LogiMarket** (`logimarket.eu`).

Sprint **LM-DROP-DOMAIN-56A-R1** jest etapem wyłącznie analityczno-dokumentacyjnym. W ramach sprintu **nie wprowadzono żadnych zmian** w kodzie źródłowym aplikacji (`src/`), schemacie bazy danych (`/src/lib/schema.ts`), migracjach PostgreSQL ani skryptach.

### Nadrzędna Zasada Klasyfikacji Informacji:
Każde sformułowanie w niniejszym dokumencie oraz powiązanych plikach należy interpretować według następujących kategorii:
* `CURRENT_REPOSITORY_FACT`: Fakt zweryfikowany empirycznie w kodzie i schemacie repozytorium na commicie `048b367bc3b6ddd4a426be4f526e9afe3952c1df`.
* `APPROVED_BUSINESS_DECISION`: Decyzja ostatecznie zatwierdzona przez Właściciela Biznesowego / Kancelarię wraz z podaniem dowodu zatwierdzenia.
* `ARCHITECTURAL_RECOMMENDATION`: Propozycja rozwiązania technicznego/domenowego przedłożona do przeglądu (**RECOMMENDED_OPTION != DECIDED**).
* `OPEN_BUSINESS_DECISION`: Otwarta decyzja biznesowa blokująca lub nieblokująca dalszych prac.
* `LEGAL_REVIEW_REQUIRED`: Kwestia wymagająca analizy prawnej, podatkowej lub regulaminowej.
* `FUTURE_CAPABILITY`: Zaimplementowana w przyszłości domena B2B nieuznana za zatwierdzony zakres MVP.
* `OUT_OF_SCOPE_FOR_DROPSHIPPING_MVP`: Funkcjonalność celowo wyłączona z pierwszego wydania dropshippingu.

---

## 2. AUDYT STANU FAKTYCZNEGO REPOZYTORIUM (`CURRENT_REPOSITORY_FACT`)

Audyt przeprowadzono na repozytorium LogiMarket (`commit: 048b367bc3b6ddd4a426be4f526e9afe3952c1df`).

| CONCEPT | EXISTS | FILE_OR_TABLE | CURRENT_ROLE | REUSE_CANDIDATE | GAP / NIEDOBÓR MVP |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `offerModel` | TAK | `src/lib/schema.ts` (`offers.offerModel`) | Określa model konwersji UI (`rfq`, `ecommerce`, `outbound`). | TAK (Zachować bez zmian) | Brak pola `fulfillmentModel` w `offers` do rozróżnienia stocku LogiMarket od dropshippingu. |
| `partners` | TAK | `src/lib/schema.ts` (`partners`) | Podstawowy rekord wydawcy oferty (`companyName`, `logoUrl`, `contactEmail`). | TAK | Brak atrybutów dropshippingowych (umowa, NIP, dane rozliczeniowe, adres zwrotów, czas realizacji SLA). |
| `suppliers / vendors` | NIE | BAZA / SCHEMAT | Brak osobnej tabeli dostawców. | NIE | Partner pełni funkcję dostawcy; wymagane rozszerzenie relacyjne lub profil dostawcy. |
| `cart` | TAK | `src/lib/schema.ts` (`cartItems`), `src/app/actions.ts` | Przechowywanie pozycji koszyka wg `sessionHash`. | TAK | Brak grupowania koszyka wg dostawców, brak kalkulacji kosztów dostawy per partner dropshippingowy. |
| `checkout` | TAK | `src/components/CheckoutModal.tsx`, `src/app/actions.ts` | Formularz danych B2B i tworzenia zamówienia w bazie. | TAK | Brak adresu dostawy (ulica, kod, miasto), brak NIP rozliczeniowego, brak wyboru dostawy/płatności. |
| `orders` | TAK | `src/lib/schema.ts` (`orders`) | Nagłówek zamówienia B2B (`companyName`, `contactName`, `email`, `totalAmount`, `status="new"`). | TAK | Brak szczegółowych adresów, statusów płatności/wysyłki/zwrotu, waluty, podatków i powiązań z dostawcami. |
| `orderItems` | TAK | `src/lib/schema.ts` (`orderItems`) | Pozycje zamówienia (`orderId`, `offerId`, `title`, `quantity`, `unitPrice`). | TAK | Brak historycznego kosztu zakupu (buy price), prowizji, snapshotu dostawcy i przypisania do *Supplier Order*. |
| `payments` | NIE | BAZA / SCHEMAT | Brak integracji bramki płatności i brak tabel transakcyjnych. | NIE | Brak obsługi autoryzacji, pobrania środków (capture), zwrotów (refund) i rozbicia prowizji (split). |
| `shipments & tracking` | NIE | BAZA / SCHEMAT | Brak bazy przesyłek. Ścieżka `/go/[id]` służy **wyłącznie** do tracking kliknięć outbound! | NIE (nie używać `/go/[id]`) | Wymagana osobna struktura domenowa przesyłek (`shipments`) z kurierem, tracking number i historią dostawy. |
| `inventory & stock` | NIE | BAZA / SCHEMAT | Brak weryfikacji stanów magazynowych (tylko `isActive` i `publicationStatus`). | NIE | Brak kontroli stanów ilościowych, rezerwacji i wskaźników dostępności (lead time). |
| `settlement & commission` | NIE | BAZA / SCHEMAT | Brak rozliczeń z partnerami i naliczania prowizji. | NIE | Brak rejestrów prowizyjnych, historii wypłat (settlements) oraz dopasowywania faktur dostawców. |
| `cancellation / returns` | NIE | BAZA / SCHEMAT | Brak obsługi anulowań, zwrotów B2B oraz reklamacji. | NIE | Wymagane dedykowane maszyny stanów i obiekty zgłoszeń (*return_requests*, *complaints*). |
| `audit` | CZĘŚCIOWO | `src/lib/schema.ts` (`migrationBatches`) | Istnieją wyłącznie tabele audytu migracji atrybutów. | CZĘŚCIOWO (wzorzec) | Brak ogólnego rejestru zdarzeń domenowych dla zmian statusów zamówień i operacji finansowych. |
| `admin MVP` | NIE | BAZA / APLIKACJA | Brak panelu operacyjnego dla zespołu LogiMarket. | NIE | Wymagany kompletny centralny panel operatora do zarządzania dropshippingiem. |

---

## 3. RELACJA: OFFER MODEL VS FULFILLMENT MODEL (`ARCHITECTURAL_RECOMMENDATION`)

W architekturze LogiMarket rozdzielamy pojęcie sposobu zakupu na marketplace (`offerModel`) od sposobu fizycznej realizacji zamówienia (`fulfillmentModel`).

```
+-----------------------------------------------------------------------------------+
|                                 LOGIMARKET OFFER                                  |
+-------------------------------------------------+---------------------------------+
| offerModel (Model Interakcji / Konwersji)        | fulfillmentModel (Model Realizacji)
+-------------------------------------------------+---------------------------------+
| 1. rfq       -> Formularz zapytania ofertowego  | A. logimarket_stock (Magazyn własny)
| 2. ecommerce -> Dodaj do koszyka + Checkout     | B. dropship_supplier (Dostawca)
| 3. outbound  -> Przekierowanie zewnętrzne /go/   | C. external_fulfilled (Zewnętrzny)
+-------------------------------------------------+---------------------------------+
```

### Macierz Kombinacji:
| offerModel | fulfillmentModel | Ocena Arkitektury / Zakres MVP |
| :--- | :--- | :--- |
| **ecommerce** | **dropship_supplier** | **GŁÓWNY ZAKRES DROPSHIPPING MVP.** Produkt zamawiany w koszyku LogiMarket, wysyłany bezpośrednio przez partnera dropshippingowego do kupującego. |
| **ecommerce** | **logimarket_stock** | **Wspierany.** Standardowy e-commerce z wysyłką z magazynu centralnego LogiMarket (jeśli dotyczy). |
| **rfq** | **dropship_supplier** | **Poza MVP.** Zapytania ofertowe wymagają indywidualnej wyceny i negocjacji. |
| **outbound** | **external_partner** | **Niezależne.** Przekierowanie przez `/go/[id]`. Transakcja i realizacja odbywają się w 100% poza ramy LogiMarket. `/go/[id]` nie tworzy zamówienia LogiMarket i nie może być używane do śledzenia przesyłek! |

---

## 4. KONTRAKT RÓL BIZNESOWYCH I MACIERZ RACI (`ARCHITECTURAL_RECOMMENDATION`)

### Zdefiniowane Role Domenowe:
1. **Kupujący B2B (Customer / Buyer)**: Podmiot gospodarczy składający zamówienie w LogiMarket, podający dane do faktury i dostawy oraz opłacający zamówienie.
2. **Operator LogiMarket (Marketplace Operator)**: Centralny zespół LogiMarket zarządza katalogiem, umowami, weryfikuje zamówienia, zleca wysyłki dostawcom, kontroluje rozliczenia i obsługuje wyjątki.
3. **Partner Dropshippingowy (Supplier / Vendor)**: Podmiot zewnętrznyutrzymujący stock, pakujący i wysyłający towar bezpośrednio do Kupującego B2B na zlecenie Operatora.
4. **Przewoźnik (Carrier)**: Firma kurierska/logistyczna realizująca przewóz i dostarczająca dane statusowe tracking.
5. **Dostawca Płatności (Payment Service Provider / PSP)**: Podmiot procesujący płatność bezgotówkową (np. Stripe — *nazwa podana wyłącznie jako niewiążący przykład rynkowy*), autoryzacje, pobrania oraz zwroty środków.

### Macierz RACI (Responsible, Accountable, Consulted, Informed):
*Uwaga: Zgodnie z wymogami przeglądu, Kupujący B2B **nie jest** oznaczony jako Accountable za wewnętrzne procesy marketplace. Odpowiedzialność transportowa oznaczona jest jako zależna od decyzji prawnej.*

| Etap Procesu Zamówienia | Kupujący B2B | Operator LogiMarket | Partner Dropshippingowy | Przewoźnik | Dostawca Płatności |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Składanie zamówienia i checkout | **R** | **A** | I | - | I |
| Autoryzacja i pobranie płatności | I | **A** | - | - | **R** |
| Weryfikacja zamówienia i przekazanie do dostawcy | I | **R / A** | C | - | - |
| Potwierdzenie dostępności i terminu (SLA) | I | A | **R** | - | - |
| Kompletacja i nadanie przesyłki | I | A | **R** | C | - |
| Wprowadzenie danych trackingowych | I | **A** | **R** | C | - |
| Transport i fizyczna dostawa | I | TBD — LEGAL/BUSINESS | I | **R** | - |
| Obsługa anulowania (przed wysyłką) | R | **A** | C | - | C |
| Obsługa reklamacji / uszkodzeń w przesyłce | R | **A** | C | C | - |
| Rozliczenie i settlement dostawcy | - | **R / A** | C | - | C |

---

## 5. CYKL ŻYCIA ZAMÓWIENIA I ZDEKOMPONOWANE OSIE STATUSOWE

Zamówienie dropshippingowe opisane jest zestawem **ortogonalnych maszyn stanów**, a nie jedną liniową kolumną statusu.

```
                          ZDEKOMPONOWANE OSIE STATUSOWE
+-----------------------------------------------------------------------------------+
| 1. Customer Order Status:   draft -> placed -> processing -> completed -> cancelled|
| 2. Payment Status:          pending -> authorized -> captured -> refunded -> failed|
| 3. Supplier Order Status:   unsubmitted -> pending_confirmation -> confirmed -> rejected|
| 4. Fulfillment Status:      unfulfilled -> processing -> shipped -> delivered      |
| 5. Shipment Status:         manifested -> in_transit -> delivered -> exception     |
| 6. Cancellation Status:     none -> requested -> approved -> rejected              |
| 7. Refund Status:           none -> pending -> partial -> full -> failed            |
| 8. Return Status:           none -> requested -> authorized -> received -> rejected|
| 9. Complaint Status:        none -> open -> under_review -> resolved -> rejected   |
| 10. Settlement Status:      unsettled -> ready_for_payout -> paid -> disputed     |
+-----------------------------------------------------------------------------------+
```

### Wymagane Scenariusze i Wyjątki Domenowe:
Maszyny stanów muszą formalnie obsługiwać:
* `supplier_rejection` (odrzucenie zamówienia przez dostawcę z braku stanu);
* `partial_supplier_confirmation` (potwierdzenie tylko części pozycji);
* `partial_fulfillment` / `partial_shipment` / `split_shipment` (wysyłka w wielu paczkach/paletach);
* `partial_cancellation` / `partial_refund` (anulowanie lub zwrot części kwoty);
* `refund_failure` / `payment_auth_failure` / `payment_capture_failure` (błędy finansowe);
* `cancellation_before_supplier_confirmation` vs `cancellation_after_supplier_confirmation` vs `cancellation_after_shipment`;
* `missing_inventory` / `damaged_shipment` / `wrong_product` / `missing_items`;
* `duplicate_webhook_or_event` / `duplicate_refund_attempt` / `duplicate_fulfillment_attempt`;
* `retry_of_same_operation` / `out_of_order_event_delivery`;
* `manual_operator_correction` (ręczna korekta przez operatora LogiMarket).

### Przykładowa Tabela Przejść Stanów (`NON_EXHAUSTIVE_EXAMPLE`):

| STATE_AXIS | FROM | EVENT | TO | ACTOR | PRECONDITIONS | SIDE_EFFECTS | FAILURE_PATH | RETRY_POLICY | IDEMPOTENCY_SCOPE | IDEMPOTENCY_KEY | AUDIT_EVENT | NOTIFICATION | ALLOWED_ADMIN_ACTION | FORBIDDEN_ADMIN_ACTION |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Payment Status` | `pending` | `AUTH_PAYMENT` | `authorized` | PSP Webhook | Valid checkout session | Reserve funds, emit `PAYMENT_AUTH_SUCCESS` | `payment_failed` | Max 3 retries | Order Session | `pay_auth_{order_id}` | `PAYMENT_AUTHORIZED` | Email to Buyer | View details | Manual status override without PSP check |
| `Supplier Order` | `unsubmitted` | `TRANSMIT_ORDER` | `pending_confirmation` | Operator / System | Payment authorized | Generate Supplier Order record & spec PDF | `transmission_failed` | Exponential backoff | Supplier Order | `sup_trans_{sup_order_id}` | `SUPPLIER_ORDER_TRANSMITTED` | Email to Supplier | Re-transmit email | Edit line items after transmission |
| `Supplier Order` | `pending_confirmation` | `SUPPLIER_CONFIRM` | `confirmed` | Operator (for Supplier) | SLA active | Lock buy price, update status | `supplier_rejected` | Manual resolution | Supplier Order | `sup_conf_{sup_order_id}` | `SUPPLIER_CONFIRMED` | Email to Buyer | Confirm on behalf | Confirm without item availability check |
| `Fulfillment` | `processing` | `DISPATCH_SHIPMENT` | `shipped` | Operator (for Supplier) | Valid tracking number & carrier | Capture authorized funds, emit tracking link | `dispatch_failed` | Manual check | Shipment | `ship_disp_{shipment_id}` | `SHIPMENT_DISPATCHED` | Email with tracking URL | Enter tracking info | Mark shipped without tracking number |

---

## 6. MODEL ZAMÓWIEŃ WIELOPARTNERSKICH (`ARCHITECTURAL_RECOMMENDATION`)

Przeanalizowano 3 warianty obsługi koszyka zawierającego towary od różnych partnerów dropshippingowych:
* **Wariant A**: Jedno zamówienie, wiele grup dostawy.
* **Wariant B (REKOMENDACJA MVP)**: **Master Customer Order** (`orders`) + pod-zamówienia dostawców **Sub-Supplier Orders** (`supplier_orders`). Kupujący płaci raz, a system automatycznie dzieli pozycje na odrębne zamówienia dostawców.
* **Wariant C**: Ograniczenie koszyka do jednego dostawcy w MVP.

---

## 7. KONTRAKT CENY, STANU I DOSTĘPNOŚCI (SNAPSHOT IMMUTABILITY)

Aby zapewnić spójność księgową i prawną, dane handlowe na zamówieniu nie mogą być wyliczane dynamicznie z aktualnego rekordu oferty `offers`, lecz muszą stanowić nieodwracalny **snapshot historyczny** (`order_items` snapshot).

---

## 8. PRZEKAZANIE ZAMÓWIENIA DO PARTNERA (SUPPLIER HANDOFF)

Ze względu na ograniczenia biznesowe MVP (brak portalu dostawcy i braku automatycznych API/EDI w 1. fazie):
* System generuje powiadomienie e-mail / specyfikację zamówienia PDF dla Partnera;
* Operator LogiMarket w Admin MVP nadzoruje status i czas odpowiedzi (SLA);
* Minimalizacja danych osobowych (PII Minimization): Partner otrzymuje wyłącznie dane niezbędne do wysyłki towaru.

---

## 9. WYSYŁKA I TRACKING (SHIPMENT & TRACKING CONTRACT)

Encja domenowa `shipments` reprezentuje przesyłkę kurierską/paletową (*przykładowa nazwa techniczna: ILLUSTRATIVE NAME — SUBJECT TO DATA MODEL REVIEW*).
> **Ścieżka `/go/[id]`** jest wyłącznie mechanizmem śledzenia kliknięć w oferty typu *Outbound* i pod żadnym pozorem nie może być wykorzystywana do śledzenia przesyłek kurierskich!

---

## 10. RECOMMENDED TARGET FINANCIAL MODEL — NOT APPROVED

> **UWAGA CRITICAL:** Poniższy model finansowy jest wyłącznie REKOMENDACJĄ ARCHITEKTONICZNĄ i NIE ZOSTAŁ ZATWIERDZONY. Ostateczna architektura finansowa zależy bezwzględnie od zamknięcia decyzji biznesowych i prawnych: Merchant of Record (`DEC-DROP-01`), Seller of Record (`DEC-DROP-02`), podmiotu fakturującego (`DEC-DROP-03`), podmiotu pobierającego płatność (`DEC-DROP-04`), własności środków (`DEC-DROP-05`), modelu wynagrodzenia handlowego (`DEC-DROP-06`), settlementów (`DEC-DROP-08`), odpowiedzialności za refundy/chargebacki oraz opodatkowania VAT/KSeF (`DEC-DROP-18`).

### Precyzja Pojęć Ekonomicznych:
* `Sell Price` (Cena Sprzedaży): Cena płacona przez Kupującego B2B na marketplace LogiMarket.
* `Buy Price / Wholesale Price` (Cena Zakupu / Hurtowa): Cena należna Dostawcy za towar.
* `Margin` (Marża): Różnica między Ceną Sprzedaży a Ceną Zakupu w modelu odsprzedaży.
* `Commission` (Prowizja): Wynagrodzenie LogiMarket za usługę pośrednictwa handlowego w modelu agencyjnym.
* `Supplier Pay-Out / Settlement`: Kwota przekazywana Dostawcy po potrąceniu należności marketplace.

### Trzy Rozważane Warianty Ekonomiczne:
1. **Model A — Resale / Trading Margin (Odsprzedaż / Kupno-Sprzedaż)**:
   - LogiMarket kupuje towar od partnera i odsprzedaje go kupującemu.
   - LogiMarket jest sprzedawcą (Seller of Record) i wystawia fakturę kupującemu.
   - Wynagrodzenie wynika z marży handlowej. Partner wystawia fakturę sprzedaży do LogiMarket.
2. **Model B — Agency / Commission (Pośrednictwo / Prowizyjny)**:
   - Partner sprzedaje towar bezpośrednio kupującemu.
   - LogiMarket świadczy usługę pośrednictwa i pobiera prowizję.
   - Partner wystawia fakturę kupującemu, a LogiMarket wystawia fakturę prowizyjną dla Partnera.
3. **Model C — Marketplace PSP Split / Managed Pay-out**:
   - Dostawca płatności (PSP) obsługuje bezpośredni podział środków zgodnie z zasadami marketplace.
   - Wymaga osobnej analizy KYC, AML, regulacyjnej, podatkowej i umownej.

---

## 11. CENTRALNY PANEL OPERATORA (ADMIN MVP)

Admin MVP jest modułem wewnętrznym przeznaczonym wyłącznie dla pracowników i operatorów LogiMarket. Wyłączono z MVP self-service portal dla dostawców.

---

## 12. BEZPIECZEŃSTWO, PRIVACY I AUDYT DOMENOWY

### Wymagania Bezpieczeństwa i Audytu:
1. **RBAC i Least Privilege**: Dostęp do funkcji administracyjnych uwarunkowany jest rolą operacyjną (Operator, Finance Admin, Support Agent).
2. **Separation of Duties**: Zmiany cen, zatwierdzenia wypłat (settlement) i wykonanie refundów wymagają osobnych uprawnień.
3. **Nieedytowalny Audit Log (`domain_audit_logs`)**: Zapis historii każdego zdarzenia biznesowego wraz z autorem, starym i nowym stanem oraz kluczem idempotencyjnym (`idempotency_key`).
4. **Zabezpieczenie przed Podwójnym Fulfillmentem i Refundem**: Wymuszenie unikalności kluczy transakcyjnych i operacyjnych.
5. **Minimalizacja PII i Retencja Danych**: Ochrona danych osobowych kupującego przekazywanych partnerowi.
6. **Zabezpieczenia Webhooków**: Wyszukiwanie nagłówków podwójnego podpisu (HMAC), ochrona przed atakami typu replay attack (timestamp verification).

---

## 13. FUTURE B2B CAPABILITY BOUNDARIES — NOT APPROVED FOR IMPLEMENTATION

> **ZASADA BRAKU SCOPE CREEP:** Poniższe 5 domen stanowią przyszłe wymogi dla dojrzałego marketplace B2B. Zostały sklasyfikowane i powiązane z architekturą, ale **NIE SĄ ZATWIERDZONE DO IMPLEMENTACJI** w sprincie dropshipping MVP i nie dodają żadnych pól/tabel do schematu bazy danych.

---

### CAP-B2B-ACCOUNT-01 — Corporate B2B Accounts & Purchase Approvals
* **BUSINESS_PROBLEM**: Kupujący B2B to organizacje wieloosobowe, w których proces zakupowy wymaga podziału ról (Buyer, Approver, Finance, Admin), limitów zakupowych oraz podawania numeru zamówienia klienta (*Customer PO Number*).
* **DOMAIN_BOUNDARY**: Zarządzanie strukturą firmy kupującej, profilami członków, adresami dostaw i fakturowania oraz akceptacjami.
* **RELATION_TO_DROPSHIPPING**: Dropshipping realizuje wysyłkę na adres końcowy wskazany w zamówieniu firmowym.
* **CURRENT_REPOSITORY_SUPPORT**: Brak (`orders` przechowywane są per `sessionHash` bez kont użytkowników).
* **MVP_RELEVANCE**: Niska (w MVP dane firmy wprowadzane są jednorazowo w checkout). Pole `customer_po_number` (*ILLUSTRATIVE NAME*) jest rekomendowane dla przyszłego kontraktu zamówień.
* **FUTURE_RELEVANCE**: Krytyczna dla klientów korporacyjnych B2B.
* **BLOCKING_DECISIONS**: Decyzja o wdrożeniu systemu kont i IAM dla Kupujących.
* **LEGAL_DEPENDENCIES**: Regulamin kont firmowych B2B i odpowiedzialność reprezentantów.
* **SECURITY_DEPENDENCIES**: Multi-tenant data isolation, RBAC po stronie kupującego.
* **PROPOSED_FUTURE_SPRINT**: `LM-B2B-ACCOUNT-58A — CORPORATE ACCOUNTS AND PURCHASE APPROVAL DOMAIN`.
* **STATUS**: `OUT_OF_SCOPE_FOR_DROP_MVP` / `FUTURE_REQUIRED`.

---

### CAP-B2B-FREIGHT-02 — Heavy Freight and Deferred Freight Quote
* **BUSINESS_PROBLEM**: Towary gabarytowe, paletowe oraz przemysłowe (np. regały wysokiego składowania, antresole, wózki) posiadają skomplikowane koszty transportu zależne od wagi, objętości, kodów pocztowych, rozładunku HDS/dźwigiem, rampy lub wyładowania wózkiem widłowym. Standardowa stawka kurierska nie pokrywa tych wymogów.
* **DOMAIN_BOUNDARY**: Silnik wyceny transportu ciężkiego (Freight Engine), kalkulacja LTL/FTL oraz wycena odroczona (*Deferred Freight Quote*).
* **RELATION_TO_DROPSHIPPING**: Dostawca dropshippingowy często realizuje wysyłkę dedykowanym transportem własnym lub siecią paletową.
* **CURRENT_REPOSITORY_SUPPORT**: Brak (koszyk nie wylicza kosztów transportu ciężkiego).
* **MVP_RELEVANCE**: Wyłączona z wyceny automatycznej checkoutu MVP. Oferta `offerModel=ecommerce` może wymagać ręcznego potwiedzenia transportu bez stawania się ofertą `rfq`.
* **FUTURE_RELEVANCE**: Wysoka dla kategorii urządzeń magazynowych i wielkogabarytowych.
* **BLOCKING_DECISIONS**: Wybór modelu kalkulacji kosztów transportu (fixed vs rule-based vs deferred quote).
* **LEGAL_DEPENDENCIES**: Warunki dostawy Incoterms / prawo przewozowe B2B.
* **SECURITY_DEPENDENCIES**: Autoryzacja aktualizacji kosztu zamówienia przed pobraniem płatności.
* **PROPOSED_FUTURE_SPRINT**: `LM-DROP-FREIGHT-57B — HEAVY FREIGHT QUOTATION AND DELIVERY TERMS`.
* **STATUS**: `OUT_OF_SCOPE_FOR_DROP_MVP` / `OPEN_BUSINESS_DECISION`.

---

### CAP-B2B-CREDIT-03 — Trade Credit and Deferred Payment Domain
* **BUSINESS_PROBLEM**: Transakcje B2B często wymagają płatności odroczonej (np. 14, 30 dni), faktury proforma lub limitu kupieckiego (*Trade Credit*), a nie płatności natychmiastowej kartą/przelewem.
* **DOMAIN_BOUNDARY**: Ocena ryzyka kredytowego, limit kupiecki, weryfikacja ubezpieczyciela (np. Euler Hermes/Enfused), zarządzanie terminami płatności.
* **RELATION_TO_DROPSHIPPING**: Wyznacza moment realizacji zamówienia przez dostawcę przed lub po otrzymaniu wpłaty od kupującego.
* **CURRENT_REPOSITORY_SUPPORT**: Brak.
* **MVP_RELEVANCE**: Wyłączona w MVP (MVP zakłada płatność bezgotówkową z góry przed przekazaniem do dostawcy).
* **FUTURE_RELEVANCE**: Wysoka dla zwiększenia wolumenu wartościowych zamówień B2B.
* **BLOCKING_DECISIONS**: `DEC-DROP-01`, `DEC-DROP-04` oraz wybór partnera finansowania B2B (Faktoring / Kredyt kupiecki).
* **LEGAL_DEPENDENCIES**: Umowa ramowa kredytu kupieckiego, cesja wierzytelności.
* **SECURITY_DEPENDENCIES**: Zabezpieczenie przed wyłudzeniami i nadużyciem limitu.
* **PROPOSED_FUTURE_SPRINT**: `LM-DROP-CREDIT-57C — B2B TRADE CREDIT AND DEFERRED PAYMENT DOMAIN`.
* **STATUS**: `OUT_OF_SCOPE_FOR_DROP_MVP` / `LEGAL_REVIEW_REQUIRED`.

---

### CAP-CATALOG-ATTR-04 — Technical Attribute Normalization
* **BUSINESS_PROBLEM**: Różni dostawcy wprowadzają te same parametry w różnych jednostkach i formatach (np. `1.5 t`, `1500 kg`, `1500kg`), co utrudnia filtrowanie i porównywanie ofert w katalogu.
* **DOMAIN_BOUNDARY**: Kanoniczna reprezentacja wartości numerycznych, jednostek SI, reguł konwersji i walidacji w silniku atrybutów katalogowych.
* **RELATION_TO_DROPSHIPPING**: Zapewnia spójność danych ofert dropshippingowych z katalogiem głównym LogiMarket.
* **CURRENT_REPOSITORY_SUPPORT**: **CZĘŚCIOWO ZAPISANE W SCHEMACIE.** Istnieją tabele `attributeDefinitions`, `controlledOptionValues`, `offerAttributeValues` itp., zbudowane w ramach wcześniejszych sprintów katalogowych (`LM-CAT-FILTER-54B`).
* **MVP_RELEVANCE**: Architektura atrybutów istnieje i jest zachowana bez zmian. Rozszerzenia konwersji jednostek są osobnym strumieniem katalogowym.
* **FUTURE_RELEVANCE**: Istotna dla podnoszenia jakości danych i filtrowania faceted search.
* **BLOCKING_DECISIONS**: Brak (strumień katalogowy).
* **LEGAL_DEPENDENCIES**: Brak.
* **SECURITY_DEPENDENCIES**: Walidacja typów danych wejściowych.
* **PROPOSED_FUTURE_SPRINT**: `LM-CAT-ATTR-54C — TECHNICAL ATTRIBUTE NORMALIZATION ENGINE`.
* **STATUS**: `PARTIALLY_SUPPORTED` / `FUTURE_OPTIONAL`.

---

### CAP-DROP-SLA-05 — Supplier Performance and SLA Engine
* **BUSINESS_PROBLEM**: Jakość dropshippingu zależy od terminowości dostawców (czas potwierdzenia SLA, czas wysyłki, wskaźnik odrzuceń, wskaźnik uszkodzeń w transporcie).
* **DOMAIN_BOUNDARY**: Gromadzenie zdarzeń operacyjnych, wyliczanie metryk SLA, wskaźników jakości oraz ewentualnego wływu na ranking ofert.
* **RELATION_TO_DROPSHIPPING**: Umożliwia Operatorowi ocenę i moderację partnerów dropshippingowych.
* **CURRENT_REPOSITORY_SUPPORT**: Brak.
* **MVP_RELEVANCE**: Gromadzenie surowych zdarzeń w logu audytowym jest wymaganiem MVP; automatyczny scoring i wpływ na pozycję w katalogu jest wariantem post-MVP.
* **FUTURE_RELEVANCE**: Wysoka dla automatyzacji nadzoru nad jakością dostawców.
* **BLOCKING_DECISIONS**: Zasady transparentności rankingu i wyliczania ocen dostawców.
* **LEGAL_DEPENDENCIES**: Zgodność z rozporządzeniem P2B (Platform-to-Business) dotyczącym kryteriów plasowania ofert.
* **SECURITY_DEPENDENCIES**: Nieedytowalność zdarzeń źródłowych, kontrola dostępu do korekt ręcznych.
* **PROPOSED_FUTURE_SPRINT**: `LM-DROP-SLA-57D — SUPPLIER PERFORMANCE AND SLA ENGINE`.
* **STATUS**: `OUT_OF_SCOPE_FOR_DROP_MVP` / `FUTURE_OPTIONAL`.

---

*Koniec dokumentu domenowego.*
