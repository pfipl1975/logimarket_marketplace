# LOGIMARKET — OPERATIONAL DECISIONS (LM-DROP-DOMAIN-56A-R2A)

**Wersja:** 1.0.0
**Data:** 2026-07-22
**Cel:** Neutralna analiza wariantów operacyjnych procesu zamówień, płatności i logistyki.

Wszystkie warianty poniżej przedstawione są neutralnie do czasu ich formalnego zatwierdzenia przez biznes.
Żadne zadanie opisane w tym dokumencie nie jest z góry uznane za obowiązujący proces.

## DECISION CARDS CONDITIONALS

* **DEC-DROP-12 (Refund Processing):** Jeśli wariant scentralizowany zostanie zatwierdzony, to LogiMarket będzie wyłącznym podmiotem wykonującym fizyczny zwrot środków (refund) dla Kupującego w systemie płatności.
* **DEC-DROP-17 (Multi-Partner Order):** Jeśli dzielenie koszyka zostanie zatwierdzone, to jedno zamówienie główne klienta będzie w systemie mapowane na wiele sub-zamówień (per dostawca), co wymusi wieloelementową obsługę dostawy i płatności.
* **DEC-DROP-21 (Payment Methods):** Zestawienie wariantów znajduje się poniżej (PAYMENT MATRIX). Logika księgowa dla koszyka uruchomi się po wskazaniu wybranego modelu dla MVP.
* **DEC-DROP-22 (Freight Methods):** Zestawienie wariantów logistycznych znajduje się poniżej (FREIGHT MATRIX). Mechanizmy wyceny i realizacji wysyłek zostaną oparte na wybranym i zatwierdzonym wariancie.

---

## 1. PAYMENT MATRIX (DEC-DROP-21)

Poniższa tabela zbiera 6 możliwych wariantów płatności w MVP dla modelu dropshipping.

| PAYMENT_VARIANT | ORDER_PLACED_WHEN | SUPPLIER_HANDOFF_WHEN | FUNDS_AVAILABLE_WHEN | FAILURE_PATH | EXPIRY_PATH | REFUND_PATH | CANCELLATION_PATH | ACCOUNTING_IMPACT | CREDIT_RISK | LEGAL_GATES | TECHNICAL_IMPLICATIONS | OPEN_QUESTIONS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1: Online payment with immediate capture** | Z chwilą poprawnej płatności | Natychmiast po `placed` | T+0 (bramka) / T+1 (konto) | Błąd bramki -> Retry / Cancel | N/A (odrzucenie natychmiastowe) | Zwrot z konta bramki | Przerwanie sesji płatniczej | Natychmiastowy obowiązek FV | Brak dla platformy | LEG-GATE-10, LEG-GATE-11 | Konieczność integracji z webhookami PSP (np. PayU, Stripe) | Co jeśli dostawca odrzuci w pełni opłacone zamówienie z braku stanu? |
| **2: Authorization and later capture** | Z chwilą udanej autoryzacji karty | Po udanej autoryzacji (`authorized`) | Z chwilą capture (zwykle wysyłka) | Autoryzacja odrzucona | Wygaśnięcie autoryzacji (np. 7 dni) | Void autoryzacji / Partial capture | Zwolnienie blokady na karcie | FV dopiero przy capture (moment sprzedaży) | Brak, jeśli capture wykonane w terminie | LEG-GATE-10 | Wymaga skomplikowanego cyklu życia płatności (Auth/Capture/Void) | Czy wszyscy polscy klienci B2B posiadają karty kredytowe służbowe? |
| **3: Bank transfer prepayment** | Z chwilą kliknięcia "Zamawiam i płacę" | Po ręcznym zaksięgowaniu wpłaty | Gdy przelew trafi na konto | Brak wpłaty | Anulowanie po X dniach bez wpłaty | Tradycyjny przelew zwrotny | Zamówienie anulowane przed wpłatą | Rozliczanie ręczne wyciągów bankowych | Brak (przedpłata) | LEG-GATE-10 | Ręczne przypisywanie wpłat do Order ID (duży narzut w panelu admina) | Ile dni czekać na przelew przed auto-cancellation? |
| **4: Pro forma** | Z chwilą kliknięcia "Zamawiam z obow. zapłaty" | Po potwierdzeniu opłacenia pro formy | Gdy przelew z pro formy trafi na konto | Niezapłacona pro forma | Wygaśnięcie pro formy (np. 14 dni) | Przelew zwrotny | Korekta dokumentu / Anulacja | FV Zaliczkowa / FV Końcowa | Brak (przedpłata) | LEG-GATE-10, LEG-GATE-02 | Generowanie poprawnego dokumentu pro forma z danymi konta w PDF | Kto wystawia pro formę w modelu B (Agencyjnym)? |
| **5: Deferred payment (Kredyt Kupiecki)** | Z chwilą zatwierdzenia limitu / kliknięcia | Natychmiast po `placed` | Zgodnie z terminem faktury (np. 14, 30 dni) | Brak spłaty po terminie | N/A | Zwrot przez korektę salda / przelew | Korekta faktury / dokumentu | Należność własna z odroczonym terminem | PEŁNE ryzyko LogiMarket | LEG-GATE-12, LEG-GATE-13 | System limitów kupieckich (Scoring klientów B2B) i automatycznych monitów | Kto ponosi koszt windykacji w przypadku braku wpłaty? |
| **6: External B2B financing** | Po zatwierdzeniu wniosku przez zewnętrznego faktora | Po zatwierdzeniu przez faktora | Od faktora w T+1/T+2 | Faktor odrzuca wniosek klienta | Wniosek u faktora wygasa | Zwrot do faktora | Rezygnacja u faktora | Środki otrzymywane od podmiotu 3-go | Przejmuje faktor (za prowizję) | LEG-GATE-12 | Integracja z zewnętrznym API B2B (np. PragmaGO, PayPo B2B) | Jak obsługiwać częściowe zwroty z zewnętrznym faktorem? |

---

## 2. FREIGHT MATRIX (DEC-DROP-22)

Poniższa tabela zbiera 6 możliwych wariantów logistycznych (wyceny i odpowiedzialności za dostawę).

| FREIGHT_VARIANT | ELIGIBLE_CATEGORIES | CHECKOUT_BEHAVIOR | ORDER_TOTAL_FINAL | PAYMENT_CAPTURE_RULE | OPERATOR_INTERVENTION | SUPPLIER_RESPONSIBILITY | CARRIER_RESPONSIBILITY | RETURN_LOGISTICS | LEGAL_GATES | OFFER_MODEL_IMPACT | FULFILLMENT_MODEL_IMPACT | OPEN_QUESTIONS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1: Parcel (Kurier Standard)** | Małe gabaryty, waga do 31kg | Cena znana od razu (Fixed rate z tabeli) | Tak, potwierdzone w checkoucie | Standard Capture | Brak | Pakowanie i wydanie kurierowi | Standardowy regulamin kuriera | Wysyłka zwrotna paczką | LEG-GATE-06 | Płaskie koszty transportu dodawane do oferty | Wymaga generowania etykiet lub zrzucenia tego na dostawcę | Czy etykietę generuje LogiMarket czy dostawca na własnej umowie kurierskiej? |
| **2: Pallet (Przesyłki Paletowe)** | Gabaryty, waga >31kg do 1000kg | Cena znana z góry (Strefy / Kody pocztowe) | Tak, potwierdzone w checkoucie | Standard Capture | Brak / Tylko monitorowanie wyjątków | Pakowanie na palecie, przygotowanie listu | Ubezpieczenie palety, czas tranzytu B2B | Paletowy zwrot (kosztowny) | LEG-GATE-06, LEG-GATE-04 | Wymaga tabel wyceny palet od dostawców | Dostawca musi posiadać infrastrukturę do obsługi palet (wózki) | Czy dopuszczamy zwroty B2B produktów paletowych? |
| **3: Own transport (Transport własny dostawcy)** | Ciężkie maszyny, produkty specjalistyczne | Cena znana od razu lub wg odległości (zł/km) | Tak / Konfiguracja algorytmu KM | Standard Capture | Minimalna | Pełna obsługa logistyki i rozładunku | Brak (Dostawca jest przewoźnikiem) | Odbiór własnym transportem | LEG-GATE-06, LEG-GATE-11 | Wymaga pobierania cenników per KM od dostawcy | Odbicie dowodu dostawy (PoD) w systemie manualnie przez dostawcę | Jak potwierdzić odbiór i przenieść ryzyko, skoro LogiMarket nie ma trackingu od integratora? |
| **4: Manually quoted freight (Przed zamówieniem)** | Niestandardowe, gabaryty powyżej palety | Klient wysyła zapytanie (RFQ), cena nieznana w koszyku | Nie, zamówienie blokowane do wyceny | Capture zablokowane do akceptacji wyceny | Wycena transportu u przewoźników i podanie ceny | Przygotowanie towaru po akceptacji wyceny przez klienta | Zależnie od wybranego dedykowanego transportu | Ustalane indywidualnie | LEG-GATE-06 | Konwertuje produkt w proces RFQ (oferty) | Zmiana ścieżki na "Zamów z wyceną" | Jak długo klient ma ważną ofertę na transport niestandardowy? |
| **5: Deferred freight quote (Po dodaniu do koszyka)** | Każdy trudny asortyment logistycznie | Zamówienie "zawieszone", dostawca/operator dodaje koszt po fakcie, klient dopłaca/akceptuje | Nie, koszt dostawy dodany później | Autoryzacja na kwotę koszyka, dopłata osobnym linkiem | Obowiązkowa (dodanie kosztu transportu do zamówienia) | Przygotowanie wyceny i oczekiwanie na wpłatę | Zależnie od przewoźnika | Indywidualnie | LEG-GATE-06 | Produkt w koszyku, ale finalna kwota nieznana w sekundzie 0 | Wymaga stanu *Awaiting Freight Confirmation* i mechanizmu dopłaty (Payment Link) | Czy klient może anulować zamówienie bezpłatnie, jeśli koszt dostawy mu się nie spodoba? |
| **6: Kategorie dopuszczone do MVP** | Decyzja Biznesowa (np. tylko Parcel + Pallet) | Standardowy checkout dla małych/średnich | Tak | Standard Capture | Brak | Standardowa | Standardowa | Standardowa | Brak | Odrzucenie na starcie trudnych kategorii | Prostszy model | Które kategorie ostatecznie odrzucamy w V1? |

### ILLUSTRATIVE STATES — SUBJECT TO DATA MODEL REVIEW

W wariantach `Deferred freight quote` i `Manually quoted freight` mogą być wymagane stany koszyka/zamówienia takie jak:

1. `FREIGHT_QUOTE_PENDING`
2. `AWAITING_FREIGHT_CONFIRMATION`
3. `FREIGHT_CONFIRMED`
4. `FREIGHT_REJECTED`
