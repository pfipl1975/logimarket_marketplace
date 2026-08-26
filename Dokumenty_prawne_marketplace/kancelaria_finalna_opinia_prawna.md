# LogiMarket — Finalna opinia prawna kancelarii

**Od:** Kancelaria prawna
**Do:** Piotr Fiszer, LogiMarket
**Data:** 9 sierpnia 2026 r.
**Dotyczy:** Finalna odpowiedź na „Odpowiedź do kancelarii po wstępnej opinii" — doprecyzowania i gate register
**Status:** FINALNA OPINIA PRAWNA (z zastrzeżeniami oznaczonymi MORE_FACTS_REQUIRED)

> Niniejsza opinia stanowi finalną odpowiedź na pytania przekazane przez Zamawiającego w piśmie z 9.08.2026. Opinia uwzględnia odpowiedzi Ownera na pytania uzupełniające oraz doprecyzowania z sekcji 2 i 3 pisma. Wszelkie punkty oznaczone wcześniej MORE_FACTS_REQUIRED, na które Owner udzielił odpowiedzi, zostały zaktualizowane.

---

## 1. Odpowiedzi na doprecyzowania Ownera

### 2.1. LEG-MKT-01 — Agencja vs. umowa usługowa nienazwana

**Werdykt: APPROVED_WITH_CONDITIONS**

Owner prosi o doprecyzowanie, czy relacja LogiMarket–Partner może mieścić się w wariancie pośredniczącym umowy agencyjnej (art. 758 §1 KC) bez umocowania do zawierania umów w imieniu Partnera, czy też rekomendujemy umowę nienazwaną.

**Analiza:**

Art. 758 §1 KC definiuje umowę agencyjną jako taką, w której agent „zobowiązuje się, w ramach działalności swojego przedsiębiorstwa, do stałego pośredniczenia, w imieniu dającemu zlecenie, w zawieraniu z klientami umów albo do ich zawierania." Dwa elementy są konstytutywne:
1. **stałe pośredniczenie** w zawieraniu umów — **spełnione** (LogiMarket ułatwia zawieranie umów sprzedaży na platformie);
2. **w imieniu dającego zlecenie** — **NIE spełnione** (LogiMarket nie działa w imieniu Partnera, nie ma umocowania art. 95+ KC, nie zawiera umów w jego imieniu).

Bez elementu „w imieniu" nie jest to umowa agencyjna w ścisłym znaczeniu art. 758 KC. Co więcej, agent działa jako przedstawiciel (art. 95+ KC) — LogiMarket nie jest przedstawicielem Partnera.

**Rekomendacja: umowa nienazwana (art. 750 w zw. z art. 353¹ KC)** o świadczenie usług platformowych z elementami pośrednictwa handlowego.

**Przesłanki odróżniające od agencji:**
1. LogiMarket nie działa **w imieniu** Partnera (brak umocowania, brak przedstawicielstwa);
2. LogiMarket nie zawiera umów sprzedaży — akceptacja należy wyłącznie do Partnera;
3. LogiMarket świadczy usługę **techniczno-organizacyjną** (infrastruktura, routing, komunikacja), a nie usługę agencyjną (pośrednictwo w zawieraniu umów w cudzym imieniu);
4. Ryzyko towarowe i odpowiedzialność za zgodność towaru pozostają po stronie Partnera.

**Konsekwencje kwalifikacji jako umowa nienazwana:**
- Swoboda kształtowania treści (art. 353¹ KC) — pod warunkiem niezbiegu z właściwością stosunku, ustawą i zasadami współżycia;
- Zastosowanie odpowiednie art. 735+ KC (odpłatność), art. 736–738 KC (zawiadomienie, wykonanie);
- Brak obowiązku stosowania przepisów o agencji (art. 758–764 KC) — w tym brak ograniczeń terytorialnych agenta, ochrony agenta przy rozwiązaniu (art. 764 KC), zakazu konkurencji agenta;
- Regulamin i umowa partnerska kształtują relację — klauzule: success fee, moderacja, zawieszenie, IP, retencja danych, ROdo.

**Wpływ na 56B1:** Brak zmiany — `OfferContractClassification` = umowa nienazwana o świadczenie usług platformowych.

---

### 2.2. LEG-MKT-02 — Jawna akceptacja E7, art. 69 i art. 68² KC

**Werdykt: APPROVED_WITH_CONDITIONS**

Owner prosi o uwzględnienie art. 69 KC (przystąpienie do wykonania) i art. 68² KC (stałe stosunki gospodarcze — milczące przyjęcie).

**Analiza:**

**Art. 69 KC** — przyjęcie oferty przez przystąpienie do wykonania: „Jeżeli według ustalonego w danych stosunkach zwyczaju lub zgodnie z treść oferty, przyjęcie może nastąpić przez przystąpienie do wykonania umowy, umowa zostaje zawarta w chwili przystąpienia do wykonania." — Dotyczy sytuacji, w których zwyczaj lub treść oferty wskazują na tę formę przyjęcia. W modelu LogiMarket: jeżeli Partner przystąpi do wykonania (wysyłka towaru) **bez uprzedniej jawnej akceptacji (E7)**, mogłoby to zostać uznane za przyjęcie oferty przez przystąpienie do wykonania — **ryzyko niezamierzonego zawarcia umowy**.

**Rozwiązanie:** Regulamin musi stanowić, że **przystąpienie do wykonania (wysyłka) bez zarejestrowanej SellerAcceptanceDecision (E7) nie stanowi przyjęcia oferty** — wykluczenie art. 69 KC przez wyraźne postanowienie (możliwe w B2B — art. 353¹ KC). System musi wymuszać E7 przed E8.

**Art. 68² KC** — milczące przyjęcie przez przedsiębiorcę w stałych stosunkach gospodarczych: „Jeżeli przedsiębiorca otrzymał od osoby, z którą pozostaje w stałych stosunkach gospodarczych, ofertę zawarcia umowy w ramach swej działalności, brak niezwłocznej odpowiedzi poczytuje się za przyjęcie oferty."

**Ryzyko:** Jeżeli LogiMarket i Partner pozostają w „stałych stosunkach gospodarczych" (umowa partnerska, regularne transakcje), brak odpowiedzi Partnera na zamówienie Kupującego **mógłby zostać uznany za przyjęcie oferty** — mimo braku jawnej akceptacji E7.

**Rozwiązanie:** Regulamin / umowa partnerska musi zawierać klauzulę wyłączającą art. 68² KC:

> „Niniejszym wyłącza się zastosowanie art. 68² Kodeksu cywilnego. Brak odpowiedzi Partnera na zamówienie Kupującego nie stanowi przyjęcia oferty. Zawarcie umowy sprzedaży wymaga wyraźnej akceptacji przez Partnera (SellerAcceptanceDecision) zarejestrowanej w systemie LogiMarket."

Klauzula ta jest dopuszczalna w B2B (art. 353¹ KC — swoboda umów, wyłączenie dyspozytywne art. 68² KC).

**Potwierdzenie:** Tak — postanowienie, zgodnie z którym brak odpowiedzi Partnera nie stanowi przyjęcia oferty, a zawarcie umowy wymaga jawnej SellerAcceptanceDecision zarejestrowanej w systemie, jest **skuteczne i rekomendowane**.

**Wpływ na 56B2:** `SellerAcceptanceDecision` jako mandatory field; status `SUBMITTED → ROUTED → ACCEPTED/REJECTED/EXPIRED`; `EXPIRED` przy braku akceptacji w terminie (systemowy timeout).

---

### 2.3. DSA — Kuratorowany model ofert i art. 14

**Werdykt: APPROVED_WITH_CONDITIONS**

**Korekta DSA Terms and Conditions:** Owner słusznie wskazuje, że obowiązek dotyczący warunków korzystania z usługi (Terms and Conditions / regulamin) znajduje się w **art. 14 DSA** (Section 1 — obowiązki wszystkich intermediary services), a nie w art. 13 (który dotyczy prawnych przedstawicieli dla nie-UE). Potwierdzamy korektę.

**Kuratorowany model ofert — klasyfikacja:**

Kluczowe pytanie: czy oferta Partnera jest informacją przechowywaną **na żądanie Partnera** (hosting — art. 3(g)(iii)), czy treścią redakcyjną LogiMarket (wtedy LogiMarket może być „nadawcą" treści i nie korzystać z safe harbor)?

**Ocena:**

1. **Jeżeli Partner dostarcza treść oferty** (tekst, zdjęcia, cena, specyfikacja) — a LogiMarket ją przechowuje i prezentuje (nawet z redakcyjną weryfikacją/kuracją) — oferta jest informacją **przechowywaną na żądanie Partnera** → hosting (art. 3(g)(iii)) / platforma internetowa (art. 3(i)). Kuratorowanie (moderacja, weryfikacja) nie pozbawia statusu hostingu, o ile LogiMarket nie staje się **autorem** treści.

2. **Jeżeli LogiMarket tworzy treść oferty na podstawie materiałów Partnera** (np. redaguje opis, dodaje własne zdjęcia, ustala cenę) — ta część może być traktowana jako **treść własna LogiMarket** → brak safe harbor dla tej treści (LogiMarket odpowiada jak wydawca). Nie dotyczy to standardowej moderacji (sprawdzanie zgodności z regulaminem, formatowanie).

**Rekomendacja:** Klasyfikacja **globalna** dla MVP (jedna kwalifikacja usługi), ale z uwzględnieniem, że treści tworzone przez LogiMarket (nie przez Partnera) wyłączają safe harbor dla tych konkretnych treści.

**W praktyce:** Należy rozróżnić w umowie partnerskiej:
- **Treści Partnera** (oferty, opisy, ceny, zdjęcia dostarczone przez Partnera) — hosting/platforma, safe harbor art. 4–6;
- **Treści LogiMarket** (np. artykuły blogowe, opisy kategorii, promotional content) — własna odpowiedzialność LogiMarket.

**Wpływ na 56B1:** `OfferContentSource` (PARTNER / LOGIMARKET / MIXED) — pole metadanych oferty dla celów DSA liability.

---

### 2.4. LEG-MKT-08 — Przedsiębiorca korzystający z ochrony konsumenckiej

**Werdykt: APPROVED_WITH_CONDITIONS**

Owner prosi o rozszerzenie analizy na osobę fizyczną prowadzącą działalność, gdy transakcja jest związana z działalnością, ale nie ma charakteru zawodowego.

**Analiza:**

Art. 22¹ KC — „konsument" to osoba fizyczna dokonująca czynności prawnej **bezpośrednio niezwiązanej z jej działalnością gospodarczą lub zawodową**. Status konsumenta ocenia się **per transakcja**, nie globalnie (TSUE C-203/05 — końowy; SN I CZ 91/18).

**Trzy kategorie:**

| Kategoria | Status | Ochrona konsumencka |
|---|---|---|
| Przedsiębiorca (osoba prawna / organizacja) kupujący w działalności | Przedsiębiorca | Brak ochrony konsumenckiej |
| Osoba fizyczna prowadząca działalność (JDG) — transakcja o charakterze zawodowym | Przedsiębiorca (art. 43¹ KC) | Brak ochrony konsumenckiej |
| Osoba fizyczna prowadząca działalność (JDG) — transakcja **bezpośrednio niezwiązana** z działalnością lub **nie mająca charakteru zawodowego** | Konsument (art. 22¹ KC) | Pełna ochrona konsumencka |

**Ocena per transakcja:** Tak — status konsumenta należy oceniać **per transakcja**, a nie globalnie dla użytkownika. JDG może być przedsiębiorcą w jednej transakcji i konsumentem w innej.

**Dodatkowe oświadczenie:** Rekomendowane — oświadczenie przy checkout/RFQ: „Zamówienie składam w celu związanym z moją działalnością gospodarczą o charakterze zawodowym." To przesuwa ciężar dowodu na kupującego (jeżeli złoży fałszywe oświadczenie, trudniej mu potem powołać się na status konsumenta), ale **nie wyłącza ochrony konsumenckiej** — sąd ocenia obiektywnie, czy transakcja miała charakter zawodowy (TSUE C-203/05).

**Czy LogiMarket może ograniczyć e-commerce do transakcji o charakterze zawodowym?** Tak — w regulaminie: „Platforma jest przeznaczona wyłącznie do transakcji o charakterze zawodowym (B2B). Osoby fizyczne składają zamówienia wyłącznie jako przedsiębiorcy w ramach swojej działalności gospodarczej." Ale to nie wyłącza obowiązku ustawowych praw konsumenta, jeżeli transakcja obiektywnie nie ma charakteru zawodowego.

**Wpływ na 56B2:** `BuyerLegalContextSnapshot` — oświadczenie + NIP/VAT ID + weryfikacja; pole `transaction_professional_purpose` (boolean, oświadczenie kupującego).

---

### 2.5. LEG-MKT-03 — Klasyfikacja seller disclosure

**Werdykt: APPROVED_WITH_CONDITIONS**

Owner prosi o przypisanie każdego pola do kategorii: LEGAL_REQUIRED / CONTRACTUALLY_REQUIRED / RECOMMENDED_BEST_PRACTICE / INTERNAL_KYB_ONLY.

**Macierz klasyfikacji:**

| Pole | Kategoria | Podstawa / uzasadnienie |
|---|---|---|
| Nazwa prawna sprzedawcy | **CONTRACTUALLY_REQUIRED** | art. 60 KC (zgodny zamiar), art. 66 §1 KC (istotne postanowienia — identyfikacja kontrahenta). W B2B brak ustawowego obowiązku, ale identyfikacja kontrahenta jest niezbędna dla ważności/oznaczoności umowy. |
| NIP / VAT ID | **CONTRACTUALLY_REQUIRED** | Identyfikacja podatkowa kontrahenta (faktura, VAT); w B2B niezbędne dla celów podatkowych kupującego. Nie ustawowy obowiązek disclosure, ale wymóg praktyczny kontraktowy. |
| KRS / REGON | **RECOMMENDED_BEST_PRACTICE** | Uzupełniająca identyfikacja; przydatne dla KYB i due diligence, ale nie niezbędne publicznie. Można prezentować na profilu sprzedawcy (opcjonalnie). |
| Adres siedziby | **CONTRACTUALLY_REQUIRED** | Identyfikacja kontrahenta; miejsce wykonania umowy (art. 452 KC — domniemanie miejsca); doręczenia. |
| E-mail firmowy | **CONTRACTUALLY_REQUIRED** | Kontakt transakcyjny (reklamacje, komunikacja); w B2B niezbędny do realizacji umowy. |
| Telefon firmowy | **RECOMMENDED_BEST_PRACTICE** | Uzupełniający kanał kontaktu; nie obowiązkowy. |
| Wystawca faktury za towar | **CONTRACTUALLY_REQUIRED** | Kluczowa informacja przy modelu pośrednika — kupujący musi wiedzieć, kto wystawi fakturę (Partner, nie LogiMarket). |
| Podmiot realizujący dostawę | **CONTRACTUALLY_REQUIRED** | Realizacja umowy — kupujący musi wiedzieć, kto dostarcza towar. |
| Podmiot obsługujący reklamacje | **CONTRACTUALLY_REQUIRED** | Realizacja rękojmi/gwarancji (art. 556+ KC) — kupujący musi wiedzieć, do kogo kierować reklamację. |
| Rola LogiMarket | **CONTRACTUALLY_REQUIRED** | Informacja, że LogiMarket jest pośrednikiem, nie sprzedawcą — klauzula transparentności. |
| Beneficjenci rzeczywiści | **INTERNAL_KYB_ONLY** | DAC7/rejestrowe; nie publiczne. |
| IBAN / dane rachunku | **INTERNAL_KYB_ONLY** | KYB/DAC7; nie publiczne. |
| Dokumenty rejestrowe | **INTERNAL_KYB_ONLY** | KYB weryfikacja; nie publiczne. |

**Żadne pole nie jest LEGAL_REQUIRED** w modelu B2B (ustawa o prawach konsumenta nie ma zastosowania; DSA art. 30 nie dotyczy B2B-only). Wszystkie obowiązkowe pola to CONTRACTUALLY_REQUIRED — wynikają z konieczności identyfikacji kontrahenta i realizacji umowy, nie z obowiązku ustawowego.

---

### 3.1. VAT prowizji — oznaczenie na fakturze

**Werdykt: APPROVED**

Owner słusznie zauważa, że oznaczenie „0% + reverse charge" może być technicznie nieprawidłowe.

**Prawidłowe oznaczenie:** Usługa pośrednictwa świadczone na rzecz podatnika VAT-UE (czynnego) z siedzibą w innym państwie członkowskim — **miejsce świadczenia u nabywcy** (art. 28b ust. 1 ustawy o VAT). Faktura:
- **Nie naliczać polskiego VAT** (nie „0%" — zero dotyczy stawki, tu w ogóle nie powstaje obowiązek podatkowy w PL);
- Adnotacja: **„Odwrotne obciążenie / Reverse charge — art. 28b ust. 1 ustawy o VAT"** lub **„NP"** (nie podlega);
- W systemie: `vat_rate = NP` (not applicable) lub `reverse_charge = true` dla Partnerów UE z aktywnym VIES.

Stawka „0%" dotyczy np. WDT (art. 41 ust. 9) — to inny reżim. Dla usług B2B transgranicznych właściwym oznaczeniem jest „NP" / „odwrotne obciążenie."

---

### 3.2. DAC7 — Rozdzielenie ścieżek

**Werdykt: MORE_FACTS_REQUIRED (z rekomendacją wstępną)**

| Ścieżka | Obowiązek DAC7? | Uzasadnienie |
|---|---|---|
| **E-commerce marketplace** | **TAK** | LogiMarket zna wartość i liczbę transakcji; platforma ułatwia sprzedaż; wynagrodzenie (prowizja) jest znane lub rozsądnie ustalalne. Obowiązek due diligence i raportowania. |
| **RFQ** | **Prawdopodobnie TAK, ale ograniczony** | LogiMarket ułatwia kontakt, ale finalna sprzedaż może zostać zawarta poza platformą. DAC7 obejmuje platformy ułatwiające sprzedaż — sam RFQ jako lead generation może podlegać due diligence, ale raportowanie wartości transakcji jest niemożliwe, jeżeli nie jest znana. Rekomendacja: due diligence (identyfikacja Partnerów), ale raportowanie tylko znanych transakcji. **Wymaga potwierdzenia przez doradcę podatkowego.** |
| **Outbound /go/[id]** | **Prawdopodobnie NIE** | LogiMarket zna tylko referral/click, nie ułatwia zawarcia umowy (brak checkoutu). Wyłączenie P2B/DAC7 dla „przekierowywania klientów na inne interfejsy" (art. 2 pkt 2 lit. c P2B — analogia). Ale DAC7 ma szerszy zakres niż P2B. **Wymaga potwierdzenia.** |

**Rekomendacja wstępna:** DAC7 due diligence (identyfikacja Partnerów, zbieranie danych) dla wszystkich ścieżek; raportowanie finansowe tylko dla e-commerce (znane wartości). RFQ — raportowanie z kvalifikatorem „wartość nieznana" jeżeli sprzedaż odbyła się poza platformą. Outbound — wyłączenie, jeżeli LogiMarket nie ułatwia transakcji, tylko odsyła.

**Wymaga potwierdzenia przez doradcę podatkowego** — DAC7 ma skomplikowane definicje „reportable seller" i „relevant activity."

---

### 3.3. Cookie / art. 399 PKE — ocena 30-dniowego cookie

**Werdykt: APPROVED_WITH_CONDITIONS**

Owner prosi o ocenę bez automatycznego założenia, że sam czas retencji przesądza o obowiązku zgody.

**Analiza:**

Art. 399 PKE — wyjątek „bezwzględnie niezbędne do świadczenia usługi elektronicznej żądanej przez użytkownika." Kluczowe pytanie: czy zapamiętanie koszyka między wizytami (30 dni) jest **bezwzględnie niezbędne** do świadczenia usługi, czy jest **funkcją dodatkowej wygody**.

**Ocena:**

1. **Usługa żądana przez użytkownika** = korzystanie z platformy marketplace (przeglądanie ofert, RFQ, checkout).
2. **Bezwzględnie niezbędne** = bez cookie usługa nie mogłaby być świadczona lub byłaby technicznie niemożliwa/praktycznie uniemożliwiona.
3. **Cookie sesyjne** (utrzymanie sesji w trakcie wizyty) — **bezwzględnie niezbędne** (bez niego koszyk nie działa w trakcie sesji, logowanie nie działa, nawigacja jest zerwana).
4. **Cookie 30-dniowe** (przywrócenie koszyka przy kolejnej wizycie) — **nie jest bezwzględnie niezbędne**. Użytkownik może ponownie dodać towary do koszyka. Funkcja ta służy **wygodzie**, a nie niezbędności usługi. Bez niej platforma działa poprawnie (koszyk jest pusty przy nowej wizycie, ale usługa jest dostępna).

**Konkluzja:** Cookie 30-dniowe utrzymujące koszyk między wizytami **nie mieści się w wyjątku „bezwzględnie niezbędne"** z art. 399 PKE — **wymaga zgody użytkownika**.

**Dwie opcje:**

| Opcja | Opis | Wymagania |
|---|---|---|
| **A (rekomendowana)** | Cookie sesyjne (maxAge = sesja) | Wyjątek art. 399 PKE — brak bannera; koszyk nie jest zachowywany między wizytami |
| **B** | Cookie 30-dniowe + banner zgody | Zgoda ePrivacy (aktywny opt-in, per-cel, info o czasie — C-61/19); wycofanie równie łatwe (art. 7(3) RODO); polityka cookie |

**Ocena braku Secure jako naruszenia art. 32:** Owner prosi o ocenę w kontekście całego środowiska. Skoro Secure = YES in production (zadeklarowane przez Ownera) — **nie jest to naruszenie** w środowisku produkcyjnym. Brak flagi w kodzie źródłowym (development) jest problemem wdrożeniowym, nie prawnym. **Zalecenie:** weryfikacja produkcyjna (HTTPS/HSTS + Secure flag) w ramach QA przed go-live; udokumentowanie w polityce bezpieczeństwa.

---

## 2. Finalny gate register

| Gate | Werdykt | Podstawa prawna | Warunki | Regulatory impact | Product impact | Data impact | Transaction impact |
|---|---|---|---|---|---|---|---|
| **LEG-MKT-01** | **APPROVED_WITH_CONDITIONS** | art. 750, 353¹, 735+ KC | Umowa nienazwana o świadczenie usług platformowych; regulamin + umowa partnerska; komunikaty UI; brak faktur towarowych/escrow | Regulamin: rola pośrednika, podział odpowiedzialności; Partner Agreement: klauzule success fee, moderacja, IP | UI: „Sprzedawca: [Partner]", „LogiMarket = pośrednik" | SellerLegalIdentity, OfferSellerAssignment, contractModel = UNNAMED_INTERMEDIARY | Brak — model pośrednika |
| **LEG-MKT-02** | **APPROVED_WITH_CONDITIONS** | art. 66, 66¹, 68–70, 68², 69, 61, 72, 384 KC | E2 = oferta, E7 = zawarcie; wyłączenie art. 68² i 69 KC; capture po E7; RFQ z zastrzeżeniem niewiążącym | Regulamin: klauzula wyłączająca milczące przyjęcie; klauzula invitatio dla ofert | UI: statusy zamówienia, komunikaty E3/E7 | SellerAcceptanceDecision, E2/E6/E7 timestamps, contractFormation timestamp | E2→E3→E6→E7→capture; EXPIRED przy braku E7 |
| **LEG-MKT-03** | **APPROVED_WITH_CONDITIONS** | art. 60, 66 §1 KC; uśude art. 5 | Macierz disclosure (CONTRACTUALLY_REQUIRED / RECOMMENDED / KYB_ONLY) | Regulamin: klauzula disclosure | UI: dane sprzedawcy na ofercie + checkout | SellerDisclosureSnapshot, field classification | Brak |
| **LEG-MKT-04 (P2B)** | **NOT_APPLICABLE** | Reg. 2019/1150 recital 11, art. 2 | Pure B2B — P2B nie ma zastosowania. Best practice kontraktowo | Partner Agreement: skargi, uzasadnienia, ranking, zmiany (best practice) | Brak | Brak dedykowanych tabel P2B | Brak |
| **DSA** | **APPROVED_WITH_CONDITIONS** | Reg. 2022/2065 art. 3(i), 14, 16–18, 19, 29, 4–6, 15(2) | Platforma internetowa; Section 1 (art. 14 ToS) + Section 2 (art. 16–18); wyłączenia art. 15(2), 19, 29; safe harbor art. 4–6 | Regulamin (art. 14): warunki, moderacja, zgłoszenia; punkt kontaktowy | UI: mechanizm notice & action; oznaczenia promocyjne | OfferContentSource (PARTNER/LOGIMARKET) | Brak |
| **LEG-MKT-08** | **APPROVED_WITH_CONDITIONS** | art. 43¹, 22¹ KC; TSUE C-203/05 | Deklaracja + NIP/VAT ID/rejestr + weryfikacja; ocena per transakcja; oświadczenie o charakterze zawodowym | Regulamin: definicja Kupującego, procedura awaryjna | UI: pola firmowe, deklaracja, walidacja | BuyerLegalContextSnapshot, transaction_professional_purpose | Blokada konwersji przy braku B2B eligibility |
| **LEG-MKT-09** | **APPROVED_WITH_CONDITIONS** | RODO art. 4, 6, 13–14, 28, 32, 35; art. 399 PKE | DPA Supabase; klauzula art. 13; cookie sesyjne (rekomendowane) lub banner; Secure flag in production; rola Partnera per operacja | Privacy notice (art. 13); polityka cookie; DPA Supabase | UI: klauzula informacyjna, cookie consent (jeśli opcja B) | PrivacyProcessingContext, RetentionPolicySnapshot, vendor register | Brak |
| **OMQ-MKT-01** | **APPROVED_WITH_CONDITIONS** | art. 66, 68–70, 61 KC | E2 = oferta, E7 = zawarcie umowy | Regulamin: opis ścieżki e-commerce | UI: statusy, komunikaty | Jak LEG-MKT-02 | Jak LEG-MKT-02 |
| **OMQ-MKT-02** | **APPROVED_WITH_CONDITIONS** | art. 72 KC; zastrzeżenie art. 66 §1 | RFQ = rokowania; wycena z zastrzeżeniem niewiążącym | Regulamin: opis ścieżki RFQ | UI: tekst zastrzeżenia, brak „Akceptuję wycenę" | rfq_leads retention 12 mies. | Brak automatycznego zawarcia |
| **OMQ-MKT-11** | **APPROVED_WITH_CONDITIONS** | RODO art. 5(1)(e); KC art. 118; Ord. pod. art. 112; uor art. 74 | Retencja: cart 30d/sesja, orders 3/5 lat, rfq 12m, clicks 12m, auth rola+6m, partners współpraca+3 lata | Polityka retencji; ROPA | UI: info o retencji w privacy notice | RetentionPolicySnapshot, cron jobs, anonymisation | Brak |
| **VAT/KSeF** | **APPROVED_WITH_CONDITIONS** | art. 9a, 19a, 28b ustawy o VAT; KSeF (MF) | Próg > 10 000 zł — obowiązek od 1.04.2026; zewnętrzne narzędzie KSeF dopuszczalne; faktury prowizyjne w KSeF | Proces fakturowania KSeF | Brak w MVP (ręczne) | KSeF refs (56B4) | Prowizja: 23% PL / NP+reverse charge UE |
| **DAC7** | **MORE_FACTS_REQUIRED** | Dyrektywa 2021/514; ustawa o wymianie informacji | E-commerce: TAK; RFQ: prawdopodobnie (ograniczony); Outbound: prawdopodobnie NIE. Due diligence wszystkich Partnerów. | Onboarding KYB; raport roczny do 31.01 | UI: pola DACB w onboarding | Seller tax identity, IBAN, TIN | Brak |
| **PSP** | **APPROVED_WITH_CONDITIONS** | Ustawa o usługach płatniczych (PSD2) | Direct payout przez licencjonowany PSP; brak self-custody; connected accounts/split allocation | PSP Agreement; umowa partnerska (klauzule płatnicze) | UI: brak własnego escrow | PaymentOrchestration (56B3) | Preauth→accept→capture via PSP |

**LM_MARKETPLACE_SCHEMA_56B1_READY:** Pozostaje **NO** — wymaga:
1. DPO sign-off dla LEG-MKT-09 (DPA Supabase, klauzula art. 13, cookie decision);
2. Tax advisor sign-off dla DAC7 (scope RFQ/outbound);
3. Owner/Engineering readiness review.

Po spełnieniu tych warunków gate'e mogą zostać zamknięte i `56B1_READY` może zostać ustawione na `YES`.

---

## 3. Odpowiedzi na pytania z sekcji 1 pisma Ownera

### 1.1. KSeF — obór > 10 000 zł

Przy założeniu ostrożnościowym (obrót > 10 000 zł brutto/mies.): **obowiązek wystawiania faktur w KSeF od 1.04.2026**. Własna integracja API **nie jest konieczna** — obowiązek może być realizowany przez:
- Biuro rachunkowe z dostępem do KSeF;
- Program księgowy z integracją KSeF;
- Oficjalną Aplikację Podatnika (portal KSeF);
- Każde narzędzie, które wystawia faktury ustrukturyzowane FA(1)/(2) i przesyła do KSeF.

**Rekomendacja dla MVP:** Rozpocząć z procesem ręcznym przez biuro rachunkowe / Aplikację Podatnika; integrację API odroczyć do momentu, gdy wolumen fakturowania uzasadni automatyzację (56B4).

**Obowiązek odbioru** faktur KSeF od kontrahentów: od 1.02.2026 — dotyczy LogiMarket niezależnie od wielkości.

### 1.2. DAC7 — brak Partnerów giełdowych

Potwierdzone — na obecnym etapie brak excluded sellers. W przypadku pojawienia się takiego Partnera — weryfikacja indywidualna.

Rozdzielenie ścieżek: patrz sekcja 3.2 powyżej.

### 1.3. Przyszłe B2C

Potwierdzone: B2B_ONLY w MVP, B2C wyłącznie po odrębnym readiness review. To wzmacnia kwalifikację P2B = NOT_APPLICABLE i DSA art. 30 = nie dotyczy.

### 1.4. Infrastruktura / Supabase

**Dokumenty/evidence wymagane dla DPO:**

1. **DPA z Supabase** (art. 28(3) RODO) — podpisana umowa powierzenia przetwarzania;
2. **Lista subprocesorów Supabase** (art. 28(2)) — aktualna, pobrana od dostawcy;
3. **Region przetwarzania** — potwierdzenie regionu EEA (np. Frankfurt eu-central-1);
4. **Analiza transferu** — jeżeli Supabase lub subprocesorzy mają dostęp z USA:
   - Certyfikacja EU-US Data Privacy Framework (decyzja (UE) 2023/1795) — sprawdzić na listę DPF;
   - Jeżeli nie DPF: Standard Contractual Clauses (SCC 2021/914) w DPA + Transfer Impact Assessment (TIA) wg EDPB Recommendations 01/2020;
5. **ROPA (art. 30(1))** — wpis Supabase jako podmiot przetwarzający;
6. **Polityka bezpieczeństwa** — art. 32 RODO (szyfrowanie, dostęp, backupy, incydenty);
7. **Procedura naruszeń** — art. 33/34 (notyfikacja 72h) — koordynacja z Supabase (DPA powinna określać obowiązek powiadomienia);

### 1.5. Umowa partnerska

Rekomendujemy przygotowanie **krótkiej, praktycznej umowy partnerskiej** po zamknięciu gate'ów, zawierającej minimum:
- Kwalifikacja roli (pośrednik, nie sprzedawca);
- Obowiązki Partnera (oferty, faktury, dostawa, reklamacje);
- Prowizja i fakturowanie;
- Moderacja, zawieszenie, rozwiązanie (z uzasadnieniami — best practice po P2B);
- IP (licencja na treści ofert);
- RODO (klauzule C2C / art. 26 — per operacja po zaprojektowaniu przepływu);
- Prawo właściwe i jurysdykcja;
- DAC7 (obowiązek dostarczenia danych).

### 1.6. Treści sponsorowane

Potwierdzone: brak paid ranking, brak automated scoring, brak sponsored placements w MVP. Ranking manualny/redakcyjny. To upraszcza compliance DSA (art. 26 — brak reklam do oznaczania; art. 27 — brak systemu rekomendacji).

---

## 4. Podsumowanie

Niniejsza opinia stanowi **finalną odpowiedź** na pytania przekazane przez Zamawiającego. Wszystkie gate'e z wyjątkiem DAC7 zostały rozstrzygnięte jako APPROVED_WITH_CONDITIONS lub NOT_APPLICABLE. DAC7 wymaga potwierdzenia przez doradcę podatkowego w zakresie ścieżek RFQ i outbound.

**LM_MARKETPLACE_SCHEMA_56B1_READY = NO** — pozostaje do czasu:
1. DPO sign-off (LEG-MKT-09: DPA Supabase, klauzula art. 13, decyzja cookie);
2. Tax advisor sign-off (DAC7: scope);
3. Owner/Engineering readiness review.

Po spełnieniu tych trzech warunków opinia kancelarii nie blokuje rozpoczęcia projektowania 56B1 (Seller Identity + Offer Contract Classification).

---

*Opinia przygotowana na podstawie dokumentów przekazanych 9.08.2026 (Memo R2.1 + Odpowiedź Ownera). Stan prawny zweryfikowany w tekstach aktów prawnych na dzień 9.08.2026.*

*Źródła: KC (Dz.U. 2026 poz. 795) — art. 60, 61, 66, 66¹, 68, 68², 69, 70, 72, 384, 353¹, 43¹, 22¹, 750, 735+, 758+; RODO (Reg. 2016/679); DSA (Reg. 2022/2065) — art. 3, 14, 16–19, 29, 4–6, 15(2); P2B (Reg. 2019/1150) — recital 11, art. 2; PKE (Dz.U. 2024 poz. 1221) — art. 399; uśude (Dz.U. 2017 poz. 1219); ustawa o VAT; dyrektywa 2006/112/WE; dyrektywa 2021/514 (DAC7); TSUE C-203/05, C-40/17, C-673/17, C-61/19; EDPB Guidelines 07/2020.*

**Reviewer:** Kancelaria prawna, 9.08.2026
