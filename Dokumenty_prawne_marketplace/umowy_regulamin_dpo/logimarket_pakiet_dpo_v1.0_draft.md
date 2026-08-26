# PAKIET DPO — LogiMarket Marketplace B2B

## Dokumenty do sign-off Data Protection Officer

**Wersja:** Draft v1.0
**Data:** 9 sierpnia 2026 r.
**Status:** DO WERYFIKACJI PRZEZ DPO / EXTERNAL DATA PROTECTION COUNSEL
**Podstawa:** RODO (Regulation (EU) 2016/679), EDPB Guidelines 07/2020, art. 399 PKE (Dz.U. 2024 poz. 1221)

---

## SPIS DOKUMENTÓW W PAKIECIE

1. Rejestr Czynności Przetwarzania (ROPA) — art. 30(1)
2. Klauzula informacyjna art. 13 — Checkout i RFQ
3. Polityka retencji danych
4. Decyzja cookie — ocena art. 399 PKE
5. Wymagania DPA / vendor register — Supabase i dostawcy
6. Matryca ról RODO per processing operation
7. DPIA Screening — art. 35
8. Procedura obsługi żądań osób (DSAR) — art. 12–23
9. Procedura notyfikacji naruszeń — art. 33/34
10. Wytyczne dla przyszłego uzgodnienia art. 26 — LogiMarket → Partner

---
---

## Dokument 1: Rejestr Czynności Przetwarzania (ROPA) — art. 30(1)

| Pole | ACT-01 Checkout | ACT-02 RFQ | ACT-03 Admin auth | ACT-04 Outbound clicks | ACT-05 Cart & session | ACT-06 Partner contacts |
|---|---|---|---|---|---|---|
| **Cel przetwarzania** | Przyjmowanie zamówień / kroki przed zawarciem umowy | Przyjmowanie zapytań ofertowych / negocjacje | Kontrola dostępu, bezpieczeństwo panelu admin | Atrybucja prowizji, analityka konwersji | Funkcjonalność koszyka, ciągłość sesji | Zarządzanie relacją partnerską, KYB |
| **Podstawa prawna** | art. 6(1)(b) RODO | art. 6(1)(b) RODO | art. 6(1)(f) RODO | art. 6(1)(f) RODO + LIA | art. 6(1)(b) RODO | art. 6(1)(f) + 6(1)(b) RODO |
| **Kategorie osób** | Pracownicy firm (B2B) — contactName, e-mail, telefon | jw. | Admin LogiMarket (osoba fizyczna) | Użytkownicy platformy (pseudonimizowani) | Użytkownicy platformy | Pracownicy Partnerów (osoby fizyczne) |
| **Kategorie danych** | companyName, contactName, email, phone, message, order items, wartość zamówienia | companyName, contactName, email, phone, message | e-mail, credential (hash), IP logowania | Session ID, HMAC-SHA256(IP), offerId, partnerId, timestamp | Session ID (32 random bytes), cart items | companyName, contactEmail, websiteUrl |
| **Odbiorcy** | LogiMarket Admin (obecnie); Partner (FUTURE — po uzgodnieniu art. 26) | jw. | — | — | — | LogiMarket Admin |
| **Transfery** | Brak poza EEA (obecnie); FUTURE: tylko EEA | jw. | Supabase (EEA — do potwierdzenia) | Brak | Brak | Brak |
| **Retencja** | 3 lata (PII) / 5 lat (dane księgowe) od finalizacji; potem anonimizacja | 12 mies. od ostatniej aktywności | Konto: rola + 6 mies.; logi: 12 mies. | 12 mies. (surowe); agregaty dłużej | 30 dni / sesja | Współpraca + 3 lata; księgowość 5 lat |
| **Środki bezpieczeństwa** | TLS, httpOnly cookie, Supabase RLS, requireAdmin | jw. | Supabase Auth, allowlist ADMIN_USER_IDS | HMAC pseudonimizacja, no-referrer | httpOnly, SameSite=Lax, (Secure — do wdrożenia) | Supabase RLS, requireAdmin |
| **Podmiot przetwarzający** | Supabase (hosting DB, Auth) | Supabase | Supabase Auth | — | — | Supabase |
| **DPA status** | NOT_VERIFIED — wymaga podpisania | jw. | jw. | — | — | jw. |

**FUTURE — przekazanie danych Kupującego do Partnera:**

| Pole | Wartość |
|---|---|
| **Cel** | Realizacja Zamówienia / odpowiedź na RFQ |
| **Podstawa** | art. 6(1)(b) — wykonanie umowy / kroki przed zawarciem |
| **Role** | DO USTALENIA per processing operation (art. 26 / C2C / niezależny administrator) — po zaprojektowaniu przepływu |
| **Obowiązek informacyjny** | LogiMarket: art. 13 przy kolekcji (wskazanie Partnera jako odbiorcy); Partner: art. 14 przy otrzymaniu (mechanizm 14(3)(c)) |
| **Warunek uruchomienia** | Uzgodnienie art. 26 (lub klauzule C2C) + aktualizacja klauzuli art. 13 + DPO sign-off — PRZED pierwszym przekazaniem |

---
---

## Dokument 2: Klauzula informacyjna art. 13 — Checkout i RFQ

### Wersja krótka (widoczna w formularzu):

> **Ochrona danych osobowych**
>
> Administratorem Twoich danych osobowych jest LogiMarket sp. z o.o. *(adres, NIP)*. Dane przetwarzane są w celu obsługi Twojego zamówienia/zapytania (art. 6(1)(b) RODO) oraz bezpieczeństwa i analityki platformy (art. 6(1)(f) RODO).
>
> Twoje dane (firma, dane kontaktowe, treść zamówienia) zostaną przekazane Sprzedawcy (Partnerowi) w celu realizacji transakcji.
>
> Masz prawo: dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszalności, sprzeciwu, oraz wniesienia skargi do Prezesa UODO. Szczegóły: [Polityka prywatności](/privacy).

### Wersja pełna (Polityka Prywatności — art. 13(1)–(2)):

| Element art. 13 | Treść |
|---|---|
| **(1)(a) Administrator** | LogiMarket sp. z o.o., *[adres]*, NIP: *[NIP]*, e-mail: privacy@logimarket.eu |
| **(1)(b) DPO** | *[Do wyznaczenia — rekomendowane]* — kontakt: dpo@logimarket.eu |
| **(1)(c) Cele i podstawy** | Obsługa zamówienia/RFQ — art. 6(1)(b); bezpieczeństwo, atrybucja prowizji, analityka — art. 6(1)(f); KYB Partnerów — art. 6(1)(f) + 6(1)(b) |
| **(1)(d) Uzasadnione interesy** | Atrybucja prowizji (success fee); ochrona przed nadużyciami i oszustwami; bezpieczeństwo systemu |
| **(1)(e) Odbiorcy** | Partner (Sprzedawca) — w celu realizacji Zamówienia; dostawcy infrastruktury (Supabase — podmiot przetwarzający); *[future: PSP]* |
| **(1)(f) Transfery** | Brak transferu poza EEA (obecnie). Jeżeli pojawi się: odpowiednie zabezpieczenia (DPF/SCC + TIA) |
| **(2)(a) Retencja** | Zamówienia: 3 lata (PII) / 5 lat (dane księgowe); RFQ: 12 mies. od ostatniej aktywności; koszyk: 30 dni/sesja; analityka: 12 mies. Po upływie: usunięcie lub anonimizacja |
| **(2)(b) Prawa** | Dostęp (art. 15), sprostowanie (art. 16), usunięcie (art. 17), ograniczenie (art. 18), przenoszalność (art. 20), sprzeciw (art. 21) |
| **(2)(c) Wycofanie zgody** | Nie dotyczy (zgoda nie jest podstawą dla core flows). Marketing (jeśli przyszłościowy) — wycofanie równie łatwe jak udzielenie |
| **(2)(d) Skarga do UODO** | Prezes Urzędu Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa, www.uodo.gov.pl |
| **(2)(e) Wymóg podania / konsekwencje** | Dane obowiązkowe (companyName, contactName, e-mail) — niezbędne do obsługi zamówienia; brak = brak możliwości złożenia zamówienia. Dane opcjonalne (phone, message) — oznaczone |
| **(2)(f) Zautomatyzowane decyzje / profilowanie** | Nie stosujemy zautomatyzowanego podejmowania decyzji ani profilowania (art. 22) |

### RFQ — tekst informacyjny (zastępuje obecny rfqLabels.consent):

> **Informacja o przetwarzaniu danych**
>
> Dane podane w formularzu RFQ przetwarzane są w celu obsługi Twojego zapytania ofertowego (art. 6(1)(b) RODO). Twoje dane kontaktowe zostaną przekazane wybranemu Partnerowi w celu przygotowania odpowiedzi. Szczegóły: [Polityka prywatności](/privacy).

**UWAGA:** Usunąć obecny tekst `rfqLabels.consent` — zgoda nie jest podstawą przetwarzania RFQ. Zastąpić tekstem informacyjnym art. 13 powyżej.

---
---

## Dokument 3: Polityka retencji danych

| Dataset | Okres retencji | Trigger (liczony od) | Akcja po upływie | Podstawa prawna | Mechanizm techniczny |
|---|---|---|---|---|---|
| **cart_items** (porzucone) | 30 dni / sesja | Ostatnia aktualizacja (updated_at) | Hard DELETE | art. 5(1)(e), 6(1)(b)/(f) RODO | Cron/edge function: `DELETE FROM cart_items WHERE updated_at < NOW() - INTERVAL '30 days'` |
| **orders** (PII) | 3 lata | Status finalny (COMPLETED/REJECTED/CANCELLED) | Anonimizacja PII (NULL contactName, email, phone, message) | art. 6(1)(f) — obrona roszczeń (art. 118 KC — 3 lata B2B) | Scheduled job: `UPDATE orders SET contactName=NULL, ... WHERE status_final_at < NOW() - INTERVAL '3 years'` |
| **orders** (dane księgowe) | 5 lat | Koniec roku kalendarzowego, w którym upłynął termin płatności | Anonimizacja (lub archiwizacja księgowa) | art. 6(1)(c) — art. 112 Ord. pod., art. 74 uor | Współpraca z biurem rachunkowym |
| **rfq_leads** | 12 mies. | Ostatnia aktywność (odpowiedź/kontakt) | Hard DELETE | art. 6(1)(f) RODO | Cron: `DELETE FROM rfq_leads WHERE last_activity_at < NOW() - INTERVAL '12 months'` |
| **clicks** (surowe logi) | 12 mies. | Timestamp zdarzenia | Anonimizacja (usunięcie HMAC IP + session ID) | art. 6(1)(f) + LIA | Cron: anonymize clicks older than 12 months + rotacja klucza HMAC |
| **auth/accounts** (admin) | Konto: rola + 6 mies. po zakończeniu roli; logi: 12 mies. | Offboarding admina / timestamp logu | Usunięcie konta w Supabase Auth + DELETE logów | art. 6(1)(f) RODO | Procedura offboarding + cron logów |
| **partner contacts** | Współpraca + 3 lata; księgowość 5 lat | Zakończenie umowy partnerskiej | Usunięcie contactEmail (chyba że marketing z art. 21(2)) | art. 6(1)(f)/(b); art. 6(1)(c) księgowość | Procedura offboarding Partnera |

**Zasady wdrożeniowe:**
1. Retencja musi być **automatyczna** (cron/edge function) — nie ręczna;
2. Po upływie okresu: **hard DELETE lub anonimizacja** (nie soft-delete bezterminowo);
3. Backupy: retencja kopii zapasowych (np. 30–90 dni) udokumentowana osobno — backup nie może być „wiecznym" obejściem retencji;
4. Retencja udokumentowana w ROPA (art. 30(1)(f)) i w klauzuli art. 13(2)(a);
5. Retencja księgowa (5 lat) dotyczy wyłącznie danych niezbędnych dla celów podatkowych — nie całego rekordu z PII.

---
---

## Dokument 4: Decyzja cookie — ocena art. 399 PKE

### Stan faktyczny
- Cookie: 32-bajtowy losowy session ID, httpOnly, SameSite=Lax, maxAge=30 dni
- Cel: utrzymanie koszyka między wizytami
- Secure flag: brak w kodzie (deklarowany YES in production)
- Brak bannera cookie

### Ocena prawna

**Art. 399 PKE** (Dz.U. 2024 poz. 1221) — przechowywanie/odczyt informacji w urządzeniu końcowym wymaga zgody, z wyjątkiem: (a) przekazania komunikatu przez sieć; (b) **bezwzględnie niezbędnych** do świadczenia usługi **wyraźnie żądanej** przez użytkownika.

**Cookie sesyjne** (maxAge = sesja) — **mieści się w wyjątku** „bezwzględnie niezbędne" (koszyk nie działa bez sesji; usługa wyraźnie żądana = korzystanie z platformy). Brak bannera — **legalne**.

**Cookie 30-dniowe** (maxAge = 30 dni) — przywrócenie koszyka między wizytami. **Nie mieści się w wyjątku** „bezwzględnie niezbędne" — to funkcjonalność wygody (użytkownik może ponownie dodać towary). **Wymaga zgody** użytkownika (banner z aktywnym opt-in, info o czasie — C-61/19 Orange România; aktywna zgoda — C-673/17 Planet49).

### Rekomendacja DPO

| Opcja | Opis | Wymagania | Rekomendacja |
|---|---|---|---|
| **A (rekomendowana)** | Cookie sesyjne (maxAge = sesja lub krótki, np. 24h) | Wyjątek art. 399 PKE — brak bannera | ✅ Najprostsze compliance |
| **B** | Cookie 30-dniowe + banner zgody | Banner: aktywny opt-in per-cel, info o czasie, wycofanie równie łatwe (art. 7(3) RODO) | ⚠️ Dodatkowy obowiązek + ryzyko |

### P0 — Secure flag

Brak flagi `Secure` w cookie = **luka bezpieczeństwa** (art. 32 RODO). Cookie bez Secure może być wysłane po HTTP (przechwycenie w niezabezpieczonej sieci).

**Działanie:** Dodać `Secure; HttpOnly; SameSite=Lax` w konfiguracji cookie produkcyjnego. Rozważyć prefiks `__Host-` (wymaga Secure + Path=/ + brak Domain). Wymusić HTTPS/HSTS. Traktować jako **security remediation** przed go-live.

---
---

## Dokument 5: Wymagania DPA / Vendor Register — Supabase

### Status obecny
```
VENDOR_DPA_STATUS = NOT_VERIFIED
SUBPROCESSOR_REGISTER_STATUS = NOT_VERIFIED
THIRD_COUNTRY_TRANSFER_STATUS = NOT_DETERMINED
```

### Wymagane dokumenty/evidence

| # | Dokument | Podstawa prawna | Status |
|---|---|---|---|
| 1 | **DPA z Supabase** (Data Processing Agreement) | art. 28(3) RODO — umowa powierzenia przetwarzania | DO PODPISANIA |
| 2 | **Lista subprocesorów Supabase** | art. 28(2) RODO — autoryzacja ogólna + lista | DO POBRANIA |
| 3 | **Potwierdzenie regionu EEA** | art. 44–49 RODO — brak transferu poza EEA | DO POTWIERDZENIA |
| 4 | **Analiza transferu** (jeśli Supabase/subprocesorzy mają dostęp z USA) | art. 44–49 RODO; EDPB Recommendations 01/2020 | DO WYKONANIA |
| 4a | Certyfikacja EU-US Data Privacy Framework | Decyzja (UE) 2023/1795 — sprawdzić listę DPF | DO WERYFIKACJI |
| 4b | Jeżeli nie DPF: Standard Contractual Clauses (SCC 2021/914) w DPA | Decyzja wykonawcza (UE) 2021/914 | DO ZAWARCIA |
| 4c | Transfer Impact Assessment (TIA) | EDPB Recommendations 01/2020 (Schrems II, C-311/18) | DO WYKONANIA |
| 5 | **Rejestr podmiotów przetwarzających** (własny) | art. 30(1) RODO + art. 28(2) | DO UTWORZENIA |
| 6 | **ROPA** — wpis Supabase jako procesor | art. 30(1) RODO | W dokumencie 1 |
| 7 | **Polityka bezpieczeństwa** | art. 32 RODO | DO UTWORZENIA |
| 8 | **Procedura naruszeń** — koordynacja z Supabase | art. 33(2) RODO — procesor powiadamia administratora bez zbędnej zwłoki | DO UTWORZENIA |

### Minimalna treść DPA z Supabase (art. 28(3)):
- przedmiot, czas, charakter i cel przetwarzania;
- rodzaj danych osobowych i kategorie osób (art. 28(3)(a));
- polecenia administratora (LogiMarket) — art. 28(3)(a);
- poufność personelu (art. 28(3)(b));
- środki bezpieczeństwa (art. 28(3)(c), art. 32);
- warunki korzystania z subprocesorów (art. 28(3)(d), 28(2)/(4));
- pomoc przy żądaniach osób (art. 28(3)(e));
- wsparcie compliance (art. 28(3)(f));
- usunięcie/zwrot danych po zakończeniu (art. 28(3)(g));
- audyt (art. 28(3)(h));
- rejestr czynności procesora (art. 30(2)).

### Inni dostawcy (future vendor register):
- Hosting frontendu (Vercel/Next.js — jeśli dotyczy)
- PSP (po wyborze — DPA + minimalizacja danych płatniczych, tokenizacja)
- E-mail / monitoring błędów (DPA + transfer)

---
---

## Dokument 6: Matryca ról RODO per processing operation

| Aktywność | Rola LogiMarket | Rola Partnera | Rola Supabase | Uwagi |
|---|---|---|---|---|
| ACT-01 Checkout (obecnie) | **Administrator** | N/A (brak dostępu) | **Podmiot przetwarzający** | LogiMarket samodzielnie ustala cele i środki |
| ACT-02 RFQ (obecnie) | **Administrator** | N/A | **Podmiot przetwarzający** | jw. |
| ACT-01/02 FUTURE (przekazanie do Partnera) | **Do ustalenia** — art. 26 (współadministrowanie w zakresie kolekcji+przekazania) LUB administrator (kolekcja) + Partner niezależny administrator (po otrzymaniu) | **Do ustalenia** — współadministrator (ograniczony) LUB niezależny administrator | **Podmiot przetwarzający** | Decyzja po zaprojektowaniu konkretnego przepływu; EDPB 07/2020; TSUE C-40/17 Fashion ID |
| ACT-03 Admin auth | **Administrator** | N/A | **Podmiot przetwarzający** (Supabase Auth) | — |
| ACT-04 Outbound clicks | **Administrator** | N/A | — (server-side, brak vendorów) | LIA wymagana; dane pseudonimizowane, nie zanonimizowane |
| ACT-05 Cart & session | **Administrator** | N/A | **Podmiot przetwarzający** | Cookie — art. 399 PKE |
| ACT-06 Partner contacts | **Administrator** | Partner = **podmiot danych** (nie procesor) | **Podmiot przetwarzający** | contactEmail osoby fizycznej = dane osobowe |

**Zasada:** Nie hardcodować roli Partnera jako współadministratora (art. 26). Rola będzie ustalona per operacja po zaprojektowaniu konkretnego przepływu przekazania danych.

---
---

## Dokument 7: DPIA Screening — art. 35

### Ocena whether DPIA is required

| Kryterium (art. 35(1) + lista EDPB/WP248) | LogiMarket MVP | DPIA wymagana? |
|---|---|---|
| Ocena czynników ludzkich na dużą skalę (profilowanie) | Nie (ranking ręczny, brak profilowania) | Nie |
| Przetwarzanie danych wrażliwych na dużą skalę (art. 9) | Nie (brak danych wrażliwych) | Nie |
| Systematyczne monitorowanie na dużą skalę | Nie (analityka server-side, brak monitorowania użytkowników na dużą skalę) | Nie |
| Przetwarzanie na dużą skalę | Nie (MVP B2B, niska skala) | Nie |
| Innowacyjne technologie | Nie (standardowa platforma webowa) | Nie |
| Uniemożliwienie skorzystania z usługi/umowy | Częściowo (B2B gating — wymóg NIP) | Nie wymaga DPIA, ale dokumentować |

### Werdykt: DPIA NIEOBOWIĄZKOWA dla MVP B2B

Wymagany: **udokumentowany screening** (niniejszy dokument) — decyzja na piśmie z uzasadnieniem (art. 35(1) zd. 2).

### Ponowny screening wymagany przy:
1. Wdrożeniu automatycznego scoringu/rankingu Partnerów (art. 22);
2. Rozszerzeniu o B2C;
3. Przetwarzaniu danych płatniczych na dużą skalę;
4. Profilowaniu behawioralnym;
5. Zmianie skali (VLOP/duża skala).

---
---

## Dokument 8: Procedura obsługi żądań osób (DSAR) — art. 12–23

### 1. Kanał przyjmowania żądań
- E-mail: privacy@logimarket.eu
- Formularz na Platformie (future)
- Pocztą tradycyjną na adres LogiMarket

### 2. Weryfikacja tożsamości (art. 12(6))
- Kupujący (nieuwierzytelniony): weryfikacja przez e-mail + referencję zamówienia (nr zamówienia + e-mail podany przy checkout);
- Partner: weryfikacja przez e-mail firmowy + dane z umowy partnerskiej;
- Admin: weryfikacja wewnętrzna.

### 3. Terminy (art. 12(3))
- Miesiąc od otrzymania żądania (możliwość przedłużenia o 2 miesiące przy złożoności — art. 12(3) zd. 2 + informacja w ciągu miesiąca);

### 4. Zakres praw
| Prawo | Podstawa | Realizacja |
|---|---|---|
| Dostęp (art. 15) | art. 15 | Kopia danych + informacje (cele, podstawy, odbiorcy, retencja, prawa) |
| Sprostowanie (art. 16) | art. 16 | Aktualizacja w systemie |
| Usunięcie (art. 17) | art. 17 | Hard DELETE (z wyjątkami: obowiązki prawne, roszczenia, wolność wypowiedzi) |
| Ograniczenie (art. 18) | art. 18 | Ograniczenie przetwarzania (flaga w systemie) |
| Przenoszalność (art. 20) | art. 20 | Eksport danych w ustrukturyzowanym formacie (JSON/CSV) |
| Sprzeciw (art. 21) | art. 21 | Sprzeciw wobec 6(1)(f) — zaniechanie przetwarzania, chyba że prawnie uzasadniona podstawa |
| Zautomatyzowane decyzje (art. 22) | art. 22 | Nie dotyczy (brak w MVP) |

### 5. Bezpłatność (art. 12(5))
- Pierwsze żądanie: bezpłatne;
- Powtarzające się / nadmierne: opłata rozsądna lub odmowa.

---
---

## Dokument 9: Procedura notyfikacji naruszeń — art. 33/34

### 1. Definicja naruszenia (art. 4(12))
Naruszenie bezpieczeństwa prowadzące do przypadkowego lub niezgodnego z prawem zniszczenia, utraty, modyfikacji, nieuprawnionego ujawnienia lub dostępu do danych osobowych.

### 2. Wewnętrzna procedura (72h — art. 33(1))

| Etap | Działanie | Termin |
|---|---|---|
| **Wykrycie** | Identyfikacja naruszenia (monitoring, zgłoszenie, alert) | T+0 |
| **Ocena ryzyka** | Ocena: czy naruszenie stwarza ryzyko dla praw i wolności osób? | T+24h |
| **Notyfikacja UODO** | Jeżeli ryzyko: zgłoszenie do Prezesa UODO (formularz UODO) | **T+72h** |
| **Notyfikacja osób** | Jeżeli wysokie ryzyko: komunikacja do osób dotkniętych (art. 34) | Bez zbędnej zwłoki |
| **Dokumentacja** | Rejestr naruszeń (art. 33(5)) — bez względu na notyfikację | T+72h |

### 3. Koordynacja z Supabase
- DPA z Supabase musi określać: obowiązek powiadomienia LogiMarket o naruszeniu **bez zbędnej zwłoki** (art. 33(2));
- Umowa określa: kto zgłasza do UODO (zwykle administrator = LogiMarket), kto komunikuje z osobami;
- Supabase prowadzi własny rejestr naruszeń (art. 33(5) dla procesorów).

### 4. Rejestr naruszeń (art. 33(5))
Pola: data wykrycia, opis naruszenia, dane dotknięte, liczba osób, skutki, środki zaradcze, czy zgłoszono do UODO (data, numer), czy powiadomiono osoby (data, treść).

---
---

## Dokument 10: Wytyczne dla przyszłego uzgodnienia art. 26 — LogiMarket → Partner

### Kontekst
Przy przyszłym uruchomieniu przekazywania danych Kupującego do Partnera (FUTURE), Strony muszą uregulować relację RODO. Nie hardcodować art. 26 — rola zależy od faktycznego stopnia kontroli.

### Dwie opcje

| Opcja | Struktura | Kiedy | Wymagane dokumenty |
|---|---|---|---|
| **A (rekomendowana)** | **Współadministrowanie art. 26** w zakresie kolekcji + przekazania danych; Partner = niezależny administrator dla użycia poza wspólnym zakresem | Gdy obie strony mają wpływ na cele i środki operacji kolekcji/przekazania (TSUE C-40/17 Fashion ID) | Uzgodnienie art. 26(2): role, obowiązki, punkt kontaktowy, treść informacyjna, odpowiedzialność solidarna (art. 26(3)) |
| **B** | LogiMarket = administrator (kolekcja + ujawnienie); Partner = niezależny administrator po otrzymaniu; brak art. 26 | Gdy LogiMarket samodzielnie ustala cele/środki kolekcji, a Partner samodzielnie ustala cele/środki po otrzymaniu | Klauzule C2C w umowie partnerskiej: limit celu, bezpieczeństwo, retencja, współpraca przy żądaniach, zakaz dalszego przekazywania, notyfikacja naruszeń |

### Minimalna treść uzgodnienia art. 26 (opcja A):
1. Zakres wspólnego przetwarzania (kolekcja, przekazanie, podstawowe przetwarzanie transakcyjne do E7);
2. Podział obowiązków: art. 13 (LogiMarket), art. 14 (Partner — 14(3)(c) — LogiMarket dostarcza notę), realizacja praw (jeden punkt kontaktowy), bezpieczeństwo (art. 32), naruszenia (72h koordynacja);
3. Jeden punkt kontaktowy dla osób (art. 26(2) zd. 2) — privacy@logimarket.eu;
4. Udostępnienie istoty uzgodnienia osobom (art. 26(2) zd. 2 — w klauzuli art. 13);
5. Odpowiedzialność solidarna (art. 26(3)) — klauzule umowne o podziale odpowiedzialności.

### Warunek uruchomienia
Uzgodnienie art. 26 (lub klauzule C2C) + aktualizacja klauzuli art. 13 + DPO sign-off — **PRZED pierwszym produkcyjnym przekazaniem danych Kupującego do Partnera**.

---
---

## Podsumowanie sign-off DPO

| Obszar | Status | Wymagane działanie |
|---|---|---|
| ROPA (art. 30) | **Draft gotowy** (Dokument 1) | DPO weryfikuje i zatwierdza |
| Klauzula art. 13 | **Draft gotowy** (Dokument 2) | DPO weryfikuje; usunąć rfqLabels.consent |
| Retencja | **Polityka gotowa** (Dokument 3) | DPO zatwierdza; Dev wdraża cron jobs |
| Cookie | **Decyzja rekomendowana** (Dokument 4) | DPO decyduje: sesyjne vs 30dni+banner; Secure flag = P0 |
| DPA Supabase | **Wymagania zdefiniowane** (Dokument 5) | Podpisać DPA + subprocesory + region + transfer |
| Role per ACT | **Matryca gotowa** (Dokument 6) | DPO zatwierdza; FUTURE art. 26 po zaprojektowaniu |
| DPIA | **Screening gotowy** (Dokument 7) | DPO zatwierdza: DPIA nieobowiązkowa |
| DSAR | **Procedura gotowa** (Dokument 8) | DPO weryfikuje; wdrożyć privacy@logimarket.eu |
| Naruszenia | **Procedura gotowa** (Dokument 9) | DPO weryfikuje; rejestr naruszeń; koordynacja Supabase |
| Art. 26 FUTURE | **Wytyczne gotowe** (Dokument 10) | Po zaprojektowaniu przepływu — oddzielne uzgodnienie |

**DPO_SIGNOFF_REQUIRED = YES**
**LM_MARKETPLACE_SCHEMA_56B1_READY = NO** (do DPO sign-off + Tax/DAC7 + Engineering readiness)

---

*Pakiet DPO przygotowany na podstawie Konsolidacji Ustaleń Kancelarii Prawnej v1.0, Dokumentu 03 (RODO/Data Flow Pack), oraz EDPB Guidelines 07/2020. Wszystkie dokumenty są draftami do weryfikacji przez DPO/external data protection counsel.*

*Źródła: RODO (Reg. 2016/679) — art. 4, 5, 6, 7, 12–23, 26, 28, 30, 32–35, 44–49; EDPB Guidelines 07/2020; EDPB Guidelines 05/2020; EDPB Recommendations 01/2020; TSUE C-40/17, C-210/16, C-673/17, C-61/19, C-311/18; PKE (Dz.U. 2024 poz. 1221) — art. 399; KC (Dz.U. 2026 poz. 795) — art. 118; Ordynacja podatkowa — art. 112; ustawa o rachunkowości — art. 74.*
