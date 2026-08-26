# LogiMarket — Analiza RODO / GDPR (Worker 02 — Blok F wg plan.md)

**Autor:** prawnik-DPO (worker analityczny)
**Data:** 2026-08-09
**Zakres:** role RODO per aktywność (ACT-01…ACT-06), podstawy prawne art. 6, obowiązki informacyjne art. 13/14, retencja, umowy art. 28/26, cookie i sesje (ePrivacy), specyfika B2B.
**Materiał źródłowy:** doc_01.txt, doc_02.txt, doc_03.txt (Counsel Pack v1.0, baseline main @ cd1de626), plan.md.
**Status:** ANALIZA WSTĘPNA DO WERYFIKACJI PRZEZ KANCELARIĘ — nie stanowi opinii prawnej. Wskazane werdykty dla bramek LEG-MKT-09 / OMQ-MKT-11 są propozycjami DPO.

---

## 0. Werdykty w pigułce (macierz decyzji wg doc_03 §8)

| Processing activity | Rola LogiMarket | Rola Partnera | Podstawa prawna | Art. 13/14 | Retencja (rekomendacja) | DPA / art. 26 | Transfer |
|---|---|---|---|---|---|---|---|
| **ACT-01 Checkout** | Administrator (obecnie jedyny); po wdrożeniu przepływu do Partnera: współadministrator w zakresie kolekcji i przekazania (art. 26) | N/A obecnie; FUTURE: współadministrator (zakres transakcyjny) / niezależny administrator po otrzymaniu | 6(1)(b) (kroki przed zawarciem umowy na żądanie osoby); pomocniczo 6(1)(f) | Art. 13 przy kolekcji (obecna legalNote niewystarczająca); przyszłość: art. 14(3)(c) dla Partnera / wspólna nota | Orders: 3 lata od finalizacji (roszczenia, art. 118 KC); dane fakturowane 5 lat (art. 112 Ord. pod., art. 74 uor); potem anonimizacja | Nie DPA z Partnerem; art. 26 arrangement przed uruchomieniem przepływu (lub klauzule C2C) | Brak poza EEA obecnie; do Partnera tylko EEA (MVP); przyszłość poza EEA — art. 44+ |
| **ACT-02 RFQ** | Administrator (obecnie jedyny); FUTURE jw. | N/A obecnie; FUTURE: jw. | 6(1)(b) (kroki przed zawarciem umowy — negocjacje); pomocniczo 6(1)(f) | Art. 13 przy kolekcji; **usunąć/przebudować rfqLabels.consent** (zgoda nie jest podstawą RFQ) | rfq_leads: 12 mies. od ostatniej aktywności; konwersja → reżim orders; brak aktywności → delete | jw. | jw. |
| **ACT-03 Admin auth** | Administrator | N/A (Partner Portal nie istnieje) | 6(1)(f) (bezpieczeństwo, kontrola dostępu); ewent. 6(1)(b) (stosunek/umowa admina) | Art. 13 dla admina (polityka wewn.) | Konto: aktywność + 6 mies. po zakończeniu roli; logi: 12 mies. | **DPA z Supabase — TAK (art. 28(3))**; rejestr subprocesorów | Supabase (vendor US): SCC 2021/914 / DPF — do weryfikacji + TIA (Schrems II) |
| **ACT-04 Outbound clicks** | Administrator | N/A | 6(1)(f) + LIA (atrybucja prowizji, analityka, ochrona przed nadużyciami); **bez zgody** | Art. 13(1)(f) — wskazanie celu + odbiorców; informacja w polityce prywatności | Clicks (surowiec): 12 mies.; agregaty anonimowe: dłużej | Brak zewnętrznych vendorów analityki (server-side) — brak współadministrowania | Brak |
| **ACT-05 Cart & session** | Administrator | N/A | 6(1)(b) (element prekontraktowy — koszyk); cookie: ePrivacy — wyjątek "bezwzględnie niezbędne" **tylko dla cookie sesyjnego** | Art. 13 + informacja cookie (czas przechowywania — C-61/19 Orange România) | cart_items: do zakończenia checkout / **max 30 dni** (albo krócej, zgodnie z cookie); cron usuwający porzucone | — | Brak |
| **ACT-06 Partner contact** | Administrator | Partner = **podmiot danych** (nie procesor) | 6(1)(f) (relacja biznesowa, KYB); 6(1)(b) (umowa partnerska) | Art. 13 przy kolekcji (onboarding partnera); uwaga: contactEmail osoby fizycznej = dane osobowe | Czas trwania współpracy + 3 lata (roszczenia) / 5 lat (księgowość) | — | Brak |

**Kluczowe werdykty przekrojowe:**
1. **Zgoda NIE jest wymagana dla żadnego obecnego celu podstawowego** (checkout, RFQ, sesja, analityka, auth). Wyjątki: (a) cookie 30-dniowe — zgoda ePrivacy (art. 175 PKE) **jeśli** nie zostanie zredukowane do sesyjnego; (b) ewentualny marketing poza transakcją — osobna, dobrowolna zgoda.
2. Obecny tekst `rfqLabels.consent` jest **błędnie skonstruowany** jako zgoda na samo przetwarzanie RFQ → do usunięcia/przebudowy (ryzyko naruszenia art. 7(4) RODO — zgoda związana z usługą).
3. **Brak flagi Secure w cookie sesyjnym = realny problem** (art. 32 RODO) → P0.
4. **DPA z Supabase jest obowiązkowy** (art. 28(3)) — status VENDOR_DPA_STATUS=NOT_VERIFIED musi zostać zamknięty przed produkcją.
5. Przepływ LogiMarket → Partner (FUTURE) wymaga **uzgodnienia art. 26** (lub jasnych klauzul C2C) + aktualizacji notyfikacji art. 13 **przed** uruchomieniem, nie po.
6. B2B **nie wyłącza RODO**; dane kontaktowe osób fizycznych (w tym w ramach działalności) są danymi osobowymi (recital 14, C-101/01, C-434/16, C-582/14, SN III CZP 8/20).

---

## 1. Role RODO per aktywność (art. 4(7), 4(8), art. 26; EDPB Guidelines 07/2020)

### 1.1 Ramy analizy

- **Administrator (art. 4(7))**: podmiot, który **samodzielnie lub wspólnie z innymi** ustala **cele i sposoby** przetwarzania. EDPB Guidelines 07/2020 (wersja 2.0 z 7.07.2021): decydujące są fakty, nie etykiety; cel i środki mogą być ustalane wprost (umowa) lub milcząco (zachowanie).
- **Podmiot przetwarzający (art. 4(8))**: przetwarza dane **w imieniu administratora** (działanie na udokumentowane polecenie, art. 28(3)).
- **Współadministrowanie (art. 26)**: wspólne ustalenie celów **i** środków; może dotyczyć **tylko wybranych operacji** (TSUE C-40/17 Fashion ID — współadministrowanie ograniczone do operacji kolekcji i przekazania danych; TSUE C-210/16 Wirtschaftsakademie — fan page Facebooka; C-25/17 Jehovan todistajat — wspólne ustalanie nawet bez umowy).
- EDPB 07/2020: gdy jedna strona tylko **dostarcza technologię/platformę**, a druga ustala cele i środki — platforma jest podmiotem przetwarzającym. Gdy obie strony mają wpływ na cele/środki **dla konkretnych operacji** — współadministrowanie w tym zakresie.

### 1.2 Analiza per aktywność

**ACT-01 Checkout i ACT-02 RFQ (stan obecny).** LogiMarket samodzielnie ustala cel (przyjmowanie i routing order intent / zapytań) oraz środki (struktura formularza, baza danych, logika walidacji i routingu, dostęp admina). Partner **nie ma obecnie dostępu do danych** (brak dowodu w repo) i nie wpływa na cele/środki kolekcji. → **LogiMarket jest wyłącznym administratorem** operacji kolekcji i przechowywania. Supabase (baza, auth) jest podmiotem przetwarzającym. Wniosek: nie ma dziś podstaw do kwalifikacji Partnera jako administratora/współadministratora jakichkolwiek operacji z ACT-01/02 — nie przetwarza on tych danych.

**ACT-01/02 (stan przyszły — przepływ LogiMarket → Partner).** Po uruchomieniu przekazania danych kupującego do Partnera w celu realizacji zamówienia / odpowiedzi na RFQ:
- **Cel przetwarzania transakcyjnego jest wspólny**: obie strony potrzebują danych (companyName, kontakt, treść zapytania) do zawarcia i wykonania umowy sprzedaży (Partner jako sprzedawca kontraktowy — intencja biznesowa Q3/Q4).
- **Środki są częściowo wspólne**: LogiMarket ustala środki kolekcji (formularz, routing); Partner ustala środki po otrzymaniu (jak skontaktuje się z kupującym, jak przechowuje dane w swoich systemach, jak realizuje fulfillment).
- Zgodnie z linią **Fashion ID (C-40/17)** współadministrowanie może być ograniczone do operacji **kolekcji i przekazania** danych; późniejsze użycie przez Partnera (decyzje fulfillmentowe, własna komunikacja, własny marketing) pozostaje poza wspólnym zakresem, jeśli Partner samodzielnie ustala tam cele/środki.

**Rekomendacja (dwie opcje, rekomendowana pierwsza):**

| Opcja | Struktura | Konsekwencje |
|---|---|---|
| **A (rekomendowana)** | **Współadministrowanie art. 26** ograniczone do operacji "kolekcja + przekazanie + podstawowe przetwarzanie transakcyjne" (order/RFQ → akceptacja/odpowiedź Partnera); Partner = **niezależny administrator** dla użycia poza wspólnym zakresem (własny fulfillment, marketing, własne bazy) | Wymagane uzgodnienie art. 26(2) (role, obowiązki, punkt kontaktowy, treść informacyjna); jawność wobec osób danych (art. 26(2) zd. 2); odpowiedzialność solidarna art. 26(3). Najlepiej odzwierciedla rzeczywistość i daje kupującemu jeden punkt kontaktowy. |
| **B** | LogiMarket = administrator (kolekcja + ujawnienie); Partner = **niezależny administrator** po otrzymaniu; brak art. 26 | Wymagane klauzule C2C w umowie partnerskiej (limit celu, bezpieczeństwo, retencja, współpraca przy żądaniach, zakaz dalszego przekazywania, notyfikacja naruszeń). Mniejsze pole odpowiedzialności wspólnej, ale trudniejsze do obrony, skoro cel transakcyjny jest obiektywnie wspólny. |

**DPA art. 28 między LogiMarket a Partnerem — NIE** w żadnej z opcji: Partner nie przetwarza danych "w imieniu" LogiMarket, lecz dla własnych celów (wykonanie umowy z kupującym). DPA byłby wymagany tylko w modelu, w którym Partner przetwarzałby dane wyłącznie na polecenie LogiMarket (nie jest to model biznesowy).

**ACT-03 Admin auth.** LogiMarket ustala cele (kontrola dostępu, bezpieczeństwo panelu) i środki (allowlist ADMIN_USER_IDS, Supabase Auth). → **LogiMarket = administrator**; Supabase Auth = podmiot przetwarzający (część infrastruktury). Admin jest podmiotem danych (jego email + credential są danymi osobowymi — art. 4(1)).

**ACT-04 Outbound clicks.** LogiMarket samodzielnie ustala cel (atrybucja leadów/conversion tracking, podstawa rozliczenia success fee) i środki (HMAC-SHA256, no-referrer, secret). Przetwarzanie **serwerowe, bez zewnętrznych vendorów analitycznych** → brak współadministrowania z podmiotami trzecimi. → **LogiMarket = administrator.** Uwaga: dane są **pseudonimizowane, nie zanonimizowane** (recital 26) — HMAC z tajnym kluczem IP daje deterministyczny identyfikator; przy znajomości klucza lub kontekście (session ID powiązany z koszykiem/checkoutem) możliwa re-identyfikacja → traktować jako dane osobowe w rejestrze czynności.

**ACT-05 Cart & session.** LogiMarket ustala cele (funkcjonalność koszyka, ciągłość sesji) i środki (cookie httpOnly, 32-bajtowy session ID, tabela cart_items). → **LogiMarket = administrator.** Cookie sesyjne przechowywane w urządzeniu użytkownika — dodatkowo reżim ePrivacy (art. 5(3) dyrektywy 2002/58/WE; w PL art. 175 PKE) — patrz sekcja 6.

**ACT-06 Partner contact.** LogiMarket ustala cele (zarządzanie relacją partnerską, KYB, kontakt operacyjny) i środki (partners table, widoczność admina). → **LogiMarket = administrator.** Partner (lub jego pracownik) jest **podmiotem danych**, nie podmiotem przetwarzającym. Publiczne renderowanie danych partnera (NOT_VERIFIED) — jeśli wystąpi, pozostaje przetwarzaniem LogiMarket na podstawie art. 6(1)(f) (przejrzystość rynkowa, P2B/DSA disclosure — patrz Blok C), z ograniczeniem do danych firmowych (poza zakresem RODO — recital 14) i ostrożnością przy emailach imiennych.

---

## 2. Podstawy prawne (art. 6 RODO)

| ACT | Podstawa główna | Podstawa pomocnicza | Zgoda wymagana? |
|---|---|---|---|
| ACT-01 Checkout | **art. 6(1)(b)** — "podjęcie kroków na żądanie osoby, której dane dotyczą, przed zawarciem umowy": złożenie checkout = czynność na żądanie kupującego zmierzająca do zawarcia umowy (order intent → akceptacja Partnera); obejmuje też message i dane kontaktowe niezbędne do wykonania umowy | 6(1)(f) — operacje platformy (bezpieczeństwo, rozliczenie prowizji, zapobieganie nadużyciom; recital 47) | **NIE** |
| ACT-02 RFQ | **art. 6(1)(b)** — kroki przed zawarciem umowy (RFQ = rozpoczęcie rokowań; wycena Partnera) | 6(1)(f) — prowadzenie leadu, ochrona przed spamem | **NIE** — obecny `rfqLabels.consent` przebudować (patrz niżej) |
| ACT-03 Admin auth | **art. 6(1)(f)** — bezpieczeństwo systemów i kontrola dostępu (art. 32 RODO jako kontekst); recital 49 | 6(1)(b) — jeśli admin działa na podstawie umowy (praca/zlecenie); 6(1)(c) dla obowiązków bezpieczeństwa (NIS2, ePrivacy) | NIE |
| ACT-04 Outbound clicks | **art. 6(1)(f)** + **LIA** (atrybucja prowizji — bez tego brak rozliczenia success fee; ochrona przed oszustwami; minimalizacja przez HMAC) | — | **NIE** (pod warunkiem: pseudonimizacja, brak łączenia z marketingiem profilowanym, prawo sprzeciwu art. 21) |
| ACT-05 Cart & session | **art. 6(1)(b)** — element prekontraktowy (koszyk budowany na żądanie użytkownika) | 6(1)(f) — integralność sesji | **Zgoda ePrivacy (nie RODO)** dla cookie 30-dniowego — patrz sekcja 6; przy cookie sesyjnym wyjątek "bezwzględnie niezbędne" |
| ACT-06 Partner contact | **art. 6(1)(f)** — prowadzenie relacji biznesowej, KYB, obsługa platformy; recital 47 | 6(1)(b) — umowa partnerska (dane kontaktowe jako dane umowne) | NIE (marketing do tych adresów — osobne zagadnienie: soft opt-in art. 10 ust. 2 pkt 2 uśude, prawo sprzeciwu art. 21(2)) |

### 2.1 Czy zgoda jest wymagana dla któregokolwiek obecnego celu? — odpowiedź szczegółowa

1. **Checkout (ACT-01)** — NIE. Podstawa 6(1)(b). Zgoda byłaby wręcz wadliwa: przywiązanie zgody do skorzystania z usługi (złożenie zamówienia) narusza art. 7(4) RODO (zgoda nie jest dobrowolna, gdy jest warunkiem świadczenia, które może być wykonane na innej podstawie — EDPB Guidelines 05/2020).
2. **RFQ (ACT-02)** — NIE dla samego przetwarzania RFQ. **Obecny `rfqLabels.consent` (renderowany tekst zgody) należy usunąć lub przebudować**: jeśli jest prezentowany jako zgoda na przetwarzanie danych w celu odpowiedzi na RFQ, jest (a) zbędny (6(1)(b) wystarcza), (b) ryzykowny (art. 7(4) — zgoda warunkująca usługę), (c) mylący dla użytkownika. Przebudowa: tekst informacyjny art. 13 zamiast zgody; **osobny, opcjonalny checkbox zgody tylko wtedy**, gdy dane mają być użyte do marketingu Partnera/LogiMarket poza odpowiedzią na RFQ (art. 6(1)(a) + rejestr zgód art. 7(1)).
3. **Analityka (ACT-04)** — NIE, pod warunkiem ścisłego trzymania się pseudonimizacji, braku profilowania i realizacji prawa sprzeciwu (art. 21). Wymagana **LIA** (test uzasadnionego interesu) udokumentowana na piśmie — patrz rekomendacje.
4. **Sesja/koszyk (ACT-05)** — zgoda **ePrivacy (art. 175 PKE / art. 5(3) ePrivacy)**, nie RODO, wyłącznie jeśli cookie pozostaje **trwałe (30 dni)**; przy cookie sesyjnym stosuje się wyjątek "bezwzględnie niezbędne do świadczenia usługi wyraźnie zamówionej przez użytkownika" (szerokość wyjątku — interpretacja zawężająca, TSUE C-673/17 Planet49).
5. **Marketing** (jeśli przyszłościowo) — TAK, osobna dobrowolna zgoda (art. 6(1)(a)) dla marketingu elektronicznego do osób fizycznych; dla adresów firmowych przedsiębiorców — soft opt-in (art. 10 ust. 2 pkt 2 ustawy o świadczeniu usług drogą elektroniczną; por. SN III CZP 19/18) + prawo sprzeciwu art. 21(2).

---

## 3. Obowiązki informacyjne — art. 13 i 14

### 3.1 Kolekcja bezpośrednia (checkout, RFQ) — wymagana treść art. 13(1)–(2)

Kolekcja od samej osoby (formularz) → obowiązki z **art. 13 w momencie pozyskania** (przed/na moment submit). Klauzula musi zawierać:

| Element | Art. | Uwaga dla LogiMarket |
|---|---|---|
| Tożsamość i dane kontaktowe administratora | 13(1)(a) | oznaczenie podmiotu prowadzącego LogiMarket (spółka), adres, email kontaktowy (np. privacy@logimarket.eu) |
| Dane kontaktowe DPO (jeśli wyznaczony) | 13(1)(b) | wyznaczenie DPO nie jest obowiązkowe dla MVP (art. 37), ale rekomendowane jako kontakt ds. ochrony danych |
| Cele i podstawa prawna | 13(1)(c) | realizacja zamówienia/odpowiedzi na RFQ — art. 6(1)(b); operacje platformy — 6(1)(f) |
| Uzasadnione interesy (przy 6(1)(f)) | 13(1)(d) | np. atrybucja prowizji, bezpieczeństwo — wskazać wprost |
| Odbiorcy / kategorie odbiorców | 13(1)(e) | **obowiązkowo wskazać Partnera jako odbiorcę już teraz** (przyszły przepływ jest znany i celowy); obecnie: administratorzy LogiMarket, dostawcy infrastruktury (Supabase) |
| Zamiar przekazania do państwa trzeciego + zabezpieczenia | 13(1)(f), 13(2)(f) | obecnie brak (EEA); aktualizować, gdy pojawi się partner spoza EEA |
| Okres przechowywania lub kryteria | 13(2)(a) | wg harmonogramu retencji (sekcja 4) |
| Prawa: dostęp, sprostowanie, usunięcie, ograniczenie, przenoszalność, sprzeciw | 13(2)(b) | pełny katalog + sposób realizacji |
| Prawo wycofania zgody (jeśli zgoda stosowana) | 13(2)(c) | tylko dla celów zgodowych (np. marketing) |
| Prawo wniesienia skargi do UODO | 13(2)(d) | |
| Czy podanie danych jest wymogiem ustawowym/umownym oraz konsekwencje odmowy | 13(2)(e) | **istotne**: dane minimalne (companyName, contactName, email) niezbędne do obsługi zamówienia/RFQ; pola opcjonalne (phone, message) oznaczyć |
| Zautomatyzowane podejmowanie decyzji/profilowanie | 13(2)(f) | obecnie brak — oświadczenie "nie stosujemy" |
| Informacja o dalszym przetwarzaniu (zmiana celu) | 13(3) | jeśli cel się zmieni — informacja przed dalszym przetwarzaniem |

**Ocena stanu obecnego:** `checkoutLabels.legalNote` — istnieje, ale **niewystarczająca** (SUFFICIENCY=PENDING → NIE). `rfqLabels.consent` — **nie nadaje się jako klauzula art. 13** (to tekst zgody; patrz 2.1). Rekomendacja: jedna warstwowa klauzula (krótka + pełna) wspólna dla checkout i RFQ, linkowana w obu formularzach, z pełną treścią art. 13(1)–(2).

### 3.2 Kolekcja pośrednia — przepływ LogiMarket → Partner (art. 14)

Gdy Partner otrzyma dane kupującego od LogiMarket (FUTURE), dane nie pochodzą od osoby → **Partner ma obowiązki z art. 14**:
- **Treść (art. 14(1)–(2))**: jak art. 13, zamiast "czy podanie jest wymogiem" — informacja o **źródle danych** ("dane pochodzą od LogiMarket") oraz o tym, czy dane pochodzą ze źródeł publicznych (14(2)(f)).
- **Termin (art. 14(3))**: (a) w rozsądnym terminie, nie później niż 1 miesiąc od pozyskania; (b) przy pierwszym kontakcie z osobą — jeśli dane służą kontaktowi; (c) **najpóźniej przy pierwszym ujawnieniu innemu odbiorcy**.
- **Wyłączenia (art. 14(5))**: (a) osoba już posiada informacje (np. z klauzuli LogiMarket przy kolekcji — patrz niżej); (b) niemożliwość lub niewspółmierny wysiłek — w PL dodatkowo **art. 1 ustawy z 10.05.2018 r. o ochronie danych osobowych**: wyłączenie art. 14(5)(b) dla przetwarzania niezbędnego do ustalenia/dochodzenia/obrony roszczeń (dla rutynowego fulfillmentu rzadko znajdzie zastosowanie); (c) obowiązek tajemnicy.

**Czy LogiMarket musi przekazać informacje?** Tak, w dwóch wymiarach:
1. **Już przy kolekcji (art. 13(1)(e))**: LogiMarket informuje kupującego, że dane zostaną przekazane Partnerowi (nazwa/rola Partnera) — wtedy Partner może oprzeć się na art. 14(5)(a), ale musi móc to **udowodnić**.
2. **Przy przekazaniu (art. 14(3)(c))**: LogiMarket dostarcza Partnerowi treść informacji (lub gotową notę art. 14) **w momencie ujawnienia** — praktycznie: pakiet danych (order/RFQ) zawiera osadzoną notę informacyjną + pole identyfikujące klauzulę, na którą kupujący wyraził zgodę/został poinformowany.

**Rekomendacja:** w uzgodnieniu art. 26 (sekcja 5.3) przypisać obowiązek informacyjny: LogiMarket odpowiada za art. 13 przy kolekcji i za dostarczenie noty przy przekazaniu; Partner odpowiada za art. 14(3)(b) przy pierwszym kontakcie z kupującym i za własne cele niezależne. W umowie partnerskiej: obowiązek Partnera potwierdzenia otrzymania noty + zakaz użycia poza celem transakcyjnym bez odrębnej podstawy.

---

## 4. Retencja — okresy, triggery, podstawy (art. 5(1)(e))

Zasady: (i) okresy liczyć od **triggara** (zdarzenia kończącego cel); (ii) po upływie okresu — **usunięcie lub anonimizacja**; (iii) harmonogram musi być udokumentowany w ROPA (art. 30(1)(f)) i odzwierciedlony w klauzuli art. 13(2)(a); (iv) wdrożenie automatyczne (cron/edge function w Supabase, indeks po `updated_at`).

| Obszar | Rekomendowany okres | Trigger | Podstawa prawna retencji | Uwagi |
|---|---|---|---|---|
| **cart_items** (porzucone) | **30 dni od ostatniej aktywności** (albo krócej — zależnie od decyzji cookie, patrz 6.2; przy cookie sesyjnym — okres sesji) | usunięcie przy: remove item / clear cart / udany checkout; cron: `updated_at < now()-30d` → hard delete | 6(1)(b)/6(1)(f); minimalizacja 5(1)(c) | **luka potwierdzona**: brak auto-expiry; dodać job + indeks; dane koszyka nie są dokumentem księgowym — nie ma podstawy do dłuższej retencji |
| **orders** | **3 lata od finalizacji** (akceptacja/odrzucenie/realizacja) dla pełnego rekordu (PII); **5 lat** dla danych fakturowych/księgowych; potem **anonimizacja** (agregaty bez PII) | status finalny + timer 3 lata; dokumenty fakturowane — 5 lat od końca roku kalendarzowego, w którym upłynął termin płatności | 6(1)(f) — obrona roszczeń (art. 118 KC: 3 lata dla roszczeń związanych z działalnością gospodarczą; 6 lat ogólne); 6(1)(c) — obowiązki podatkowe/księgowe (art. 112 § 1 Ordynacji podatkowej; art. 74 ust. 1 ustawy o rachunkowości) | karencja: zawieszenie przy sporze (retencja do rozstrzygnięcia); po 5 latach anonimizacja, nie tylko soft-delete |
| **rfq_leads** | **12 miesięcy od ostatniej aktywności** (ostatni kontakt/odpowiedź Partnera); konwersja na zamówienie → przejście w reżim "orders"; brak aktywności → delete | status leadu (won/lost/closed) lub inactivity timer 12 mies. | 6(1)(f) — prowadzenie rokowań, follow-up; brak umowy = brak podstawy 6(1)(b) po zakończeniu negocjacji | opcjonalnie: 12 mies. z możliwością przedłużenia przy aktywnych negocjacjach (udokumentować w LIA) |
| **clicks** | surowe logi **12 miesięcy**; agregaty statystyczne (bez identyfikatorów) — dłużej (np. 26 mies. — benchmark z GA, nie norma prawna) | timer 12 mies. od zdarzenia; po okresie anonimizacja IP/session | 6(1)(f) + LIA — atrybucja prowizji (spory o success fee: art. 118 KC — 3 lata, ale surowiec można trzymać krócej, bo atrybucja jest rozstrzygana na agregatach) | rotacja klucza HMAC zmniejsza linkowalność historyczną; retencja musi obejmować klucz HMAC (usunąć razem z logami) |
| **auth / accounts** | konto admina: **czas pełnienia roli + 6 miesięcy** po zakończeniu; logi logowania/audyt: **12 miesięcy** | offboarding admina (usunięcie z allowlist + dezaktywacja w Supabase Auth); logi — timer | 6(1)(f) — bezpieczeństwo, dochodzenie incydentów (art. 32); ewent. 6(1)(c) (NIS2) | dane kont w Supabase Auth — zgodnie z DPA; po usunięciu konta upewnić się, że vendor usunął rekordy |
| **partners (ACT-06)** | **czas trwania współpracy + 3 lata** (roszczenia z umowy partnerskiej); dokumenty księgowe 5 lat | zakończenie umowy partnerskiej + timer | 6(1)(f)/6(1)(b); 6(1)(c) dla księgowości | przy zakończeniu — usunąć contactEmail pracownika (chyba że podstawa marketingowa z art. 21(2) sprzeciwem) |

**Praktyka wdrożeniowa:** Supabase — funkcje cron (pg_cron lub edge function wywoływana harmonogramem), twarde DELETE dla cart/rfq/click logs; dla orders — flaga archiwum + anonimizacja (null PII) po 5 latach; backupy: retencja kopii zapasowych (np. 30–90 dni, okno przywracania) udokumentowana osobno — backup nie może być "wiecznym" obejściem retencji.

---

## 5. Umowy powierzenia (art. 28), współadministrowanie (art. 26), transfery

### 5.1 Supabase — DPA obowiązkowy

Supabase przetwarza dane **w imieniu** LogiMarket (hosting Postgres, Supabase Auth) → relacja administrator–podmiot przetwarzający → **umowa powierzenia wymagana z mocy art. 28(3)**. Zakres minimalny umowy: przedmiot i czas, charakter i cel, rodzaj danych i kategorie osób (art. 28(3)(a)); polecenia administratora; poufność (28(3)(b)); środki bezpieczeństwa (28(3)(c)); warunki korzystania z subprocesorów (28(3)(d), 28(2)/(4) — autoryzacja ogólna + lista subprocesorów); pomoc przy żądaniach osób (28(3)(e)); wsparcie compliance (28(3)(f)); usunięcie/zwrot po zakończeniu (28(3)(g)); audyt (28(3)(h)); rejestr czynności procesora (art. 30(2)).

**Do zamknięcia (obecnie NOT_VERIFIED):**
- VENDOR_DPA_STATUS: podpisać DPA Supabase (dokument dostawcy) przed produkcją;
- SUBPROCESSOR_REGISTER_STATUS: pobrać i zachować aktualną listę subprocesorów Supabase + rejestr własny (art. 28(2));
- region hostingu: wybrać i zamrozić region EEA (np. Frankfurt); potwierdzić brak przetwarzania poza EEA dla podstawowego hostingu;
- dostęp wsparcia vendorów (kto i kiedy ma dostęp do danych) — udokumentować.

### 5.2 Transfery do państw trzecich (art. 44–49)

- Supabase jest spółką z USA → **możliwy transfer** (wsparcie, subprocesory, infrastruktura) — niezbędne: (a) sprawdzenie certyfikacji w **EU-US Data Privacy Framework** (decyzja adekwatności (UE) 2023/1795 z 10.07.2023) — jeśli Supabase/subprocesor certyfikowany, transfer na tej podstawie; (b) w przeciwnym razie **SCC** (decyzja wykonawcza (UE) 2021/914) w DPA; (c) **Transfer Impact Assessment (TIA)** wg EDPB Recommendations 01/2020 (Schrems II, C-311/18) — ocena dostępu organów USA + środki uzupełniające; (d) zapis w ROPA (art. 30(1)(e)) i w klauzuli art. 13(1)(f)/13(2)(f).
- **THIRD_COUNTRY_TRANSFER_STATUS** zmienić z NOT_DETERMINED na udokumentowaną decyzję po ww. analizie.
- Inni dostawcy (hosting frontendu — Vercel/Next.js, e-mail, monitoring błędów, PSP — przyszłość): każdy vendor → DPA + analiza transferu; **rejestr podmiotów przetwarzających** (wymóg art. 28 i 30).
- Przepływ do Partnera: MVP = partnerzy EEA (RFQ PL+UE, e-commerce PL) → brak transferu; przyszli partnerzy spoza EEA → SCC 2021/914 (C2C) + TIA przed uruchomieniem.

### 5.3 LogiMarket–Partner: art. 28 czy art. 26?

**Werdykt: nie DPA (art. 28), lecz art. 26 (współadministrowanie) — w wariancie rekomendowanym A (sekcja 1.2) — albo klauzule C2C (wariant B).**

Uzasadnienie: Partner nie działa "na polecenie" LogiMarket; przetwarza dane dla własnego celu (wykonanie umowy sprzedaży z kupującym, odpowiedź na RFQ). Relacja nie spełnia definicji podmiotu przetwarzającego (art. 4(8), EDPB 07/2020). Wspólny cel transakcyjny + wspólny wpływ na operacje kolekcji/przekazania → kwalifikacja z art. 26 (linia C-210/16, C-40/17).

**Treść uzgodnienia art. 26(2) (essential content):**
- zakres wspólnego przetwarzania (operacje: kolekcja, przekazanie, przetwarzanie transakcyjne do momentu akceptacji/odpowiedzi);
- podział obowiązków: informacyjny (13 przy kolekcji — LogiMarket; 14 przy przekazaniu — obaj wg sekcji 3.2), realizacja praw osób (punkt kontaktowy), bezpieczeństwo (art. 32), notyfikacja naruszeń (art. 33/34 — koordynacja 72 h), retencja;
- **jeden punkt kontaktowy dla osób danych** (art. 26(2) zd. 2) — podać w klauzuli;
- udostępnienie istoty uzgodnienia osobom danych (art. 26(2) zd. 2 — treść w klauzuli art. 13);
- zakres odpowiedzialności (art. 26(3)) + klauzule umowy partnerskiej: limit celu, zakaz dalszego przekazywania, retencja po stronie Partnera, współpraca przy żądaniach, indemnity.

**Kolejność wdrożenia:** uzgodnienie art. 26 **przed** pierwszym przekazaniem danych do Partnera; aktualizacja klauzul informacyjnych równolegle (13(1)(e)); uruchomienie przepływu dopiero po readiness review (LM_MARKETPLACE_SCHEMA_56B1_READY).

---

## 6. Cookie i sesje (ePrivacy / PECR; polskie przepisy)

### 6.1 Reżim prawny

- Dyrektywa 2002/58/WE (ePrivacy) art. 5(3): przechowywanie informacji w urządzeniu końcowym lub dostęp do niej wymaga **poinformowania + zgody**, z wyjątkiem: (1) przekazania komunikatu przez sieć; (2) **"bezwzględnie niezbędne"** do świadczenia usługi **wyraźnie zamówionej** przez użytkownika.
- Polska implementacja: dawny art. 173 ust. 2–3 ustawy Prawo telekomunikacyjne; od 1.01.2025 — **ustawa z 12.07.2024 r. Prawo komunikacji elektronicznej (Dz.U. 2024 poz. 1221), art. 175 PKE** (numerację zweryfikować w tekście jednolitym; wyjątki: przekazanie komunikatu + bezwzględnie niezbędne do usługi wyraźnie zamówionej).
- **TSUE C-673/17 Planet49**: zgoda na cookie musi być **aktywna** (zakaz pre-checked boxów); wyjątek "niezbędności" interpretować **wąsko**. **TSUE C-61/19 Orange România**: dostawca musi poinformować o **czasie przechowywania** cookie i o tym, czy mają do nich dostęp podmioty trzecie. Zgoda cookie musi spełniać art. 7 RODO (EDPB 05/2020).

### 6.2 Cookie sesyjne 30 dni — czy wymaga zgody?

**Tak, przy obecnej konfiguracji.** Cookie (32 bajty losowe, httpOnly, SameSite=Lax, **maxAge 30 dni**) nie jest "bezwzględnie niezbędne" jako **trwałe**: usługa (koszyk, sesja) działa poprawnie przy cookie sesyjnym (maxAge do końca sesji lub krótki okres). Trwałość 30 dni to **funkcjonalność wygody** (przywracanie koszyka między wizytami) → poza wąskim wyjątkiem z art. 175 PKE → wymagana **zgoda** (banner z aktywnym wyrażeniem zgody, bez pre-checked; informacja o czasie przechowywania — C-61/19; możliwość wycofania równie łatwego — art. 7(3)).

**Dwie drogi (wybór biznesowy):**

| Opcja | Opis | Konsekwencje |
|---|---|---|
| **A (rekomendowana)** | Redukcja maxAge do **sesji** (lub krótkiego, uzasadnionego okresu, np. 24–48 h) | cookie mieści się w wyjątku "bezwzględnie niezbędne" → **brak bannera zgody** dla tego cookie; cart_items trzymane tylko w okresie sesji/uzasadnionym; prostszy UX B2B |
| **B** | Zachowanie 30 dni + wdrożenie **cookie bannera** ze zgodą (per-cel, aktywny opt-in) | dodatkowy obowiązek informacyjny i mechanizm zgód (art. 7(1) rejestr), zgoda wycofywalna; ryzyko kontrolne UODO wyższe |

Dodatkowo: banner (jeśli opcja B lub przy przyszłych cookie analitycznych/marketingowych) — per-cel, bez "odrzuć wszystkie" ukrytego; pamiętać, że **obecna analityka jest serwerowa (bez cookie)** — nie wymaga zgody cookie, ale wymaga informacji i LIA (sekcja 2).

### 6.3 Brak flagi Secure — problem?

**Tak, to realna luka (P0).** Cookie bez `Secure` może zostać wysłane po **zwykłym HTTP** (downgrade ataku, przechwycenie w niezabezpieczonej sieci) → ryzyko przejęcia sesji/koszyka (art. 32 RODO — naruszenie bezpieczeństwa może rodzić obowiązek notyfikacji art. 33/34). Naprawa:
1. `Set-Cookie: ...; Secure; HttpOnly; SameSite=Lax` (SameSite=Lax OK dla tego zastosowania; httpOnly już jest);
2. rozważyć prefiks `__Host-` (wymaga Secure + Path=/ + brak Domain) dla maksymalnej ochrony przed atakami podrzucania cookie;
3. wymusić HTTPS (HSTS) — całość ruchu przez TLS;
4. potwierdzić, że cookie nie zawiera PII (obecnie: sam identyfikator sesji — dobrze; dane w DB).

---

## 7. B2B a RODO — czy B2B zmienia wymagania?

**Nie zmienia zakresu stosowania.** RODO chroni osoby fizyczne; nie istnieje wyłączenie "B2B":

- **Recital 14 RODO**: rozporządzenie nie obejmuje danych **osób prawnych** (nazwa firmy, forma prawna, dane kontaktowe osoby prawnej np. info@firma.pl) — ale obejmuje dane **osób fizycznych**, także przetwarzane w kontekście zawodowym/biznesowym.
- **TSUE C-101/01 Lindqvist**: informacje opublikowane w kontekście zawodowym pozostają danymi osobowymi. **C-434/16 Nowak**: szeroka koncepcja danych osobowych. **C-582/14 Breyer**: identyfikowalność przez "dodatkowe dane" (adres IP) — dane tożsamościowe firmy + email imienny pracownika → dane osobowe pracownika.
- **Imienny email kontaktowy** (np. jan.kowalski@partner.pl), **telefon komórkowy**, imię i nazwisko kupującego (contactName) → **dane osobowe** bez wątpienia. Email generyczny (info@) i companyName — poza zakresem, **chyba że** kontekst (np. jedyny pracownik = osoba fizyczna) pozwala zidentyfikować osobę (C-582/14).
- **Przedsiębiorca jednoosobowy (JDG)**: dane dotyczące jego działalności są danymi osobowymi (por. uchwała SN z 22.02.2021 r., III CZP 8/20 — stosowanie RODO do danych przedsiębiorców będących osobami fizycznymi; zgodnie z recitalem 14 i orzecznictwem TSUE).
- **Korekta cytowania z zadania**: C-191/15 (Verein für Konsumenteninformation v Amazon) dotyczy **prawa konsumenckiego** (jurysdykcja, prawo właściwe — Bruksela I/Rzym I), nie danych osobowych — nie jest właściwym źródłem dla tezy "dane biznesowe = dane osobowe". Właściwe: recital 14, C-101/01, C-434/16, C-582/14, SN III CZP 8/20. C-210/16 (Wirtschaftsakademie) pozostaje właściwe — ale dla **współadministrowania**, nie dla definicji danych osobowych.

**Konsekwencje praktyczne B2B (nie zwolnienie, lecz balans):**
1. **LIA łatwiejsza, ale obowiązkowa**: dane kontaktowe B2B mają niższe oczekiwanie prywatności (osoby działają zawodowo) → uzasadniony interes (6(1)(f)) częściej przeważy; test i tak udokumentować.
2. **Marketing B2B**: do adresów e-mail przedsiębiorców (osób fizycznych) możliwy **soft opt-in** (art. 10 ust. 2 pkt 2 ustawy o świadczeniu usług drogą elektroniczną — adres uzyskany w związku z działalnością, informacja o podobnych towarach/usługach; por. SN III CZP 19/18) + prawo sprzeciwu art. 21(2); do adresów imiennych osób fizycznych (pracowników) — ostrożniej, w praktyce zgoda lub ścisły 6(1)(f).
3. **Brak danych dzieci i (z reguły) szczególnych kategorii** → niższe ryzyko; w polu `message` dodać zakaz podawania danych wrażliwych (minimalizacja art. 5(1)(c)).
4. **DPIA (art. 35)**: MVP B2B (brak dużego monitoringu, brak danych wrażliwych na dużą skalę, brak profilowania) — **prawdopodobnie nieobowiązkowa**; wymagany jednak **screening** (decyzja udokumentowana wg listy UODO + EDPB DPIA Guidelines). Ponowny screening przy: profilowaniu, scoringu Partnerów, rozszerzeniu o dane płatnicze na dużą skalę.
5. **B2B a kwalifikacja platformy (DSA)**: jeżeli do systemu "przecieknie" konsument (brak kwalifikacji B2B — LEG-MKT-08), pojawią się obowiązki konsumenckie i potencjalnie art. 30 DSA (KYB traderów dla platform umożliwiających konsumentom zawieranie umów) — wzmacnia to pilność zamknięcia bramki B2B (Blok E), ale nie zmienia analizy RODO.
6. **Obowiązki informacyjne, prawa osób, notyfikacja naruszeń, ROPA** — w B2B identyczne jak w B2C; nie można ich pominąć z powodu "to tylko firmy".

---

## 8. Rekomendacje priorytetowe

### P0 — blokujące (przed uruchomieniem przepływu do Partnera / produkcją)
1. **Zamknąć klauzule informacyjne art. 13** w checkout i RFQ (pełny zakres wg sekcji 3.1; wskazanie Partnera jako przyszłego odbiorcy; oznaczenie pól opcjonalnych; warstwowość: krótka + pełna).
2. **Usunąć/przebudować `rfqLabels.consent`** — zgoda nie jest podstawą RFQ; ewentualny osobny checkbox tylko dla marketingu.
3. **Secure flag** dla cookie sesyjnego (+ HSTS, HTTPS-only); rozważyć `__Host-` prefix.
4. **DPA z Supabase** (art. 28(3)) + weryfikacja subprocesorów, region EEA, analiza transferu (SCC/DPF + TIA) — zamknąć VENDOR_DPA_STATUS / SUBPROCESSOR_REGISTER_STATUS / THIRD_COUNTRY_TRANSFER_STATUS.
5. **Harmonogram retencji + wdrożenie automatycznych usunięć** (cart 30 dni / wg decyzji cookie; rfq 12 mies.; clicks 12 mies.; orders 3/5 lat + anonimizacja).
6. **Przed pierwszym przekazaniem danych do Partnera**: uzgodnienie **art. 26** (wariant A) lub klauzule C2C (wariant B) + nota art. 14 dla Partnera (mechanizm 14(3)(c)) + aktualizacja notyfikacji.

### P1 — przed skalowaniem
7. Decyzja cookie: redukcja maxAge do sesji **albo** banner zgody (art. 175 PKE; Planet49 — aktywny opt-in; C-61/19 — info o czasie przechowywania).
8. **LIA** na piśmie dla ACT-04 (analityka/atrybucja) i ACT-06 (relacje partnerskie) + prawo sprzeciwu (art. 21) wdrożone praktycznie.
9. **ROPA (art. 30(1))** — wpisy 1:1 z ACT-01…06 + przyszły przepływ do Partnera; rejestr subprocesorów; rejestr naruszeń (art. 33(5)); procedura 72 h (art. 33/34).
10. **Proces żądań osób (art. 12–23)** dla nieuwierzytelnionych użytkowników: weryfikacja tożsamości (art. 12(6)) oparta o email + referencję zamówienia; wyznaczenie kontaktu (privacy@logimarket.eu) i ewentualnie DPO zewnętrznego.
11. **Polityka prywatności + polityka cookie** (osobne, kompletne); informacja o cookie w UI (C-61/19).
12. **Screening DPIA** (art. 35(1)) udokumentowany na piśmie.

### P2 — dobre praktyki
13. Rotacja klucza HMAC (ACT-04) i retencja klucza wraz z logami.
14. W polu `message` — zakaz danych wrażliwych (walidacja + nota).
15. Anonimizacja historycznych orders po 5 latach; agregaty analityczne bez PII.
16. Uwzględnić w umowie partnerskiej: limit celu, zakaz dalszego przekazywania, bezpieczeństwo, retencja, współpraca przy żądaniach i naruszeniach (niezależnie od wariantu A/B).
17. Przy wyborze PSP (przyszłość) — powtórzenie analizy vendor (DPA, transfer, minimalizacja danych płatniczych — tokenizacja).

---

## 9. Mapowanie na bramki projektu

| Gate | Werdykt (propozycja DPO) | Warunki |
|---|---|---|
| **LEG-MKT-09** (RODO role/obowiązki) | **APPROVED_WITH_CONDITIONS** | Role per ACT wg sekcji 1; warunki P0.1–P0.6; ROPA + LIA przed produkcją |
| **OMQ-MKT-11** (retencja/przepływy) | **APPROVED_WITH_CONDITIONS** | Harmonogram retencji (sekcja 4) wdrożony technicznie; art. 26/C2C przed przepływem do Partnera |
| **DATA_PROTECTION_ROLE_STATUS** | Per-activity wg macierzy w sekcji 0 (LogiMarket = administrator we wszystkich; Supabase = procesor; Partner = przyszły współadministrator/niezależny administrator) | Zmiana statusu po akceptacji przez kancelarię |
| **LM_MARKETPLACE_SCHEMA_56B1_READY** | pozostaje **NO** | do czasu zamknięcia P0 |

---

## 10. Akty i materiały przywołane

- Rozporządzenie (UE) 2016/679 (RODO) — art. 4, 5, 6, 7, 12–23, 26, 28, 30, 32–35, 44–49; recital 14, 26, 47.
- EDPB Guidelines 07/2020 on the concepts of controller and processor (wersja 2.0, 7.07.2021).
- EDPB Guidelines 05/2020 on consent; EDPB Recommendations 01/2020 (środki uzupełniające transfery).
- TSUE: C-673/17 Planet49; C-61/19 Orange România; C-40/17 Fashion ID; C-210/16 Wirtschaftsakademie; C-25/17 Jehovan todistajat; C-101/01 Lindqvist; C-434/16 Nowak; C-582/14 Breyer; C-311/18 Schrems II. *Uwaga: C-191/15 dotyczy prawa konsumenckiego (Bruksela I/Rzym I), nie RODO.*
- Polska: ustawa z 10.05.2018 r. o ochronie danych osobowych (art. 1 — wyłączenie informacyjne dla roszczeń); ustawa z 12.07.2024 r. Prawo komunikacji elektronicznej (Dz.U. 2024 poz. 1221) — art. 175 (cookie; dawny art. 173 PT); ustawa z 18.07.2002 r. o świadczeniu usług drogą elektroniczną (art. 10); Kodeks cywilny (art. 118); Ordynacja podatkowa (art. 112); ustawa o rachunkowości (art. 74); uchwała SN z 22.02.2021 r., III CZP 8/20; por. uchwała SN z 4.07.2019 r., III CZP 19/18.
- Decyzja wykonawcza Komisji (UE) 2021/914 (SCC); decyzja wykonawcza (UE) 2023/1795 (EU-US Data Privacy Framework).

*Dokument ma charakter analizy roboczej dla kancelarii/DPO i nie stanowi opinii prawnej. Numery artykułów aktów krajowych (w szczególności PKE) oraz dokładne sentencje orzeczeń należy zweryfikować w aktualnych tekstach jednolitych.*
