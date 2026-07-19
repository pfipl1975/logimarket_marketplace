# Runbook — Korekta taksonomii wózka widłowego (LM-CAT-DATA-55A)

Ten runbook opisuje procedurę bezpiecznego przeniesienia oferty ID 8 z kategorii 21 (`wozki-widlowe-elektryczne`) do kategorii 25 (`elektryczne-wozki-paletowe`).

## 1. Wstępne założenia i bezpieczeństwo
- Zmiana dotyczy wyłącznie jednej oferty: **ID 8** ("Elektryczny wózek paletowy LogiTrans L-18").
- Zmiana modyfikuje wyłącznie kolumnę `category_id` oraz `updated_at` w tabeli `public.offers`.
- Transakcje są chronione timeoutami: `statement_timeout = '15000ms'` oraz `lock_timeout = '3000ms'`.
- Wszystkie skrypty są w pełni idempotentne.

## 2. Instrukcja wdrożenia (Apply Procedure)

1. Otwórz panel Supabase SQL Editor dla projektu produkcyjnego (`Logimarket-marketplace`, ref: `tpjsiutclowwaxlopemn`).
2. Skopiuj i uruchom zawartość pliku:
   `scripts/sql/production/lm-cat-data-55a-forklift-taxonomy-precheck.sql`
   - **Oczekiwany wynik:** `PASS`.
3. Skopiuj i uruchom zawartość pliku:
   `scripts/sql/production/lm-cat-data-55a-forklift-taxonomy-apply.sql`
   - **Oczekiwany wynik:** `Success. No rows returned.` i komunikat `Offer 8 category updated from 21 to 25.` w logach notice.
4. Skopiuj i uruchom zawartość pliku:
   `scripts/sql/production/lm-cat-data-55a-forklift-taxonomy-verify.sql`
   - **Oczekiwany wynik:** `PASS`.

## 3. Procedura wycofania (Rollback Procedure)
Wycofanie zmiany do stanu początkowego (25 → 21) należy przeprowadzić wyłącznie na jawne polecenie operatora w przypadku wykrycia błędów w aplikacji.

1. Skopiuj i uruchom zawartość pliku:
   `scripts/sql/production/lm-cat-data-55a-forklift-taxonomy-rollback.sql`
   - **Oczekiwany wynik:** `Success. No rows returned.` i komunikat `Offer 8 category restored from 25 to 21.` w logach notice.
2. Ponownie uruchom skrypt weryfikacji początkowej (`lm-cat-data-55a-forklift-taxonomy-precheck.sql`), aby potwierdzić powrót do kategorii 21.
