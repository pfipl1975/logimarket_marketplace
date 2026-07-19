# Runbook — Korekta taksonomii wózka widłowego (LM-CAT-DATA-55A)

Ten runbook opisuje procedurę bezpiecznego przeniesienia oferty ID 8 z kategorii 21 (`wozki-widlowe-elektryczne`) do kategorii 25 (`elektryczne-wozki-paletowe`).

> [!WARNING]
> Ten skrypt NIE został jeszcze wykonany na środowisku produkcyjnym. Obowiązuje kategoryczny zakaz samodzielnego uruchamiania na bazie produkcyjnej bez formalnego zatwierdzenia (PRODUCTION_SQL_EXECUTION=PROHIBITED). Skrypt nie jest zadeklarowany jako gotowy do bezpośredniego wdrożenia bez audytu.

## 1. Wstępne założenia i bezpieczeństwo
- Zmiana dotyczy wyłącznie jednej oferty: **ID 8** ("Elektryczny wózek paletowy LogiTrans L-18").
- Zmiana modyfikuje wyłącznie kolumny `category_id` oraz `updated_at` w tabeli `public.offers`.
- Transakcje są chronione timeoutami: `statement_timeout = '15000ms'` oraz `lock_timeout = '3000ms'`. Strefa czasowa transakcji jest jawnie ustawiana na `UTC` (`SET LOCAL TIME ZONE 'UTC'`).
- Wszystkie skrypty są w pełni idempotentne.

## 2. Zabezpieczenia transakcyjne (Immutable-Row Invariance Contract)
Skrypty wdrożenia (`apply`) oraz wycofania (`rollback`) implementują restrykcyjne zabezpieczenia oparte na pełnej niezmienności wiersza (18 kolumn):
1. **Deterministyczne blokowanie kategorii**: Kategorie 21 oraz 25 są blokowane przez `FOR UPDATE` w rosnącej kolejności ID (najpierw 21, potem 25), aby zapobiec deadlockom. Ich slugi są weryfikowane przed jakąkolwiek modyfikacją.
2. **Blokada oferty i guard braku wiersza**: Oferta ID 8 jest blokowana przez `FOR UPDATE`. Brak rekordu jest wykrywany za pomocą klauzuli `IF NOT FOUND` w PL/pgSQL.
3. **Kontrakt Niezmienności Wiersza (18 kolumn)**: Wszelkie kolumny oferty poza `category_id` i `updated_at` są objęte ścisłym kontraktem niezmienności. Dotyczy to kolumn:
   - `id`
   - `partner_id`
   - `title`
   - `description`
   - `image_url`
   - `price_brutto`
   - `price_on_request`
   - `conversion_type`
   - `offer_model`
   - `outbound_url`
   - `is_featured`
   - `is_active`
   - `publication_status`
   - `published_at`
   - `archived_at`
   - `deleted_at`
   - `technical_attributes` (JSONB)
   - `created_at`
4. **Baseline Hash (UTC)**:
   Precheck, apply, verify oraz rollback weryfikują przed modyfikacją integralność 18 kolumn oferty 8 za pomocą wyliczonego w strefie czasowej `UTC` MD5 hasha:
   `809289f462b35e52e675630658979285`
   Wyliczenie realizowane jest poprzez kanoniczne wyrażenie:
   ```sql
   md5(
     (
       to_jsonb(o)
       - ARRAY['category_id', 'updated_at']::text[]
     )::text
   )
   ```
   Wszelkie niezgodności w hashu skutkują natychmiastowym przerwaniem transakcji z błędem **`IMMUTABLE_ROW_DRIFT`** (brak jakichkolwiek mutacji).
5. **Idempotentne stany logiczne**:
   - **`ALREADY_APPLIED` / `ALREADY_ROLLED_BACK`**: Jeśli oferta ma już docelową kategorię (25 w apply, 21 w rollback), skrypt nie wykonuje żadnej mutacji, nie modyfikuje pola `updated_at` i kończy się bezpiecznym komunikatem typu NOOP.
   - **`DRIFT_DETECTED`**: Jeśli oferta znajduje się w jakiejkolwiek innej kategorii niż 21 lub 25, transakcja zostaje natychmiast przerwana z błędem, wycofując wszelkie zmiany.
6. **Postcheck przed COMMIT**: Przed ostatecznym zatwierdzeniem zmian skrypt weryfikuje poprawność docelowej kategorii, nienaruszalność całego wiersza chronionego poprzez porównanie JSONB snapshotu sprzed modyfikacji ze snapshotem po modyfikacji:
   ```sql
   IF v_post_immutable IS DISTINCT FROM v_orig_immutable THEN
     RAISE EXCEPTION 'LM55A apply postcheck: immutable row changed (IMMUTABLE_ROW_DRIFT)' USING ERRCODE = 'check_violation';
   END IF;
   ```
   Sprawdzany jest również brak zmian slugów kategorii oraz brak modyfikacji innych ofert (np. oferta ID 1 pozostaje w kategorii 21). Wykrycie jakiejkolwiek niezgodności przerywa transakcję (`ROLLBACK`).

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

## 4. Wycofanie zmiany (Rollback Procedure)
Wycofanie zmiany do stanu początkowego (25 → 21) należy przeprowadzić wyłącznie na jawne polecenie operatora w przypadku wykrycia błędów w aplikacji.

1. Skopiuj i uruchom zawartość pliku:
   `scripts/sql/production/lm-cat-data-55a-forklift-taxonomy-rollback.sql`
   - **Oczekiwany wynik:** `Success. No rows returned.` i komunikat `Offer 8 category restored from 25 to 21.` w logach notice (lub `ALREADY_ROLLED_BACK`).
2. Ponownie uruchom skrypt weryfikacji początkowej (`lm-cat-data-55a-forklift-taxonomy-precheck.sql`), aby potwierdzić powrót do kategorii 21.
