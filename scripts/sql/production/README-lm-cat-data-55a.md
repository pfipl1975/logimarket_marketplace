# Runbook — Korekta taksonomii wózka widłowego (LM-CAT-DATA-55A)

Ten runbook opisuje procedurę bezpiecznego przeniesienia oferty ID 8 z kategorii 21 (`wozki-widlowe-elektryczne`) do kategorii 25 (`elektryczne-wozki-paletowe`).

> [!WARNING]
> Ten skrypt NIE został jeszcze wykonany na środowisku produkcyjnym. Obowiązuje zakaz samodzielnego uruchamiania przed kolejnym formalnym przeglądem (PRODUCTION_SQL_EXECUTION=PROHIBITED).

## 1. Wstępne założenia i bezpieczeństwo
- Zmiana dotyczy wyłącznie jednej oferty: **ID 8** ("Elektryczny wózek paletowy LogiTrans L-18").
- Zmiana modyfikuje wyłącznie kolumnę `category_id` oraz `updated_at` w tabeli `public.offers`.
- Transakcje są chronione timeoutami: `statement_timeout = '15000ms'` oraz `lock_timeout = '3000ms'`.
- Wszystkie skrypty są w pełni idempotentne.

## 2. Zabezpieczenia transakcyjne (Guards & Hardening)
Skrypty wdrożenia (`apply`) oraz wycofania (`rollback`) implementują restrykcyjne zabezpieczenia:
1. **Deterministyczne blokowanie kategorii**: Kategorie 21 oraz 25 są blokowane przez `FOR UPDATE` w rosnącej kolejności ID (najpierw 21, potem 25), aby zapobiec deadlockom. Ich slugi są weryfikowane przed jakąkolwiek modyfikacją.
2. **Blokada oferty i guard braku wiersza**: Oferta ID 8 jest blokowana przez `FOR UPDATE`. Brak rekordu jest wykrywany za pomocą klauzuli `IF NOT FOUND` w PL/pgSQL.
3. **Migawka pól chronionych (Protected Fields Snapshot)**: Przed modyfikacją skrypt odczytuje i zapisuje do zmiennych wartości chronionych pól handlowych oferty:
   - `title`
   - `publication_status`
   - `offer_model`
   - `partner_id`
   - `price_brutto`
   - `price_on_request`
   - `conversion_type`
   - `outbound_url`
   - `is_featured`
   - `is_active`
   - `technical_attributes` (JSONB)
4. **Idempotentne stany logiczne**:
   - **`ALREADY_APPLIED` / `ALREADY_ROLLED_BACK`**: Jeśli oferta ma już docelową kategorię (25 w apply, 21 w rollback), skrypt nie wykonuje żadnej mutacji, nie modyfikuje pola `updated_at` i kończy się bezpiecznym komunikatem typu NOOP.
   - **`DRIFT_DETECTED`**: Jeśli oferta znajduje się w jakiejkolwiek innej kategorii niż 21 lub 25, transakcja zostaje natychmiast przerwana z błędem, wycofując wszelkie zmiany.
5. **Postcheck przed COMMIT**: Przed ostatecznym zatwierdzeniem zmian skrypt weryfikuje poprawność docelowej kategorii, nienaruszalność wszystkich pól chronionych (porównanie 1-do-1 z migawką, w tym semantyczna zgodność JSONB), poprawność slugów kategorii oraz brak modyfikacji innych ofert (np. oferta ID 1 pozostaje w kategorii 21). Wykrycie jakiejkolwiek niezgodności przerywa transakcję (`ROLLBACK`).

## 3. Instrukcja wdrożenia (Apply Procedure)

1. Otwórz panel Supabase SQL Editor dla projektu produkcyjnego (`Logimarket-marketplace`, ref: `tpjsiutclowwaxlopemn`).
2. Skopiuj i uruchom zawartość pliku:
   `scripts/sql/production/lm-cat-data-55a-forklift-taxonomy-precheck.sql`
   - **Oczekiwany wynik:** `PASS`.
3. Skopiuj i uruchom zawartość pliku:
   `scripts/sql/production/lm-cat-data-55a-forklift-taxonomy-apply.sql`
   - **Oczekiwany wynik:** `Success. No rows returned.` i komunikat `Offer 8 category updated from 21 to 25.` w logach notice (lub `ALREADY_APPLIED`).
4. Skopiuj i uruchom zawartość pliku:
   `scripts/sql/production/lm-cat-data-55a-forklift-taxonomy-verify.sql`
   - **Oczekiwany wynik:** `PASS`.

## 4. Procedura wycofania (Rollback Procedure)
Wycofanie zmiany do stanu początkowego (25 → 21) należy przeprowadzić wyłącznie na jawne polecenie operatora w przypadku wykrycia błędów w aplikacji.

1. Skopiuj i uruchom zawartość pliku:
   `scripts/sql/production/lm-cat-data-55a-forklift-taxonomy-rollback.sql`
   - **Oczekiwany wynik:** `Success. No rows returned.` i komunikat `Offer 8 category restored from 25 to 21.` w logach notice (lub `ALREADY_ROLLED_BACK`).
2. Ponownie uruchom skrypt weryfikacji początkowej (`lm-cat-data-55a-forklift-taxonomy-precheck.sql`), aby potwierdzić powrót do kategorii 21.
