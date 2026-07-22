# LOGIMARKET — FINANCIAL AND TRANSACTION MODELS (LM-DROP-DOMAIN-56A-R2A)

**Wersja:** 1.0.0
**Data:** 2026-07-22
**Cel:** Porównanie wariantów architektury transakcyjno-finansowej w modelu dropshippingowym MVP (szczegóły dla DEC-DROP-01, DEC-DROP-02, DEC-DROP-03, DEC-DROP-04)

> UWAGA: Zgodnie z wytycznymi R2A, żaden z poniższych modeli nie jest wskazany jako zatwierdzony. Przedstawiono równe porównanie konsekwencji, ryzyk i zależności celem podjęcia decyzji w R2B.

## 1. PORÓWNANIE WARIANTÓW (DEC-DROP-01, DEC-DROP-02, DEC-DROP-03, DEC-DROP-04)

### MODEL A — Resale / Trading Margin (Odsprzedaż / Kupno-Sprzedaż)
W modelu A, LogiMarket nabywa towar od Partnera (Dostawcy) z chwilą jego sprzedaży i bezpośrednio odsprzedaje go Kupującemu B2B, stając się de facto stroną łańcucha dostaw handlowych.
* **Merchant of Record**: LogiMarket.
* **Seller of Record**: LogiMarket.
* **Invoice issuer**: LogiMarket (wystawia fakturę VAT/proforma na 100% wartości zamówienia dla Kupującego B2B).
* **Payment collector**: LogiMarket (środki trafiają na konto operacyjne LogiMarket z bramki PSP).
* **Ownership of funds**: Pieniądze stanowią bezpośredni przychód i aktywa operacyjne LogiMarket; zobowiązanie wobec Partnera to zobowiązanie z tytułu dostaw towaru.
* **Supplier invoice flow**: Partner Dropshippingowy wystawia fakturę sprzedaży (B2B) towarów na rzecz LogiMarket za cenę hurtową (Buy Price).
* **Customer invoice flow**: LogiMarket wystawia fakturę sprzedaży towarów do Kupującego B2B (Sell Price).
* **Margin or commission**: Model biznesowy to klasyczna marża handlowa (Sell Price - Buy Price).
* **Settlement timing**: Uregulowanie faktury zakupowej dostawcy odbywa się po dostawie według zdefiniowanego harmonogramu lub z dołu (np. raz na tydzień / raz w miesiącu, terminy kredytu kupieckiego).
* **Refund responsibility**: LogiMarket jako wystawca faktury realizuje bezpośrednie zwroty (korekty faktur) na rzecz Kupującego.
* **Chargeback responsibility**: LogiMarket jako Merchant of Record ponosi wyłączne ryzyko chargebacków z PSP.
* **VAT/KSeF implications**: Wymagana pełna obsługa faktur kosztowych (zakup towarów od Partnera) oraz faktur sprzedażowych przez zintegrowany KSeF. Skomplikowane przy zwrotach.
* **Working-capital requirement**: Bardzo wysokie. LogiMarket odpowiada za środki płynne na koncie do obsługi refundacji, chargebacków i ewentualnych braków wpłat od PSP.
* **PSP/KYC/AML implications**: Niskie do średnich. LogiMarket jest jedynym handlowcem rozliczanym przez PSP. Partnerzy nie przechodzą weryfikacji KYC/AML przez dostawcę płatności.
* **Contractual requirements**: Umowa zakupu towaru (B2B) zawarta z Partnerem, zlecająca realizację przesyłki w modelu dropshippingu (zlecona dostawa).
* **Operational complexity**: Wymaga utrzymania logiki księgowo-magazynowej (przyjęcie WZ i wydanie na dokumentach pomimo braku fizycznego stocku) lub tzw. księgowości back-to-back.
* **Technical complexity**: Średnia. Nie wymaga dzielenia koszyka płatności (split payments) w PSP; wystarczy pojedyncze żądanie płatności.
* **Main risks**: Najwyższe ryzyko prawne i operacyjne (wady produktu, rękojmia ciążą bezpośrednio na LogiMarket). Znaczące zaangażowanie kapitału pracującego.

### MODEL B — Agency / Commission (Pośrednictwo / Prowizyjny)
W modelu B, LogiMarket pełni rolę agenta (platformy pośredniczącej), kojarząc strony. Partner (Dostawca) jest faktycznym sprzedawcą towaru.
* **Merchant of Record**: LogiMarket (LogiMarket udostępnia swoją bramkę PSP celem ułatwienia zakupów, inkasując należność w imieniu Partnera).
* **Seller of Record**: Partner Dropshippingowy.
* **Invoice issuer**: Partner (faktura za towar bezpośrednio na Kupującego B2B).
* **Payment collector**: LogiMarket inkasuje opłatę jako agent/pośrednik na sub-konto, depozyt lub wydzielone konto powiernicze (zależne od statusu MIP/KIP, jeśli dotyczy).
* **Ownership of funds**: Środki wpłacone przez Kupującego, po potrąceniu prowizji, prawnie stanowią własność Partnera (depozyt).
* **Supplier invoice flow**: Partner wystawia fakturę za sprzedany towar bezpośrednio Kupującemu (Sell Price). LogiMarket wystawia Partnerowi osobną fakturę za usługi pośrednictwa (Prowizja).
* **Customer invoice flow**: Kupujący B2B otrzymuje fakturę za towar od Partnera w paczce lub e-mailem.
* **Margin or commission**: Model biznesowy to prowizja % (lub stała opłata) od przeprowadzonej transakcji (Commission).
* **Settlement timing**: Środki zebrane od Kupujących muszą zostać fizycznie przekazane Partnerowi (pomniejszone o prowizję platformy) według ustalonego cyklu settlementu (np. co 14 dni).
* **Refund responsibility**: Prawnie to Partner dokonuje zwrotu i korekty faktury. Operacyjnie to LogiMarket dokonuje technicznego zlecenia refundu na bramce PSP ze środków zebranych (lub po odliczeniach od przyszłych wypłat).
* **Chargeback responsibility**: Chargeback uderza w konto LogiMarket, system musi przenieść jego koszt na saldo Partnera.
* **VAT/KSeF implications**: Uproszczone z punktu widzenia sprzedaży towaru (LogiMarket nie wystawia uciążliwych faktur zakupowych/sprzedażowych za towar; wystawia jedynie fakturę zbiorczą na usługi). Kłopotliwe dla Kupującego przy Multi-Partner Order (wiele faktur do jednego przelewu).
* **Working-capital requirement**: Wymagane oddzielenie środków operacyjnych od środków zdeponowanych dla partnerów.
* **PSP/KYC/AML implications**: Ograniczenia i ryzyka w związku z dyrektywą PSD2/PSD3. Inkasowanie środków w imieniu osób trzecich bez licencji KIP/MIP może wymagać tzw. zwolnienia handlowego (Commercial Agent Exemption). Złożona weryfikacja prawna u operatora płatności (MoR bez SoR jest niechętnie akceptowane).
* **Contractual requirements**: Umowa powiernictwa, pośrednictwa handlowego oraz odpowiednio skonstruowany regulamin zakupów platformy (informujący Kupującego, kto jest właściwym Sprzedawcą).
* **Operational complexity**: Wymagany skomplikowany, samodzielnie wdrażany rejestr finansowy (ledger) by oddzielić prowizję, potrącenia, zaległości Partnerów od wpływów brutto.
* **Technical complexity**: Znacząca, gdyż każda modyfikacja płatności w order_items musi generować korekty w bilansie wypłat do Partnerów.
* **Main risks**: Bardzo wysokie ryzyko regulacyjne wynikające z przepisów finansowych o usługach płatniczych (brak licencji KIP); opór kupujących B2B przed otrzymywaniem faktury od innej firmy niż ta, której dokonali przelewu.

### MODEL C — Marketplace PSP Split / Managed Pay-out
Rozwinięcie modelu B, gdzie odpowiedzialność za rozliczanie strumieni pieniężnych (settlement) i compliance przejmuje wykwalifikowany Dostawca Usług Płatniczych, np. Stripe Connect, Adyen for Platforms.
* **Merchant of Record**: Architektura hybrydowa, zazwyczaj to Operator PSP, a LogiMarket jest Platformą.
* **Seller of Record**: Partner Dropshippingowy.
* **Invoice issuer**: Partner Dropshippingowy.
* **Payment collector**: Platforma współpracuje ze zintegrowanym PSP, który dzieli strumień płatności: Buy Price kierowany do portfela Partnera, Prowizja do portfela LogiMarket.
* **Ownership of funds**: Bezpośrednia własność Partnera (portfel PSP prowadzony przez Operatora Płatności), brak "przechodzenia" kapitału przez rachunki bankowe LogiMarket.
* **Supplier invoice flow**: Analogicznie do Modelu B.
* **Customer invoice flow**: Analogicznie do Modelu B.
* **Margin or commission**: Prowizja potrącana z góry i lokowana na sub-koncie LogiMarket.
* **Settlement timing**: Auto-realizowane przez PSP (np. z chwilą potwierdzenia "delivered" webhook API zleca PSP wypłatę).
* **Refund responsibility**: PSP blokuje portfel partnera i cofa środki z odpowiednich portfeli.
* **Chargeback responsibility**: Ryzyko finansowe (balance negative) przeniesione w dużej mierze na Partnera bezpośrednio powiązanego z portfelem PSP.
* **VAT/KSeF implications**: Jak w modelu B.
* **Working-capital requirement**: Niskie. Płynność zapewniana z przepływów PSP, LogiMarket nie musi "kredytować" wpłat własnymi środkami operacyjnymi.
* **PSP/KYC/AML implications**: BARDZO WYSOKIE dla dostawców. Zanim dostawca dropshippingowy zrealizuje pierwsze zamówienie, musi przejść pełen proces KYC, przesłać wyciągi z KRS, dowody osobiste beneficjentów rzeczywistych i założyć własne konto techniczne u dostawcy PSP (często z oporami i wysokim odsetkiem porzuceń onboardingowych).
* **Contractual requirements**: Zgoda na Platform Terms and Conditions w danym PSP.
* **Operational complexity**: LogiMarket nie musi zajmować się systemem rozrachunków, ale musi zapewnić proces onboardingu i pomoc techniczną dla dostawców.
* **Technical complexity**: Integracja z zaawansowanym API PSP, wymóg utrzymywania rozliczeń on-us / off-us oraz pełnego śledzenia ledger-u zewnętrznego w bazie LogiMarket. Zależność od platform-specific API (vendor lock-in).
* **Main risks**: Duże obniżenie tempa zdobywania nowych dostawców z uwagi na formalności (tzw. "Bariera KYC"). W B2B ryzykowny model przy Multi-Partner Order, który staje się trudny do zafakturowania przez 3 oddzielne podmioty podczas jednego zakupu.

## 2. DETAILED DECISION CARDS: DEC-DROP-01 TO DEC-DROP-04

### DEC-DROP-01: Merchant of Record (MoR)
1. **Decision question**: Kto występuje jako podmiot rozliczający płatność bezgotówkową kupującego i zarejestrowany na bramce płatności?
2. **Why the decision is required**: Określa z kim Kupujący zawiera transakcję finansową.
3. **Options**: Option 1 (LogiMarket), Option 2 (Partner), Option 3 (Managed PSP).
4. **Current architectural recommendation**: Zgodnie z wariantem Model A, LogiMarket. W przypadku zatwierdzenia Modelu B, rekomendacja ulega zmianie na Partner lub Managed PSP.
5. **Business consequences**: Opcja 1: Pełna kontrola nad interfejsem kasy, kupujący ma poczucie jednego pewnego kontrahenta.
6. **Legal and tax consequences**: W Opcji 1 (bez bycia SoR) obciążenie ryzykiem regulacyjnym i nadzorem anty-pralniowym z Ustawy o usługach płatniczych.
7. **Financial consequences**: Prowizje od procesorów płatności na koszt LogiMarket, konieczność płynności na chargebacki (przy Opcji 1).
8. **Operational consequences**: W Opcji 1 odpowiedzialność za zgłoszenia sporu transakcyjnego.
9. **Technical consequences**: Opcja 1 to prosta integracja po stronie `LM-DROP-PAYMENT-56E`, ale wymaga samodzielnej obsługi rozrachunków w bazie.
10. **Risks**: Brak akceptacji PSP bez licencji pośrednika, jeśli połączy się MoR (LogiMarket) bez SoR (LogiMarket).
11. **Reversibility**: Zmiana modelu w przyszłości jest wysoce skomplikowana. Zmiana ta wymaga kompletnego refactoringu bazy `payments` oraz `settlements`.
12. **Required approvers**: Właściciel Biznesowy, CFO, Legal Counsel.
13. **Required evidence**: Pisemna autoryzacja.
14. **Blocked sprints**: `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E`.
15. **Questions that remain unanswered**: Jaka jest polityka chargebacków z wybranym PSP w kontekście B2B?

### DEC-DROP-02: Seller of Record (SoR)
1. **Decision question**: Kto formalnie sprzedaje towar Kupującemu B2B na gruncie prawa handlowego?
2. **Why the decision is required**: Stanowi bazę do zdefiniowania procesu fakturowania B2B, KSeF oraz odpowiedniego zaksięgowania transakcji.
3. **Options**: Option 1 (LogiMarket jako sprzedawca B2B w modelu odsprzedaży / Model A), Option 2 (Partner Dropshippingowy jako sprzedawca B2B / Model B).
4. **Current architectural recommendation**: (Warunkowo): W przypadku akceptacji ryzyka księgowego Modelu A - Option 1. Brak definitywnej rekomendacji z powodu LEG-GATE-01.
5. **Business consequences**: Option 1 gwarantuje jednorodne i spójne fakturowanie, kluczowe dla firmowych nabywców w Polsce, którzy nie chcą tracić czasu na księgowanie wielu małych faktur z 1 zamówienia.
6. **Legal and tax consequences**: W Opcji 1 jako Sprzedawca, LogiMarket bierze na siebie pełną rękojmię, wady prawne i produktowe w stosunku do Kupującego (z ewentualnym prawem regresu).
7. **Financial consequences**: W Opcji 1 konieczność ewidencji 100% wartości sprzedaży jako przychodu oraz 100% kwot faktur Partnerów jako kosztu sprzedanych towarów (COGS).
8. **Operational consequences**: W Opcji 1 Zespół Customer Service musi działać w pierwszej linii zgłoszeń reklamacyjnych (DEC-DROP-13).
9. **Technical consequences**: W Opcji 1 - proste modelowanie, jeden obiekt "Faktura LogiMarket", jeden "Kosz". Opcja 2 mocno komplikuje `LM-DROP-ORDER-56C`.
10. **Risks**: Utrata zwolnienia ze statusu hurtowni / dystrybutora (wymogi recyklingowe, BDO, EPR itp.) przy wprowadzaniu produktów na rynek w Opcji 1.
11. **Reversibility**: Zmiana wariantu jest praktycznie migracją operacyjną całej firmy.
12. **Required approvers**: Legal Counsel, CFO.
13. **Required evidence**: Formalna notatka po konsultacji prawnej (Opinia Prawna).
14. **Blocked sprints**: `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3`.
15. **Questions that remain unanswered**: Kto pokrywa ryzyka gwarancji dla wyrobów nieposiadających autoryzowanych serwisów na terenie kraju nabywcy, jeśli wyłączymy rękojmię?

### DEC-DROP-03: Podmiot Wystawiający Fakturę
1. **Decision question**: Kto i w jakim trybie wystawia fakturę VAT/proforma dla Kupującego B2B?
2. **Why the decision is required**: Dla integracji z oprogramowaniem księgowym LogiMarket i KSeF.
3. **Options**: Option 1 (LogiMarket), Option 2 (Partner Dropshippingowy).
4. **Current architectural recommendation**: W przypadku Modelu A: Option 1.
5. **Business consequences**: Option 1: Uproszczenie zakupów B2B. Jeden przelew, jedna faktura.
6. **Legal and tax consequences**: Ściśle zależne od rozstrzygnięcia SoR (DEC-DROP-02).
7. **Financial consequences**: Powiązanie modułu checkout z wystawieniem faktury lub proformy.
8. **Operational consequences**: Zespół księgowy musi obsłużyć większy wolumen faktur sprzedażowych LogiMarket (fakturowanie 100% zamówień na rzecz Kupującego) w Opcji 1.
9. **Technical consequences**: Niezbędna struktura tabel z audytem dokumentów księgowych w sprincie `LM-DROP-SCHEMA-56B3`.
10. **Risks**: Ryzyko utraty zaufania kupującego, jeśli faktury są opóźnione w KSeF w wyniku ewentualnych awarii integracji.
11. **Reversibility**: Niskie do średniego kosztu zmiany technologicznej, ogromny koszt organizacyjny.
12. **Required approvers**: Finance / Legal.
13. **Required evidence**: Pisemna decyzja i wytyczne KSeF.
14. **Blocked sprints**: `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3`.
15. **Questions that remain unanswered**: Kiedy wygenerować dokument księgowy (w chwili złożenia draft order, opłacenia, czy wysyłki)?

### DEC-DROP-04: Podmiot Pobierający Płatność
1. **Decision question**: Na czyje konto trafiają środki wpłacane przez kupującego na bramce płatności?
2. **Why the decision is required**: Wyznacza główny podmiot realizujący przepływ pieniężny (cashflow) platformy i odpowiadający za potrącenie swojej marży.
3. **Options**: Option 1 (Konto operacyjne LogiMarket), Option 2 (Sub-konto dostawcy PSP / Model C).
4. **Current architectural recommendation**: W Opcji Model A/B: Option 1. W Opcji Model C: Option 2.
5. **Business consequences**: Opcja 1 daje możliwość zaoferowania kredytu kupieckiego na ryzyko LogiMarket.
6. **Legal and tax consequences**: Opcja 1 przy braku SoR wiąże się z ryzykiem braku licencji KIP (zależne od analizy LEG-GATE-01).
7. **Financial consequences**: Opcja 1 generuje znaczne przychody na konto w początkowej fazie obrotu, co poprawia wskaźniki płynności LogiMarket.
8. **Operational consequences**: Opcja 1 wymusza cykliczne audyty finansowe, księgowanie splitów i wypłat do dziesiątek dostawców ("payout runs").
9. **Technical consequences**: `LM-DROP-SCHEMA-56B3` Ledger Scheme musi zostać zaprogramowany bardzo bezpiecznie, gwarantując niezmienne double-entry.
10. **Risks**: W Opcji 1 - błędy techniczne w wypłatach (settlement run) obciążają kapitał LogiMarket.
11. **Reversibility**: Zmiana wiąże się ze zwrotem kontraktów do wszystkich dostawców dropshippingowych.
12. **Required approvers**: CFO.
13. **Required evidence**: Zaakceptowany proces z Działem Księgowości oraz bankiem/PSP.
14. **Blocked sprints**: `LM-DROP-DATA-MODEL-56B0, LM-DROP-SCHEMA-56B3, LM-DROP-PAYMENT-56E`.
15. **Questions that remain unanswered**: Czy planowane jest wdrożenie specjalnych rachunków powierniczych (Escrow)?
