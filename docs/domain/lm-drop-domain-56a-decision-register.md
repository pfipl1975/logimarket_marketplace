# LOGIMARKET — REJESTR DECYZJI BIZNESOWYCH I PRAWNYCH DROPSHIPPINGU (LM-DROP-DOMAIN-56A-R1F)

**Wersja:** 1.2.2
**Data:** 2026-07-22
**Status:** READY FOR FINAL DOMAIN REVIEW
**Moduł:** Decision Register for Dropshipping Architecture

> **[R3 SUPERSESSION NOTICE]**
> This R2B document is historically preserved. Its designation of LogiMarket as the global Seller of Record and default selection of Model A (Resale) have been **SUPERSEDED** by `lm-marketplace-domain-56a-r3-business-approval-and-validation-record.md`.
> Model A is retained only as a future, offer-specific reseller channel (`active_in_initial_mvp=NO`).
> The canonical MVP architecture is now **Hybrid Intermediary-First**.


---

## 1. R2B BUSINESS APPROVAL STATUS
- **BUSINESS_APPROVAL_STATUS**: Applied per decision.
- **EXTERNAL_VALIDATION_STATUS**: PENDING_FORMAL_EVIDENCE for all legal/tax gates.
- **IMPLEMENTATION_READINESS**: READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY or BLOCKED_FOR_SCHEMA.
- **EVIDENCE_STATUS**: PENDING.
- **SCHEMA_READINESS**: NOT READY.

## Original 1. STRUKTURA DECYZYJNA I ZASADY STATUSOWANIA

Niniejszy rejestr zawiera pełne zestawienie kluczowych decyzji handlowych, prawnych i podatkowych związanych z wdrożeniem dropshippingu w LogiMarket.

### Zasady Normatywne Statusów:
1. **Wzajemna Rozłączność Statusów Głównych**: Każda decyzja posiada **dokładnie jeden** podstawowy status wybrany z podanej niżej listy.
2. **`RECOMMENDED_OPTION != DECIDED`**: Rekomendacja architektoniczna nie stanowi decyzji zatwierdzonej. Jeżeli status jest inny niż `DECIDED`, wariant nie może być opisany jako obowiązujący ani zatwierdzony.
3. **Wpisy `DECIDED` wymagają Dowodu**: Status `DECIDED` może być przyznany wyłącznie wtedy, gdy podano pola: `APPROVED_BY`, `APPROVED_AT` oraz `APPROVAL_SOURCE`. Brak dowodu wymaga nadania statusu `RECOMMENDED` lub `OPEN`.
4. **Wskaźnik Blokowania (`BLOCKS_IMPLEMENTATION`)**: Zaznaczenie `BLOCKS_IMPLEMENTATION = YES` oznacza, że rekomendacja **nie unieważnia** blokady implementacyjnej do czasu ostatecznego zatwierdzenia.

### Dozwolone Statusy Główne:
* `DECIDED`: Decyzja ostatecznie zatwierdzona z udokumentowanym dowodem zatwierdzenia.
* `RECOMMENDED`: Propozycja architektoniczna przedłożona do akceptacji biznesowo-prawnej.
* `OPEN`: Decyzja otwarta, wymagająca doprecyzowania parametrów operacyjnych.
* `OPEN_BLOCKING_BUSINESS_DECISION`: Kluczowa decyzja biznesowa blokująca implementację schematu bazy danych i checkoutu.
* `LEGAL_REVIEW_REQUIRED`: Kwestia wymagająca szczegółowej analizy prawnej, podatkowej lub regulaminowej.
* `OUT_OF_SCOPE`: Element wyłączony z zakresu MVP.

---

## 2. AUTOMATYCZNIE WERYFIKOWALNA TABELA ZBIORCZA DECYZJI

| DECISION_ID | SUBJECT | STATUS | BLOCKS_IMPLEMENTATION | AFFECTED_SPRINTS | BLOCKED_SPRINTS | OWNER | APPROVED_BY | APPROVED_AT | APPROVAL_SOURCE |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-01` | Merchant of Record (MoR) | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | Business Owner / CFO | NULL | NULL | NULL |
| `DEC-DROP-02` | Seller of Record (SoR) | `LEGAL_REVIEW_REQUIRED` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3` | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3` | Legal Counsel / CFO | NULL | NULL | NULL |
| `DEC-DROP-03` | Podmiot Wystawiający Fakturę | `RECOMMENDED` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3` | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3` | Finance / Legal | NULL | NULL | NULL |
| `DEC-DROP-04` | Podmiot Pobierający Płatność | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | CFO | NULL | NULL | NULL |
| `DEC-DROP-05` | Własność Środków przed Payoutem | `LEGAL_REVIEW_REQUIRED` | NO | `LM-DROP-SCHEMA-56B3` | | CFO / Legal | NULL | NULL | NULL |
| `DEC-DROP-06` | Model Wynagrodzenia (Prowizja/Marża)| `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B3` | | Head of Sales / CFO | NULL | NULL | NULL |
| `DEC-DROP-07` | Moment Naliczenia Prowizji | `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B3` | | CFO | NULL | NULL | NULL |
| `DEC-DROP-08` | Częstotliwość Settlementów | `OPEN` | NO | `LM-DROP-SCHEMA-56B3` | | Operations / Finance | NULL | NULL | NULL |
| `DEC-DROP-09` | Odpowiedzialność za Błędną Cenę | `LEGAL_REVIEW_REQUIRED` | NO | `LM-DROP-SCHEMA-56B4, LM-DROP-RETURNS-56G` | | Legal Counsel | NULL | NULL | NULL |
| `DEC-DROP-10` | Brak Stanu (Overselling) | `RECOMMENDED` | NO | `LM-DROP-SUPPLIER-56D` | | Operations Manager | NULL | NULL | NULL |
| `DEC-DROP-11` | Uszkodzenie w Transporcie | `LEGAL_REVIEW_REQUIRED` | NO | `LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F` | | Operations / Legal | NULL | NULL | NULL |
| `DEC-DROP-12` | Podmiot Obsługujący Refund | `RECOMMENDED` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-SCHEMA-56B4` | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-SCHEMA-56B4` | Finance / Support | NULL | NULL | NULL |
| `DEC-DROP-13` | Zgłoszenia Reklamacyjne | `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B4, LM-DROP-RETURNS-56G` | | Support Lead | NULL | NULL | NULL |
| `DEC-DROP-14` | Adres i Koszt Zwrotu Towaru | `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B4, LM-DROP-RETURNS-56G` | | Operations Lead | NULL | NULL | NULL |
| `DEC-DROP-15` | Częściowa Realizacja Zamówienia | `OPEN` | NO | `LM-DROP-ORDER-56C, LM-DROP-SUPPLIER-56D` | | Operations | NULL | NULL | NULL |
| `DEC-DROP-16` | Split Shipment (Wielopaczkowość)| `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F` | | Domain Architect | NULL | NULL | NULL |
| `DEC-DROP-17` | Multi-Partner Order w Koszyku | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-ORDER-56C` | `LM-DROP-DATA-MODEL-56B0, LM-DROP-ORDER-56C` | Product Manager | NULL | NULL | NULL |
| `DEC-DROP-18` | VAT i Fakturowanie Transgraniczne| `RECOMMENDED` | NO | `LM-DROP-SCHEMA-56B3` | | Finance / Tax Advisor | NULL | NULL | NULL |
| `DEC-DROP-19` | Kraje Dostawy w MVP | `RECOMMENDED` | NO | `LM-DROP-ORDER-56C` | | Operations | NULL | NULL | NULL |
| `DEC-DROP-20` | Waluta i Język Dokumentów | `RECOMMENDED` | NO | `LM-DROP-ORDER-56C` | | Product Manager | NULL | NULL | NULL |
| `DEC-DROP-21` | MVP PAYMENT METHODS AND PAYMENT TIMING | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E` | Finance | NULL | NULL | NULL |
| `DEC-DROP-22` | MVP SHIPPING AND FREIGHT SCOPE | `OPEN_BLOCKING_BUSINESS_DECISION` | YES | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F` | `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F` | Operations | NULL | NULL | NULL |
| `DEC-DROP-23` | CUSTOMER PO NUMBER IN MVP ORDER CORE | `OPEN` | NO | `LM-DROP-ORDER-56C` | | Product Manager | NULL | NULL | NULL |

---

## 3. SZCZEGÓŁOWY REJESTR DECYZJI (DECISION REGISTER DETAILS)

### DECISION_ID: DEC-DROP-01 — Merchant of Record (MoR)
* **QUESTION**: Kto występuje jako podmiot rozliczający płatność bezgotówkową kupującego i zarejestrowany na bramce płatności?
* **OPTIONS**:
  1. LogiMarket Sp. z o.o. (Merchant of Record).
  2. Partner Dropshippingowy (Direct Seller/Merchant).
  3. Model hybrydowy / Managed PSP split.
* **RECOMMENDED_OPTION**: Option 1 (LogiMarket jako MoR).
* **RATIONALE**: Jednolity proces płatności dla Kupującego B2B, brak konieczności rejestracji kont płatniczych dostawców.
* **RISKS**: Odpowiedzialność za zwroty płatności (chargebacki) i ryzyko finansowe przy braku realizacji przez dostawcę.
* **OWNER**: Business Owner / CFO LogiMarket.
* **STATUS**: `OPEN_BLOCKING_BUSINESS_DECISION`
* **BLOCKS_IMPLEMENTATION**: YES (Blokuje model płatności i bazę danych).

---

### DECISION_ID: DEC-DROP-02 — Seller of Record (SoR)
* **QUESTION**: Kto formalnie sprzedaje towar Kupującemu B2B na gruncie prawa handlowego?
* **OPTIONS**:
  1. LogiMarket (Model odsprzedaży: kupuje od dostawcy, sprzedaje kupującemu).
  2. Partner Dropshippingowy (Model agencyjny: sprzedaje bezpośrednio kupującemu, LogiMarket jest pośrednikiem).
* **RECOMMENDED_OPTION**: Option 1 (LogiMarket jako sprzedawca w modelu odsprzedaży).
* **RATIONALE**: Pojedynczy dokument sprzedaży dla kupującego B2B za całe zamówienie na LogiMarket.
* **RISKS**: Wymóg prowadzenia księgowości towarowej, rozliczanie VAT i gwarancje rękojmi B2B.
* **OWNER**: Legal Counsel / CFO.
* **STATUS**: `LEGAL_REVIEW_REQUIRED`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-03 — Podmiot Wystawiający Fakturę Kupującemu
* **QUESTION**: Kto i w jakim trybie wystawia fakturę VAT/proforma dla Kupującego B2B?
* **OPTIONS**:
  1. LogiMarket wystawia fakturę VAT dla kupującego.
  2. Partner Dropshippingowy wystawia fakturę bezpośrednio kupującemu.
* **RECOMMENDED_OPTION**: Option 1 (LogiMarket wystawia fakturę VAT kupującemu).
* **RATIONALE**: Zgodne z rekomendacją SoR i oczekiwaniem jednego dokumentu przez kupującego B2B.
* **RISKS**: Obowiązek integracji z KSeF / systemem fakturowania LogiMarket.
* **OWNER**: Finance & Accounting / Legal.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-04 — Podmiot Pobierający Płatność
* **QUESTION**: Na czyje konto trafiają środki wpłacane przez kupującego na bramce płatności?
* **OPTIONS**:
  1. Konto operacyjne LogiMarket Sp. z o.o.
  2. Sub-konto dostawcy w wybranym PSP.
* **RECOMMENDED_OPTION**: Option 1 (LogiMarket pobiera płatność na własne konto operacyjne).
* **RATIONALE**: Zgodne z rekomendowanym, lecz niezatwierdzonym wariantem, w którym LogiMarket pełni funkcję Merchant of Record.
* **RISKS**: Wymagany kapitał obrotowy oraz precyzyjny mechanizm settlementów.
* **OWNER**: CFO.
* **STATUS**: `OPEN_BLOCKING_BUSINESS_DECISION`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-05 — Własność Środków przed Rozliczeniem Partnera
* **QUESTION**: Jaki jest status prawny wpłaconych środków na koncie LogiMarket do momentu realizacji dostawy przez partnera?
* **OPTIONS**:
  1. Środki stanowią przychód LogiMarket, a należność dla partnera jest zobowiązaniem handlowym.
  2. Środki są depozytem do czasu potwierdzenia wydania przesyłki.
* **RECOMMENDED_OPTION**: Option 1.
* **RATIONALE**: Standardowy model handlowy przy odprzedaży towaru.
* **RISKS**: Wymaga zachowania płynności na ewentualne refundacje.
* **OWNER**: CFO / Legal.
* **STATUS**: `LEGAL_REVIEW_REQUIRED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-06 — Model Wynagrodzenia (Prowizja vs Marża)
* **QUESTION**: W jaki sposób wyliczane jest wynagrodzenie LogiMarket?
* **OPTIONS**:
  1. Marża handlowa (Sell Price = Buy Price + Marża %).
  2. Prowizja procentowa od ceny sprzedaży brutto/netto.
  3. Opłata kwotowa za zamówienie (Fixed fee).
* **RECOMMENDED_OPTION**: Option 2 przy pośrednictwie / Option 1 przy odsprzedaży.
* **RATIONALE**: Zależne od ostatecznego wyboru SoR/MoR.
* **RISKS**: Parametryzacja stawek w Admin MVP.
* **OWNER**: Head of Sales / CFO.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-07 — Moment Naliczenia Wynagrodzenia
* **QUESTION**: Kiedy wynagrodzenie LogiMarket staje się definitywnie należne?
* **OPTIONS**:
  1. Z chwilą opłacenia zamówienia.
  2. Z chwilą wysłania towaru (`shipped`).
  3. Po upływie okresu na reklamację (np. 14 dni od `delivered`).
* **RECOMMENDED_OPTION**: Option 2 (W momencie nadania przesyłki `shipped`).
* **RATIONALE**: Gwarantuje wykonanie usługi wysyłki przez dostawcę.
* **RISKS**: Konieczność korekty finansowej w przypadku zwrotu po wysyłce.
* **OWNER**: CFO.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-08 — Częstotliwość Settlementów (Wypłat dla Partnerów)
* **QUESTION**: Jak często LogiMarket przelewa środki należne dostawcom?
* **OPTIONS**:
  1. Raz w tygodniu.
  2. Dwa razy w miesiącu (1. i 15. dnia).
  3. Raz w miesiącu na podstawie faktury dostawcy.
* **RECOMMENDED_OPTION**: Option 2 lub 3.
* **RATIONALE**: Optymalizacja nakładu księgowego w MVP.
* **RISKS**: Oczekiwanie krótszych terminów przez dostawców.
* **OWNER**: Operations Lead / Finance.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-09 — Odpowiedzialność za Błędną Cenę lub Błąd Systemowy
* **QUESTION**: Kto ponosi koszty w przypadku błędnej ceny w katalogu?
* **OPTIONS**:
  1. Partner, jeśli dostarczył błędne dane.
  2. LogiMarket, jeśli błąd nastąpił podczas wprowadzania danych.
  3. Prawo do anulowania zamówienia B2B z powodu błędu (KC).
* **RECOMMENDED_OPTION**: Zapis umowny oraz regulaminowy o prawie anulowania z powodu błędu cenowego.
* **RATIONALE**: Ochrona stron przed rażącymi stratami.
* **RISKS**: Niezadowolenie kupującego.
* **OWNER**: Legal Counsel.
* **STATUS**: `LEGAL_REVIEW_REQUIRED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-10 — Odpowiedzialność za Brak Stanu Magazynowego (Overselling)
* **QUESTION**: Jakie konsekwencje ponosi partner przy odrzuceniu zamówienia z braku towaru?
* **OPTIONS**:
  1. Bezwarunkowe anulowanie i auto-refund bez kar w MVP.
  2. Karta opłata operacyjna potrącana z settlementu.
  3. Obniżenie scoringu i ostrzeżenie w panelu.
* **RECOMMENDED_OPTION**: Option 1 w MVP + Option 3.
* **RATIONALE**: Unikanie zniechęcania pierwszych dostawców karami finansowymi w MVP.
* **RISKS**: Utrata reputacji przy częstych odmowach.
* **OWNER**: Operations Manager.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-11 — Odpowiedzialność za Uszkodzenie w Transporcie
* **QUESTION**: Kto rozpatruje i ponosi koszt uszkodzeń przesyłki w przewozie?
* **OPTIONS**:
  1. Partner Dropshippingowy (zamawia kuriera i odpowiada za pakowanie/ubezpieczenie).
  2. LogiMarket.
* **RECOMMENDED_OPTION**: Option 1 (Partner odpowiada za pakowanie i relację z przewoźnikiem).
* **RATIONALE**: Dostawca przekazuje paczkę kurierowi ze swojego magazynu.
* **RISKS**: Konieczność sprawnego przekazywania protokołów szkody przez kupującego.
* **OWNER**: Operations / Legal.
* **STATUS**: `LEGAL_REVIEW_REQUIRED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-12 — Podmiot Obsługujący i Wykonujący Refund
* **QUESTION**: Jak realizowany jest finansowy zwrot środków do Kupującego B2B?
* **OPTIONS**:
  1. Wyłącznie centralnie przez Operatora LogiMarket w Admin MVP / PSP.
  2. Bezpośrednio przez partnera.
* **RECOMMENDED_OPTION**: Option 1 (Wyłącznie centralnie przez LogiMarket).
* **RATIONALE**: Ochrona danych bankowych i spójność audytowa.
* **RISKS**: Wymaga obsługi wniosków w panelu admina.
* **OWNER**: Finance / Customer Service.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-13 — Podmiot Przyjmujący Zgłoszenia Reklamacyjne
* **QUESTION**: Gdzie kupujący B2B zgłasza wady i reklamacje?
* **OPTIONS**:
  1. Do Biura Obsługi Klienta LogiMarket.
  2. Bezpośrednio do Partnera.
* **RECOMMENDED_OPTION**: Option 1 (Obsługa przez LogiMarket).
* **RATIONALE**: Jednolity standard marki LogiMarket.
* **RISKS**: Obciążenie BOK.
* **OWNER**: Support Lead.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-14 — Adres i Koszt Zwrotu Towaru
* **QUESTION**: Dokąd odsyłany jest towar i kto płaci za przesyłkę zwrotną?
* **OPTIONS**:
  1. Odsyłka bezpośrednio na magazyn Partnera; koszt ponosi strona winna.
  2. Odsyłka do LogiMarket.
* **RECOMMENDED_OPTION**: Option 1 (Odsyłka bezpośrednio do Partnera).
* **RATIONALE**: Brak magazynu fizycznego LogiMarket dla zwrotów dropshippingowych.
* **RISKS**: Wymóg dostarczenia etykiety/adresu dostawcy.
* **OWNER**: Operations Lead.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-15 — Zasady Częściowej Realizacji Zamówienia
* **QUESTION**: Co dzieje się, gdy partner posiada tylko część zamawianej ilości?
* **OPTIONS**:
  1. Zgoda na częściową realizację za akceptacją Kupującego i refund różnicy.
  2. Bezwarunkowe anulowanie (All-or-Nothing).
* **RECOMMENDED_OPTION**: Option 1 za zgodą Kupującego.
* **RATIONALE**: Elastyczność w B2B.
* **RISKS**: Złożoność statusów pozycji zamówienia.
* **OWNER**: Operations.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-16 — Split Shipment (Wielopaczkowość)
* **QUESTION**: Czy zamówienie dostawcy może posiadać wiele przesyłek/listów przewozowych?
* **OPTIONS**:
  1. TAK — encja `shipments` wspiera relację 1-to-many z sub-zamówieniem.
  2. NIE — dokładnie jeden list przewozowy per sub-zamówienie.
* **RECOMMENDED_OPTION**: Option 1 (Wsparcie dla wielu przesyłek).
* **RATIONALE**: Towary przemysłowe wymagają wysyłek mieszanych (paleta + karton).
* **RISKS**: Wyświetlanie wielu linków trackingowych.
* **OWNER**: Domain Architect.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-17 — Zamówienie z Produktami Wielu Partnerów
* **QUESTION**: Czy kupujący może złożyć jedno zamówienie łączące produkty od różnych dostawców?
* **OPTIONS**:
  1. TAK — automatyczny podział na sub-zamówienia dostawców (`supplier_orders`).
  2. NIE — blokada koszyka do jednego dostawcy.
* **RECOMMENDED_OPTION**: Option 1 (Podział na sub-zamówienia w tle).
* **RATIONALE**: Kluczowy wymóg skalowalności marketplace B2B.
* **RISKS**: Oddzielne koszty dostawy naliczane per dostawca.
* **OWNER**: Product Manager.
* **STATUS**: `OPEN_BLOCKING_BUSINESS_DECISION`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-18 — Zasady VAT i Fakturowania Transgranicznego
* **QUESTION**: Czy w MVP obsługujemy transakcje z dostawcami lub kupującymi zagranicznymi?
* **OPTIONS**:
  1. Wyłącznie transakcje krajowe PL-PL w MVP.
  2. Obsługa WNT/WDT i Reverse Charge.
* **RECOMMENDED_OPTION**: Option 1 (Ograniczenie do PL-PL w MVP).
* **RATIONALE**: Uproszczenie podatków i KSeF na etapie startu.
* **RISKS**: Wykluczenie dostawców zagranicznych w MVP.
* **OWNER**: Finance / Tax Advisor.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-19 — Kraje Dostawy w MVP
* **QUESTION**: Jaki jest dozwolony zasięg terytorialny dostaw w MVP?
* **OPTIONS**:
  1. Wyłącznie Polska (PL).
  2. Unia Europejska (EU).
* **RECOMMENDED_OPTION**: Option 1 (Wyłącznie Polska).
* **RATIONALE**: Zgodne z DEC-DROP-18. *Zmieniono status z DECIDED na RECOMMENDED ze względu na brak formalnego dokumentu zatwierdzenia.*
* **RISKS**: Brak obsługi eksportu w MVP.
* **OWNER**: Operations.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-20 — Waluta i Język Dokumentów Handlowych
* **QUESTION**: W jakiej walucie i języku prowadzona jest sprzedaż w MVP?
* **OPTIONS**:
  1. Waluta: PLN, Język: Polski (PL).
  2. Wielowalutowość (PLN, EUR, USD).
* **RECOMMENDED_OPTION**: Option 1 (PLN / PL).
* **RATIONALE**: Bazowa waluta rozliczeniowa LogiMarket. *Zmieniono status z DECIDED na RECOMMENDED ze względu na brak formalnego dokumentu zatwierdzenia.*
* **RISKS**: Brak.
* **OWNER**: Product Manager.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NO.

---



### DECISION_ID: DEC-DROP-21 — MVP PAYMENT METHODS AND PAYMENT TIMING
* **QUESTION**: Jakie metody i terminy płatności są dostępne w MVP? Kiedy następuje autoryzacja, a kiedy pobranie?
* **OPTIONS**:
  1. online payment with immediate capture
  2. authorization and later capture
  3. bank transfer prepayment
  4. pro forma
  5. deferred payment
  6. external B2B financing
* **RECOMMENDED_OPTION**: Brak. Decyzja otwarta.
* **RATIONALE**: Należy określić: kiedy customer order jest placed; kiedy supplier order może zostać przekazany; kiedy środki są captured lub uznane za otrzymane; failure path przy braku płatności.
* **RISKS**: Wpływ na płynność i zgodność prawną.
* **OWNER**: Finance / Product.
* **STATUS**: `OPEN_BLOCKING_BUSINESS_DECISION`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-22 — MVP SHIPPING AND FREIGHT SCOPE
* **QUESTION**: Jakie metody transportu są objęte MVP i jak wyceniamy transport ciężki?
* **OPTIONS**:
  1. parcel
  2. pallet
  3. own transport
  4. manually quoted freight
  5. deferred freight quote
  6. kategorie dopuszczone do MVP
* **RECOMMENDED_OPTION**: Brak. Decyzja otwarta.
* **RATIONALE**: Bez niej nie można zaprojektować checkoutu i shipment domain.
* **RISKS**: Błędna wycena frachtu.
* **OWNER**: Operations.
* **STATUS**: `OPEN_BLOCKING_BUSINESS_DECISION`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-23 — CUSTOMER PO NUMBER IN MVP ORDER CORE
* **QUESTION**: Czy wprowadzamy Customer PO Number do MVP?
* **OPTIONS**:
  1. required
  2. optional
  3. out of MVP
* **RECOMMENDED_OPTION**: Option 2.
* **RATIONALE**: Ułatwienie dla klientów B2B.
* **RISKS**: Brak.
* **OWNER**: Product Manager.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

## 4. PODSUMOWANIE STATYSTYCZNE DECYZJI

```text
+-------------------------------------------------------------+
| STATYSTYKA WZAJEMNIE ROZŁĄCZNYCH STATUSÓW GŁÓWNYCH          |
+-------------------------------------------------------------+
| DECIDED_COUNT                       = 0                     |
| RECOMMENDED_COUNT                   = 11                    |
| OPEN_COUNT                          = 3                     |
| OPEN_BLOCKING_BUSINESS_DECISION     = 5                     |
| LEGAL_REVIEW_REQUIRED               = 4                     |
| OUT_OF_SCOPE_COUNT                  = 0                     |
+-------------------------------------------------------------+
| TOTAL_DECISIONS                     = 23                    |
| STATUS_SUM_MATCHES_TOTAL            = YES (0+11+3+5+4+0=23) |
+-------------------------------------------------------------+

BLOCKS_IMPLEMENTATION_YES_COUNT=8

ALL_BLOCKING_DECISIONS:
DEC-DROP-01
DEC-DROP-02
DEC-DROP-03
DEC-DROP-04
DEC-DROP-12
DEC-DROP-17
DEC-DROP-21
DEC-DROP-22
```

> **PODSUMOWANIE KONTROLI BRAMEK:** Ze względu na brak decyzji ze statusem `DECIDED` oraz obecność otwartych decyzji blokujących, implementacja schematu bazy danych i checkoutu **pozostaje zablokowana**.

---

## 5. R2B BUSINESS APPROVAL AND VALIDATION REGISTER

| DECISION_ID | SOURCE_STATUS | BUSINESS_APPROVAL_STATUS | BUSINESS_APPROVED_OPTION | BUSINESS_APPROVED_BY | BUSINESS_APPROVER_ROLE | BUSINESS_APPROVED_AT | BUSINESS_APPROVAL_SOURCE | LEGAL_VALIDATION_STATUS | TAX_VALIDATION_STATUS | ACCOUNTING_VALIDATION_STATUS | PSP_VALIDATION_STATUS | PRIVACY_VALIDATION_STATUS | IMPLEMENTATION_CONDITIONS | IMPLEMENTATION_READINESS | R2B_NOTES |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-01` | `OPEN_BLOCKING_BUSINESS_DECISION` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `LOGIMARKET_AS_MOR` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending PSP and Legal confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-02` | `LEGAL_REVIEW_REQUIRED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `LOGIMARKET_AS_SELLER_OF_RECORD; BUY_SELL_BACK_TO_BACK` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending Legal, Tax, Accounting confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-03` | `RECOMMENDED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `LOGIMARKET_ISSUES_CUSTOMER_INVOICE; SUPPLIER_ISSUES_WHOLESALE_INVOICE_TO_LOGIMARKET` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending KSeF and legal confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-04` | `OPEN_BLOCKING_BUSINESS_DECISION` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `PAYMENT_TO_LOGIMARKET_OPERATING_OR_PSP_SETTLEMENT_ACCOUNT; ACCOUNT_ARCHITECTURE_PENDING_PSP_CONFIRMATION` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending PSP confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-05` | `LEGAL_REVIEW_REQUIRED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `CUSTOMER_PAYMENT_IS_PAYMENT_FOR_LOGIMARKET_SALE; SUPPLIER_CLAIM_IS_SEPARATE_TRADE_PAYABLE` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending Legal confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-06` | `RECOMMENDED` | `BUSINESS_APPROVED` | `TRADING_MARGIN; SELL_PRICE_MINUS_BUY_PRICE` | `Piotr Fiszer` | `Business Owner` | `2026-07-23` | `OWNER_BUSINESS_DECISION_2026_07_23` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `Pending Tax/Accounting confirmation` | `READY_FOR_LOGICAL_DATA_MODEL` | `Business revenue model is approved but statutory recognition remains pending.` |
| `DEC-DROP-07` | `RECOMMENDED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `MARGIN_OPERATIONALLY_RECOGNISED_AT_SUPPLIER_SHIPPED; STATUTORY_ACCOUNTING_AND_VAT_RECOGNITION_PENDING` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending Tax/Accounting confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-08` | `OPEN` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `SUPPLIER_SETTLEMENT_RUN_TWICE_MONTHLY; TARGET_DAYS=1_AND_15; BASIS=VALID_SUPPLIER_INVOICE_AND_ELIGIBLE_SUPPLIER_ORDER; SETTLEMENT_IS_PAYMENT_OF_TRADE_PAYABLE_NOT_MARKETPLACE_PAYOUT` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending validation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-09` | `LEGAL_REVIEW_REQUIRED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `PRICE_ERROR_REVIEW_REQUIRED; ORDER_MAY_BE_SUSPENDED; MANUAL_LEGAL_DECISION_REQUIRED; WRITTEN_AVOIDANCE_DECLARATION_WHERE_APPLICABLE; CUSTOMER_NOTIFICATION_REQUIRED; AUDIT_TRAIL_REQUIRED; REFUND_REQUIRED_IF_CAPTURED` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending legal procedure | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-10` | `RECOMMENDED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `SUPPLIER_REJECTION_ALLOWED_FOR_CONFIRMED_STOCK_FAILURE; AUTO_REFUND_REQUIRED_AFTER_PAID_REJECTION; SUPPLIER_SCORING_NEGATIVE_EVENT=YES; AUTOMATIC_CONTRACTUAL_PENALTY=NO_IN_MVP` | `Piotr Fiszer` | `Business Owner` | `2026-07-23` | `OWNER_BUSINESS_DECISION_2026_07_23` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending LEG-GATE-14 ranking-transparency validation;<br>schema and production implementation remain blocked;<br>conditionally ready for logical data model | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Business overselling direction approved by Business Owner;<br>supplier scoring impact remains subject to LEG-GATE-14 and formal P2B<br>ranking-transparency validation. |
| `DEC-DROP-11` | `LEGAL_REVIEW_REQUIRED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `CUSTOMER_FACING_SELLER_RESPONSIBILITY=LOGIMARKET; SUPPLIER_INTERNAL_FULFILLMENT_RESPONSIBILITY=PARTNER; SUPPLIER_PACKAGING_RESPONSIBILITY=PARTNER; SUPPLIER_CARRIER_OPERATION_RESPONSIBILITY=PARTNER; SUPPLIER_RECOURSE_AND_INDEMNITY=REQUIRED; DELIVERY_TERM=DAP_NAMED_PLACE_INCOTERMS_2020` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending Legal confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-12` | `RECOMMENDED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `CUSTOMER_REFUND_EXECUTOR=LOGIMARKET; ADMIN_MVP_REFUND_CONTROL=CENTRALISED; SUPPLIER_RECOURSE=CONDITIONAL_ON_CAUSE_AND_CONTRACT` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending validation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-13` | `RECOMMENDED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `FIRST_LINE_SUPPORT=LOGIMARKET; SUPPLIER_TECHNICAL_ESCALATION=YES; CUSTOMER_FACING_FORMAL_PROCESS=LOGIMARKET` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending Legal confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-14` | `RECOMMENDED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `RETURN_DESTINATION=SUPPLIER_WAREHOUSE; RETURN_AUTHORISATION_REQUIRED=YES; RETURN_COST_ALLOCATION=CAUSE_BASED` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending Legal confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-15` | `OPEN` | `BUSINESS_APPROVED` | `PARTIAL_FULFILLMENT_REQUIRES_BUYER_ACCEPTANCE; REFUND_OR_PRICE_CORRECTION_REQUIRED; NO_SILENT_PARTIAL_FULFILLMENT` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | No external blocker | `READY_FOR_LOGICAL_DATA_MODEL` | Approved by owner |
| `DEC-DROP-16` | `RECOMMENDED` | `BUSINESS_APPROVED` | `SUPPLIER_ORDER_TO_SHIPMENTS=ONE_TO_MANY` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | No external blocker | `READY_FOR_LOGICAL_DATA_MODEL` | Approved by owner |
| `DEC-DROP-17` | `OPEN_BLOCKING_BUSINESS_DECISION` | `BUSINESS_APPROVED` | `MULTI_PARTNER_CART=YES; ORDER_TO_SUPPLIER_ORDERS=ONE_TO_MANY` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | No external blocker | `READY_FOR_LOGICAL_DATA_MODEL` | Approved by owner |
| `DEC-DROP-18` | `RECOMMENDED` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `DOMESTIC_PL_TO_PL_TRANSACTIONS_ONLY; CROSS_BORDER_SALES=OUT_OF_SCOPE_FOR_MVP` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending Legal/Tax confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-19` | `RECOMMENDED` | `BUSINESS_APPROVED` | `DELIVERY_COUNTRIES=[PL]` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | No external blocker | `READY_FOR_LOGICAL_DATA_MODEL` | Approved by owner |
| `DEC-DROP-20` | `RECOMMENDED` | `BUSINESS_APPROVED` | `CURRENCY=PLN; DOCUMENT_LANGUAGE=PL` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | No external blocker | `READY_FOR_LOGICAL_DATA_MODEL` | Approved by owner |
| `DEC-DROP-21` | `OPEN_BLOCKING_BUSINESS_DECISION` | `BUSINESS_APPROVED_PENDING_EXTERNAL_VALIDATION` | `ONLINE_IMMEDIATE_CAPTURE; PROFORMA_PREPAYMENT; INTERNAL_TRADE_CREDIT=NOT_IN_MVP; EXTERNAL_B2B_FINANCING=POST_MVP; FUTURE_SCOPE=LM-DROP-CREDIT-57C; PROVIDER_SELECTED=NO` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `PENDING_FORMAL_EVIDENCE` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | Pending PSP and Legal confirmation | `READY_FOR_LOGICAL_DATA_MODEL_CONDITIONALLY` | Blocked for schema until validation |
| `DEC-DROP-22` | `OPEN_BLOCKING_BUSINESS_DECISION` | `BUSINESS_APPROVED` | `PARCEL; PALLET; MANUAL_FREIGHT_ECOMMERCE=NOT_SELECTED_FOR_MVP; DEFERRED_FREIGHT_ECOMMERCE=NOT_SELECTED_FOR_MVP; OFFER_MODEL_IMPACT=NO_AUTOMATIC_OFFER_MODEL_CHANGE` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | No external blocker | `READY_FOR_LOGICAL_DATA_MODEL` | Approved by owner |
| `DEC-DROP-23` | `OPEN` | `BUSINESS_APPROVED` | `CUSTOMER_PO_NUMBER=OPTIONAL` | Piotr Fiszer | Business Owner | 2026-07-23 | OWNER_BUSINESS_DECISION_2026_07_23 | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | `NOT_REQUIRED_FOR_CURRENT_DECISION` | No external blocker | `READY_FOR_LOGICAL_DATA_MODEL` | Approved by owner |

---

## 6. R3 INTERMEDIARY-FIRST DECISION OVERLAY

To zestawienie ma **najwyższy priorytet (precedence)** dla pierwszej iteracji MVP (Intermediary-First). Jeżeli decyzje R3 stoją w sprzeczności z decyzjami R2B (np. dotyczącymi statusu Merchant of Record lub logiki płatności), w pierwszej kolejności stosuje się decyzje z bloku R3. Poprzednie decyzje R2B zostały sklasyfikowane i ewentualnie zablokowane dla MVP w tabelach wpływu, pozostając jedynie wskaźnikiem przyszłych kierunków rozwoju (Future Reseller).

### 6.1. DEC-MKT: NOWE DECYZJE ARCHITEKTONICZNE (1-18)

| DECISION_ID | APPROVED_OPTION | STATUS | OWNER | EFFECTIVE_DATE | AFFECTED_OFFER_MODEL | AFFECTED_CONTRACT_MODEL | IMPLEMENTATION_IMPACT | LEGAL_PSP_TAX_DEPENDENCY | IMPLEMENTATION_READINESS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-MKT-01` | intermediary-first MVP | `DECIDED` | Piotr Fiszer | 2026-07-24 | All | partner_marketplace | Core marketplace mechanics | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-02` | independent offerModel and contractModel | `DECIDED` | Piotr Fiszer | 2026-07-24 | All | All | Schema separation of offer source and contract target | NO | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-03` | RFQ partner marketplace active | `DECIDED` | Piotr Fiszer | 2026-07-24 | rfq | partner_marketplace | Default MVP flow for RFQ | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-04` | ecommerce partner marketplace active | `DECIDED` | Piotr Fiszer | 2026-07-24 | ecommerce | partner_marketplace | Default MVP flow for ecommerce | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-05` | outbound external redirect active | `DECIDED` | Piotr Fiszer | 2026-07-24 | outbound | external_redirect | Existing logic preservation via /go/[id] | NO | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-06` | reseller future only | `DECIDED` | Piotr Fiszer | 2026-07-24 | All | logimarket_reseller | Blocked in MVP schema validation | NO | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-07` | Partner contractual seller and Seller of Record | `DECIDED` | Piotr Fiszer | 2026-07-24 | rfq, ecommerce | partner_marketplace | P2B and Terms & Conditions | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-08` | Partner owns description, price, availability | `DECIDED` | Piotr Fiszer | 2026-07-24 | rfq, ecommerce | partner_marketplace | Legal disclosures | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-09` | Partner owns fulfillment, delivery, complaints, returns, refunds | `DECIDED` | Piotr Fiszer | 2026-07-24 | rfq, ecommerce | partner_marketplace | Operational separation | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-10` | LogiMarket owns platform orchestration and rule enforcement | `DECIDED` | Piotr Fiszer | 2026-07-24 | rfq, ecommerce | partner_marketplace | Core admin features | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-11` | multi-seller checkout creates seller-specific relationships | `DECIDED` | Piotr Fiszer | 2026-07-24 | ecommerce | partner_marketplace | Checkout cart splitting logic | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-12` | Partner issues buyer goods invoice | `DECIDED` | Piotr Fiszer | 2026-07-24 | rfq, ecommerce | partner_marketplace | B2B billing automation | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-13` | LogiMarket issues platform-service invoices | `DECIDED` | Piotr Fiszer | 2026-07-24 | rfq, ecommerce | partner_marketplace | KSeF integration | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-14` | licensed PSP and validation required | `DECIDED` | Piotr Fiszer | 2026-07-24 | rfq, ecommerce | partner_marketplace | Blocks schema until PSP is selected | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-15` | no self-custody or LogiMarket escrow | `DECIDED` | Piotr Fiszer | 2026-07-24 | rfq, ecommerce | partner_marketplace | No LogiMarket operating accounts for funds | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-16` | seller disclosure before contract formation | `DECIDED` | Piotr Fiszer | 2026-07-24 | rfq, ecommerce | partner_marketplace | Pre-checkout UI requirements | YES | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-17` | reseller activation explicit and offer-specific | `DECIDED` | Piotr Fiszer | 2026-07-24 | All | logimarket_reseller | Blocks global Reseller switches | NO | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |
| `DEC-MKT-18` | existing conversion behavior unchanged in R3 | `DECIDED` | Piotr Fiszer | 2026-07-24 | All | All | No frontend behavior changes | NO | `READY_FOR_LOGICAL_DATA_MODEL_RESET` |

### 6.2. DEC-DROP IMPACT MATRIX: WPŁYW R3 NA DECYZJE R2B (1-23)

| DECISION_ID | PREVIOUS_ASSUMPTION | R3_IMPACT_CLASSIFICATION | ACTIVE_MVP_INTERPRETATION | FUTURE_RESELLER_INTERPRETATION | BLOCKED_FUTURE_SPRINT | EVIDENCE_OWNER |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-01` | LogiMarket as MoR | `SUPERSEDED_FOR_INTERMEDIARY_MVP` | Partner uses licensed PSP | Preserved for Model A | `LM-DROP-PAYMENT-56E` | Business Owner |
| `DEC-DROP-02` | LogiMarket as SoR | `RETAINED_FOR_FUTURE_RESELLER_ONLY` | Partner is SoR | Preserved for Model A | `LM-DROP-SCHEMA-56B3` | Business Owner |
| `DEC-DROP-03` | LogiMarket goods invoices | `RETAINED_FOR_FUTURE_RESELLER_ONLY` | Partner issues goods invoice | Preserved for Model A | `LM-DROP-SCHEMA-56B3` | Business Owner |
| `DEC-DROP-04` | customer payment as LogiMarket sale | `RETAINED_FOR_FUTURE_RESELLER_ONLY` | Payment directly to Partner | Preserved for Model A | `LM-DROP-PAYMENT-56E` | Business Owner |
| `DEC-DROP-05` | supplier trade payable | `RETAINED_FOR_FUTURE_RESELLER_ONLY` | No trade payable to supplier | Preserved for Model A | `LM-DROP-SCHEMA-56B3` | Business Owner |
| `DEC-DROP-06` | trading margin | `RETAINED_FOR_FUTURE_RESELLER_ONLY` | LogiMarket charges commission fee | Preserved for Model A | `LM-DROP-SCHEMA-56B3` | Business Owner |
| `DEC-DROP-07` | Margin recognition | `RETAINED_FOR_FUTURE_RESELLER_ONLY` | Commission recognized upon fulfillment | Preserved for Model A | `LM-DROP-SCHEMA-56B3` | Business Owner |
| `DEC-DROP-08` | Settlement frequency | `OUTSIDE_R3_SCOPE` | Dependent on PSP payout schedule | N/A | `LM-DROP-SCHEMA-56B3` | Business Owner |
| `DEC-DROP-09` | Price error liability | `REQUIRES_REVALIDATION` | Partner manages own price errors | N/A | `LM-DROP-SCHEMA-56B4` | Business Owner |
| `DEC-DROP-10` | Overselling liability | `REQUIRES_REVALIDATION` | Partner manages own stock | N/A | `LM-DROP-SUPPLIER-56D` | Business Owner |
| `DEC-DROP-11` | Transport damage | `REQUIRES_REVALIDATION` | Partner handles transport damage | N/A | `LM-DROP-SCHEMA-56B2` | Business Owner |
| `DEC-DROP-12` | Refund execution | `SUPERSEDED_FOR_INTERMEDIARY_MVP` | PSP executes refund | Preserved for Model A | `LM-DROP-SCHEMA-56B4` | Business Owner |
| `DEC-DROP-13` | Complaint handling | `SUPERSEDED_FOR_INTERMEDIARY_MVP` | Partner handles complaints | Preserved for Model A | `LM-DROP-SCHEMA-56B4` | Business Owner |
| `DEC-DROP-14` | Return destination | `PRESERVED_AS_CHANNEL_NEUTRAL` | Partner warehouse | Partner warehouse | N/A | Business Owner |
| `DEC-DROP-15` | Partial fulfillment | `PRESERVED_AS_CHANNEL_NEUTRAL` | Allowed | Allowed | N/A | Business Owner |
| `DEC-DROP-16` | Split shipment | `PRESERVED_AS_CHANNEL_NEUTRAL` | Allowed | Allowed | N/A | Business Owner |
| `DEC-DROP-17` | Multi-partner cart | `PRESERVED_AS_CHANNEL_NEUTRAL` | Cart splitting required | Cart splitting required | N/A | Business Owner |
| `DEC-DROP-18` | Cross-border scope | `PRESERVED_AS_CHANNEL_NEUTRAL` | PL-PL only in MVP | PL-PL only | N/A | Business Owner |
| `DEC-DROP-19` | Delivery countries | `PRESERVED_AS_CHANNEL_NEUTRAL` | PL only | PL only | N/A | Business Owner |
| `DEC-DROP-20` | Currency and language | `PRESERVED_AS_CHANNEL_NEUTRAL` | PLN and PL only | PLN and PL only | N/A | Business Owner |
| `DEC-DROP-21` | Payment timing | `OUTSIDE_R3_SCOPE` | Defined by PSP | Defined by PSP | `LM-DROP-PAYMENT-56E` | Business Owner |
| `DEC-DROP-22` | Freight scope | `OUTSIDE_R3_SCOPE` | Defined by Operations | Defined by Operations | `LM-DROP-SCHEMA-56B2` | Business Owner |
| `DEC-DROP-23` | PO number | `PRESERVED_AS_CHANNEL_NEUTRAL` | Optional | Optional | N/A | Business Owner |

### 6.3. LEG-GATE IMPACT MATRIX (1-14)

| LEGAL_GATE_ID | PREVIOUS_SCOPE | R3_IMPACT_CLASSIFICATION | ACTIVE_MVP_INTERPRETATION | FUTURE_RESELLER_INTERPRETATION | BLOCKED_FUTURE_SPRINT | EVIDENCE_OWNER |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `LEG-GATE-01` | P2B Terms | `REQUIRES_REVALIDATION` | Must cover intermediary role | Must cover reseller role | `LM-DROP-SCHEMA-56B3` | Legal Counsel |
| `LEG-GATE-02` | Intermediation terms | `REQUIRES_REVALIDATION` | Mandatory for Partner onboarding | N/A | `LM-DROP-SCHEMA-56B3` | Legal Counsel |
| `LEG-GATE-03` | MoR qualification | `SUPERSEDED_FOR_INTERMEDIARY_MVP` | PSP assumes MoR role | LogiMarket as MoR | `LM-DROP-PAYMENT-56E` | Legal Counsel |
| `LEG-GATE-04` | KSeF integration | `REQUIRES_REVALIDATION` | For LogiMarket service invoices only | For LogiMarket goods invoices | `LM-DROP-SCHEMA-56B3` | Tax Advisor |
| `LEG-GATE-05` | Reverse Charge | `PRESERVED_AS_CHANNEL_NEUTRAL` | PL-PL only in MVP | PL-PL only | N/A | Tax Advisor |
| `LEG-GATE-06` | DAC7 reporting | `REQUIRES_REVALIDATION` | Applicable to marketplace operators | N/A | `LM-DROP-SCHEMA-56B3` | Tax Advisor |
| `LEG-GATE-07` | PSD2 exemptions | `SUPERSEDED_FOR_INTERMEDIARY_MVP` | Not needed due to PSP usage | Escrow review needed | `LM-DROP-PAYMENT-56E` | Legal Counsel |
| `LEG-GATE-08` | AML/KYC | `REQUIRES_REVALIDATION` | Managed by PSP | Managed by LogiMarket | `LM-DROP-PAYMENT-56E` | Legal Counsel |
| `LEG-GATE-09` | Consumer Rights | `REQUIRES_REVALIDATION` | B2B only, with quasi-consumer exclusions | B2B only | `LM-DROP-SCHEMA-56B4` | Legal Counsel |
| `LEG-GATE-10` | Omnibus Directive | `REQUIRES_REVALIDATION` | Applicable to Partner prices | Applicable to LogiMarket prices | `LM-DROP-SCHEMA-56B1` | Legal Counsel |
| `LEG-GATE-11` | Data Protection | `REQUIRES_REVALIDATION` | Joint controllership rules needed | Independent controllers | `LM-DROP-SCHEMA-56B1` | Legal Counsel |
| `LEG-GATE-12` | Product Liability | `SUPERSEDED_FOR_INTERMEDIARY_MVP` | Partner bears full liability | LogiMarket bears liability | `LM-DROP-SCHEMA-56B4` | Legal Counsel |
| `LEG-GATE-13` | Marketing consent | `PRESERVED_AS_CHANNEL_NEUTRAL` | Unchanged | Unchanged | N/A | Legal Counsel |
| `LEG-GATE-14` | Competition Law | `REQUIRES_REVALIDATION` | Neutral platform rules | Non-compete clauses | `LM-DROP-SCHEMA-56B3` | Legal Counsel |

### 6.4. LEG-MKT: MARKETPLACE LEGAL GATES (1-10)

| LEGAL_GATE_ID | QUESTION | BUSINESS_ASSUMPTION | EVIDENCE_REQUIRED | OWNER | BLOCKED_SPRINT | SAFE_DOCUMENTATION_DEFAULT | SCHEMA_IMPACT | PRODUCTION_IMPACT | STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `LEG-MKT-01` | intermediary legal qualification and terms | Does the new model qualify strictly as intermediation without LogiMarket entering the contract of sale? | Legal memo | Legal Counsel | `LM-MARKETPLACE-SCHEMA-56B1` | PENDING | High | Blocking | `PENDING_FORMAL_EVIDENCE` |
| `LEG-MKT-02` | contract formation for RFQ and e-commerce | How exactly is the contract formed between buyer and seller in the UI? | Legal memo | Legal Counsel | `LM-MARKETPLACE-SCHEMA-56B1` | PENDING | High | Blocking | `PENDING_FORMAL_EVIDENCE` |
| `LEG-MKT-03` | seller identity and pre-contract disclosure | How is the seller presented to the buyer before checkout to meet legal standards? | UX Review | Legal Counsel | `LM-MARKETPLACE-SCHEMA-56B1` | PENDING | Medium | Blocking | `PENDING_FORMAL_EVIDENCE` |
| `LEG-MKT-04` | P2B terms, rankings, suspension, complaints | Do the terms of service comply with the P2B regulation for rankings and suspensions? | Legal memo | Legal Counsel | `LM-MARKETPLACE-SCHEMA-56B1` | PENDING | Low | Blocking | `PENDING_FORMAL_EVIDENCE` |
| `LEG-MKT-05` | PSP architecture, KYB/KYC, allocations, payouts | Does the chosen PSP correctly handle KYB/KYC and route funds directly to the seller? | PSP contract | Legal Counsel | `LM-MARKETPLACE-PAYMENT-56E` | PENDING | High | Blocking | `PENDING_FORMAL_EVIDENCE` |
| `LEG-MKT-06` | VAT, accounting and KSeF split | How is the platform commission invoiced to the seller versus the goods invoice to the buyer? | Tax opinion | Tax Advisor | `LM-MARKETPLACE-SCHEMA-56B3` | PENDING | High | Blocking | `PENDING_FORMAL_EVIDENCE` |
| `LEG-MKT-07` | refund, chargeback and seller liability | Who manages chargebacks operationally and financially? | PSP terms | Legal Counsel | `LM-MARKETPLACE-SCHEMA-56B4` | PENDING | Medium | Blocking | `PENDING_FORMAL_EVIDENCE` |
| `LEG-MKT-08` | B2B and entrepreneur-with-consumer-rights analysis | Are "quasi-consumers" properly excluded or handled in the new terms? | Legal memo | Legal Counsel | `LM-MARKETPLACE-SCHEMA-56B4` | PENDING | Low | Blocking | `PENDING_FORMAL_EVIDENCE` |
| `LEG-MKT-09` | privacy roles and retention | Are data controller roles properly defined between LogiMarket and the Partner? | DPA agreement | Legal Counsel | `LM-MARKETPLACE-SCHEMA-56B1` | PENDING | Low | Blocking | `PENDING_FORMAL_EVIDENCE` |
| `LEG-MKT-10` | future reseller activation | Under what legal conditions can a specific offer be switched to the reseller model? | Legal memo | Legal Counsel | `LM-DROP-SCHEMA-56B3` | PENDING | High | Non-Blocking | `PENDING_FORMAL_EVIDENCE` |

---

*Koniec rejestru decyzji.*
