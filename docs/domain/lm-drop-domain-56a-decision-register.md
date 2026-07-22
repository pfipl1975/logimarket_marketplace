# LOGIMARKET — REJESTR DECYZJI BIZNESOWYCH I PRAWNYCH DROPSHIPPINGU (LM-DROP-DOMAIN-56A-R1)

**Wersja:** 1.1.0 (R1 — Domain Review & Status Consistency Fixes)
**Data:** 2026-07-22
**Status:** OPEN FOR DOMAIN REVIEW
**Moduł:** Decision Register for Dropshipping Architecture

---

## 1. STRUKTURA DECYZYJNA I ZASADY STATUSOWANIA

Niniejszy rejestr zawiera pełne zestawienie kluczowych decyzji handlowych, prawnych i podatkowych związanych z wdrożeniem dropshippingu w LogiMarket.

### Zasady Normatywne Statusów:
1. **Wzajemna Rozłączność Statusów Głównych**: Każda decyzja posiada **dokładnie jeden** podstawowy status wybrany z podanej niżej listy.
2. **`OPEN_OPTION != DECIDED`**: Rekomendacja architektoniczna nie stanowi decyzji zatwierdzonej. Jeżeli status jest inny niż `DECIDED`, wariant nie może być opisany jako obowiązujący ani zatwierdzony.
3. **Wpisy `DECIDED` wymagają Dowodu**: Status `DECIDED` może być przyznany wyłącznie wtedy, gdy podano pola: `APPROVED_BY`, `APPROVED_AT` oraz `APPROVAL_SOURCE`. Brak dowodu wymaga nadania statusu `OPEN` lub `OPEN`.
4. **Wskaźnik Blokowania (`BLOCKS_IMPLEMENTATION`)**: Zaznaczenie `BLOCKS_IMPLEMENTATION = YES` oznacza, że rekomendacja **nie unieważnia** blokady implementacyjnej do czasu ostatecznego zatwierdzenia.

### Dozwolone Statusy Główne:
* OPEN: Decyzja otwarta, wymagająca rozstrzygnięcia.
* CLOSED: Decyzja ostatecznie zatwierdzona.
* BLOCKED: Decyzja wstrzymana przez zależności zewn.
* REJECTED: Odrzucona.

---

## 2. AUTOMATYCZNIE WERYFIKOWALNA TABELA ZBIORCZA DECYZJI

| DECISION_ID | SUBJECT | STATUS | BLOCKS_IMPLEMENTATION | BLOCKED_SPRINTS | OWNER | APPROVED_BY | APPROVED_AT | APPROVAL_SOURCE |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `DEC-DROP-01` | Merchant of Record (MoR) | `BLOCKED` | YES | 56B, 56E | Business Owner / CFO | NULL | NULL | NULL |
| `DEC-DROP-02` | Seller of Record (SoR) | `BLOCKED` | YES | 56B, 56C | Legal Counsel / CFO | NULL | NULL | NULL |
| `DEC-DROP-03` | Podmiot Wystawiający Fakturę | `OPEN` | YES | 56B, 56C | Finance / Legal | NULL | NULL | NULL |
| `DEC-DROP-04` | Podmiot Pobierający Płatność | `BLOCKED` | YES | 56B, 56E | CFO | NULL | NULL | NULL |
| `DEC-DROP-05` | Własność Środków przed Payoutem | `BLOCKED` | NO | 56B3 | CFO / Legal | NULL | NULL | NULL |
| `DEC-DROP-06` | Model Wynagrodzenia (Prowizja/Marża)| `OPEN` | NO | 56B3 | Head of Sales / CFO | NULL | NULL | NULL |
| `DEC-DROP-07` | Moment Naliczenia Prowizji | `OPEN` | NO | 56B3 | CFO | NULL | NULL | NULL |
| `DEC-DROP-08` | Częstotliwość Settlementów | `OPEN` | NO | 56B3 | Operations / Finance | NULL | NULL | NULL |
| `DEC-DROP-09` | Odpowiedzialność za Błędną Cenę | `BLOCKED` | NO | 56G | Legal Counsel | NULL | NULL | NULL |
| `DEC-DROP-10` | Brak Stanu (Overselling) | `OPEN` | NO | 56D | Operations Manager | NULL | NULL | NULL |
| `DEC-DROP-11` | Uszkodzenie w Transporcie | `BLOCKED` | NO | 56F, 56G | Operations / Legal | NULL | NULL | NULL |
| `DEC-DROP-12` | Podmiot Obsługujący Refund | `OPEN` | YES | 56E, 56G | Finance / Support | NULL | NULL | NULL |
| `DEC-DROP-13` | Zgłoszenia Reklamacyjne | `OPEN` | NO | 56G | Support Lead | NULL | NULL | NULL |
| `DEC-DROP-14` | Adres i Koszt Zwrotu Towaru | `OPEN` | NO | 56G | Operations Lead | NULL | NULL | NULL |
| `DEC-DROP-15` | Częściowa Realizacja Zamówienia | `OPEN` | NO | 56C, 56D | Operations | NULL | NULL | NULL |
| `DEC-DROP-16` | Split Shipment (Wielopaczkowość)| `OPEN` | NO | 56F | Domain Architect | NULL | NULL | NULL |
| `DEC-DROP-17` | Multi-Partner Order w Koszyku | `BLOCKED` | YES | 56B, 56C | Product Manager | NULL | NULL | NULL |
| `DEC-DROP-18` | VAT i Fakturowanie Transgraniczne| `OPEN` | NO | 56B3 | Finance / Tax Advisor | NULL | NULL | NULL |
| `DEC-DROP-19` | Kraje Dostawy w MVP | `OPEN` | NO | 56C | Operations | NULL | NULL | NULL |
| `DEC-DROP-20` | Waluta i Język Dokumentów | `OPEN` | NO | 56C | Product Manager | NULL | NULL | NULL |

---

## 3. SZCZEGÓŁOWY REJESTR DECYZJI (DECISION REGISTER DETAILS)

### DECISION_ID: DEC-DROP-01 — Merchant of Record (MoR)
* **QUESTION**: Kto występuje jako podmiot rozliczający płatność bezgotówkową kupującego i zarejestrowany na bramce płatności?
* **OPTIONS**:
  1. LogiMarket Sp. z o.o. (Merchant of Record).
  2. Partner Dropshippingowy (Direct Seller/Merchant).
  3. Model hybrydowy / Managed PSP split.
* **OPEN_OPTION**: Option 1 (LogiMarket jako MoR).
* **RATIONALE**: Jednolity proces płatności dla Kupującego B2B, brak konieczności rejestracji kont płatniczych dostawców.
* **RISKS**: Odpowiedzialność za zwroty płatności (chargebacki) i ryzyko finansowe przy braku realizacji przez dostawcę.
* **OWNER**: Business Owner / CFO LogiMarket.
* **STATUS**: `BLOCKED`
* **BLOCKS_IMPLEMENTATION**: YES (Blokuje model płatności i bazę danych).

---

### DECISION_ID: DEC-DROP-02 — Seller of Record (SoR)
* **QUESTION**: Kto formalnie sprzedaje towar Kupującemu B2B na gruncie prawa handlowego?
* **OPTIONS**:
  1. LogiMarket (Model odsprzedaży: kupuje od dostawcy, sprzedaje kupującemu).
  2. Partner Dropshippingowy (Model agencyjny: sprzedaje bezpośrednio kupującemu, LogiMarket jest pośrednikiem).
* **OPEN_OPTION**: Option 1 (LogiMarket jako sprzedawca w modelu odsprzedaży).
* **RATIONALE**: Pojedynczy dokument sprzedaży dla kupującego B2B za całe zamówienie na LogiMarket.
* **RISKS**: Wymóg prowadzenia księgowości towarowej, rozliczanie VAT i gwarancje rękojmi B2B.
* **OWNER**: Legal Counsel / CFO.
* **STATUS**: `BLOCKED`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-03 — Podmiot Wystawiający Fakturę Kupującemu
* **QUESTION**: Kto i w jakim trybie wystawia fakturę VAT/proforma dla Kupującego B2B?
* **OPTIONS**:
  1. LogiMarket wystawia fakturę VAT dla kupującego.
  2. Partner Dropshippingowy wystawia fakturę bezpośrednio kupującemu.
* **OPEN_OPTION**: Option 1 (LogiMarket wystawia fakturę VAT kupującemu).
* **RATIONALE**: Zgodne z rekomendacją SoR i oczekiwaniem jednego dokumentu przez kupującego B2B.
* **RISKS**: Obowiązek integracji z KSeF / systemem fakturowania LogiMarket.
* **OWNER**: Finance & Accounting / Legal.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-04 — Podmiot Pobierający Płatność
* **QUESTION**: Na czyje konto trafiają środki wpłacane przez kupującego na bramce płatności?
* **OPTIONS**:
  1. Konto operacyjne LogiMarket Sp. z o.o.
  2. Sub-konto dostawcy w wybranym PSP.
* **OPEN_OPTION**: Option 1 (LogiMarket pobiera płatność na własne konto operacyjne).
* **RATIONALE**: Ochrona środków kupującego i spójność rozliczeń z PSP (zapobieganie praniu brudnych pieniędzy i ułatwienie chargebacków).
* **RISKS**: Wymagany kapitał obrotowy oraz precyzyjny mechanizm settlementów.
* **OWNER**: CFO.
* **STATUS**: `BLOCKED`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-05 — Własność Środków przed Rozliczeniem Partnera
* **QUESTION**: Jaki jest status prawny wpłaconych środków na koncie LogiMarket do momentu realizacji dostawy przez partnera?
* **OPTIONS**:
  1. Środki stanowią przychód LogiMarket, a należność dla partnera jest zobowiązaniem handlowym.
  2. Środki są depozytem do czasu potwierdzenia wydania przesyłki.
* **OPEN_OPTION**: Option 1.
* **RATIONALE**: Standardowy model handlowy przy odprzedaży towaru.
* **RISKS**: Wymaga zachowania płynności na ewentualne refundacje.
* **OWNER**: CFO / Legal.
* **STATUS**: `BLOCKED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-06 — Model Wynagrodzenia (Prowizja vs Marża)
* **QUESTION**: W jaki sposób wyliczane jest wynagrodzenie LogiMarket?
* **OPTIONS**:
  1. Marża handlowa (Sell Price = Buy Price + Marża %).
  2. Prowizja procentowa od ceny sprzedaży brutto/netto.
  3. Opłata kwotowa za zamówienie (Fixed fee).
* **OPEN_OPTION**: Option 2 przy pośrednictwie / Option 1 przy odsprzedaży.
* **RATIONALE**: Zależne od ostatecznego wyboru SoR/MoR.
* **RISKS**: Parametryzacja stawek w Admin MVP.
* **OWNER**: Head of Sales / CFO.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-07 — Moment Naliczenia Wynagrodzenia
* **QUESTION**: Kiedy wynagrodzenie LogiMarket staje się definitywnie należne?
* **OPTIONS**:
  1. Z chwilą opłacenia zamówienia.
  2. Z chwilą wysłania towaru (`shipped`).
  3. Po upływie okresu na reklamację (np. 14 dni od `delivered`).
* **OPEN_OPTION**: Option 2 (W momencie nadania przesyłki `shipped`).
* **RATIONALE**: Gwarantuje wykonanie usługi wysyłki przez dostawcę.
* **RISKS**: Konieczność korekty finansowej w przypadku zwrotu po wysyłce.
* **OWNER**: CFO.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-08 — Częstotliwość Settlementów (Wypłat dla Partnerów)
* **QUESTION**: Jak często LogiMarket przelewa środki należne dostawcom?
* **OPTIONS**:
  1. Raz w tygodniu.
  2. Dwa razy w miesiącu (1. i 15. dnia).
  3. Raz w miesiącu na podstawie faktury dostawcy.
* **OPEN_OPTION**: Option 2 lub 3.
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
* **OPEN_OPTION**: Zapis umowny oraz regulaminowy o prawie anulowania z powodu błędu cenowego.
* **RATIONALE**: Ochrona stron przed rażącymi stratami.
* **RISKS**: Niezadowolenie kupującego.
* **OWNER**: Legal Counsel.
* **STATUS**: `BLOCKED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-10 — Odpowiedzialność za Brak Stanu Magazynowego (Overselling)
* **QUESTION**: Jakie konsekwencje ponosi partner przy odrzuceniu zamówienia z braku towaru?
* **OPTIONS**:
  1. Bezwarunkowe anulowanie i auto-refund bez kar w MVP.
  2. Karta opłata operacyjna potrącana z settlementu.
  3. Obniżenie scoringu i ostrzeżenie w panelu.
* **OPEN_OPTION**: Option 1 w MVP + Option 3.
* **RATIONALE**: Unikanie zniechęcania pierwszych dostawców karami finansowymi w MVP.
* **RISKS**: Utrata reputacji przy częstych odmowach.
* **OWNER**: Operations Manager.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-11 — Odpowiedzialność za Uszkodzenie w Transporcie
* **QUESTION**: Kto rozpatruje i ponosi koszt uszkodzeń przesyłki w przewozie?
* **OPTIONS**:
  1. Partner Dropshippingowy (zamawia kuriera i odpowiada za pakowanie/ubezpieczenie).
  2. LogiMarket.
* **OPEN_OPTION**: Option 1 (Partner odpowiada za pakowanie i relację z przewoźnikiem).
* **RATIONALE**: Dostawca przekazuje paczkę kurierowi ze swojego magazynu.
* **RISKS**: Konieczność sprawnego przekazywania protokołów szkody przez kupującego.
* **OWNER**: Operations / Legal.
* **STATUS**: `BLOCKED`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-12 — Podmiot Obsługujący i Wykonujący Refund
* **QUESTION**: Jak realizowany jest finansowy zwrot środków do Kupującego B2B?
* **OPTIONS**:
  1. Wyłącznie centralnie przez Operatora LogiMarket w Admin MVP / PSP.
  2. Bezpośrednio przez partnera.
* **OPEN_OPTION**: Option 1 (Wyłącznie centralnie przez LogiMarket).
* **RATIONALE**: Ochrona danych bankowych i spójność audytowa.
* **RISKS**: Wymaga obsługi wniosków w panelu admina.
* **OWNER**: Finance / Customer Service.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-13 — Podmiot Przyjmujący Zgłoszenia Reklamacyjne
* **QUESTION**: Gdzie kupujący B2B zgłasza wady i reklamacje?
* **OPTIONS**:
  1. Do Biura Obsługi Klienta LogiMarket.
  2. Bezpośrednio do Partnera.
* **OPEN_OPTION**: Option 1 (Obsługa przez LogiMarket).
* **RATIONALE**: Jednolity standard marki LogiMarket.
* **RISKS**: Obciążenie BOK.
* **OWNER**: Support Lead.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-14 — Adres i Koszt Zwrotu Towaru
* **QUESTION**: Dokąd odsyłany jest towar i kto płaci za przesyłkę zwrotną?
* **OPTIONS**:
  1. Odsyłka bezpośrednio na magazyn Partnera; koszt ponosi strona winna.
  2. Odsyłka do LogiMarket.
* **OPEN_OPTION**: Option 1 (Odsyłka bezpośrednio do Partnera).
* **RATIONALE**: Brak magazynu fizycznego LogiMarket dla zwrotów dropshippingowych.
* **RISKS**: Wymóg dostarczenia etykiety/adresu dostawcy.
* **OWNER**: Operations Lead.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-15 — Zasady Częściowej Realizacji Zamówienia
* **QUESTION**: Co dzieje się, gdy partner posiada tylko część zamawianej ilości?
* **OPTIONS**:
  1. Zgoda na częściową realizację za akceptacją Kupującego i refund różnicy.
  2. Bezwarunkowe anulowanie (All-or-Nothing).
* **OPEN_OPTION**: Option 1 za zgodą Kupującego.
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
* **OPEN_OPTION**: Option 1 (Wsparcie dla wielu przesyłek).
* **RATIONALE**: Towary przemysłowe wymagają wysyłek mieszanych (paleta + karton).
* **RISKS**: Wyświetlanie wielu linków trackingowych.
* **OWNER**: Domain Architect.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-17 — Zamówienie z Produktami Wielu Partnerów
* **QUESTION**: Czy kupujący może złożyć jedno zamówienie łączące produkty od różnych dostawców?
* **OPTIONS**:
  1. TAK — automatyczny podział na sub-zamówienia dostawców (`supplier_orders`).
  2. NIE — blokada koszyka do jednego dostawcy.
* **OPEN_OPTION**: Option 1 (Podział na sub-zamówienia w tle).
* **RATIONALE**: Kluczowy wymóg skalowalności marketplace B2B.
* **RISKS**: Oddzielne koszty dostawy naliczane per dostawca.
* **OWNER**: Product Manager.
* **STATUS**: `BLOCKED`
* **BLOCKS_IMPLEMENTATION**: YES.

---

### DECISION_ID: DEC-DROP-18 — Zasady VAT i Fakturowania Transgranicznego
* **QUESTION**: Czy w MVP obsługujemy transakcje z dostawcami lub kupującymi zagranicznymi?
* **OPTIONS**:
  1. Wyłącznie transakcje krajowe PL-PL w MVP.
  2. Obsługa WNT/WDT i Reverse Charge.
* **OPEN_OPTION**: Option 1 (Ograniczenie do PL-PL w MVP).
* **RATIONALE**: Uproszczenie podatków i KSeF na etapie startu.
* **RISKS**: Wykluczenie dostawców zagranicznych w MVP.
* **OWNER**: Finance / Tax Advisor.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-19 — Kraje Dostawy w MVP
* **QUESTION**: Jaki jest dozwolony zasięg terytorialny dostaw w MVP?
* **OPTIONS**:
  1. Wyłącznie Polska (PL).
  2. Unia Europejska (EU).
* **OPEN_OPTION**: Option 1 (Wyłącznie Polska).
* **RATIONALE**: Zgodne z DEC-DROP-18. *Zmieniono status z DECIDED na OPEN ze względu na brak formalnego dokumentu zatwierdzenia.*
* **RISKS**: Brak obsługi eksportu w MVP.
* **OWNER**: Operations.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-20 — Waluta i Język Dokumentów Handlowych
* **QUESTION**: W jakiej walucie i języku prowadzona jest sprzedaż w MVP?
* **OPTIONS**:
  1. Waluta: PLN, Język: Polski (PL).
  2. Wielowalutowość (PLN, EUR, USD).
* **RECOMMENDED_OPTION**: Option 1 (PLN / PL).
* **RATIONALE**: Bazowa waluta rozliczeniowa LogiMarket.
* **RISKS**: Brak.
* **OWNER**: Product Manager.
* **STATUS**: OPEN
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-21 — SLA Czasu Weryfikacji (Supplier)
* **QUESTION**: Ile czasu ma dostawca na potwierdzenie przyjęcia zamówienia?
* **OPTIONS**:
  1. 24h robocze.
  2. 48h roboczych.
* **RECOMMENDED_OPTION**: Option 1.
* **RATIONALE**: Oczekiwania klientów B2B.
* **RISKS**: Opóźnienia po stronie dostawców.
* **OWNER**: Operations.
* **STATUS**: OPEN
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-22 — Kary za Niespełnienie SLA
* **QUESTION**: Czy wprowadzamy kary umowne za przekroczenie SLA przez dostawcę?
* **OPTIONS**:
  1. Tak, kary finansowe potrącane z settlementu.
  2. Nie, tylko obniżenie scoringu w MVP.
* **RECOMMENDED_OPTION**: Option 2.
* **RATIONALE**: Zachęta do onboardingu w MVP.
* **RISKS**: Brak twardych narzedzi nacisku na jakość.
* **OWNER**: Legal.
* **STATUS**: OPEN
* **BLOCKS_IMPLEMENTATION**: NO.

---

### DECISION_ID: DEC-DROP-23 — Format Etykiet Kurierskich
* **QUESTION**: Kto generuje etykiety kurierskie dla przesyłek?
* **OPTIONS**:
  1. Dostawca (na własnej umowie).
  2. LogiMarket (API kurierskie zintegrowane w panelu dostawcy).
* **RECOMMENDED_OPTION**: Option 1.
* **RATIONALE**: Brak panelu dostawcy w MVP.
* **RISKS**: Brak ujednoliconego brandingu na etykietach.
* **OWNER**: Operations.
* **STATUS**: OPEN
* **BLOCKS_IMPLEMENTATION**: NO.


---

## 4. PODSUMOWANIE STATYSTYCZNE DECYZJI

```text
+-------------------------------------------------------------+
| STATYSTYKA WZAJEMNIE ROZŁĄCZNYCH STATUSÓW GŁÓWNYCH          |
+-------------------------------------------------------------+
| OPEN_COUNT                          = 16                    |
| CLOSED_COUNT                        = 0                     |
| BLOCKED_COUNT                       = 7                     |
| REJECTED_COUNT                      = 0                     |
+-------------------------------------------------------------+
| TOTAL_DECISIONS                     = 23                    |
| STATUS_SUM_MATCHES_TOTAL            = YES (16+0+7+0=23)     |
+-------------------------------------------------------------+
```

> **PODSUMOWANIE KONTROLI BRAMEK:** Ze względu na brak decyzji ze statusem `DECIDED` oraz obecność 3 otwartych decyzji blokujących biznesowo (`DEC-DROP-01`, `DEC-DROP-04`, `DEC-DROP-17`) i 4 decyzji wymagających opinii prawnej (`DEC-DROP-02`, `DEC-DROP-05`, `DEC-DROP-09`, `DEC-DROP-11`), implementacja schematu bazy danych (`schema.ts`) i checkoutu **pozostaje zablokowana**.

---

*Koniec rejestru decyzji.*
