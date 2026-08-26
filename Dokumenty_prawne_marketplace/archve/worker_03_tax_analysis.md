# Analiza podatkowa modelu marketplace B2B — LogiMarket

**Autor:** subagent (doradca podatkowy — e-commerce B2B, Polska/UE)
**Data analizy:** 9 sierpnia 2026 r.
**Zakres:** VAT (pakiet e-commerce 2021, deemed supplier, split payment), fakturowanie i KSeF, moment rozpoznania przychodu, RFQ transgraniczne, PCC/podatek u źródła, AML/KYB/KYC.

**Model przyjęty w analizie:**
- LogiMarket = marketplace B2B (platforma pośrednicząca), Partner = sprzedawca towaru, kupujący = przedsiębiorca (B2B).
- LogiMarket pobiera *success fee* / prowizję od Partnera; nie nabywa towaru na własną rzecz (model agencyjno-pośredniczący, brak roli "resellera" w łańcuchu).
- MVP: e-commerce krajowy (PL) + RFQ (PL i UE). Fakturowanie ręczne (MVP), docelowo automatyzacja.
- Założenie: LogiMarket = spółka polska, czynny podatnik VAT w Polsce. Partnerzy = czynni podatnicy VAT (polscy i zagraniczni, UE).

> ⚠️ **Zastrzeżenie:** analiza ma charakter poglądowy (analiza wstępna modelu), nie stanowi opinii prawnej. Daty obowiązywania przepisów (zwłaszcza KSeF) zweryfikowano w źródłach publicznych na dzień analizy; przed wdrożeniem rekomendowana jest weryfikacja aktualnych komunikatów MF i opinia doradcy podatkowego.

---

## 1. VAT e-commerce — pakiet 2021 (OSS/IOSS) i rola LogiMarket jako platformy

### 1.1. Pakiet VAT e-commerce (od 1 lipca 2021 r.)

Pakiet zmienił zasady opodatkowania sprzedaży na odległość (B2C) i importu przesyłek niskiej wartości:

| Instrument | Zakres |
|---|---|
| **OSS (One Stop Shop)** | rozliczanie VAT od sprzedaży na odległość towarów wewnątrz UE (B2C) oraz usług B2C (elektroniczne, telekomunikacyjne, nadawcze) w jednym państwie członkowskim identyfikacji; próg 10 000 EUR rocznie dla sprzedaży wewnątrzunijnej |
| **IOSS (Import One Stop Shop)** | VAT od importu towarów o wartości wewnętrznej ≤ 150 EUR — pobierany w momencie sprzedaży |
| **Deemed supplier (art. 14a dyrektywy 2006/112/WE)** | platformy ułatwiające dostawy są uznawane za dostawcę towarów (fikcja prawna) w ściśle określonych przypadkach B2C/importowych |
| Zniesienie zwolnienia z VAT przy imporcie przesyłek ≤ 22 EUR | — |

### 1.2. Deemed supplier (art. 14a dyrektywy 2006/112/WE; art. 9a ustawy o VAT)

**Kiedy platforma jest uznawana za dostawcę towarów** (art. 14a ust. 1–2 dyrektywy, transpozycja: art. 9a ustawy z 11.03.2004 r. o podatku od towarów i usług, obowiązuje od 1.07.2021):

1. **Sprzedaż na odległość towarów importowanych** z państw trzecich/terytoriów trzecich w przesyłkach o wartości wewnętrznej **nieprzekraczającej 150 EUR** — niezależnie od statusu nabywcy (dotyczy też B2B);
2. **Dostawa towarów na rzecz osoby niebędącej podatnikiem VAT** (czyli **B2C**) — bez limitu wartości — gdy faktyczny sprzedawca (podmiot działający za pośrednictwem platformy) **nie ma siedziby w UE i nie jest zarejestrowany do VAT w UE**, a towary znajdują się już w UE.

**Wyłączenia (art. 14a ust. 3 dyrektywy):** platforma nie jest uznawana za dostawcę, jeśli jej rola ogranicza się wyłącznie do: (a) przetwarzania płatności, (b) wymiany informacji o towarach/usługach w ogłoszeniach, (c) przekierowywania klientów na inne interfejsy — bez dalszego angażowania się w sprzedaż.

**Czy B2B marketplace jest „platformą interfejsu cyfrowego"?** Tak, technicznie spełnia definicję interfejsu elektronicznego („platforma handlowa, platforma, portal lub podobne środki"). **Ale reguły deemed supplier dotyczą wyłącznie transakcji B2C oraz importu przesyłek ≤ 150 EUR.** W czystym modelu B2B (Partner = czynny podatnik VAT, kupujący = przedsiębiorca) **LogiMarket NIE jest uznawany za dostawcę** — nawet jeśli przetwarza płatności, prowadzi komunikację i pobiera prowizję.

**Wniosek dla LogiMarket (model B2B):**
- ✅ Brak statusu deemed supplier dla transakcji B2B realizowanych przez Partnerów.
- ⚠️ Ryzyko pojawia się, gdyby: (a) platforma obsługiwała transakcje **B2C** (sprzedaż do konsumentów), (b) Partnerzy zagraniczni spoza UE sprzedawali przez platformę towary **importowane ≤ 150 EUR**, (c) LogiMarket faktycznie **działał jako reseller** (nabywa towar i odsprzedaje — wtedy to on jest dostawcą w łańcuchu, z pełnymi konsekwencjami VAT, w tym WDT).
- **Rekomendacja:** w Regulaminie jednoznacznie określić, że LogiMarket jest wyłącznie pośrednikiem (nie nabywa towarów, nie przejmuje ryzyka towarowego, nie jest stroną umowy sprzedaży), a faktury za towar wystawia wyłącznie Partner. Unikać sformułowań „LogiMarket sprzedaje", „kup teraz od LogiMarket" — mogą być podstawą uznania LogiMarket za dostawcę w rozumieniu art. 7 ust. 8 ustawy o VAT (faktura przez platformę „jak własna" przy świadomym udziałze w dostawie).

### 1.3. OSS/IOSS — czy LogiMarket ich potrzebuje?

- **OSS**: dotyczy sprzedaży **B2C** na odległość i usług B2C. W modelu czysto B2B — **nie dotyczy**. Gdyby LogiMarket wszedł w B2C (sprzedaż do konsumentów z magazynów Partnerów w UE) — OSS byłoby narzędziem do rozliczenia sprzedaży transgranicznej B2C.
- **IOSS**: dotyczy importu ≤ 150 EUR. Nie dotyczy modelu B2B.
- **Wniosek:** w MVP (B2B PL + RFQ UE) LogiMarket **nie potrzebuje rejestracji OSS/IOSS**.

### 1.4. Split payment (mechanizm podzielonej płatności, MPP) — Polska

- **Podstawa:** art. 108a–108f ustawy o VAT; biała lista podatników VAT (art. 96b ustawy o VAT); odpowiedzialność solidarna (art. 117ba–117bc Ordynacji podatkowej).
- **Obowiązkowy MPP:** dla faktur o wartości **> 15 000 zł brutto** dokumentujących dostawy towarów/usług **wymienionych w załączniku nr 15 do ustawy o VAT** (tzw. towary/usługi wrażliwe: m.in. wyroby stalowe, elektronika, paliwa, części samochodowe, odpady, węgiel). Obowiązek ciąży na **nabywcy** (płatniku) — przy płatności za fakturę objętą obowiązkiem MPP musi użyć komunikatu przelewu MPP.
- **Biała lista:** przy płatności **> 15 000 zł** na rachunek **spoza białej listy** (niewykazany w wykazie VAT na dzień zlecenia płatności) — **odpowiedzialność solidarna nabywcy** za zaległości VAT dostawcy z tytułu tej transakcji (limit: 30% wartości faktury). Sankcja dotyczy nabywcy — płacącego.
- **Prowizja LogiMarket (usługa pośrednictwa) — NIE jest objęta załącznikiem nr 15** → brak obowiązku MPP przy płatnościach Partnera za prowizję. MPP może być stosowany dobrowolnie.
- **Towary Partnerów z załącznika nr 15** (np. elektronika, stal): kupujący B2B będzie zobowiązany do MPP przy płatnościach > 15 000 zł brutto za takie faktury. **LogiMarket powinien:**
  - zadbać, aby w procesie płatności (PSP) obsłużyć MPP (komunikat przelewu / płatność podzielona) lub wyraźnie poinformować strony o obowiązku;
  - weryfikować kontrahentów na białej liście (API białej listy) — zarówno przy rozliczeniach z Partnerami, jak i przy własnych zakupach;
  - odnotować na fakturach Partnerów adnotację „mechanizm podzielonej płatności", gdy dotyczy.

---

## 2. Fakturowanie — kto wystawia co, wymogi e-faktur, KSeF

### 2.1. Podział ról fakturowych

| Faktura | Wystawca | Odbiorca | Stawka VAT |
|---|---|---|---|
| **Za towar** (dostawa od Partnera do kupującego B2B) | **Partner** (sprzedawca) | kupujący (nabywca) | krajowo: 23% / 8% / 5% / 0% wg towaru; WDT: 0% + warunki |
| **Za prowizję / success fee** (usługa pośrednictwa) | **LogiMarket** | Partner | 23% (usługa pośrednictwa — stawka podstawowa; brak zwolnienia) |
| **Za prowizję — Partner zagraniczny (UE, czynny podatnik VAT)** | **LogiMarket** | Partner | **0% VAT PL — reverse charge** (miejsce świadczenia: kraj siedziby nabywcy, art. 28b ust. 1 ustawy o VAT) — faktura z adnotacją „odwrotne obciążenie / reverse charge" |

- **LogiMarket nie wystawia faktur za towar** (chyba że w modelu agencyjnym ujawnionym — art. 7 ust. 8 ustawy o VAT — ale w czystym modelu pośrednictwa nie).
- **Partner wystawia faktury za towar bezpośrednio kupującemu.** To kluczowy element konstrukcji: chroni LogiMarket przed statusem dostawcy, przed obowiązkami WDT/własnymi fakturami towarowymi i przed rozliczaniem VAT od towarów.
- **Faktura za prowizję:** LogiMarket wystawia na rzecz Partnera; w przypadku Partnerów z innych krajów UE (czynni podatnicy VAT, NIP UE) — **odwrotne obciążenie** (reverse charge) — VAT rozlicza Partner w swoim kraju. LogiMarket nie nalicza polskiego VAT. **Ważne:** wymagana weryfikacja numeru VAT UE Partnera w systemie **VIES** (bieżąca weryfikacja, dokumentacja).

### 2.2. Faktury elektroniczne — wymogi

- Od 1.01.2022 r. **nie jest wymagana zgoda nabywcy** na wystawianie faktur elektronicznych (art. 106n ustawy o VAT) — wystarczy, że odbiorca ma możliwość odbioru (np. e-mail, panel, KSeF).
- Faktury e-mail/PDF/strukturalne — dopuszczalne; obowiązek zapewnienia **autentyczności pochodzenia, integralności treści i czytelności** (art. 106m ustawy o VAT) — w praktyce: bezpieczne generowanie PDF (np. podpis/znacznik czasu) lub faktury ustrukturyzowane KSeF, które spełniają te wymogi z mocy prawa.
- **MVP (fakturowanie ręczne):** dopuszczalne, ale rekomendowane od początku generowanie faktur przez system (szablon + numeracja + PDF) — ręczne wystawianie faktur prowizyjnych przy skali transakcji będzie kosztowne i ryzykowne (terminy 30-dniowe, art. 106i ust. 3).

### 2.3. KSeF (Krajowy System e-Faktur) — status na sierpień 2026 r.

**Harmonogram (zweryfikowany w źródłach publicznych — ksef.podatki.gov.pl, MF):**

| Data | Obowiązek |
|---|---|
| **1.02.2026** | Obowiązkowe **wystawianie** faktur ustrukturyzowanych w KSeF przez **dużych podatników** (wartość sprzedaży brutto > 200 mln zł w 2024 r.); obowiązkowe **odbieranie** faktur wystawianych w KSeF — dla **wszystkich** podatników |
| **1.04.2026** | Obowiązkowe wystawianie w KSeF przez **pozostałych czynnych podatników VAT** (MŚP, jednoosobowe działalności) — w tym LogiMarket, o ile nie jest „dużym" podatnikiem (wtedy od 1.02.2026) |
| **1.01.2027** | Trzeci etap wg części źródeł (rozszerzenie zakresu) — **do weryfikacji** w aktualnych komunikatach MF |

**Wyłączenia z obowiązku wystawiania e-faktur (najistotniejsze):**
- faktury **B2C** (do osób fizycznych nieprowadzących działalności gospodarczej) — wyłączone z obowiązku;
- faktury VAT RR, paragony, faktury w trybie „nabywca wystawia" (self-billing) — w zakresie określonym przepisami;
- **KSeF dotyczy także podatników zagranicznych** w zakresie czynności rozliczanych w Polsce (rejestracja i wystawianie).

**Konsekwencje dla LogiMarket:**
1. **LogiMarket (polski czynny podatnik VAT):** od **1.04.2026** (lub 1.02.2026, jeśli obrót > 200 mln zł) **obowiązek wystawiania faktur prowizyjnych w KSeF** (faktury ustrukturyzowane, FA(1)/(2)). Wdrożenie: integracja API KSeF, tryb offline/awaryjny, upoważnienia, kody QR — rekomendowane już w MVP (nawet przy fakturowaniu „ręcznym" — przez portal/aplikację z szablonami lub zewnętrznego dostawcę usług KSeF).
2. **Odbieranie faktur:** od 1.02.2026 LogiMarket ma obowiązek odbierać faktury kosztowe wystawiane w KSeF przez kontrahentów (PSP, dostawcy IT itd.) — wymagana konfiguracja odbioru (skrzynka, upoważnienia, integracja z księgowością).
3. **Partnerzy (polscy przedsiębiorcy):** ich faktury za towar również będą objęte obowiązkiem KSeF (od 1.04.2026) — warto uwzględnić w wymaganiach wobec Partnerów (np. wymóg integracji z KSeF przy automatyzacji fakturowania na platformie).
4. **Faktury do kontrahentów zagranicznych** (usługi z reverse charge): co do zasady również podlegają obowiązkowi KSeF (wystawiane przez polskiego podatnika), z wyłączeniami przewidzianymi przepisami — szczegóły do weryfikacji z doradcą przy projektowaniu procesu.
5. **Sankcje:** wystawianie faktur poza KSeF w okresie obowiązkowości — sankcja VAT (do 100% kwoty podatku wykazanego na fakturze) oraz odpowiedzialność karno-skarbowa; wg założeń KSeF 2.0 — złagodzenie trybu nakładania. **Ryzyko istotne — traktować KSeF jako projekt priorytetowy.**

**KSeF 2.0:** od 2026 r. obowiązują nowe przepisy (ustawa o e-fakturach) — m.in. zmiany w zakresie faktur zaliczkowych, korekt, upoważnień, trybu awaryjnego, zasad wystawiania faktur w walutach obcych. Wymagane: przegląd aktualnych wytycznych MF przy wdrożeniu.

---

## 3. Rozpoznanie przychodu z prowizji — moment obowiązku VAT i przychodu CIT/księgowego

### 3.1. Moment powstania obowiązku podatkowego VAT (prowizja = usługa pośrednictwa)

- Zasada (art. 19a ust. 1 ustawy o VAT): **obowiązek podatkowy powstaje z chwilą wykonania usługi**.
- Dla usług rozliczanych okresowo/ciągłych (art. 19a ust. 3): z końcem okresu rozliczeniowego, w którym usługa została wykonana.
- **Success fee = usługa wykonana w momencie skutecznego doprowadzenia do transakcji** — w praktyce: moment finalizacji zamówienia/dostawy wg Regulaminu (np. potwierdzenie realizacji sprzedaży między Partnerem a kupującym, upływ okresu zwrotu/reklamacji, jeśli prowizja jest warunkowa). **Należy precyzyjnie określić zdarzenie „wykonania usługi" w Regulaminie** — to punkt odniesienia dla VAT i przychodów.
- Wyjątki:
  - **faktura przed wykonaniem usługi** → obowiązek VAT w dniu wystawienia faktury (art. 19a ust. 7) — w zakresie w niej ujętym;
  - **otrzymanie płatności/zaliczki przed wykonaniem usługi** → obowiązek VAT w dniu otrzymania (art. 19a ust. 8).
- **Termin wystawienia faktury:** 30 dni od wykonania usługi (art. 106i ust. 3 ustawy o VAT). KSeF: e-faktura musi trafić do systemu najpóźniej w terminie wystawienia.

### 3.2. Preautoryzacja vs capture — wpływ na moment rozpoznania

| Zdarzenie | Charakter | Wpływ na VAT | Wpływ na przychód (CIT/rachunkowość) |
|---|---|---|---|
| **Preautoryzacja** (blokada środków na karcie/koncie) | Zabezpieczenie płatności, **nie jest płatnością ani zaliczką** | **Brak** skutków VAT | **Brak** przychodu (nie powstaje prawo do wynagrodzenia) |
| **Capture** (faktyczne pobranie środków) | Płatność/settlement | Jeśli następuje **po** wykonaniu usługi — obowiązek VAT powstał już przy wykonaniu usługi; jeśli **przed** wykonaniem (zaliczka) — obowiązek VAT przy capture | Zależy od tego, czy usługa już wykonana; co do zasady przychód powstaje wcześniej (patrz niżej) |
| **Wykonanie usługi** (transakcja sfinalizowana) | Zdarzenie gospodarcze | **Obowiązek VAT** (art. 19a ust. 1) | **Przychód należny** (art. 12 ust. 3a ustawy o CIT / MSR 15 / KSR 2) |

**Konkluzja:**
- **Preautoryzacja nigdy nie tworzy przychodu ani obowiązku VAT** — to tylko blokada środków.
- **Capture nie jest momentem rozpoznania przychodu** w modelu success fee: przychód należny powstaje z chwilą **wykonania usługi pośrednictwa** (prawo do wynagrodzenia), niezależnie od terminu pobrania środków. Capture może jedynie wyprzedzić moment rozpoznania, jeśli ma charakter zaliczki (płatność przed wykonaniem usługi) — wtedy przychód w dniu otrzymania (art. 12 ust. 4 pkt 1 ustawy o CIT).
- **Ryzyko:** jeśli Regulamin uzależnia powstanie prowizji od zapłaty przez kupującego („prowizja pobierana dopiero po skutecznej zapłacie") — moment wykonania usługi może być przesunięty do capture; **rekomendacja:** jasno zdefiniować w Regulaminie, że usługa jest wykonana z chwilą sfinalizowania transakcji (niezależnie od ściągalności), a ewentualne nieściągnięcie należności obsługiwać przez **ulgę na złe długi** (art. 89a ustawy o VAT — korekta podatku należnego po 90 dniach od terminu płatności) i **rozwiązanie rezerwy/odpis aktualizacyjny** (CIT).
- **Ewidencja:** przychód z prowizji ujmować memoriałowo (należność od Partnera), osobno śledzić status płatności (preauth → capture → settlement); wymóg wdrożenia w księgowości od pierwszego miesiąca działalności.

### 3.3. Uwaga na moment „wykonania usługi" przy RFQ

Jeśli prowizja dotyczy transakcji zawartej przez RFQ (kupujący złożył zapytanie, Partner wygrał): usługa wykonana z chwilą **zawarcia umowy/realizacji dostawy** wg Regulaminu — nie z chwilą złożenia zapytania (RFQ to etap przedkontraktowy, brak skutków podatkowych — patrz pkt 4).

---

## 4. Cross-border RFQ — konsekwencje VAT w UE

### 4.1. RFQ jako takie

- **RFQ (Request for Quotation) = zapytanie ofertowe** — czynność przedkontraktowa, **nie stanowi dostawy towarów ani świadczenia usług** → **brak jakichkolwiek skutków VAT** dla LogiMarket (ani dla Partnerów).
- Skutki VAT powstają dopiero przy **realizacji transakcji** (sprzedaż towaru / świadczenie usługi).

### 4.2. Transakcja B2B przez RFQ — struktura VAT (Partner PL → kupujący UE)

- **WDT (wewnątrzwspólnotowa dostawa towarów):** dostawa towarów wysłanych/transportowanych z PL do innego państwa członkowskiego na rzecz nabywcy z ważnym NIP UE → **stawka 0%** w Polsce, pod warunkiem: (1) ważny NIP UE nabywcy (weryfikacja VIES), (2) faktyczny transport do innego państwa członkowskiego, (3) dokumentacja przewozowa (CMR/listy przewozowe/elektroniczne dowody — art. 42 ustawy o VAT), (4) wykazanie w JPK_V7 i VIES (EC-SALES). **WDT rozlicza Partner (dostawca) — nie LogiMarket.**
- **WNT (wewnątrzwspólnotowe nabycie):** kupujący UE rozlicza WNT u siebie (VAT należny i naliczony — reverse charge w kraju nabywcy).
- **Ryzyka dla platformy:** jeśli LogiMarket (a) wystawia faktury za towar, (b) przejmuje własność towaru choćby przejściowo, (c) organizuje transport w swoim imieniu — może zostać uznany za dostawcę w łańcuchu (WDT po jego stronie). **W modelu pośrednictwa — wykluczone**, pod warunkiem czystej konstrukcji umownej.

### 4.3. Czy LogiMarket potrzebuje rejestracji VAT w innych krajach UE?

**Co do zasady NIE — w czystym modelu B2B usług pośrednictwa:**
- Usługa pośrednictwa (prowizja) na rzecz Partnera z innego kraju UE (podatnika VAT): **miejsce świadczenia = kraj siedziby nabywcy** (art. 28b ust. 1 ustawy o VAT) → **odwrotne obciążenie po stronie Partnera**, LogiMarket nie nalicza VAT i **nie musi rejestrować się** w kraju Partnera wyłącznie z tego tytułu.
- Obowiązki LogiMarket: faktura z adnotacją „odwrotne obciążenie", brak VAT; wykazanie usług w JPK_V7 (pozycje wewnątrzwspólnotowe) — ewidencja.

**Kiedy LogiMarket MUSIAŁBY się zarejestrować w innym państwie UE:**
1. **Magazyn/stock w innym kraju UE** (np. obsługa logistyczna dla Partnerów — model „FBA"): dostawy do magazynu = WDT, a sprzedaż z magazynu → rejestracja VAT w kraju magazynu;
2. **Sprzedaż B2C na odległość** do konsumentów w innych krajach UE (próg 10 000 EUR/rok; po przekroczeniu — VAT w kraju docelowym, opcjonalnie OSS);
3. **Stałe miejsce prowadzenia działalności (fixed establishment)** w innym kraju (biuro z personelem, istotna infrastruktura) — art. 11 rozporządzenia wykonawczego 282/2011; samo posiadanie serwerów/platformy IT **nie** tworzy FE;
4. Świadczenie usług B2C na rzecz osób niebędących podatnikami (inne reguły miejsca świadczenia).

**Wniosek:** w zakresie MVP (RFQ PL+UE, prowizja od Partnerów UE, bez magazynów zagranicznych, bez B2C) — **brak obowiązku rejestracji VAT za granicą**; wystarczy odwrotne obciążenie. Weryfikacja VIES numerów VAT Partnerów UE = obowiązek bieżący (dokumentować).

### 4.4. Pozostałe kwestie cross-border

- **Zamówienia/transakcje między Partnerami a kupującymi z UE** realizowane poza platformą (RFQ = tylko lead/matching): VAT po stronie Partnerów (WDT/WNT), LogiMarket tylko prowizja (jak wyżej). Brak zaangażowania VAT platformy.
- **Import/eksport poza UE:** w zakresie RFQ z państwami trzecimi — dostawa eksportowa (0% + dokumenty celne), import — rozliczenie celne przez Partnera; platforma bez obowiązków (chyba że model importowy ≤ 150 EUR — patrz pkt 1.2).
- **Sankcje/ryzyka:** brak weryfikacji NIP UE przy WDT przez Partnerów nie obciąża platformy, ale platforma powinna wymagać od Partnerów oświadczeń i danych VAT (też na potrzeby DAC7 — pkt 6).

---

## 5. PCC i podatek u źródła

### 5.1. PCC (podatek od czynności cywilnoprawnych)

- **Katalog czynności PCC jest zamknięty** (art. 1 ustawy o PCC): m.in. umowy sprzedaży rzeczy i praw majątkowych, zamiany, pożyczki, darowizny, ustanowienie hipoteki, umowy spółki.
- **Umowa pośrednictwa/prowizji (regulamin marketplace, umowa z Partnerem) — NIE znajduje się w katalogu** → **brak PCC**.
- **Sprzedaż towarów między przedsiębiorcami:** czynności opodatkowane VAT są **wyłączone z PCC** (art. 2 pkt 4 lit. a ustawy o PCC) → sprzedaż towarów przez Partnerów na platformie **nie podlega PCC** (przy założeniu opodatkowania VAT).
- **Wniosek:** w modelu B2B marketplace PCC **nie wystąpi** w praktyce (poza egzotycznymi przypadkami, np. sprzedaż rzeczy/używanych poza VAT, przejęcia długów — nie dotyczy MVP).

### 5.2. Podatek u źródła (WHT) — płatności transgraniczne

**Podstawa:** art. 21–22 ustawy o CIT (i art. 29–30a PIT); stawka krajowa 20% (CIT) z możliwością obniżenia wg UPO (umowy o unikaniu podwójnego opodatkowania).

| Płatność | WHT w Polsce? |
|---|---|
| **Płatności LogiMarket za towary** (zakup towarów od zagranicznych dostawców) | **Nie** — dostawy towarów nie są w katalogu art. 21 ust. 1 ustawy o CIT |
| **Prowizja płacona przez Partnera zagranicznego do LogiMarket** (przychód LogiMarket) | Nie dotyczy LogiMarket jako odbiorcy w Polsce; **Partner** może mieć obowiązki WHT w swoim kraju (usługi niematerialne — sprawdzić UPO) |
| **Prowizje LogiMarket dla zagranicznych agentów/pośredników** (np. pozyskiwanie Partnerów za granicą) | **Ryzyko:** usługi pośrednictwa mogą być kwalifikowane jako „świadczenia o podobnym charakterze" (art. 21 ust. 1 pkt 2a ustawy o CIT) → **WHT 20%**; obniżenie wg UPO (art. 7 „zyski przedsiębiorstw" — brak zakładu → brak opodatkowania w PL) przy zachowaniu **należytej staranności** (certyfikat rezydencji, oświadczenia, analiza faktycznego charakteru usługi) |
| **Opłaty licencyjne / software / SaaS** (zakup systemów od zagranicznych dostawców) | **Ryzyko:** opłaty licencyjne — art. 21 ust. 1 pkt 1 (10–20% / UPO); **SaaS/subskrypcje oprogramowania** — wg dominującej linii orzeczniczej i interpretacyjnej (m.in. wyrok TSUE C-215/20 *Veria* i zmiany od 2022 r. w zakresie pojęcia „należności licencyjnych") — usługa, nie opłata licencyjna; stanowisko fiskusa ewoluowało — **konieczna analiza każdej umowy** |
| **Odsetki/leasing/finansowanie** | WHT 20% / UPO (art. 11) — jeśli dotyczy |

**Mechanizm „pay-and-refund" (od 2022 r.):** przy płatnościach WHT-podatnych na rzecz jednego zagranicznego podmiotu przekraczających **2 mln zł rocznie** — obowiązek poboru WHT (20%) z możliwością zwrotu na wniosek; przy niższych kwotach — pobór zależny od oświadczenia/należytej staranności (art. 26 ust. 1–2f ustawy o CIT).

**Rekomendacje dla LogiMarket:**
- Weryfikacja statusu rezydencji podatkowej kontrahentów (certyfikaty rezydencji, klauzule w umowach);
- Mapowanie płatności do zagranicznych dostawców pod kątem katalogu art. 21 (usługi, licencje, pośrednictwo);
- Uwzględnienie WHT w umowach (klauzule gross-up / net);
- Płatności za towary — poza WHT, ale wymagana dokumentacja transakcji.

---

## 6. Model PSP / KYB / KYC — obowiązki AML

### 6.1. Czy LogiMarket jest „instytucją obowiązaną" wg ustawy AML?

**Ustawa o przeciwdziałaniu praniu pieniędzy i finansowaniu terroryzmu (AML/CFT, art. 2 ust. 1)** zawiera zamknięty katalog instytucji obowiązanych: banki, SKOK-i, instytucje płatnicze, biura usług płatniczych, agentów rozliczeniowych, kantory, fundusze, zakłady ubezpieczeń, TFI, VASP (waluty wirtualne), kasyna, pośredników w obrocie nieruchomościami, TCSP (usługi tworzenia spółek), prawników, doradców podatkowych, księgowych, biegłych rewidentów, notariuszy itd.

**Marketplace B2B jako taki NIE jest instytucją obowiązaną** — samo prowadzenie platformy łączącej kupujących i sprzedawców (nawet z pobieraniem prowizji) **nie** nakłada obowiązków AML (CDD, monitoringu, raportowania do GIIF).

**ALE — sytuacja zmienia się, gdy LogiMarket świadczy usługi płatnicze:**

| Model przepływu środków | Status LogiMarket |
|---|---|
| **Środki trafiają bezpośrednio od kupującego do Partnera** (PSP zewnętrzny, przelew bankowy) — LogiMarket tylko pośredniczy w informacji | Brak usług płatniczych → brak statusu instytucji obowiązanej AML |
| **Środki przechodzą przez rachunek LogiMarket** (model escrow/agent rozliczeniowy, LogiMarket przyjmuje i przekazuje płatności) | **Ryzyko świadczenia usług płatniczych bez zezwolenia** (ustawa o usługach płatniczych, PSD2) → wymagana licencja instytucji płatniczej (KNF), status biura usług płatniczych lub działanie jako agent podmiotu licencjonowanego; **wtedy LogiMarket staje się instytucją obowiązaną AML** z pełnym reżimem (CDD, AML/CFT policy, GIIF) |
| **Escrow u licencjonowanego podmiotu** (rachunek powierniczy/rozliczeniowy PSP, środki nie na rachunku LogiMarket) | LogiMarket nie świadczy usług płatniczych → brak statusu instytucji obowiązanej |

**Wyłączenie „agenta handlowego"** (art. 3 ust. 2 ustawy o usługach płatniczych / art. 3 lit. k PSD2): usługi płatnicze świadczone przez agenta handlowego działającego **w imieniu wyłącznie nabywcy lub wyłącznie sprzedawcy** w ramach umowy handlowej są wyłączone z zakresu ustawy — ale wyłączenie jest wąskie (jedna strona, umowa agencyjna) i **nie obejmuje modelu, w którym platforma pobiera środki od obu stron i rozlicza między nimi**.

**Rekomendacja dla MVP:** model **direct pay-out przez licencjonowanego PSP** (środki nie przechodzą przez rachunek LogiMarket; LogiMarket widzi dane transakcyjne i pobiera prowizję osobnym strumieniem lub przez PSP). Unika to: licencji płatniczej, reżimu AML i ryzyka regulacyjnego. Jeśli docelowo LogiMarket chce mieć **własny wallet/escrow** — projekt licencyjny (instytucja płatnicza / biuro usług płatniczych / współpraca z bankiem) — osobny etap, koszty i compliance.

### 6.2. KYB (Know Your Business) — weryfikacja Partnerów

**Obowiązki prawne (niezależnie od AML):**

1. **DAC7 — raportowanie operatorów platform (obowiązek obowiązujący!):**
   - Podstawa: dyrektywa DAC7 (2021/514), wdrożona w Polsce (ustawa o wymianie informacji podatkowych z innymi państwami — nowelizacja 2023 r.; pierwsze raporty za 2023 r. złożono do 31.01.2024, kolejne corocznie **do 31 stycznia** za poprzedni rok).
   - **LogiMarket = operator platformy cyfrowej** → obowiązek **due diligence** wobec sprzedawców (Partnerów) i **raportowania do Szefa KAS** danych: identyfikacyjnych (nazwa, adres, NIP/TIN, numer VAT UE, numer rejestracyjny, miejsce rejestracji, IBAN; dla osób fizycznych — data urodzenia), finansowych (liczba transakcji, łączna kwota wynagrodzenia, prowizje/opłaty pobrane przez platformę).
   - **Progi raportowania (sprzedaż towarów/usług):** Partnerzy z **> 30 transakcjami LUB > 2 000 EUR wynagrodzenia** w roku kalendarzowym. Wyłączenia: podmioty rządowe, spółki giełdowe (notowane), sprzedawcy poniżej progów.
   - **Konsekwencje:** LogiMarket musi zbierać i weryfikować dane Partnerów (w tym **NIP/VAT UE przez VIES**, adres, dane rejestrowe, beneficjentów rzeczywistych dla celów rejestrowych) już w procesie onboardingu — to **de facto obowiązkowe KYB**, nawet bez statusu instytucji obowiązanej AML.
   - Sankcje za brak raportowania: kary administracyjne (w Polsce do 1 mln zł wg ustawy? — kara pieniężna w wysokości do 1 000 000 zł) — istotne ryzyko.

2. **DSA (rozporządzenie 2022/2065), art. 30** — obowiązek weryfikacji handlowców (**„Know Your Business Customer"**) dla platform umożliwiających **konsumentom** zawieranie umów na odległość z handlowcami: dane handlowca, samozgodność (self-certification), kanał kontaktu. **Czysto B2B — art. 30 DSA nie dotyczy**; dotyczy, jeśli platforma ma funkcję consumer-facing (B2C) lub dopuści konsumentów do zakupów.

**Rekomendowany zakres KYB dla LogiMarket (MVP — B2B):**
- **Onboarding Partnera:** nazwa, adres siedziby, NIP/REGON (KRS/CEIDG), **numer VAT UE + weryfikacja VIES** (dla Partnerów zagranicznych), dane rejestrowe, adresy do faktur, IBAN (weryfikacja właściciela rachunku), osoby kontaktowe;
- **Weryfikacja negatywna:** listy sankcyjne (UE/US), media doniesienia (podstawowa), status podatkowy (aktywny podatnik VAT — weryfikacja białej listy PL / VIES UE);
- **Beneficjenci rzeczywiści** — dla celów rejestrowych i przyszłych wymogów (jeśli LogiMarket wejdzie w reżim AML — obowiązkowe CDD);
- **Dokumentacja:** umowa/regulamin, oświadczenia (status VAT, brak sankcji, compliance), archiwizacja — zgodnie z RODO (podstawa prawna: obowiązek prawny DAC7 + uzasadniony interes);
- **Monitoring:** cykliczna re-weryfikacja (VIES), alerty przy zmianach statusu VAT, raportowanie DAC7 roczne;
- **Segmentacja ryzyka:** wyższy poziom weryfikacji dla Partnerów z krajów wysokiego ryzyka (FATF) i dużych wolumenów.

### 6.3. KYC (kupujący)

- Model B2B: weryfikacja kupujących co do zasady ograniczona (dane firmowe, NIP/VAT, weryfikacja biała lista/VIES przy płatnościach — patrz pkt 1.4). **Nie ma obowiązku KYC konsumenckiego** w B2B.
- Jeśli LogiMarket obsługiwałby konsumentów (B2C) — obowiązki RODO/DPI + ewentualnie art. 30 DSA.

---

## 7. Podsumowanie — kluczowe wnioski i rekomendacje

| Obszar | Wniosek | Działanie |
|---|---|---|
| **Deemed supplier (art. 14a)** | Nie dotyczy czystego modelu B2B; ryzyko tylko przy B2C, imporcie ≤ 150 EUR, modelu resellera | Czysta konstrukcja umowna: LogiMarket = pośrednik, faktury za towar wystawia Partner; klauzule w Regulaminie |
| **OSS/IOSS** | Niepotrzebne w B2B | Odłożyć; wrócić przy wejściu w B2C |
| **VAT prowizji** | 23% (Partnerzy PL); 0% + reverse charge (Partnerzy UE z ważnym NIP VIES) | Weryfikacja VIES, adnotacje „odwrotne obciążenie" |
| **Split payment** | Prowizja poza MPP; towary wrażliwe Partnerów > 15 000 zł brutto — MPP po stronie kupującego | Obsługa MPP w procesie płatności, biała lista, adnotacje na fakturach |
| **KSeF** | **Obowiązkowy:** wystawianie od 1.02.2026 (duzi) / 1.04.2026 (pozostali), odbiór od 1.02.2026; B2C wyłączone | **Priorytet:** integracja KSeF (API), tryb awaryjny, upoważnienia, faktury prowizyjne w KSeF; uwzględnić wymóg KSeF wobec Partnerów |
| **Moment przychodu/VAT** | Wykonanie usługi = sfinalizowanie transakcji (wg Regulaminu); preauth — bez skutków; capture — płatność, nie moment rozpoznania; zaliczka przed usługą = VAT/przychód w dniu otrzymania | Definicja „wykonania usługi" w Regulaminie; ewidencja memoriałowa; ulga na złe długi |
| **RFQ cross-border** | RFQ bez skutków VAT; WDT/WNT po stronie Partnerów; prowizja od Partnerów UE — reverse charge; **brak rejestracji VAT za granicą** (bez magazynów/B2C/FE) | Rejestr NIP UE (VIES), dokumentacja; przegląd przy otwarciu magazynów zagranicznych |
| **PCC** | Nie występuje (pośrednictwo poza katalogiem; sprzedaż opodatkowana VAT wyłączona) | — |
| **WHT** | Towary — bez WHT; usługi/licencje/pośrednictwo zagraniczne — ryzyko WHT 20% (UPO: art. 7 — brak zakładu) | Mapowanie płatności, certyfikaty rezydencji, klauzule umowne, „pay-and-refund" przy > 2 mln zł |
| **AML/PSP** | Marketplace B2B nie jest instytucją obowiązaną; **staje się nią przy obsłudze płatności (escrow/wallet)**; „commercial agent" wyłączenie wąskie | MVP: direct pay-out przez licencjonowany PSP; środki nie przechodzą przez rachunek LogiMarket; osobny projekt przy escrow |
| **KYB/DAC7** | **DAC7 obowiązkowy** (raport do Szefa KAS do 31.01 rocznie; progi 30 trans. / 2 000 EUR); KYB = proces onboardingu (VIES, rejestry, sankcje, IBAN, dane DAC7) | Wdrożyć KYB/DAC7 od startu; sankcje do 1 mln zł za brak raportów |

**Najważniejsze ryzyka projektowe (kolejność priorytetów):**
1. **KSeF** — obowiązek już obowiązuje (2026) — brak wdrożenia = sankcje VAT i karno-skarbowe;
2. **DAC7** — obowiązek raportowania rocznego — brak = kary administracyjne;
3. **Model płatności** — trzymać z dala od nielegalnego świadczenia usług płatniczych (escrow na własnym rachunku bez licencji);
4. **Konstrukcja umowna** (pośrednik vs dostawca) — chroni przed deemed supplier, WDT i obowiązkami towarowymi;
5. **Reverse charge przy Partnerach UE** — weryfikacja VIES i poprawne fakturowanie.

---

## Źródła (zweryfikowane 9.08.2026)

1. KSeF — zakres obowiązkowego KSeF, ksef.podatki.gov.pl (harmonogram: 1.02.2026 / 1.04.2026 / odbiór od 1.02.2026; wyłączenia, w tym B2C)
2. MF (podatki.gov.pl) — „KSeF obowiązkowy od 1 lutego 2026 r."; podatki-arch.mf.gov.pl — ustawa przesuwająca termin
3. infakt.pl — „KSeF od kiedy? Terminy obowiązku wystawiania faktur w KSeF" (ustawa o e-fakturach przyjęta przez Sejm; obowiązek odbioru od 1.02.2026)
4. jpk.info.pl — harmonogram 3-etapowy (1.02.2026, 1.04.2026, 1.01.2027), kary, wyłączenia
5. comarch.pl / kluczesoft.pl / penta.com.pl / kik.edu.pl — harmonogram KSeF 2026 (duzi podatnicy > 200 mln zł; pozostali od 1.04.2026; podmioty zagraniczne)
6. eurocert.pl — wyłączenie faktur konsumenckich (B2C) z obowiązku KSeF
7. staniekandpartners.pl — KSeF 2.0 (nowe przepisy od 2026)
8. sip.lex.pl — art. 14a dyrektywy 2006/112/WE (deemed supplier — platformy/interfejsy elektroniczne)
9. gov.pl/web/finanse — „Co warto wiedzieć o dyrektywie DAC7" (progi: 30 transakcji / 2 000 EUR)
10. mddp.pl, wgtax.pl, vsprint.pl, izbapodatkowa.pl — DAC7: obowiązki operatorów platform, progi, raportowanie do Szefa KAS

*Akty prawne: ustawa o VAT (art. 7 ust. 8, 9a, 19a, 28b, 42, 89a, 96b, 106i–106n, 108a–108f); dyrektywa 2006/112/WE (art. 14a, 44); Ordynacja podatkowa (art. 117ba–117bc); ustawa o PCC (art. 1, 2 pkt 4); ustawa o CIT (art. 21–22, 26); ustawa o usługach płatniczych (art. 3); ustawa AML (art. 2); ustawa o wymianie informacji podatkowych (DAC7); rozporządzenie DSA 2022/2065 (art. 30); rozporządzenie wykonawcze 282/2011 (art. 11 — stałe miejsce prowadzenia działalności).*
