# Runbook — Sprint LM-CAT-FILTER-51AB

This runbook documents the backfill of relational attribute values for the two pilot offers in category `pojemniki-plastikowe-euro`.

## 1. Cel i zakres
Celem jest powiązanie danych technicznych z ustrukturyzowanymi atrybutami (8 numeric, 2 enum) dla ofert 5 i 6.
Dane relacyjne są tworzone równolegle do istniejących legacy danych JSONB w kolumnie `technical_attributes`.
- **Produkcja NIE została zmieniona** w tym sprincie.
- **Kolumna `technical_attributes` pozostaje bez zmian** (nie jest modyfikowana ani usuwana).

## 2. Źródło danych i snapshot
- **Oferta 5:**
  - ID: 5
  - Tytuł: `Pojemnik Euro plastikowy 600x400x220 mm`
  - technical_attributes: `{"Materiał": "PP (Polipropylen)", "Pojemność (l)": 45, "Wymiary zewnętrzne (mm)": "600x400x220"}`
- **Oferta 6:**
  - ID: 6
  - Tytuł: `Pojemnik Euro plastikowy 400x300x120 mm`
  - technical_attributes: `{"Materiał": "PP (Polipropylen)", "Pojemność (l)": 10, "Wymiary zewnętrzne (mm)": "400x300x120"}`

## 3. Manifest docelowych wartości (OAV vs OAOV)
- Wszystkie wartości są zapisywane w tabeli `public.offer_attribute_values` (OAV).
- Typy numeryczne są zapisywane w kolumnie `value_number`. Pozostałe kolumny wartości są `NULL`.
- Typ `enum` (atrybut `material`) jest zapisywany przez przypisanie klucza obcego `option_id` (wskazuje na opcję `pp`).
- Tabela `public.offer_attribute_option_values` (OAOV) jest przeznaczona dla atrybutów typu `multi_enum` i pozostaje pusta (0 wierszy dla pilota).

## 4. Model bezpieczeństwa i idempotencji
- **Blokowanie konfliktów:** Skrypt przed wykonaniem sprawdza, czy jakiekolwiek wartości istnieją. Zgodne wartości są tolerowane (skrypt jest idempotentny), ale wszelkie niezgodne wartości lub wartości w nieodpowiednich kolumnach (`value_text` itp.) wywołają błąd i wycofają transakcję.
- **True Idempotency:** Zastosowano dynamiczny `LEFT JOIN` filtrujący wstawiane wiersze, co gwarantuje brak ponownego wywoływania sekwencji `nextval()` i zachowanie nienaruszonej wartości `last_value` sekwencji klucza głównego podczas ponownego wykonania.
- **Row-level locking:** W pre-assertions blokujemy oferty 5 i 6 klauzulą `FOR SHARE`, uniemożliwiając ich modyfikację w trakcie trwania transakcji.

## 5. Rollback Drift Policy
- Rollback usuwa dokładnie 10 rekordów powiązanych z ofertami 5 i 6 w zakresie 5 aktywnych atrybutów.
- Jeśli jakakolwiek wartość uległa zmianie (drift) po migracji, skrypt rollbacku zablokuje wykonanie i zgłosi błąd.

## 6. Uruchomienie testów lokalnych
Aby uruchomić testy lokalne na tymczasowej bazie PostgreSQL:
```powershell
pwsh -NoProfile -File .\scripts\sql\tests\lm-cat-filter-51ab\run-all-lm-cat-filter-51ab-tests.ps1
```
Oczekiwany wynik:
```text
LM51AB_TESTS=48/48 PASS
LM51AB_ALL_TESTS=PASS
```

## 7. Checklist preflight dla sprintu produkcyjnego 51CD
1. Upewnij się, że branch to `feat/lm-cat-filter-51ab-backfill-prep` i SHA jest zgodne.
2. Zweryfikuj, że konfiguracja na produkcji ma dokładnie 88 wierszy.
3. Zweryfikuj, że `offer_attribute_values` ma 0 wierszy dla pilota.
4. Uruchom SQL w edytorze Supabase w transakcji dokładnie raz.
