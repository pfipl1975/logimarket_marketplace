# LOGIMARKET — REJESTR DECYZJI BIZNESOWYCH I PRAWNYCH DROPSHIPPINGU (LM-DROP-DOMAIN-56A)

**Wersja:** 1.0.0  
**Data:** 2026-07-22  
**Status:** OPEN FOR DOMAIN REVIEW  
**Moduł:** Decision Register for Dropshipping Architecture  

---

## 1. STRUKTURA DECYZYJNA

Niniejszy rejestr zawiera pełne zestawienie kluczowych decyzji handlowych, prawnych i podatkowych związanych z modelem dropshippingu w LogiMarket. 

Każda decyzja została zakwalifikowana do odpowiedniego statusu:
* `DECIDED`: Decyzja ostatecznie zatwierdzona przez Zarząd / Kancelarię Prawną.
* `RECOMMENDED`: Rekomendacja architektoniczna przedłożona do akceptacji biznesowej.
* `OPEN`: Decyzja otwarta, wymagająca doprecyzowania parametrów operacyjnych.
* `OPEN_BLOCKING_BUSINESS_DECISION`: Kluczowa decyzja biznesowa blokująca implementację schematu bazy danych i checkoutu.
* `LEGAL_REVIEW_REQUIRED`: Kwestia wymagająca analizy prawnej i przygotowania wzorca umowy partnerskiej.
* `OUT_OF_SCOPE`: Element wyłączony z zakresu MVP.

---

## 2. REJESTR DECYZJI (DECISION REGISTER)

### DECISION_ID: DEC-DROP-01 — Merchant of Record (MoR)
* **QUESTION**: Kto występuje jako podmiot rozliczający płatność bezgotówkową kupującego i zarejestrowany na bramce płatności?
* **OPTIONS**:
  1. LogiMarket Sp. z o.o. (Merchant of Record).
  2. Partner Dropshippingowy (Direct Seller/Merchant).
  3. Model hybrydowy / Stripe Connect Custom.
* **RECOMMENDED_OPTION**: Option 1 (LogiMarket jako MoR).
* **RATIONALE**: Jednolity proces płatności dla Kupującego B2B, brak konieczności posiadania kont płatniczych przez każdego dostawcę, pełna kontrola nad koszykiem koszykowym.
* **RISKS**: Odpowiedzialność za zwroty płatności (chargebacki) i ryzyko finansowe w przypadku braku realizacji przez dostawcę.
* **OWNER**: Business Owner / CFO LogiMarket.
* **STATUS**: `OPEN_BLOCKING_BUSINESS_DECISION`
* **BLOCKS_IMPLEMENTATION**: TAK (Blokuje model płatności i bazę danych).

---

### DECISION_ID: DEC-DROP-02 — Seller of Record (SoR)
* **QUESTION**: Kto formalnie sprzedaje towar Kupującemu B2B na gruncie prawa handlowego?
* **OPTIONS**:
  1. LogiMarket (Kupuje od dostawcy, odprzedaje kupującemu).
  2. Partner Dropshippingowy (Sprzedaje bezpośrednio, LogiMarket jest pośrednikiem/agentem).
* **RECOMMENDED_OPTION**: Option 1 (LogiMarket jako sprzedawca w modelu odsprzedaży / kupno-sprzedaż).
* **RATIONALE**: Najprostsze fakturowanie dla kupującego B2B (jedna faktura od LogiMarket), wyeliminowanie konieczności wystawiania faktur przez 50+ różnych dostawców bezpośrednio dla klienta końcowego.
* **RISKS**: Wymóg prowadzenia pełnej księgowości towarowej, rozliczanie VAT i gwarancje rękojmi B2B.
* **OWNER**: Legal Counsel / CFO.
* **STATUS**: `LEGAL_REVIEW_REQUIRED`
* **BLOCKS_IMPLEMENTATION**: TAK (Blokuje strukturę fakturowania i umów).

---

### DECISION_ID: DEC-DROP-03 — Podmiot Wystawiający Fakturę Kupującemu
* **QUESTION**: Kto i w jakim trybie wystawia fakturę VAT/proforma dla Kupującego B2B?
* **OPTIONS**:
  1. LogiMarket wystawia fakturę VAT (lub fakturę strukturyzowaną KSeF) dla kupującego.
  2. Partner Dropshippingowy wystawia fakturę bezpośrednio kupującemu.
* **RECOMMENDED_OPTION**: Option 1 (LogiMarket wystawia fakturę VAT kupującemu).
* **RATIONALE**: Kupujący B2B oczekuje jednego dokumentu księgowego za całe zamówienie w marketplace LogiMarket.
* **RISKS**: Obowiązek integracji z systemem fakturowania / KSeF po stronie LogiMarket.
* **OWNER**: Finance & Accounting / Legal.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: TAK (Blokuje moduł fakturowania).

---

### DECISION_ID: DEC-DROP-04 — Podmiot Pobierający Płatność
* **QUESTION**: Na czyje konto trafiają środki wpłacane przez kupującego na bramce płatności?
* **OPTIONS**:
  1. Konto bankowe / rachunek walutowy LogiMarket.
  2. Sub-konto dostawcy w modelu Stripe Connect Express / Custom.
* **RECOMMENDED_OPTION**: Option 1 (LogiMarket pobiera płatność na własne konto operacyjne).
* **RATIONALE**: Zgodne z zatwierdzonym podjęciem funkcji Merchant of Record w MVP oraz zapobiega komplikacjom rejestracji KYC dostawców na Stripe.
* **RISKS**: Wymagany kapitał obrotowy oraz precyzyjny mechanizm settlementów dla dostawców.
* **OWNER**: CFO.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: TAK.

---

### DECISION_ID: DEC-DROP-05 — Własność Środków przed Rozliczeniem Partnera
* **QUESTION**: Jaki jest status prawny wpłaconych środków na koncie LogiMarket do momentu realizacji dostawy przez partnera?
* **OPTIONS**:
  1. Środki stanowią przychód LogiMarket, a należność dla partnera jest zobowiązaniem handlowym.
  2. Środki są depozytem/płatnością powierniczą do czasu potwierdzenia wydania przesyłki.
* **RECOMMENDED_OPTION**: Option 1.
* **RATIONALE**: Standardowy model handlowy w B2B przy odprzedaży towaru.
* **RISKS**: Wymaga zachowania płynności na ewentualne zwroty/refundacje.
* **OWNER**: CFO / Legal.
* **STATUS**: `LEGAL_REVIEW_REQUIRED`
* **BLOCKS_IMPLEMENTATION**: NIE (Decyzja księgowa).

---

### DECISION_ID: DEC-DROP-06 — Model Prowizyjny Marketplace
* **QUESTION**: W jaki sposób kalkulowane jest wynagrodzenie LogiMarket?
* **OPTIONS**:
  1. Marża na cenie zakupu (LogiMarket ustala cenę sprzedaży: Sell Price = Buy Price + Marża %).
  2. Prowizja od ceny sprzedaży (Partner podaje cenę sprzedaży i kwotę prowizji dla LogiMarket %).
  3. Stawka kwotowa za zrealizowane zamówienie (Fixed fee per order).
* **RECOMMENDED_OPTION**: Option 2 (Prowizja procentowa od ceny sprzedaży brutto/netto).
* **RATIONALE**: Standard rynkowy ułatwiający partnerom porównanie opłacalności ze swoimi cennikami hurtowymi.
* **RISKS**: Wymusza precyzyjne definiowanieStawek prowizji per kategoria lub partner w Admin MVP.
* **OWNER**: Head of Sales / Business Owner.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NIE (Może być sparametryzowane).

---

### DECISION_ID: DEC-DROP-07 — Moment Naliczenia i Nabycia Prawa do Prowizji
* **QUESTION**: Kiedy prowizja LogiMarket staje się definitywnie należna?
* **OPTIONS**:
  1. Z chwilą opłacenia zamówienia przez kupującego.
  2. Z chwilą wysłania towaru przez partnera (potwierdzone `shipped`).
  3. Po upływie okresu na reklamację/zwrot (np. 14 dni od `delivered`).
* **RECOMMENDED_OPTION**: Option 2 (W momencie nadania przesyłki `shipped`).
* **RATIONALE**: Gwarantuje, że dostawca wykonał swoją usługę wysyłki towaru.
* **RISKS**: Konieczność korekty prowizji w przypadku zwrotu lub reklamacji uwzględnionej po wysyłce.
* **OWNER**: CFO.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

### DECISION_ID: DEC-DROP-08 — Częstotliwość Settlementów (Wypłat dla Partnerów)
* **QUESTION**: Jak często LogiMarket przelewa środki należne dostawcom za zrealizowane dostawy?
* **OPTIONS**:
  1. Raz w tygodniu (Co tydzień na podstawie zbiorczego zestawienia).
  2. Dwa razy w miesiącu (1. i 15. dnia miesiąca).
  3. Cykl miesięczny (Do 10. dnia następnego miesiąca na podstawie faktury dostawcy).
* **RECOMMENDED_OPTION**: Option 2 lub 3 (Cykl dwutygodniowy lub miesięczny).
* **RATIONALE**: Zmniejszenie obciążeń operacyjnych działu księgowości w MVP.
* **RISKS**: Partners dropshippingowi mogą oczekiwać krótszych terminów przy dużym wolumenie.
* **OWNER**: Operations Lead / Finance.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

### DECISION_ID: DEC-DROP-09 — Odpowiedzialność za Błędną Cenę lub Błąd Systemowy
* **QUESTION**: Kto ponosi koszty w przypadku wystawienia oferty z rażąco błędną ceną (np. 10 PLN zamiast 1000 PLN)?
* **OPTIONS**:
  1. Partner, jeśli błąd wynikał z przekazanych przez niego danych.
  2. LogiMarket, jeśli błąd nastąpił podczas moderacji / wprowadzania danych w Admin MVP.
  3. Prawo do uchylenia się od skutków oświadczenia woli złożonego pod wpływem błędu (zgodnie z KC).
* **RECOMMENDED_OPTION**: Oznaczenie w umowie partnerskiej odpowiedzialności strony wprowadzającej błąd + regulaminowy zapis o prawie anulowania zamówienia B2B z przyczyn błędu cenowego.
* **RATIONALE**: Ochrona obu stron przed stratami finansowymi wynikającymi z pomyłek edytorskich.
* **RISKS**: Niezadowolenie kupującego w przypadku anulowania zamówienia.
* **OWNER**: Legal Counsel.
* **STATUS**: `LEGAL_REVIEW_REQUIRED`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

### DECISION_ID: DEC-DROP-10 — Odpowiedzialność za Brak Stanu Magazynowego (Overselling)
* **QUESTION**: Jakie konsekwencje ponosi partner dropshippingowy w przypadku odrzucenia zamówienia z braku towaru?
* **OPTIONS**:
  1. Brak konsekwencji finansowych, automatyczne anulowanie i refund dla klienta.
  2. Opłata operacyjna za anulowanie (Penalty Fee) potrącana z settlementu.
  3. Obniżenie scoringu / czasowa zawieszenie oferty dostawcy.
* **RECOMMENDED_OPTION**: Option 1 w MVP + Option 3 (ostrzeżenie operacyjne w panelu admina).
* **RATIONALE**: Na etapie MVP relacje z dostawcami opierają się na zaufaniu; penalizacja finansowa mogłaby zniechęcić pierwszych partnerów.
* **RISKS**: Ryzyko pogorszenia reputacji LogiMarket przy częstych odrzuceniach zamówień przez partnerów.
* **OWNER**: Operations Manager.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

### DECISION_ID: DEC-DROP-11 — Odpowiedzialność za Uszkodzenie w Transporcie
* **QUESTION**: Kto rozpatruje i ponosi koszt uszkodzeń przesyłki powstałych podczas przewozu?
* **OPTIONS**:
  1. Partner Dropshippingowy (zamawia kuriera i odpowiada za pakowanie oraz ubezpieczenie).
  2. LogiMarket.
* **RECOMMENDED_OPTION**: Option 1 (Partner odpowiada za prawidłowe zapakowanie i relację z przewoźnikiem).
* **RATIONALE**: W dropshippingu to dostawca przekazuje paczkę kurierowi ze swojego magazynu i dysponuje protokołem nadania.
* **RISKS**: Wymaga sprawnego przesyłania protokołów szkody od kupującego B2B do partnera.
* **OWNER**: Operations / Legal.
* **STATUS**: `LEGAL_REVIEW_REQUIRED`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

### DECISION_ID: DEC-DROP-12 — Podmiot Obsługujący i Wykonujący Refund
* **QUESTION**: Jak realizowany jest finansowy zwrot środków do Kupującego B2B?
* **OPTIONS**:
  1. Wyłącznie przez Operatora LogiMarket za pośrednictwem paneli PSP / Admin MVP.
  2. Bezpośrednio przez partnera na konto kupującego.
* **RECOMMENDED_OPTION**: Option 1 (Wyłącznie centralnie przez Operatora LogiMarket).
* **RATIONALE**: Chroni dane bankowe kupującego oraz gwarantuje pełną spójność audytową w systemie LogiMarket.
* **RISKS**: Wymaga zatwierdzenia wniosku zwrotu w panelu admina.
* **OWNER**: Finance / Customer Service.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: TAK.

---

### DECISION_ID: DEC-DROP-13 — Podmiot Przyjmujący Zgłoszenia Reklamacyjne
* **QUESTION**: Gdzie kupujący B2B zgłasza wady i reklamacje?
* **OPTIONS**:
  1. Do Biura Obsługi Klienta LogiMarket (Operator pośredniczy i kieruje do dostawcy).
  2. Bezpośrednio do Partnera Dropshippingowego.
* **RECOMMENDED_OPTION**: Option 1 (Zgłoszenia kierowane do LogiMarket).
* **RATIONALE**: Zachowanie jednolitej standardu obsługi klienta B2B pod marką LogiMarket.
* **RISKS**: Zwiększone obciążenie BOK LogiMarket.
* **OWNER**: Support Lead.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

### DECISION_ID: DEC-DROP-14 — Koszt i Adres Zwrotu Towaru
* **QUESTION**: Dokąd odsyłany jest towar w przypadku uznanego zwrotu / reklamacji i kto płaci za przesyłkę?
* **OPTIONS**:
  1. Towar odsyłany bezpośrednio na magazyn Partnera Dropshippingowego; koszt ponosi strona winna (kupujący przy zwrocie umownym, partner przy wadzie).
  2. Towar odsyłany do magazynu centralnego LogiMarket.
* **RECOMMENDED_OPTION**: Option 1 (Bezpośrednia odsyłka na adres dostawcy podany w umowie).
* **RATIONALE**: LogiMarket nie utrzymuje magazynu fizycznego dla towarów zwrotnych w modelu dropshippingu.
* **RISKS**: Konieczność dostarczenia kupującemu etykiety/adresu zwrotnego dostawcy.
* **OWNER**: Operations Lead.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

### DECISION_ID: DEC-DROP-15 — Zasady Częściowej Realizacji Zamówienia
* **QUESTION**: Co dzieje się, gdy partner ma tylko część zamawianych sztuk danego produktu?
* **OPTIONS**:
  1. Zgoda na częściową realizację za akceptacją Kupującego i refund za brakujące sztuki.
  2. Bezwarunkowe anulowanie całego zamówienia (All-or-Nothing).
* **RECOMMENDED_OPTION**: Option 1 za zgodą Kupującego (lub Option 2 jako domyślny automat w MVP).
* **RATIONALE**: B2B dopuszcza dostawy częściowe, jeśli towar jest krytyczny dla ciągłości działania firmy.
* **RISKS**: Złożoność modyfikacji statusu pozycji zamówienia.
* **OWNER**: Operations.
* **STATUS**: `OPEN`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

### DECISION_ID: DEC-DROP-16 — Zasady Split Shipment (Wielopaczkowość)
* **QUESTION**: Czy partner może wysłać jedno zamówienie w kilku przesyłkach (np. paleta + paczka)?
* **OPTIONS**:
  1. TAK — encja `shipments` wspiera relację one-to-many do `supplier_orders`.
  2. NIE — jedno zamówienie dostawcy musi posiadać dokładnie jeden list przewozowy.
* **RECOMMENDED_OPTION**: Option 1 (Wsparcie dla wielu przesyłek w ramach jednego zamówienia dostawcy).
* **RATIONALE**: Produkty logistyczne i przemysłowe często wymagają wysyłki wielopaczkowej lub mieszanej (paleta + karton).
* **RISKS**: Większa złożoność widoku trackingowego.
* **OWNER**: Domain Architect.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

### DECISION_ID: DEC-DROP-17 — Zamówienia Zawierające Produkty Wielu Partnerów
* **QUESTION**: Czy kupujący może złożyć jedno zamówienie łączące produkty od Partnera A i Partnera B?
* **OPTIONS**:
  1. TAK — system automatycznie rozbija zamówienie na sub-zamówienia (`supplier_orders`).
  2. NIE — blokada w koszyku w MVP.
* **RECOMMENDED_OPTION**: Option 1 (Rozbicie na sub-zamówienia dostawców).
* **RATIONALE**: Patrz rozdz. 6 kontraktu domenowego (Wariant B). Kluczowy warunek dla budowy skali marketplace.
* **RISKS**: Oddzielne koszty wysyłki naliczane w checkout dla każdego dostawcy.
* **OWNER**: Product Manager.
* **STATUS**: `OPEN_BLOCKING_BUSINESS_DECISION`
* **BLOCKS_IMPLEMENTATION**: TAK.

---

### DECISION_ID: DEC-DROP-18 — Zasady VAT i Fakturowania Transgranicznego (WNT / Export)
* **QUESTION**: Czy w MVP obsługujemy transakcje z kontrahentami zewnętrznymi (np. dostawca z DE, kupujący z PL)?
* **OPTIONS**:
  1. Wyłącznie transakcje krajowe PL-PL w MVP (Dostawca PL, Kupujący PL, LogiMarket PL).
  2. Obsługa transakcji wewnątrzunijnych (WNT/WDT) oraz od odwrotnego obciążenia (Reverse Charge).
* **RECOMMENDED_OPTION**: Option 1 (Ograniczenie do PL-PL w MVP).
* **RATIONALE**: Znaczące uproszczenie rozliczeń podatkowych, VAT i KSeF na etapie startu.
* **RISKS**: Ograniczenie oferty do dostawców krajowych.
* **OWNER**: Finance / Tax Advisor.
* **STATUS**: `RECOMMENDED`
* **BLOCKS_IMPLEMENTATION**: NIE (Określa zakres zakazu w MVP).

---

### DECISION_ID: DEC-DROP-19 — Kraje Dostawy w MVP
* **QUESTION**: Jaki jest dozwolony zasięg terytorialny dostaw w modelu dropshipping MVP?
* **OPTIONS**:
  1. Wyłącznie Polska (PL).
  2. Kraje Unii Europejskiej (EU).
* **RECOMMENDED_OPTION**: Option 1 (Wyłącznie Polska).
* **RATIONALE**: Zgodne z DEC-DROP-18 oraz standardowymi warunkami dostaw kurierskich/paletowych w kraju.
* **RISKS**: Brak obsługi eksportu.
* **OWNER**: Operations.
* **STATUS**: `DECIDED`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

### DECISION_ID: DEC-DROP-20 — Waluta i Język Dokumentów Handlowych
* **QUESTION**: W jakiej walucie i języku prezentowane są rozliczenia i dokumenty zamówienia w MVP?
* **OPTIONS**:
  1. Waluta: PLN, Język: Polski (PL).
  2. Wielowalutowość (PLN, EUR, USD).
* **RECOMMENDED_OPTION**: Option 1 (PLN / PL).
* **RATIONALE**: Waluta bazowa systemu LogiMarket i baza rozliczeniowa polskich dostawców.
* **RISKS**: Brak.
* **OWNER**: Product Manager.
* **STATUS**: `DECIDED`
* **BLOCKS_IMPLEMENTATION**: NIE.

---

## 3. PODSUMOWANIE STATYSTYCZNE DECYZJI

* **TOTAL DECISIONS**: 20
* **DECIDED**: 2
* **RECOMMENDED**: 11
* **OPEN**: 2
* **OPEN_BLOCKING_BUSINESS_DECISION**: 3 (`DEC-DROP-01`, `DEC-DROP-04`, `DEC-DROP-17`)
* **LEGAL_REVIEW_REQUIRED**: 4 (`DEC-DROP-02`, `DEC-DROP-05`, `DEC-DROP-09`, `DEC-DROP-11`)

> **Wniosek:** Ze względu na obecność 3 otwartych decyzji blokujących (`OPEN_BLOCKING_BUSINESS_DECISION`) oraz 4 kwestii wymagających analizy prawnej (`LEGAL_REVIEW_REQUIRED`), implementacja kodu schematu bazy danych (`schema.ts`) i checkoutu musi zostać wstrzymana do momentu ich ostatecznego zatwierdzenia przez Zarząd LogiMarket.

---

*Koniec rejestru decyzji.*
