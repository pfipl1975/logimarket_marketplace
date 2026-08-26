# LogiMarket — Analiza regulacyjna: rola platformy, zawarcie umowy, P2B, DSA, B2B, disclosure (Worker 01)

**Autor:** analityk prawny (worker regulacyjny — uzupełniony po timeoutcie research subagenta, zweryfikowany w źródłach 9.08.2026)
**Data:** 2026-08-09
**Zakres:** LEG-MKT-01 (rola LogiMarket), LEG-MKT-02 (zawarcie umowy e-commerce + RFQ), LEG-MKT-03 (disclosure sprzedawcy), LEG-MKT-04 (P2B), DSA, LEG-MKT-08 (ograniczenie do B2B), Blok H (kwestie nieujawnione).
**Status:** ANALIZA WSTĘPNA DO WERYFIKACJI PRZEZ KANCELARIĘ — nie stanowi opinii prawnej.

---

## 1. Rola prawna LogiMarket jako pośrednika (LEG-MKT-01)

### 1.1 Kwalifikacja wg Kodeksu cywilnego

Polskie prawo nie zna jednej, zamkniętej konstrukcji "pośrednika marketplace". Do wyboru są trzy konstrukcje:

| Konstrukcja | Podstawa | Kto jest stroną umowy sprzedaży | Czy pasuje do modelu LogiMarket? |
|---|---|---|---|
| **Pośrednictwo przy sprzedaży** | **art. 540 KC** ("Jeżeli umowa sprzedaży zostaje zawarta za pośrednictwem pośrednika, umowa zostaje zawarta między zleceniodawcą a kupującym, chyba że co innego wynika z treści stosunku prawnego nawiązanego przez pośrednika") | **Partner (zleceniodawca) i kupujący** — pośrednik nie jest stroną | **TAK — konstrukcja bazowa, najbliższa intencji biznesowej** |
| **Komis** | art. 765–773 KC | komisant działa w imieniu własnym, na rachunek komitenta → komisant jest stroną | NIE (LogiMarket nie ma być stroną) |
| **Agencja / przedstawicielstwo** | art. 758+ KC / art. 95+ KC | agent/przedstawiciel działa w imieniu i na rachunek dającego zlecenie → strona jest mocodawca, ale agent ma uprawnienie do zawierania umów | CZĘŚCIOWO (jeśli LogiMarket miałby uprawnienie do zawierania umów w imieniu Partnera — nie jest to intencja, akceptacja należy do Partnera) |

**Werdykt: model "Partner = sprzedawca, LogiMarket = pośrednik" jest dopuszczalny i konstruowalny na gruncie art. 540 KC**, pod następującymi warunkami:

1. **Czystość konstrukcji umownej** — regulamin i umowa partnerska muszą jednoznacznie stanowić, że: LogiMarket nie jest stroną umowy sprzedaży, nie nabywa towaru, nie przejmuje ryzyka towarowego, nie odpowiada za zgodność towaru z umową; umowa sprzedaży zawierana jest wyłącznie między Partnerem a kupującym (art. 540 KC).
2. **Język UI i komunikatów** — unikać sformułowań "LogiMarket sprzedaje", "kup od LogiMarket", "zamówienie przyjęte przez LogiMarket". Komunikaty muszą odróżniać: przyjęcie *zamówienia* (techniczne) od przyjęcia *oferty* (kontraktowe). Rekomendowane formuły: "Twoje zamówienie zostało przekazane sprzedawcy i oczekuje na akceptację", "Sprzedawca: [nazwa]".
3. **Identyfikacja sprzedawcy przed konwersją** — patrz sekcja 4 (LEG-MKT-03).
4. **Brak zdarzeń mogących sugerować rolę dostawcy**: LogiMarket nie wystawia faktur za towar (fakturuje wyłącznie prowizję), nie przyjmuje płatności na własny rachunek (tylko orkiestracja PSP — direct pay-out), nie organizuje dostawy we własnym imieniu.
5. **Odpowiedzialność platformy** — pozostaje: (a) odpowiedzialność za usługę pośrednictwa (platforma odpowiada za wykonanie usługi platformowej — dostępność, komunikację, routing), (b) odpowiedzialność deliktowa / za treści (DSA — sekcja 5; art. 14 ustawy o świadczeniu usług drogą elektroniczną — brak generalnej odpowiedzialności za treści ofert, o ile platforma nie miała wiedzy o bezprawności i działała po otrzymaniu zawiadomienia), (c) ewentualna odpowiedzialność za własne oświadczenia (np. weryfikacja Partnerów, oznaczenia "zweryfikowany dostawca" — jeśli takie są prezentowane, LogiMarket odpowiada za prawdziwość).

**Wymagane zapisy regulaminowe/umowne (minimalna treść):**
- definicje: Sprzedawca (Partner), Kupujący (Przedsiębiorca), Platforma, Oferta, Zamówienie, Akceptacja;
- oświadczenie, że LogiMarket świadczy usługę pośrednictwa (udostępnianie przestrzeni, prezentacja ofert, obsługa RFQ, koszyk, checkout, komunikacja) i **nie jest stroną umowy sprzedaży**;
- wskazanie, że umowa sprzedaży zawierana jest między Kupującym a Sprzedawcą wg zasad z sekcji 2;
- podział odpowiedzialności: towar/specyfikacja/ceny/dostawa/reklamacje/zwroty/faktura towarowa — Partner; platforma — usługa pośrednictwa;
- prawo platformy do moderacji, zawieszenia (zgodnie z P2B — sekcja 6);
- prowizja i zasady fakturowania usługi platformowej.

### 1.2 Skutki niezachowania czystości modelu

Jeśli LogiMarket zacznie: przyjmować płatności na własny rachunek (escrow własny), wystawiać faktury za towar (art. 7 ust. 8 ustawy o VAT — faktura "jak własna"), przejmować własność towaru, organizować dostawę we własnym imieniu lub prezentować się jako sprzedawca — **może zostać uznany za stronę umowy sprzedaży (dostawcę)**, z konsekwencjami: pełna odpowiedzialność kontraktowa, obowiązki VAT towarowe (w tym WDT przy transakcjach transgranicznych), obowiązki konsumenckie (jeśli w grę wchodzi konsument), status "deemed supplier" (art. 14a dyrektywy 2006/112/WE) przy B2C/importowych przesyłkach ≤150 EUR. **Ryzyko jest realne i wzrasta z każdym elementem "zaangażowania w sprzedaż"** — stąd zasada: im mniej LogiMarket "dotyka" transakcji towarowej, tym bezpieczniej.

---

## 2. Moment zawarcia umowy (LEG-MKT-02)

### 2.1 Ramy prawne (KC)

- **Oferta (art. 66 §1 KC):** oświadczenie woli zawarcia umowy, **jeżeli określa istotne postanowienia umowy** (dla sprzedaży: towar + cena + ilość). Oferta wiąże składającego (art. 66 §2 — wiąże, dopóki druga strona nie odpowie / wg terminów z art. 66 §2).
- **Przyjęcie oferty (art. 68–70 KC):** oświadczenie woli przyjmującego; w razie wątpliwości umowa zawarta, gdy przyjmujący **wysłał** oświadczenie przyjęcia (art. 70 §1 zd. 2 — dla kontraktów między nieobecnymi); dla formy elektronicznej istotny jest moment **dotarcia** oświadczenia (art. 61 KC — oświadczenie woli wyrażone w postaci elektronicznej uważa się za złożone drugiej stronie z chwilą, gdy weszło do jej systemu teleinformatycznego w taki sposób, że mogła zapoznać się z jego treścią).
- **Oferta w postaci elektronicznej (art. 66¹ KC):** §1 — oferta złożona w postaci elektronicznej wiąże składającego, jeżeli druga strona **niezwłocznie potwierdzi jej otrzymanie**; §2 — przedsiębiorca składający ofertę w postaci elektronicznej jest obowiązany... (norma dot. informacji — treść do weryfikacji w aktualnym brzmieniu). Dla modelu B2B oznacza to: potwierdzenie otrzymania (E3) ma znaczenie dla **związania ofertą** — nie jest akceptacją.
- **Negocjacje (art. 72 KC):** umowa zawarta, gdy strony dojdą do porozumienia co do wszystkich postanowień; **art. 72¹ KC** — odpowiedzialność za przerwanie negocjacji wbrew dobrym obyczajom; **art. 72² KC** — obowiązek informacyjny przy negocjacjach na odległość z konsumentem (nie dotyczy B2B).
- **Wzorzec umowy (art. 384 KC):** wzorzec w postaci elektronicznej musi być udostępniony przed zawarciem umowy tak, aby strona mogła go **przechowywać i odtwarzać w zwykłym toku czynności**; **art. 384 §4** — wzorzec wydany przy zawarciu umowy wiąże, jeśli strona mogła zapoznać się z jego treścią.
- **Wzorce w umowach z konsumentami (art. 385¹–385³ KC)** — kontrola niedozwolonych postanowień; w B2B — co do zasady brak takiej kontroli (poza klauzulami rażąco naruszającymi dobre obyczaje w relacjach z przedsiębiorcami — art. 58 KC / 353¹ KC).

### 2.2 E-commerce — mapa zdarzeń E1–E9 (ocena)

| ID | Zdarzenie | Kwalifikacja prawna | Werdykt |
|---|---|---|---|
| **E1** | Koszyk | Czynność techniczna/preparacyjna — brak skutku kontraktowego | ✅ Zgodne z intencją biznesową |
| **E2** | Submit checkout (order intent) | **Oferta kupującego** (art. 66 §1 KC) — o ile zawiera istotne postanowienia (towar, ilość, cena, dane dostawy). Prezentacja ofert Partnera na platformie to co do zasady **zaproszenie do składania ofert (invitatio ad offerendum)** — nie wiążąca oferta (chyba że oferta wyraźnie wskazuje wolę związania) | ✅ Model prawidłowy — z zastrzeżeniem jasnego oznaczenia w UI, że złożenie zamówienia jest ofertą kupującego |
| **E3** | Potwierdzenie otrzymania | Potwierdzenie techniczne; dla oferty elektronicznej — warunek związania ofertą (art. 66¹ §1 KC); **nie jest akceptacją** | ✅ — komunikat musi to odzwierciedlać ("potwierdzenie otrzymania oferty") |
| **E4** | Inicjacja płatności | Czynność techniczna (PSP); brak skutku kontraktowego | ✅ |
| **E5** | Preautoryzacja | Blokada środków — **brak skutku dla zawarcia umowy** (nie jest zapłatą ani zaliczką); potwierdza jedynie zdolność płatniczą | ✅ — pod warunkiem braku capture przed akceptacją |
| **E6** | Otrzymanie zamówienia przez Partnera | Przekazanie operacyjne (routing); **nie jest akceptacją** | ✅ |
| **E7** | **Jawna akceptacja Partnera** | **Przyjęcie oferty (art. 68–70 KC) → MOMENT ZAWARCIA UMOWY** (z chwilą dotarcia oświadczenia do kupującego — art. 61 KC; system powinien rejestrować czas dotarcia/udostępnienia) | ✅ **KLUCZOWE ZDARZENIE — umowa zawiera się tutaj** |
| **E8** | Wysyłka | Fulfillment; wysyłka **bez uprzedniej akceptacji** mogłaby być uznana za akceptację dorozumianą (art. 68 §1 KC — przyjęcie przez przystąpienie do wykonania, gdy wynika to z okoliczności/zwyczaju) — ryzyko niepożądanej konkluzji | ⚠️ Ryzyko: wymusić akceptację przed wysyłką (status systemowy) |
| **E9** | Inne | Moment **dotarcia** akceptacji do kupującego (art. 61 KC); ewentualne potwierdzenie umowy wysyłane kupującemu (dobra praktyka, dowód) | Rekomendacja: automatyczne potwierdzenie zawarcia umowy po akceptacji (email + widok statusu) |

**Wniosek: model "order intent + jawna akceptacja Partnera" jest prawidłowo skonstruowany** i zgodny z KC, pod warunkiem:
1. prezentacje Partnerów są oznaczone jako zaproszenie do składania ofert (nie oferty);
2. UI jednoznacznie komunikuje, że złożenie zamówienia = oferta kupującego, a umowa powstaje dopiero po akceptacji sprzedawcy;
3. **capture płatności następuje dopiero po akceptacji** (preautoryzacja przed — OK);
4. system wymusza akceptację/odrzucenie w określonym terminie (brak akceptacji w terminie = brak umowy; w B2B strony mogą też ustalić, że brak odpowiedzi = odmowa — nie domniemywać akceptacji);
5. rejestracja czasów (dotarcie oferty do Partnera, dotarcie akceptacji do kupującego) — na potrzeby dowodowe (art. 61 KC).

### 2.3 RFQ — mapa zdarzeń R1–R8 (ocena)

| ID | Zdarzenie | Kwalifikacja prawna | Werdykt |
|---|---|---|---|
| **R1** | Złożenie RFQ | **Invitatio ad offerendum / rozpoczęcie negocjacji** (art. 72 KC) — zapytanie nie wiąże | ✅ |
| **R2** | Otrzymanie RFQ (routing) | Czynność techniczna platformy | ✅ |
| **R3** | Odpowiedź Partnera | Komunikat negocjacyjny (art. 72 KC) | ✅ |
| **R4** | Wycena/quotation | **Oferta (art. 66 §1 KC)** — jeżeli określa istotne postanowienia i brak zastrzeżenia niewiążącego charakteru; **invitatio** — jeżeli wyraźnie zastrzeżono | ⚠️ Kluczowa decyzja: Q6 wymaga **wyraźnego zastrzeżenia** w treści wyceny |
| **R5** | Negocjacje | Rokowania (art. 72 KC); uwaga na art. 72¹ KC (poufność, dobre obyczaje) | ✅ |
| **R6** | Akceptacja wyceny przez kupującego | Przyjęcie oferty (art. 68–70 KC) — **jeśli** wycena była ofertą wiążącą | ⚠️ |
| **R7** | Potwierdzenie Partnera | Potwierdzenie zawarcia (dobra praktyka) lub element formowania umowy wg art. 72 KC (jeśli porozumienie następuje etapami) | ⚠️ |
| **R8** | Inne | W B2B możliwe zawarcie umowy przez **wymianę dokumentów/wiadomości** — moment: ostatnie porozumiewające się oświadczenie | Rekomendacja: wskazać w regulaminie, że umowa po RFQ zawierana jest poza platformą lub na platformie wg jednoznacznych zasad |

**Jak skutecznie zapewnić niewiążący charakter wyceny (Q6):**
1. **Zastrzeżenie w treści wyceny**: "Wycena ma charakter informacyjny i niewiążący, nie stanowi oferty w rozumieniu art. 66 KC; stanowi zaproszenie do dalszych negocjacji. Wiążąca oferta zostanie złożona przez Sprzedawcę po uzgodnieniu warunków." — wraz z **terminem ważności** ("wycena ważna 7 dni" — sugeruje wolę związania po akceptacji — ostrożnie: lepiej "wycena może ulec zmianie").
2. **UI**: brak przycisku "Akceptuję wycenę" prowadzącego do automatycznego zawarcia umowy; zamiast tego — "Poproś o ofertę wiążącą" / "Przejdź do zamówienia" (ścieżka e-commerce z akceptacją Partnera).
3. **Regulamin**: postanowienie, że odpowiedzi na RFQ i wyceny są elementem rokowań (art. 72 KC) i nie tworzą umowy, dopóki strony nie wymienią jednoznacznych oświadczeń.
4. **Ścieżka konwersji**: jeżeli po RFQ dochodzi do zamówienia przez checkout — stosują się zasady z 2.2 (akceptacja Partnera = zawarcie umowy).

**Uwaga na ryzyko**: w B2B sądy częściej uznają dokument "wycena + zamówienie (PO)" za wystarczający do zawarcia umowy, nawet bez podpisu — stąd kluczowa rola wyraźnych zastrzeżeń i spójnego UI. Samo "domyślnie niewiążące" w dokumentach wewnętrznych nie wystarczy — musi być widoczne dla kupującego.

---

## 3. Disclosure sprzedawcy (LEG-MKT-03)

### 3.1 Obowiązki ustawowe — co jest bezwzględnie wymagane

1. **Ustawa o świadczeniu usług drogą elektroniczną (Dz.U. 2017 poz. 1219)** — art. 5 ust. 1: **LogiMarket jako usługodawca** musi podać własne dane (nazwa, adres, NIP, REGON, dane kontaktowe). To dotyczy platformy, nie Partnerów.
2. **B2B — brak ustawowego obowiązku pełnego disclosure sprzedawcy przed transakcją** (ustawa o prawach konsumenta i jej art. 8–10 obowiązują wyłącznie w relacjach z konsumentami). **Ale**: prawo kontraktowe (art. 60 KC — zgodny zamiar stron), zasada przejrzystości oraz **P2B** (sekcja 6) wymagają: jednoznacznej identyfikacji stron umowy. Bez wskazania sprzedawcy kupujący nie wie, z kim zawiera umowę — ryzyko sporu o ważność/identyfikację kontrahenta oraz odpowiedzialności platformy (pozór działania we własnym imieniu — art. 540 KC "chyba że co innego wynika z treści stosunku").
3. **DSA art. 30 (KYBC)** — dotyczy platform umożliwiających **konsumentom** zawieranie umów z handlowcami; przy czystym B2B **nie dotyczy** (ale patrz LEG-MKT-08 — konsekwencje "przecieku" konsumentów).
4. **P2B art. 9** — obowiązek informowania o **głównych parametrach rankingu** (nie o danych sprzedawcy).
5. **Dobra praktyka rynkowa (benchmark)**: Allegro B2B, Amazon Business, EU Supply itd. ujawniają przed konwersją: nazwę firmy, NIP/VAT ID, adres, dane kontaktowe, oceny. To także element zaufania w B2B.

### 3.2 Rekomendowana macierz pól (odpowiedź na macierz z doc_02 §5)

| Pole / informacja | RFQ (przed submit) | E-commerce (przed order) | Uwagi |
|---|---|---|---|
| Nazwa prawna sprzedawcy | ✅ TAK | ✅ TAK | publiczna; minimalny obowiązek identyfikacji kontrahenta |
| Identyfikatory rejestrowe (NIP/VAT ID, KRS/REGON) | ✅ TAK (NIP lub VAT ID) | ✅ TAK (NIP lub VAT ID) | NIP/VAT ID wystarczy; KRS/REGON — na stronie oferty/w stopce profilu; weryfikacja VIES dla UE |
| Adres siedziby / dane kontaktowe | ✅ adres firmy (nie prywatny) + e-mail kontaktowy | ✅ jw. | zakres publiczny: adres siedziby, e-mail firmowy, telefon firmowy; dane KYB wewnętrzne (beneficjenci, rachunki) — poza widokiem publicznym |
| Kto wystawia fakturę za towar | ✅ "Fakturę wystawia sprzedawca" | ✅ jw. | informacja + identyfikacja wystawcy |
| Kto realizuje dostawę | ✅ TAK (wskazanie Partnera) | ✅ TAK | |
| Kto obsługuje reklamację/zwrot | ✅ TAK | ✅ TAK | w B2B reklamacje wg KC (rękojmia art. 556+, gwarancja) — regulaminowo można zawęzić w B2B (art. 558 KC) |
| Rola LogiMarket | ✅ "Pośrednik — nie jest stroną umowy" | ✅ jw. | komunikat przy checkout i w regulaminie |

**Podstawa prawna:** art. 540 KC (identyfikacja kontrahenta dla ważności stosunku), art. 66 §1 KC (istotne postanowienia oferty), art. 60 KC; uśude art. 5 (dane platformy); P2B art. 9; DSA art. 26 (przejrzystość reklam) — pośrednio.
**Moment:** przed złożeniem RFQ i przed złożeniem zamówienia (nie dopiero po). W checkout — dane sprzedawcy widoczne na stronie oferty + w podsumowaniu zamówienia.
**Rozróżnienie publiczne vs KYB:** publiczne = nazwa, NIP/VAT ID, adres siedziby, e-mail/telefon firmowy, rola w transakcji; wewnętrzne (KYB) = weryfikacja VIES, KRS/CEIDG, białe listy, sankcje, beneficjenci — nieujawniane publicznie (ochrona danych + tajemnica).

---

## 4. Ograniczenie do B2B (LEG-MKT-08)

### 4.1 Czy samo companyName wystarczy?

**NIE.** Pole `companyName` (obecnie jedyne wymagane) nie jest weryfikowalne i nie dowodzi statusu przedsiębiorcy. Jest to również **obecna luka** (doc_03: COMPANY_NAME_REQUIRED=YES, NIP_FIELD_PRESENT=NO, VIES_CURRENTLY_USED=NO, BUSINESS_DECLARATION_PRESENT=NO, AUTHENTICATED_BUSINESS_IDENTITY_PRESENT=NO).

### 4.2 Minimalna metodologia kwalifikacji B2B (warstwowa)

**Warstwa 1 — Deklaracja (bariera wejścia, nie dowód):**
- checkbox oświadczenia: "Składam zamówienie jako przedsiębiorca w rozumieniu art. 43¹ KC"; wymóg wypełnienia pól firmowych (companyName, NIP lub VAT ID, adres firmy).
- Konsekwencja prawna: oświadczenie + podanie NIP = podstawa do przyjęcia, że druga strona działa jako przedsiębiorca (ciężar dowodu przesuwa się na konsumenta, który składa fałszywe oświadczenie).

**Warstwa 2 — Weryfikacja (dowód):**
- **PL**: NIP + weryfikacja w **wykazie podatników VAT (biała lista)** / CEIDG / KRS (API) — potwierdza istnienie i status przedsiębiorcy;
- **UE (RFQ transgraniczne)**: numer VAT UE + **weryfikacja VIES** (status aktywny);
- **Alternatywa dla podmiotów spoza VAT**: REGON/KRS (PL), rejestr handlowy kraju siedziby (UE), oświadczenie + dokumenty rejestrowe do weryfikacji manualnej.

**Warstwa 3 — Wzmocnienia (według ryzyka):**
- firmowy adres e-mail / domena domeny firmowej (słaby sygnał — nie wyklucza);
- manualna weryfikacja dla wysokich wartości / pierwszej transakcji (KYB — patrz worker_03, sekcja 6.2);
- monitoring: cykliczna re-weryfikacja VIES/CEIDG, alerty o zmianie statusu VAT (wygaszenie NIP).

**Warstwa 4 — Zabezpieczenia prawne:**
- regulamin: definicja Kupującego = przedsiębiorca; zakaz korzystania przez konsumentów; oświadczenia i odpowiedzialność za fałszywe oświadczenia;
- klauzula: "Jeżeli mimo to zamówienie zostanie złożone przez konsumenta, zastosowanie znajdą bezwzględnie wiążące przepisy o ochronie konsumentów" (nie da się ich wyłączyć umownie — ale świadomość ryzyka);
- **UI**: pola NIP/VAT ID + weryfikacja VIES w czasie rzeczywistym (obecnie NIP_FIELD_PRESENT=NO — **wymagana zmiana schematu** — to bezpośredni input dla 56B1).

### 4.3 Konsekwencje braku skutecznej kwalifikacji

1. **Konsument "przecieknie"** → pełny reżim ochrony konsumenta: prawo odstąpienia 14 dni (ustawa o prawach konsumenta art. 27), obowiązki informacyjne (art. 8–10), rękojmia konsumencka (art. 43a+ ustawy), zakaz niedozwolonych postanowień (art. 385¹ KC), odpowiedzialność UOKiK.
2. **DSA art. 30 (KYBC)** — zacznie dotyczyć platformy, jeśli platforma **umożliwia konsumentom** zawieranie umów (nawet niezamierzenie — decyduje faktyczna funkcjonalność).
3. **VAT**: transakcja z konsumentem może uruchomić reguły B2C (OSS przy transgranicznej sprzedaży na odległość; deemed supplier przy imporcie ≤150 EUR).
4. **Ryzyko reputacyjne i UOKiK** (praktyki wprowadzające w błąd — "platforma B2B", na której kupują konsumenci, bez praw konsumenckich).
5. **Orzecznictwo**: sądy oceniają status konsumenta **obiektywnie** (art. 22¹ KC — czynności niezwiązane bezpośrednio z działalnością gospodarczą), a nie wg oświadczeń — sama deklaracja nie wyłącza ochrony, jeśli faktycznie kupuje konsument.

**Werdykt:** metodologia = deklaracja + NIP/VAT ID + weryfikacja rejestrowa (biała lista/CEIDG/KRS/VIES) + monitoring; samo companyName **niewystarczające**. Wymagane zmiany: schemat danych (NIP/VAT ID, status weryfikacji), UI (pola + komunikaty + walidacja), regulamin (definicje, oświadczenia), proces (KYB onboarding — patrz worker_03).

---

## 5. DSA — klasyfikacja LogiMarket (DSA gate)

### 5.1 Kwalifikacja usługi

| Poziom | Definicja (art. 3 DSA) | LogiMarket? |
|---|---|---|
| **Usługa pośrednia** (art. 3(g)) | usługa "mere conduit", "caching" lub "hosting" (art. 3(g)(i)-(iii)) | ✅ TAK — jako minimum hosting (przechowywanie informacji ofert na żądanie odbiorcy) |
| **Hosting** (art. 3(g)(iii)) | przechowywanie informacji na żądanie usługobiorcy | ✅ TAK — oferty Partnerów przechowywane i udostępniane |
| **Platforma internetowa** (art. 3(i)) | usługa hostingowa, która **na żądanie odbiorcy przechowuje i rozpowszechnia informacje publicznie** | ✅ **Prawdopodobnie TAK** — oferty Partnerów są rozpowszechniane "do publicznej wiadomości" (art. 3(k): "do publicznej wiadomości" = do nieokreślonej liczby odbiorców) — **nawet przy ograniczeniu do zarejestrowanych kupujących B2B** (liczba odbiorców nieokreślona) |
| Wyszukiwarka (art. 3(j)) | — | NIE |

**Wniosek: LogiMarket jest najprawdopodobniej "platformą internetową" (art. 3(i) DSA), co najmniej usługodawcą hostingowym.** Kwalifikacja nie zależy od B2B/B2C — zależy od rozpowszechniania informacji "do publicznej wiadomości". *Zastrzeżenie: dokładna ocena zależy od faktycznej funkcjonalności (czy oferty są widoczne bez logowania / czy tylko dla zweryfikowanych kupujących; czy system jest "zaprojektowany" do rozpowszechniania).*

### 5.2 Obowiązki DSA mające zastosowanie do MVP

| Obowiązek | Art. DSA | Zastosowanie do MVP (B2B, mały podmiot) |
|---|---|---|
| Punkt kontaktowy (single point of contact) | art. 11 | ✅ TAK (jeśli zarejestrowany/ustanowiony w UE — podmiot PL, wystarczy punkt kontaktowy) |
| Warunki korzystania z usługi — informacje o ograniczeniach | art. 13 | ✅ TAK (regulamin — klauzule o moderacji, zawieszeniach, blokadach) |
| Przejrzystość — sprawozdawczość dot. treści bezprawnych (co 6 mies.) | art. 15 | ✅ TAK dla hostingu/platformy (zakres dla mikro — uproszczony) |
| Mechanizm zgłaszania nielegalnych treści (notice & action) | art. 16 | ⚠️ **WYŁĄCZONE dla mikro i małych przedsiębiorstw** (art. 19 ust. 2 DSA — <50 pracowników i ≤10 mln EUR obrotu) — ale dobra praktyka wdrożyć uproszczony mechanizm |
| Uzasadnienie decyzji o ograniczeniach (statement of reasons) | art. 17 | ⚠️ jw. — wyłączone dla mikro/małych; rekomendowane (spójność z P2B art. 7) |
| Zgłaszanie podejrzeń przestępstw | art. 18 | ⚠️ jw. wyłączone dla mikro/małych |
| System wewnętrznego rozpatrywania skarg | art. 20(1) | ⚠️ jw. wyłączone dla mikro/małych |
| Pozasądowe rozstrzyganie sporów | art. 21 | ⚠️ jw. wyłączone dla mikro/małych |
| Sprawozdawczość przejrzystości platform (co 6 mies.) | art. 24 | ⚠️ wyłączone dla mikro/małych (art. 19(1)? — zweryfikować dokładny zakres wyłączeń) |
| Przejrzystość reklam (oznaczenie reklam, kto płaci) | art. 26 | ✅ TAK (jeśli reklamy/pozycje sponsorowane — MVP: brak paid rankingu, ale oznaczać wszelkie treści promocyjne) |
| Przejrzystość systemów rekomendacji | art. 27 | ⚠️ TAK **jeśli** istnieje "system rekomendacji" (art. 3(s) — w pełni lub częściowo zautomatyzowany system sugerowania informacji); **MVP z rankingiem ręcznym/edytorskim — prawdopodobnie POZA definicją** — do potwierdzenia przy pierwszym algorytmicznym sortowaniu |
| Obowiązki dot. nieletnich | art. 28 | NIE dotyczy (B2B) |
| **Śledzenie handlowców (KYBC)** | art. 30 | **NIE dotyczy przy czystym B2B** (dotyczy platform umożliwiających **konsumentom** zawieranie umów); ✅ dotyczy, jeśli konsument "przecieknie" |
| Wymóg informacji o handlowcach (wyświetlanie) | art. 31 | ⚠️ tylko w zakresie art. 30 |
| Losowe kontrole handlowców | art. 32 | ⚠️ tylko w zakresie art. 30 |
| **Zwolnienia z odpowiedzialności** (mere conduit/caching/hosting) | art. 4–6 | ✅ TAK — LogiMarket jako hosting **nie odpowiada za treści ofert**, o ile: nie ma faktycznej wiedzy o bezprawnych treściach, po uzyskaniu wiedzy działa niezwłocznie (usunięcie/blokada), nie modyfikuje informacji — **warunek: zachować neutralność techniczną** (nie stawać się "aktywnym" współtwórcą treści ofert) |

**Werdykt DSA:** usługa kwalifikuje się jako platforma internetowa (lub co najmniej hosting). **MVP (mały podmiot, B2B):** obowiązki podstawowe (art. 11, 13, 15, 26) + zwolnienia z odpowiedzialności (art. 4–6); obowiązki art. 16–18, 20–22, 24 — **prawdopodobnie wyłączone dla mikro/małych** (art. 19 DSA — zweryfikować dokładną listę wyłączeń); art. 30 (KYBC) — nie dotyczy przy B2B-only. **Niezależnie od P2B** (P2B i DSA to odrębne reżimy — obowiązki mogą się nakładać/uzupełniać).

**Wymagane zapisy:** regulamin — warunki korzystania z usługi (art. 13 DSA: zasady moderacji, zawieszeń, blokad, zgłaszania), punkt kontaktowy (art. 11), uproszczony mechanizm zgłoszeń (rekomendacja mimo wyłączenia), oznaczenia treści promocyjnych (art. 26), informacja o ręcznym rankingu (art. 27 — jeśli zastosowanie).

---

## 6. P2B (LEG-MKT-04) — zastosowanie i obowiązki

### 6.1 Czy P2B ma zastosowanie do B2B-only marketplace?

**TAK — P2B z definicji dotyczy relacji B2B.** Rozporządzenie (UE) 2019/1150 chroni **komercyjnych użytkowników** (business users) platform względem **dostawców usług pośrednictwa internetowego**. LogiMarket świadczy usługi pośrednictwa internetowego (art. 2 pkt 2 P2B: usługa pośrednictwa między klientami a komercyjnymi użytkownikami w celu ułatwienia transakcji B2B) na rzecz **Partnerów** (komercyjni użytkownicy — art. 2 pkt 1). Fakt, że platforma jest "B2B-only" **nie wyłącza** P2B — wręcz przeciwnie, P2B zakłada relacje z przedsiębiorcami. **Zastrzeżenie z doc_02 ("prosimy nie zakładać automatycznego zastosowania P2B") jest nietrafne w świetle definicji** — zastosowanie P2B jest zasadą, nie wyjątkiem; wyłączenia (art. 1 ust. 3–4: płatności online, reklama online, usługi adtech, platformy wymiany handlowej giełd...) nie dotyczą marketplace.

**Wyjątki od stosowania (art. 1 ust. 3–4 P2B):** internetowe usługi płatnicze, narzędzia reklamowe, giełdy papierów wartościowych — **nie dotyczą** LogiMarket. **Wyłączenie podmiotowe:** art. 1 ust. 2 — nie stosuje się do małych dostawców (do 1 mln EUR obrotu i <10 pracowników) **świadczących usługi tylko w jednym państwie członkowskim** — przy RFQ transgranicznym (PL+UE) to wyłączenie **nie zadziała** (usługi w więcej niż jednym państwie).

### 6.2 Obowiązki P2B — mapa dla LogiMarket

| Obowiązek | Art. P2B | Wdrożenie w LogiMarket |
|---|---|---|
| **Przejrzyste warunki** (jasny język, dostępne, kompletne: zakres, kryteria rankingu, dane dotyczące dostępu do danych, ochrona IP, sposoby rozwiązania) | art. 3, 5 | Regulamin + umowa partnerska: pełny katalog informacji z art. 5 ust. 1 (m.in. parametry rankingu, prawo do danych, własność intelektualna, zawieszenia) |
| **Zmiany warunków** — okres wypowiedzenia ≥15 dni (wyjątki: wymogi prawne, pilne usługi cyfrowe) | art. 3 ust. 1 lit. b, art. 8 | Proces zmiany regulaminu: notyfikacja 15 dni przed wejściem w życie, bez zmian retroaktywnych (poza wyjątkami) |
| **Zawieszenie/ograniczenie/rozwiązanie** — uzasadnienie (statement of reasons) przed lub w chwili decyzji; prawo do wyjaśnień | art. 3 ust. 1 lit. c, art. 7 | Proces moderacji/zawieszeń (MVP: decyzje manualne Admina — ✅ zgodne z intencją Q8) + szablon uzasadnień; **brak automatycznych kar/scoringu w MVP — ✅ redukuje ryzyko** |
| **System wewnętrznego rozpatrywania skarg** (kompletny, bezpłatny, dostępny) | art. 4 | Wewnętrzny proces skarg Partnerów (email/panel + termin odpowiedzi) — wdrożyć w MVP |
| **Ranking — główne parametry** (opis kryteriów decydujących o pozycji; informacja o płatnym wpływie na ranking) | art. 5 ust. 1 lit. a, art. 9 | MVP: ranking ręczny/edytorski — **opisać parametry edytorskie** ("ręczny dobór redakcyjny; kryteria: jakość oferty, kompletność danych, historia transakcji"); brak paid rankingu — oświadczenie |
| **Zróżnicowane traktowanie** — przyczyny ekonomiczne (jeśli platforma konkuruje z Partnerami) | art. 5 ust. 1 lit. d, art. 10 | MVP: LogiMarket nie sprzedaje towarów (brak konkurowania) — oświadczenie w regulaminie; **ważne przy przyszłym kanale reseller** (Q: "przyszłe, wyłączone rozszerzenie") |
| **Dostęp do danych** — opis technicznego i kontraktowego dostępu do danych generowanych przez Partnera | art. 5 ust. 1 lit. c, art. 9 (informacje) | Opis w umowie partnerskiej: jakie dane Partnera są generowane/przechowywane, kto ma dostęp (MVP: Admin) |
| **Mediacja** — wskazanie 2+ mediatorów + koszty | art. 12 | Wskazanie mediatorów (np. lista z KE / organizacje mediacyjne) w regulaminie |
| **Kontakt dla organów** | art. 11 | dane kontaktowe w regulaminie (zgodność z art. 5 uśude) |
| **Zakaz obejścia** (retroaktywne zmiany, wymuszenia) | art. 3 | klauzule anty-obchodowe |

**Egzekucja w PL:** ustawa z 2020 r. o zapewnieniu stosowania rozporządzenia 2019/1150 (Dz.U. 2020 poz. 1298) — właściwy organ: **Prezes UOKiK** (art. 10 ust. 1 — UOKiK jako organ odpowiedzialny za stosowanie P2B; kary administracyjne).

**Werdykt: P2B MA ZASTOSOWANIE** (APPROVED_WITH_CONDITIONS). Warunki: wdrożenie obowiązków z tabeli (zwłaszcza: statement of reasons przy zawieszeniach, system skarg, opis rankingu, okres 15 dni przy zmianach, mediacja). **Manualna moderacja i brak paid rankingu w MVP upraszczają compliance, ale nie zwalniają z art. 5 ust. 1 lit. a (opis rankingu) i art. 4 (skargi).**

---

## 7. Kwestie prawne nieujawnione w pakiecie (Blok H) — uzupełnienie

Kwestie, które powinny zostać rozstrzygnięte przed uruchomieniem (oprócz objętych pytaniami klienta):

1. **Rękojmia/gwarancja w B2B (art. 556–576 KC)** — Partner odpowiada za wady; w B2B **można wyłączyć/ograniczyć odpowiedzialność z tytułu rękojmi (art. 558 §1 KC)** — wymagana decyzja biznesowa + zapis w umowie partnerskiej i wzorcu oferty; platforma musi umożliwić prezentację warunków (pola w ofercie).
2. **Zwroty/rezygnacja w B2B** — brak ustawowego prawa odstąpienia (14 dni to prawo konsumenckie); regulamin może przewidywać dobrowolne zasady zwrotów B2B — jednolite czy per Partner (decyzja: domyślne zasady platformy vs. indywidualne Partnera — rekomendacja: jednolite minimum platformy).
3. **Odpowiedzialność za treści ofert i moderacja** — DSA art. 4–6 (zwolnienia) + proces zgłoszeń; **art. 14 uśude** (odpowiedzialność za przechowywane dane — reżim zharmonizowany z DSA); zakres moderacji MVP (manualna — Q8).
4. **Prawo właściwe i jurysdykcja** — B2B: swoboda wyboru (art. 3 Rzym I; art. 25 Bruksela I bis), ale: **umowy konsumenckie — wybór prawa nie może pozbawić konsumenta ochrony** (art. 6 Rzym I) — kolejny argument za skutecznym gatingiem B2B; dla RFQ transgranicznego UE: klauzula jurysdykcyjna (np. sąd polski) + prawo polskie (lub szwajcarskie/niemieckie wg wyboru) — decyzja do podjęcia.
5. **Własność intelektualna** — treści ofert (zdjęcia, opisy, znaki towarowe): licencja Partnera na rzecz platformy (przechowywanie, prezentacja, marketing); odpowiedzialność Partnera za naruszenia; procedura DMCA-like (DSA notice & action).
6. **Ustawa o zwalczaniu nieuczciwej konkurencji (UZNK)** — nowelizacja (2023): czyny nieuczciwej konkurencji obejmują m.in. nieprzestrzeganie P2B (art. 3a? — "wprowadzenie w błąd przy świadczeniu usług pośrednictwa"); ryzyko roszczeń Partnerów.
7. **NIS2** — obowiązki cyberbezpieczeństwa dla "ważnych/istotnych podmiotów"; marketplace B2B co do zasady **poza zakresem** (chyba że duży), ale rekomendowane: podstawy bezpieczeństwa (art. 32 RODO + dobre praktyki), monitoring, plan reakcji na incydenty.
8. **eIDAS 2.0 / European Digital Identity Wallet (2026–2027)** — przyszłe możliwości weryfikacji tożsamości przedsiębiorców (wzmocni gating B2B) — monitorować.
9. **AI Act** — przy przyszłym automatycznym rankingu/scoringu (Q7: "brak automatycznego scoringu w MVP") — systemy rekomendacyjne mogą podlegać ograniczonym obowiązkom przejrzystości; MVP (manual) — poza zakresem.
10. **Prawo autorskie / treści generowane przez AI** w ofertach Partnerów — polityka platformy (rekomendacja zapisu w umowie partnerskiej).
11. **Umowy B2B z zagranicznymi Partnerami (UE)** — wymogi informacyjne (identyfikacja), prawo właściwe, rozstrzyganie sporów (mediacja P2B art. 12 + sąd), waluta, warunki płatności prowizji (reverse charge VAT — worker_03).
12. **Ochrona konsumentów przy "przecieku"** — procedura awaryjna: identyfikacja konsumenta po fakcie, umożliwienie odstąpienia 14 dni, obsługa zwrotów — zabezpieczenie operacyjne (patrz LEG-MKT-08).

---

## 8. Podsumowanie werdyktów dla bramek (Bloki A–E)

| Gate | Werdykt (propozycja analityka) | Warunki |
|---|---|---|
| **LEG-MKT-01** (rola LogiMarket) | **APPROVED_WITH_CONDITIONS** | Model pośrednika wg art. 540 KC dopuszczalny; warunki: czysta konstrukcja umowna, język UI, brak faktur towarowych/płatności na własny rachunek, disclosure sprzedawcy; unikać zachowań sugerujących rolę dostawcy |
| **LEG-MKT-02** (zawarcie umowy) | **APPROVED_WITH_CONDITIONS** | E-commerce: checkout = oferta kupującego, akceptacja Partnera = zawarcie (art. 66–70, 61 KC); warunki: oznaczenie prezentacji jako invitatio, komunikaty, capture po akceptacji, rejestracja czasów. RFQ: wycena niewiążąca wymaga wyraźnego zastrzeżenia (art. 66 §1, 72 KC) |
| **LEG-MKT-03** (disclosure) | **APPROVED_WITH_CONDITIONS** | Macierz pól wg sekcji 3.2; minimalnie: nazwa, NIP/VAT ID, adres, kontakt, rola LogiMarket, kto fakturuje/dostarcza/reklamuje — przed konwersją; KYB wewnętrzne — osobno |
| **LEG-MKT-04** (P2B) | **APPROVED_WITH_CONDITIONS** | **P2B ma zastosowanie** (B2B nie wyłącza; wręcz zakłada); obowiązki: art. 3/5 (warunki), 4 (skargi), 7 (uzasadnienia zawieszeń), 8 (zmiany 15 dni), 9 (ranking), 12 (mediacja); UOKiK jako organ |
| **DSA** | **APPROVED_WITH_CONDITIONS** | Klasyfikacja: platforma internetowa (art. 3(i)) / hosting; obowiązki: art. 11, 13, 15, 26 (+ ewent. 27 przy algorytmicznym rankingu); mikro/małe — wyłączenia części obowiązków (art. 19); **art. 30 KYBC — nie dotyczy przy B2B-only**; zwolnienia art. 4–6 — zachować neutralność |
| **LEG-MKT-08** (B2B gating) | **APPROVED_WITH_CONDITIONS** | companyName niewystarczające; warstwy: deklaracja + NIP/VAT ID + weryfikacja (biała lista/CEIDG/KRS/VIES) + monitoring; zmiany schematu (NIP_FIELD_PRESENT=NO → TAK), UI, regulamin; procedura awaryjna dla "przecieków" konsumenckich |
| **56B1/56B2 (wpływ)** | Odblokowanie po decyzjach | Po zatwierdzeniu werdyktów: schemat wymaga pól NIP/VAT ID, statusu weryfikacji, statusów zamówienia (offer sent / accepted / rejected), rejestru czasów zdarzeń (E2, E3, E6, E7), danych disclosure sprzedawcy w ofercie; **bez rozstrzygnięć LEG-MKT-02 i LEG-MKT-08 nie projektować finalnej logiki transakcyjnej** |

---

## 9. Źródła (zweryfikowane 9.08.2026)

1. Kodeks cywilny — Dz.U. 2026 poz. 795 (art. 61, 66, 66¹, 68–72, 72¹, 384, 540, 556–558, 758+, 765+; LEX/LexLege — tekst jednolity).
2. Rozporządzenie (UE) 2019/1150 (P2B) — eur-lex.europa.eu/eli/reg/2019/1150/oj/eng; omówienia: iuscase.pl (zastosowanie w relacjach B2B), parp.gov.pl, traple.pl, biznes.gov.pl (wyłączenia: płatności, reklama, adtech).
3. Rozporządzenie (UE) 2022/2065 (DSA) — art. 3, 4–6, 11, 13, 15–19, 24, 26–32; eu-digital-services-act.com (art. 3, 30); edaa.eu (kwalifikacja platformy); Freshfields "DSA decoded #9" (art. 30 KYBC — platformy umożliwiające konsumentom zawieranie umów); dsa-library.com (art. 30); Steptoe (DSA stosuje się do B2B i B2C).
4. Ustawa z 18.07.2002 r. o świadczeniu usług drogą elektroniczną (Dz.U. 2017 poz. 1219) — art. 5, 12–14.
5. Ustawa o prawach konsumenta (Dz.U. 2014 poz. 827 ze zm.) — art. 8–10, 27 (odstąpienie 14 dni).
6. Ustawa z 2020 r. o zapewnieniu stosowania rozporządzenia 2019/1150 (Dz.U. 2020 poz. 1298) — UOKiK jako organ.
7. UZNK — nowelizacja dot. usług pośrednictwa (prawo.pl — czyny nieuczciwej konkurencji dla dostawców usług pośrednich).

*Dokument ma charakter analizy roboczej dla kancelarii/DPO i nie stanowi opinii prawnej. Treść przepisów (zwłaszcza numeracja i brzmienie art. 66¹ §2 KC, art. 19 DSA — lista wyłączeń, art. 175 PKE) należy zweryfikować w aktualnych tekstach jednolitych przed wdrożeniem.*
