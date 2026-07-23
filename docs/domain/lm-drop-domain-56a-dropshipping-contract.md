# LOGIMARKET — KONTRAKT BIZNESOWY I DOMENOWY DROPSHIPPINGU (LM-DROP-DOMAIN-56A-R1F)

**Wersja:** 1.2.2
**Data:** 2026-07-22
**Status:** READY FOR FINAL DOMAIN REVIEW
**Moduł:** LogiMarket Marketplace Domain Contract
**R2B_BUSINESS_DIRECTION:** MODEL_A_SELECTED_BY_BUSINESS_OWNER
**EXTERNAL_VALIDATION_STATUS:** PENDING_FORMAL_EVIDENCE
**SCHEMA_READINESS:** BLOCKED

---

## 1. EXECUTIVE SUMMARY & KLASYFIKACJA INFORMACJI

Niniejszy dokument stanowi specyfikację domenową i biznesową dla obsługi modelu **Dropshipping** w marketplace **LogiMarket** (`logimarket.eu`).

Sprint **LM-DROP-DOMAIN-56A-R1E** jest etapem wyłącznie analityczno-dokumentacyjnym. W ramach sprintu **nie wprowadzono żadnych zmian** w kodzie źródłowym aplikacji (`src/`), schemacie bazy danych (`/src/lib/schema.ts`), migracjach PostgreSQL ani skryptach.

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
3. **Partner Dropshippingowy (Supplier / Vendor)**: Podmiot zewnętrzny utrzymujący stock, pakujący i wysyłający towar bezpośrednio do Kupującego B2B na zlecenie Operatora.
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

All state names in this section are ILLUSTRATIVE STATE SETS —
SUBJECT TO LOGICAL DATA MODEL REVIEW.

Payment Status states and transitions are additionally
CONDITIONAL_ON_DEC_DROP_21.

The arrows illustrate possible lifecycle relationships and do not
define one mandatory linear payment flow.

```
                          ZDEKOMPONOWANE OSIE STATUSOWE
+-----------------------------------------------------------------------------------+
| 1. Customer Order Status:   draft -> placed -> processing -> completed -> cancelled|
| 2. Payment Status:          pending -> authorized -> captured -> refunded -> failed|
| 3. Supplier Order Status:   draft -> created -> transmitted -> active -> completed -> cancelled|
| 4. Supplier Confirmation Status: not_requested -> pending -> partially_confirmed -> confirmed -> declined -> expired|
| 5. Fulfillment Status:      unfulfilled -> processing -> shipped -> delivered      |
| 6. Shipment Status:         manifested -> in_transit -> delivered -> exception     |
| 7. Cancellation Status:     none -> requested -> approved -> declined              |
| 8. Refund Status:           none -> pending -> partial -> full -> failed            |
| 9. Return Status:           none -> requested -> authorized -> received -> declined|
| 10. Complaint Status:       none -> open -> under_review -> resolved -> declined   |
| 11. Settlement Status:      unsettled -> ready_for_payout -> paid -> disputed     |
+-----------------------------------------------------------------------------------++
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
| Payment Status | pending | PAYMENT_FAILURE | failed | Payment Adapter or Operator — CONDITIONAL_ON_DEC_DROP_21 | CONDITIONAL_ON_DEC_DROP_21 | Log failure | payment_failed | Retry | Order Session | pay_fail_{order_id} | PAYMENT_FAILED | Email to Buyer | View details | Manual override |
| Payment Status | pending | PAYMENT_AUTHORIZATION | authorized | Payment Adapter or Operator — CONDITIONAL_ON_DEC_DROP_21 | CONDITIONAL_ON_DEC_DROP_21 | Reserve funds | auth_failed | Retry | Order Session | pay_auth_{order_id} | PAYMENT_AUTHORIZED | Email to Buyer | View details | Manual override |
| Payment Status | authorized | PAYMENT_CAPTURE | captured | Payment Adapter or Operator — CONDITIONAL_ON_DEC_DROP_21 | CONDITIONAL_ON_DEC_DROP_21 | Capture funds | capture_failed | Retry | Order Session | pay_cap_{order_id} | PAYMENT_CAPTURED | None | View details | Manual override |
| Supplier Order | draft | SUPPLIER_TRANSMISSION | transmitted | Operator LogiMarket | CONDITIONAL_ON_DEC_DROP_21 | Generate spec | transmission_failed | Exponential backoff | Supplier Order | sup_trans_{sup_order_id} | SUPPLIER_ORDER_TRANSMITTED | Email to Supplier | Re-transmit email | Edit items |
| Supplier Confirmation | pending | SUPPLIER_CONFIRMATION | confirmed | Operator LogiMarket | SLA active | Lock buy price | confirmation_failed | Manual check | Supplier Order | sup_conf_{sup_order_id} | SUPPLIER_CONFIRMED | Email to Buyer | Confirm on behalf | Confirm without stock check |
| Supplier Confirmation | pending | PARTIAL_SUPPLIER_CONFIRMATION | partially_confirmed | Operator LogiMarket | SLA active | Lock buy price partial | confirmation_failed | Manual check | Supplier Order | sup_pconf_{sup_order_id} | SUPPLIER_PARTIALLY_CONFIRMED | Email to Buyer | Confirm on behalf | Confirm without stock check |
| Supplier Confirmation | pending | SUPPLIER_DECLINE | declined | Operator LogiMarket | SLA active | Trigger DEC-DROP-15 and DEC-DROP-17 side effect | decline_failed | Manual check | Supplier Order | sup_rej_{sup_order_id} | SUPPLIER_DECLINED | Email to Buyer | Reject on behalf | Reject without reason |
| Cancellation | none | CANCELLATION_BEFORE_SUPPLIER_CONFIRMATION | requested | Operator LogiMarket | Before confirmation | Emit cancellation | cancel_failed | Manual check | Order | cancel_req_{order_id} | CANCELLATION_REQUESTED | Email to Supplier | Cancel | Reject cancellation |
| Cancellation | none | CANCELLATION_AFTER_CONFIRMATION | requested | Operator LogiMarket | After confirmation | Emit cancellation | cancel_failed | Manual check | Order | cancel_req2_{order_id} | CANCELLATION_REQUESTED | Email to Supplier | Cancel | Reject cancellation |
| Cancellation | none | CANCELLATION_AFTER_SHIPMENT | requested | Operator LogiMarket | After shipment | Emit return/recall/complaint | cancel_failed | Manual check | Order | cancel_req3_{order_id} | CANCELLATION_REQUESTED | Email to Supplier | Cancel | Reject cancellation |
| Fulfillment | unfulfilled | FULFILLMENT_START | processing | Operator LogiMarket | Confirmed | Update status | start_failed | Manual check | Supplier Order | ful_start_{sup_order_id} | FULFILLMENT_STARTED | None | Start | Start without confirm |
| Shipment | manifested | SPLIT_SHIPMENT | in_transit | Operator LogiMarket | CONDITIONAL_ON_DEC_DROP_22 | Update tracking | shipment_failed | Manual check | Shipment | ship_split_{shipment_id} | SHIPMENT_SPLIT | None | Add tracking | Split without tracking |
| Shipment | manifested | PARTIAL_SHIPMENT | in_transit | Operator LogiMarket | CONDITIONAL_ON_DEC_DROP_22 | Update tracking | shipment_failed | Manual check | Shipment | ship_part_{shipment_id} | SHIPMENT_PARTIAL | None | Add tracking | Split without tracking |
| Shipment | in_transit | SHIPMENT_EXCEPTION | exception | Carrier | In transit | Log exception | exception_failed | Manual check | Shipment | ship_exc_{shipment_id} | SHIPMENT_EXCEPTION | Alert Operator | View | Ignore exception |
| Shipment | in_transit | DELIVERY | delivered | Carrier | In transit | Update status | delivery_failed | Manual check | Shipment | ship_del_{shipment_id} | SHIPMENT_DELIVERED | Email to Buyer | View | Mark delivered manually |
| Refund | none | REFUND_REQUEST | pending | Operator LogiMarket | CONDITIONAL_ON_DEC_DROP_21_AND_DEC_DROP_12 | Request refund | request_failed | Manual check | Order | ref_req_{order_id} | REFUND_REQUESTED | None | Request | Approve without review |
| Refund | pending | PARTIAL_REFUND | partial | Payment Adapter or Operator — CONDITIONAL_ON_DEC_DROP_21 | CONDITIONAL_ON_DEC_DROP_21_AND_DEC_DROP_12 | Execute refund | refund_failed | Retry | Order | ref_part_{order_id} | REFUND_PARTIAL | Email to Buyer | View | Execute without PSP |
| Refund | pending | FULL_REFUND | full | Payment Adapter or Operator — CONDITIONAL_ON_DEC_DROP_21 | CONDITIONAL_ON_DEC_DROP_21_AND_DEC_DROP_12 | Execute refund | refund_failed | Retry | Order | ref_full_{order_id} | REFUND_FULL | Email to Buyer | View | Execute without PSP |
| Refund | pending | REFUND_FAILURE | failed | Payment Adapter or Operator — CONDITIONAL_ON_DEC_DROP_21 | CONDITIONAL_ON_DEC_DROP_21_AND_DEC_DROP_12 | Log failure | refund_failed | Retry | Order | ref_fail_{order_id} | REFUND_FAILED | Alert Operator | View | Ignore failure |
| Return | none | RETURN_REQUEST | requested | Operator LogiMarket | Delivered | Request return | request_failed | Manual check | Order | ret_req_{order_id} | RETURN_REQUESTED | Email to Supplier | Request | Approve without review |
| Complaint | none | COMPLAINT_OPENING | open | Operator LogiMarket | Delivered | Open complaint | open_failed | Manual check | Order | comp_open_{order_id} | COMPLAINT_OPENED | Email to Supplier | Open | Close without review |
| Complaint | open | COMPLAINT_RESOLUTION | resolved | Operator LogiMarket | Open | Resolve complaint | resolve_failed | Manual check | Order | comp_res_{order_id} | COMPLAINT_RESOLVED | Email to Buyer | Resolve | Reopen without reason |
| Settlement | unsettled | SETTLEMENT_READY | ready_for_payout | Operator LogiMarket | Delivered | Mark ready | ready_failed | Manual check | Supplier Order | set_ready_{sup_order_id} | SETTLEMENT_READY | None | Mark | Mark without delivery |
| Settlement | ready_for_payout | SETTLEMENT_PAID | paid | Operator LogiMarket | Ready | Mark paid | paid_failed | Manual check | Supplier Order | set_paid_{sup_order_id} | SETTLEMENT_PAID | Email to Supplier | Mark | Mark without proof |
| Settlement | ready_for_payout | SETTLEMENT_DISPUTED | disputed | Operator LogiMarket | Ready | Mark disputed | dispute_failed | Manual check | Supplier Order | set_disp_{sup_order_id} | SETTLEMENT_DISPUTED | Email to Supplier | Mark | Resolve without proof |
| Any Applicable Axis | current_state | DUPLICATE_EVENT | current_state | System | external_event_id or operation_id already processed | no domain mutation; record duplicate observation | audit write failure | no domain retry | External Event or Operation | external_event_id or operation_id | DUPLICATE_EVENT_IGNORED | None | View audit record | Replay without explicit recovery procedure |
| Any Applicable Axis | current_state | OUT_OF_ORDER_EVENT | current_state | System | incoming event version is not the expected next version | queue for reconciliation or reject without domain mutation | None | Queue | Aggregate Event Stream | aggregate_id:event_version | OUT_OF_ORDER_EVENT_DETECTED | None | None | None |
| Any Applicable Axis | validated_current_state | MANUAL_OPERATOR_CORRECTION | validated_target_state | Operator LogiMarket | actor identity present; reason present; target transition allowed by correction policy; before snapshot captured | validated domain mutation; after snapshot captured; immutable audit event | correction_failed | Manual check | Manual Correction Operation | correction_operation_id | MANUAL_OPERATOR_CORRECTION_APPLIED | Alert Admin | Correct | Correct without validation |

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

Encja domenowa `shipments` reprezentuje przesyłkę kurierską/paletową (*ILLUSTRATIVE NAME — SUBJECT TO DATA MODEL REVIEW*).
> **Ścieżka `/go/[id]`** jest wyłącznie mechanizmem śledzenia kliknięć w oferty typu *Outbound* i pod żadnym pozorem nie może być wykorzystywana do śledzenia przesyłek kurierskich!

---

## 10. TARGET FINANCIAL MODEL (MODEL A)

> **UWAGA CRITICAL:** During R2A, Model A was an architectural recommendation. During R2B, Piotr Fiszer selected Model A as Business Owner. This is a business-direction approval, not formal external validation. Formal legal, tax, accounting and PSP evidence is still pending. Models B and C are not selected for the dropshipping MVP.

### Status History
* R2A_HISTORICAL_STATUS=ARCHITECTURAL_RECOMMENDATION
* R2B_BUSINESS_OWNER_STATUS=MODEL_A_SELECTED
* EXTERNAL_LEGAL_VALIDATION=PENDING_FORMAL_EVIDENCE
* EXTERNAL_TAX_VALIDATION=PENDING_FORMAL_EVIDENCE
* ACCOUNTING_VALIDATION=PENDING_FORMAL_EVIDENCE
* PSP_VALIDATION=PENDING_FORMAL_EVIDENCE

### Required Invariants
* BUSINESS_MODEL=MODEL_A_BUY_SELL_BACK_TO_BACK
* MERCHANT_OF_RECORD=LOGIMARKET
* SELLER_OF_RECORD=LOGIMARKET
* CUSTOMER_CONTRACTUAL_SELLER=LOGIMARKET
* CUSTOMER_INVOICE_ISSUER=LOGIMARKET
* SUPPLIER_INVOICE_RECIPIENT=LOGIMARKET
* REVENUE_MODEL=TRADING_MARGIN
* MVP_PAYMENT_SCOPE: ONLINE_IMMEDIATE_CAPTURE, PROFORMA_PREPAYMENT
* INTERNAL_TRADE_CREDIT=OUT_OF_SCOPE_FOR_DROPSHIPPING_MVP
* EXTERNAL_B2B_FINANCING=POST_MVP
* FUTURE_SCOPE=LM-DROP-CREDIT-57C
* PROVIDER_SELECTED=NO

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

### KSeF Logical Requirement List
* KSEF_INVOICE_ID
* KSEF_REFERENCE_NUMBER
* KSEF_STATUS
* KSEF_SUBMISSION_MODE
* KSEF_SUBMITTED_AT
* KSEF_ACCEPTED_AT
* KSEF_REJECTED_AT
* KSEF_ERROR_CODE
* KSEF_ERROR_MESSAGE
* KSEF_INVOICE_VERSION
* INVOICE_CORRECTION_RELATION
* CORRECTED_INVOICE_ID
* KSEF_OFFLINE_OR_FAILURE_MODE
* KSEF_QR_OR_VERIFICATION_REFERENCE
* INVOICE_ISSUER_SNAPSHOT
* CUSTOMER_TAX_ID_SNAPSHOT
* SUPPLIER_TAX_ID_SNAPSHOT

### Data Retention
* RETENTION_POLICY=MATRIX_BY_DATA_CATEGORY

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
6. **Zabezpieczenia Webhooków**: Weryfikacja podpisu webhooka zgodnie z mechanizmem wybranego dostawcy, kontrola timestampu i ochrona przed replay.

---

## 13. FUTURE B2B CAPABILITY BOUNDARIES — NOT APPROVED FOR IMPLEMENTATION

> **ZASADA BRAKU SCOPE CREEP:** Poniższe 5 domen stanowią przyszłe wymogi dla dojrzałego marketplace B2B. Zostały sklasyfikowane i powiązane z architekturą, ale **NIE SĄ ZATWIERDZONE DO IMPLEMENTACJI** w sprincie dropshipping MVP i nie dodają żadnych pól/tabel do schematu bazy danych.

---

### CAP-B2B-ACCOUNT-01 — Corporate B2B Accounts & Purchase Approvals
* **BUSINESS_PROBLEM**: Kupujący B2B to organizacje wieloosobowe, w których proces zakupowy wymaga podziału ról (Buyer, Approver, Finance, Admin), limitów zakupowych oraz podawania numeru zamówienia klienta (*Customer PO Number*).
* **DOMAIN_BOUNDARY**: Zarządzanie strukturą firmy kupującej, profilami członków, adresami dostaw i fakturowania oraz akceptacjami.
* **RELATION_TO_DROPSHIPPING**: Dropshipping realizuje wysyłkę na adres końcowy wskazany w zamówieniu firmowym.
* **CURRENT_REPOSITORY_SUPPORT**: Brak (`orders` przechowywane są per `sessionHash` bez kont użytkowników).
* **MVP_RELEVANCE**: Niska (w MVP dane firmy wprowadzane są jednorazowo w checkout).
* **FUTURE_RELEVANCE**: Pełne konta organizacyjne i approval workflow pozostają post-MVP.
* **BLOCKING_DECISIONS**: Decyzja o wdrożeniu systemu kont i IAM dla Kupujących.
* **LEGAL_DEPENDENCIES**: Regulamin kont firmowych B2B i odpowiedzialność reprezentantów.
* **SECURITY_DEPENDENCIES**: Multi-tenant data isolation, RBAC po stronie kupującego.
* **PROPOSED_FUTURE_SPRINT**: `LM-B2B-ACCOUNT-58A — CORPORATE ACCOUNTS AND PURCHASE APPROVAL DOMAIN`.

### SKŁADOWE KONT KORPORACYJNYCH (ROZDZIAŁ MVP VS POST-MVP):
* **CUSTOMER_PO_NUMBER**:
  * **CAPABILITY_STATUS**: `OPEN_BUSINESS_DECISION`
  * **MVP_SCOPE_CLASSIFICATION**: `MVP_OPTIONAL`
  * **DECISION_DEPENDENCY**: `DEC-DROP-23`
* **CORPORATE_ACCOUNT_HIERARCHY**:
  * **CAPABILITY_STATUS**: `FUTURE_REQUIRED`
  * **MVP_SCOPE_CLASSIFICATION**: `POST_MVP`
  * **DECISION_DEPENDENCY**: `NULL`
* **PURCHASE_APPROVAL_WORKFLOW**:
  * **CAPABILITY_STATUS**: `FUTURE_REQUIRED`
  * **MVP_SCOPE_CLASSIFICATION**: `POST_MVP`
  * **DECISION_DEPENDENCY**: `NULL`

---

### CAP-B2B-FREIGHT-02 — Heavy Freight and Deferred Freight Quote
* **BUSINESS_PROBLEM**: Towary gabarytowe, paletowe oraz przemysłowe (np. regały wysokiego składowania, antresole, wózki) posiadają skomplikowane koszty transportu zależne od wagi, objętości, kodów pocztowych, rozładunku HDS/dźwigiem, rampy lub wyładowania wózkiem widłowym. Standardowa stawka kurierska nie pokrywa tych wymogów.
* **DOMAIN_BOUNDARY**: Silnik wyceny transportu ciężkiego (Freight Engine), kalkulacja LTL/FTL oraz wycena odroczona (*Deferred Freight Quote*).
* **RELATION_TO_DROPSHIPPING**: Dostawca dropshippingowy często realizuje wysyłkę dedykowanym transportem własnym lub siecią paletową.
* **CURRENT_REPOSITORY_SUPPORT**: Brak (koszyk nie wylicza kosztów transportu ciężkiego).
* **MVP_RELEVANCE**: Zależy od DEC-DROP-22. Nie jest automatycznie post-MVP. Oferta `offerModel=ecommerce` może wymagać ręcznego potwierdzenia transportu bez stawania się ofertą `rfq`.
* **FUTURE_RELEVANCE**: Wysoka dla kategorii urządzeń magazynowych i wielkogabarytowych.
* **BLOCKING_DECISIONS**: Wybór modelu kalkulacji kosztów transportu (fixed vs rule-based vs deferred quote).
* **LEGAL_DEPENDENCIES**: Warunki dostawy Incoterms / prawo przewozowe B2B.
* **SECURITY_DEPENDENCIES**: Autoryzacja aktualizacji kosztu zamówienia przed pobraniem płatności.
* **PROPOSED_FUTURE_SPRINT**: `LM-DROP-FREIGHT-57B — HEAVY FREIGHT QUOTATION AND DELIVERY TERMS`.
* **CAPABILITY_STATUS**: `OPEN_BUSINESS_DECISION`
* **DECISION_DEPENDENCY**: DEC-DROP-22

### Freight Invariants
* MVP_FREIGHT_SCOPE=PARCEL_AND_PALLET
* PARCEL: MVP_SCOPE_CLASSIFICATION=MVP_SELECTED
* PALLET: MVP_SCOPE_CLASSIFICATION=MVP_SELECTED
* MANUAL_FREIGHT_ECOMMERCE: MVP_SCOPE_CLASSIFICATION=NOT_SELECTED_FOR_ECOMMERCE_MVP
* DEFERRED_FREIGHT_ECOMMERCE: MVP_SCOPE_CLASSIFICATION=NOT_SELECTED_FOR_ECOMMERCE_MVP
* OFFER_MODEL_IMPACT=NO_AUTOMATIC_OFFER_MODEL_CHANGE

- Parcel and pallet are supported ecommerce MVP freight modes.
- Manual freight ecommerce is not selected for MVP.
- Deferred freight ecommerce is not selected for MVP.
- Freight eligibility must never automatically change offerModel.
- Oversized or project offers may remain offerModel=rfq.
- An ecommerce offer must not automatically become RFQ because of freight eligibility.

---

### CAP-B2B-CREDIT-03 — Trade Credit and Deferred Payment Domain
* **BUSINESS_PROBLEM**: Transakcje B2B często wymagają płatności odroczonej (np. 14, 30 dni), faktury proforma lub limitu kupieckiego (*Trade Credit*), a nie płatności natychmiastowej kartą/przelewem.
* **DOMAIN_BOUNDARY**: Ocena ryzyka kredytowego, limit kupiecki, weryfikacja ubezpieczyciela, zarządzanie terminami płatności.
* **RELATION_TO_DROPSHIPPING**: Wyznacza moment realizacji zamówienia przez dostawcę przed lub po otrzymaniu wpłaty od kupującego.
* **CURRENT_REPOSITORY_SUPPORT**: Brak.
* **MVP_RELEVANCE**: Zależy od DEC-DROP-21.
* **FUTURE_RELEVANCE**: Wysoka dla zwiększenia wolumenu wartościowych zamówień B2B.
* **BLOCKING_DECISIONS**: `DEC-DROP-01`, `DEC-DROP-04` oraz wybór partnera finansowania B2B (Faktoring / Kredyt kupiecki).
* **LEGAL_DEPENDENCIES**: Umowa ramowa kredytu kupieckiego, cesja wierzytelności.
* **SECURITY_DEPENDENCIES**: Zabezpieczenie przed wyłudzeniami i nadużyciem limitu.
* **PROPOSED_FUTURE_SPRINT**: `LM-DROP-CREDIT-57C — B2B TRADE CREDIT AND DEFERRED PAYMENT DOMAIN`.
* **CAPABILITY_STATUS**: `LEGAL_REVIEW_REQUIRED`
* **DECISION_DEPENDENCY**: DEC-DROP-21

### Credit and Financing Invariants
* INTERNAL_TRADE_CREDIT: MVP_SCOPE_CLASSIFICATION=OUT_OF_SCOPE_FOR_DROPSHIPPING_MVP
* EXTERNAL_B2B_FINANCING: MVP_SCOPE_CLASSIFICATION=POST_MVP
* FUTURE_SCOPE=LM-DROP-CREDIT-57C
* PROVIDER_SELECTED=NO

- internal deferred payment is not part of the dropshipping MVP;
- no internal customer credit ledger is designed in the MVP;
- external financing remains future scope;
- no financing provider has been selected;
- LEG-GATE-12 and LEG-GATE-13 must not block documentation-only 56B0;
- schema and production implementation for financing remain outside the current sprint.

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
* **CAPABILITY_STATUS**: `PARTIALLY_SUPPORTED`
* **MVP_SCOPE_CLASSIFICATION**: `POST_MVP`

---

### CAP-DROP-SLA-05 — Supplier Performance and SLA Engine
* **BUSINESS_PROBLEM**: Jakość dropshippingu zależy od terminowości dostawców (czas potwierdzenia SLA, czas wysyłki, wskaźnik odrzuceń, wskaźnik uszkodzeń w transporcie).
* **DOMAIN_BOUNDARY**: Gromadzenie zdarzeń operacyjnych, wyliczanie metryk SLA, wskaźników jakości oraz ewentualnego wpływu na ranking ofert.
* **RELATION_TO_DROPSHIPPING**: Umożliwia Operatorowi ocenę i moderację partnerów dropshippingowych.
* **CURRENT_REPOSITORY_SUPPORT**: Brak.
* **MVP_RELEVANCE**: Raw event capture = MVP_REQUIRED. Calculated metrics = POST_MVP. Automatic score = POST_MVP. Ranking influence = osobna decyzja i LEG-GATE-14.
* **FUTURE_RELEVANCE**: Wysoka dla automatyzacji nadzoru nad jakością dostawców.
* **BLOCKING_DECISIONS**: Zasady transparentności rankingu i wyliczania ocen dostawców.
* **LEGAL_DEPENDENCIES**: Zgodność z rozporządzeniem P2B (Platform-to-Business) dotyczącym kryteriów plasowania ofert.
* **SECURITY_DEPENDENCIES**: Nieedytowalność zdarzeń źródłowych, kontrola dostępu do korekt ręcznych.
### SKŁADOWE SLA (ROZDZIAŁ MVP VS POST-MVP):
* **RAW_EVENT_CAPTURE**:
  * **CAPABILITY_STATUS**: `FUTURE_REQUIRED`
  * **MVP_SCOPE_CLASSIFICATION**: `MVP_REQUIRED`
* **DERIVED_METRICS**:
  * **CAPABILITY_STATUS**: `FUTURE_OPTIONAL`
  * **MVP_SCOPE_CLASSIFICATION**: `POST_MVP`
* **AUTOMATIC_SCORE**:
  * **CAPABILITY_STATUS**: `FUTURE_OPTIONAL`
  * **MVP_SCOPE_CLASSIFICATION**: `POST_MVP`
* **RANKING_INFLUENCE**:
  * **CAPABILITY_STATUS**: `LEGAL_REVIEW_REQUIRED`
  * **MVP_SCOPE_CLASSIFICATION**: `POST_MVP`
  * **LEGAL_GATE**: `LEG-GATE-14`

---

## 14. R2B BUSINESS DECISION OVERLAY
* MVP_MODEL_SELECTION: MODEL A (Resale / Trading Margin)
* EXCLUDED_MODELS: MODEL B, MODEL C
* MERCHANT_OF_RECORD: LOGIMARKET
* SELLER_OF_RECORD: LOGIMARKET
* ACCOUNTING_MODEL: BUY_SELL_BACK_TO_BACK
* CUSTOMER_INVOICING: LOGIMARKET_ISSUES_CUSTOMER_INVOICE
* SUPPLIER_INVOICING: SUPPLIER_ISSUES_WHOLESALE_INVOICE_TO_LOGIMARKET
* PAYMENT_FLOW: PAYMENT_TO_LOGIMARKET_OPERATING_OR_PSP_SETTLEMENT_ACCOUNT
* CANCELLATION_CAPABILITY: SUPPORTED_AFTER_CAPTURE
* MULTI_PARTNER_CART: SUPPORTED_IN_MVP
* SUPPORTED_PAYMENT_METHODS: ONLINE_IMMEDIATE_CAPTURE, PROFORMA_PREPAYMENT
* INTERNAL_TRADE_CREDIT: EXCLUDED_FROM_MVP
* SUPPORTED_FREIGHT_METHODS: PARCEL, PALLET
* KSEF_SUPPORT: FUTURE_LOGICAL_REQUIREMENT
* RECORD_RETENTION: CATEGORY_SPECIFIC_RETENTION_REQUIRED
* EXTERNAL_VALIDATION_STATUS: PENDING_LEGAL_TAX_AND_PSP_REVIEW

*Koniec dokumentu domenowego.*
