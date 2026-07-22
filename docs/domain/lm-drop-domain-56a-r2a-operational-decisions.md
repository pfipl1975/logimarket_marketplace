# LOGIMARKET — OPERATIONAL DECISIONS (LM-DROP-DOMAIN-56A-R2A)

**Wersja:** 1.0.0
**Data:** 2026-07-22
**Cel:** Karty decyzji priorytetowych z zakresu operacji, zwrotów, wsparcia oraz struktury zamówień (DEC-DROP-12, DEC-DROP-17, DEC-DROP-21, DEC-DROP-22).

> Decyzje w tym dokumencie skupiają się na doświadczeniu użytkownika końcowego B2B oraz mechanizmach fizycznej integracji z systemami magazynowymi Partnerów Dropshippingowych.

## DEC-DROP-12: Podmiot Obsługujący Refund
1. **Decision question**: Jak realizowany jest finansowy zwrot środków do Kupującego B2B w przypadku anulowania zamówienia lub uznania zwrotu?
2. **Why the decision is required**: Stanowi bazowy mechanizm budowy kontrolerów Drizzle w `LM-DROP-SCHEMA-56B4` dla ścieżki anulowania transakcji.
3. **Options**: Option 1 (Wyłącznie centralnie przez Operatora LogiMarket), Option 2 (Bezpośrednio przez partnera ze swoich środków / bramki).
4. **Current architectural recommendation**: Option 1 (Centralnie).
5. **Business consequences**: Niezależnie kto wydał towar i przyjął zwrot, środki zawsze wracają od nadawcy głównej faktury sprzedaży (zapewnia to spójność B2B).
6. **Legal and tax consequences**: Ścisłe powiązanie fakturowania z realizacją płatności z DEC-DROP-03.
7. **Financial consequences**: Płatność refundowana zawsze potrącana jest z bieżącego/przyszłego Settlementu Partnera; ryzyko debetowe Partnera.
8. **Operational consequences**: Operator musi nadzorować fizyczne dotarcie zwrotu do magazynu dostawcy przed zleceniem Refund w panelu.
9. **Technical consequences**: Model zwrotów wymaga implementacji dwufazowego procesu (Authorised -> Executed / PSP webhook update).
10. **Risks**: Brak zapłaty za zaległe rozliczenia, gdy dostawca staje się niewypłacalny.
11. **Reversibility**: Proste technicznie, ale trudne biznesowo.
12. **Required approvers**: CFO, Customer Service.
13. **Required evidence**: Zatwierdzona polityka "Refund Policy".
14. **Blocked sprints**: `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-SCHEMA-56B4`.
15. **Questions that remain unanswered**: W jakim czasie od zatwierdzenia przez Admina następuje realizacja z bramki?

## DEC-DROP-17: Zamówienie z Produktami Wielu Partnerów (Multi-Partner Order)
1. **Decision question**: Czy kupujący B2B może w jednym procesie koszykowym złożyć zamówienie, na które składają się produkty od wielu różnych dostawców dropshippingowych?
2. **Why the decision is required**: Determinuje fundamentalną strukturę bazy danych (Order -> SupplierOrders -> Shipments) oraz UI Checkoutu i widoków po zakupowych ("My Orders").
3. **Options**: Option 1 (TAK – automatyczny podział na sub-zamówienia), Option 2 (NIE – blokada checkoutu; 1 Order = 1 Partner).
4. **Current architectural recommendation**: Option 1 (TAK).
5. **Business consequences**: Maksymalizuje współczynniki konwersji i obrót na marketplace (GMV), budując wartość platformową zintegrowanego koszyka przemysłowego B2B.
6. **Legal and tax consequences**: W modelu agencyjnym (Model B z DEC-DROP-02), jeden zakup (jeden koszyk B2B) zmusi Kupującego B2B do wprowadzania N niezależnych faktur od N podmiotów do swojego systemu ERP, co stanowi ogromną przeszkodę psychologiczną dla księgowości B2B. Opcja 1 drastycznie wspiera wariant LogiMarket jako Sprzedawcy (Model A).
7. **Financial consequences**: Pozytywne (wzrost koszyka).
8. **Operational consequences**: Logistyka rozdzielania zgłoszeń anulowania dla określonych sub-poziomów zamówienia. Operatorzy rozwiązują spory oddzielnie dla każdej z części składowych tego samego numeru zamówienia klienta.
9. **Technical consequences**: Narzuca budowę kompleksowej relacji Parent-Child w bazie (`orders` 1:N `supplier_orders`), skomplikowane procesowanie statusów zagregowanych (status globalnego orderu na podstawie stanów sub-orderów).
10. **Risks**: Wymaga klarownej wizualizacji kosztów dostaw i przewidywanego terminu (z różnych lokalizacji).
11. **Reversibility**: Pójście w Option 1 i przejście na Option 2 jest proste (nałożenie walidatora przed zapisem bazy). Opcja odwrotna po zrobieniu Option 2 – wymaga przepisania całego układu encji zamówień, płatności i wysyłek (gigantyczny koszt refactoringu `LM-DROP-ORDER-56C`).
12. **Required approvers**: Product Manager.
13. **Required evidence**: Analiza wariantów potwierdzona w dokumentacji R2B.
14. **Blocked sprints**: `LM-DROP-DATA-MODEL-56B0, LM-DROP-ORDER-56C`.
15. **Questions that remain unanswered**: W jaki sposób prezentujemy na checkoucie fakturę za rozbite koszty transportu? Czy sumujemy do jednej stawki "Dostawa LogiMarket", czy pokazujemy podział na magazyny partnerskie?

## DEC-DROP-21: MVP Payment Methods & Timing
1. **Decision question**: Jakie metody i cykle płatności obsługujemy dla transakcji B2B w MVP?
2. **Why the decision is required**: Architektura płatności determinuje statusy `payment_status` w systemie.
3. **Options**:
   - Option 1 (online payment with immediate capture)
   - Option 2 (authorization and later capture)
   - Option 3 (bank transfer prepayment)
   - Option 4 (pro forma)
   - Option 5 (deferred payment)
   - Option 6 (external B2B financing)
4. **Current architectural recommendation**: Option 1, Option 3, Option 4.
5. **Business consequences**: Różnorodność opcji w B2B zwiększa konwersję (tzw. elastyczność finansowania). Zbyt rygorystyczne opcje obniżają koszyk w B2B.
6. **Legal and tax consequences**: Moment powstania obowiązku podatkowego różni się w zależności od natychmiastowej zapłaty a opóźnionej.
7. **Financial consequences**: Prowizje od różnych form finansowania.
8. **Operational consequences**: Ręczne przypisywanie przelewów bankowych wydłuża fulfillment.
9. **Technical consequences**: Złożoność maszyny stanów zamówienia.
10. **Risks**: Odroczona płatność zwiększa ryzyko niewypłacalności (credit-risk).
11. **Reversibility**: Możliwe dodawanie metod w toku działania platformy.
12. **Required approvers**: Finance, Product Manager.
13. **Required evidence**: Formalna specyfikacja metod płatności na checkout.
14. **Blocked sprints**: `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E`.
15. **Questions that remain unanswered**: Czy integrujemy ubezpieczenie należności dla płatności odroczonych?

### PORÓWNANIE WARIANTÓW PŁATNOŚCI (PAYMENT DECISION PACK)

**Variant 1: Online payment with immediate capture (np. BLIK, Pay-by-link, Karta)**
* **When customer order becomes placed**: Natychmiast po udanej autoryzacji i capture w bramce PSP.
* **When supplier handoff is allowed**: Natychmiast po wpłacie (Captured).
* **When funds are considered available**: Zależnie od warunków wypłaty z PSP (np. D+1, D+3).
* **Failure and expiry path**: Krótki czas (TTL) sesji, zazwyczaj do 1-2 godzin przed automatycznym anulowaniem.
* **Refund path**: Zwrot przez API bramki PSP (automatyczny proces `refund_requested`).
* **Cancellation path**: Anulowanie powoduje konieczność potrącenia prowizji bramki, która przepada po wykonaniu Capture.
* **Accounting impact**: Wymaga natychmiastowej faktury zaliczkowej lub faktury końcowej (przy szybkiej dostawie).
* **Credit-risk impact**: Brak. Środki wpłynęły.
* **Required legal review**: Standardowy regulamin płatności online.
* **Technical implications**: Najprostszy wariant – stan liniowy dla zapłaty opłaconej z góry.

**Variant 2: Authorization and later capture (Karta autoryzowana, ale obciążona po potwierdzeniu przez dostawcę)**
* **When customer order becomes placed**: Po założeniu blokady na karcie klienta (Authorized).
* **When supplier handoff is allowed**: Gdy blokada jest potwierdzona (Authorized). Handoff nie wymaga Capture.
* **When funds are considered available**: Dopiero po potwierdzeniu przez dostawcę dostępności towaru i wywołaniu akcji Capture na bramce (do 7 dni).
* **Failure and expiry path**: Autoryzacja wygasa (zwykle po 7 dniach) bez kosztów, jeśli dostawca nie zrealizuje zamówienia.
* **Refund path**: Jeśli zamówienie anulowane jest przed Capture, to Void (brak kosztów). Jeśli po Capture - standardowy Refund.
* **Cancellation path**: Bez kosztowa rezygnacja z transakcji w okresie autoryzacji (Void).
* **Accounting impact**: Uniknięcie wystawiania faktur zaliczkowych w przypadku braku towaru.
* **Credit-risk impact**: Niskie - środki są zablokowane u klienta.
* **Required legal review**: Informowanie klienta o momencie obciążenia karty (regulamin usługi).
* **Technical implications**: Wymaga rozwidlenia stanu maszyny na `PAYMENT_AUTHORIZED`, która przechodzi w `CAPTURED` pod wpływem zdarzenia z innej domeny (np. `SUPPLIER_ACCEPTED`).

**Variant 3: Bank transfer prepayment (Tradycyjny przelew bankowy)**
* **When customer order becomes placed**: Zamówienie przyjmuje status "Pending Payment" zaraz po przejściu koszyka.
* **When supplier handoff is allowed**: Dopiero po ręcznym zaksięgowaniu wpłaty na koncie (w przyszłości: integracja Open Banking).
* **When funds are considered available**: Po zaksięgowaniu wyciągu MT940 na koncie LogiMarket.
* **Failure and expiry path**: TTL rzędu 5-14 dni oczekiwania na przelew.
* **Refund path**: Zwrot wymaga zebrania numeru konta bankowego B2B od klienta i ręcznego zlecenia przelewu.
* **Cancellation path**: Automatyczne anulowanie, darmowe.
* **Accounting impact**: Wymaga procedur rozpoznawania wpłat na podstawie tytułów przelewów.
* **Credit-risk impact**: Brak.
* **Required legal review**: Niskie.
* **Technical implications**: Wymaga ręcznej akcji administratora (oznacz "Zapłacono") lub modułu Open Banking (wyciągi).

**Variant 4: Pro forma (Zamówienie z obowiązkiem przedpłaty na podstawie dokumentu księgowego)**
* **When customer order becomes placed**: Po kliknięciu "Zamawiam". System od razu generuje PDF Pro-forma.
* **When supplier handoff is allowed**: Po opłaceniu Pro-formy.
* **When funds are considered available**: Po zaksięgowaniu.
* **Failure and expiry path**: Jak w przelewie.
* **Refund path**: Ręczny przelew zwrotny.
* **Cancellation path**: Darmowe anulowanie faktury pro-forma.
* **Accounting impact**: Pro-forma nie jest fakturą VAT w świetle przepisów, nie wchodzi do KSeF jako dokument sprzedażowy, dopóki nie zostanie zamieniona na zaliczkową po opłaceniu.
* **Credit-risk impact**: Brak.
* **Required legal review**: Poprawność wygenerowanego dokumentu.
* **Technical implications**: Wymaga wbudowanego silnika PDF i systemu numeracji dokumentów "pro forma" (DEC-DROP-03).

**Variant 5: Deferred payment (Kredyt kupiecki wewnątrz platformy / Odroczony termin płatności np. 14 dni)**
* **When customer order becomes placed**: Natychmiast po pozytywnym scoringu (jeśli system zautomatyzowany) lub manualnej akceptacji kredytu kupieckiego.
* **When supplier handoff is allowed**: Natychmiast po akceptacji zamówienia.
* **When funds are considered available**: Po 14 dniach (lub opóźnione), kiedy klient B2B opłaci fakturę terminową.
* **Failure and expiry path**: Niewypłacalność w terminie uruchamia windykację (braki płatności na platformie).
* **Refund path**: Skomplikowane przy braku zapłaty – realizowane jako korekta faktury na saldo zadłużenia.
* **Cancellation path**: Wystawienie faktury korygującej na 100%.
* **Accounting impact**: Moment powstania przychodu występuje przed zapłatą (w momencie wydania/wysyłki towaru).
* **Credit-risk impact**: BARDZO WYSOKI. Ryzyko niewypłacalności spółki w całości obciąża kapitał LogiMarket.
* **Required legal review**: Ubezpieczenie należności, twarda windykacja, KRD, weryfikacja spółek.
* **Technical implications**: Wymaga systemu zarządzania kredytem kupieckim (limity dla poszczególnych klientów B2B).

**Variant 6: External B2B financing (Integracja zewnętrznego faktoringu, BNPL dla firm np. PragmaGO)**
* **When customer order becomes placed**: Po zatwierdzeniu limitu/kredytu u partnera faktoringowego (w trybie online API).
* **When supplier handoff is allowed**: Natychmiast.
* **When funds are considered available**: Faktor wypłaca LogiMarket 100% kwoty w np. 24h.
* **Failure and expiry path**: Klient nie spłaca długu w firmie faktoringowej. LogiMarket otrzymał środki.
* **Refund path**: Wymaga zwrócenia kwoty do firmy BNPL/faktoringowej wg dedykowanego API korekt.
* **Cancellation path**: Konieczność notyfikacji faktora.
* **Accounting impact**: Cesja wierzytelności B2B. Zależnie od struktury prawnej faktoringu jawnego.
* **Credit-risk impact**: Niskie dla LogiMarket. Faktor przejmuje ryzyko niewypłacalności w faktoringu pełnym (bez regresu).
* **Required legal review**: Zewnętrzna umowa B2B między platformą a faktorem.
* **Technical implications**: Złożona integracja API obcej instytucji finansowej w ścieżkę zamówienia.

## DEC-DROP-22: MVP Shipping and Freight Scope
1. **Decision question**: W jakim zakresie transportowym obsługujemy MVP dla produktów przemysłowych?
2. **Why the decision is required**: Modeluje checkout (sekcja Delivery). Produkty ponadgabarytowe uniemożliwiają wycenę z tabeli API wprost na checkoucie.
3. **Options**:
   - Option 1 (parcel shipment)
   - Option 2 (pallet shipment)
   - Option 3 (supplier own transport)
   - Option 4 (manually quoted freight)
   - Option 5 (deferred freight quote)
   - Option 6 (excluded product categories)
4. **Current architectural recommendation**: Option 1 (Kuryer/Paczki) + Option 2 (Palety ze zdefiniowanym cennikiem).
5. **Business consequences**: Ogranicza katalog produktów do takich, które można wycenić w koszyku w standardowych trybach. Opcje ręcznych wycen drastycznie zdejmują automatyzację checkoutu.
6. **Legal and tax consequences**: Odpowiedzialność przewoźnika.
7. **Financial consequences**: Koszt dostawy musi być jednoznacznie pokryty przez kupującego B2B, przedpłacony przez LogiMarket lub zafakturowany.
8. **Operational consequences**: Brak obsługi wyceny ręcznej (Opcja 4/5) odciąża customer service z ciągłego podawania wycen dla ciężkich przesyłek, ale uderza w potencjał rynkowy ciężkiego sprzętu.
9. **Technical consequences**: Prosta reguła wyliczania na podstawie macierzy (waga/wymiar) -> Cennik w opcji 1 i 2.
10. **Risks**: Porzucanie koszyków przy braku zaufanego transportu w specyficznym segmencie przemysłowym.
11. **Reversibility**: Zawsze można rozszerzyć.
12. **Required approvers**: Operations, Product.
13. **Required evidence**: Formalna definicja wariantów przewozu do MVP.
14. **Blocked sprints**: `LM-DROP-SCHEMA-56B2, LM-DROP-FULFILLMENT-56F`.
15. **Questions that remain unanswered**: Jak traktujemy zwroty gabarytowe?

### PORÓWNANIE WARIANTÓW WYSYŁKI (SHIPPING AND FREIGHT DECISION PACK)
* **Option 1 (parcel shipment)**: Dotyczy małych pudełek. Checkout liczy wg cennika z wagą (np. DPD, InPost). Żadna interwencja operatora. Wymaga wymiarów lub wagi na produkcie.
* **Option 2 (pallet shipment)**: Dotyczy europalet (np. Raben, JAS-FBG). Checkout korzysta ze statycznej matrycy (Województwo, waga -> cena).
* **Option 3 (supplier own transport)**: Dostawca narzuca sztywną stawkę za dowiezienie (np. stawkę za kilometr).
* **Option 4 (manually quoted freight)**: Cały proces jest zablokowany przed płatnością. Koszyk jest wysyłany do zespołu operacyjnego, który dogaduje stawkę transportu wielkogabarytowego i aktualizuje Order, po czym klient B2B może dopłacić. UWAGA: Różni się od Offer RFQ (zapytania ofertowego). Tutaj cena towaru jest ustalona (dodany do koszyka), negocjujemy wyłącznie wycenę transportu (freight quote) po dodaniu do checkoutu.
* **Option 5 (deferred freight quote)**: Klient płaci za towar w koszyku, a transport (Deferred freight quote) opłaca osobnym procesem / dokumentem później. Również oddzielone od Offer RFQ. Skomplikowane procesy rozliczania długu i dopłat za logistykę po zakończeniu zakupów głównego towaru.
* **Option 6 (excluded product categories)**: Całkowity zakaz sprzedaży przedmiotów niemieszczących się na palecie w modelu MVP (maszyny CNC, dźwigi) – wyrzucenie ich z katalogu.

* **Impact on offerModel**: Należy zdefiniować na ofercie typ gabarytu transportowego i wagę. Zgodnie z wytycznymi biznesowymi, mechanizm Deferred Freight Quote jest całkowicie oddzielony od ścieżki "Zapytanie ofertowe (Offer RFQ)". W procesie RFQ negocjowana jest cena wyrobu (przed zakupem), a w Deferred Freight Quote urealniana jest cena transportu towaru już zamówionego.
* **Impact on fulfillmentModel**: Mapowanie usług partnerskich na cenniki przewoźników kurierskich. Ograniczenie gabarytu uderza w specyficzne rynki.
