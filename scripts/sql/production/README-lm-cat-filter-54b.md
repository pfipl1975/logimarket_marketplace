# Runbook — Sprint LM-CAT-FILTER-54B

Ten runbook dokumentuje pakiet produkcyjny SQL konfigurujący 4 filtry dla kategorii 21 `wozki-widlowe-elektryczne` oraz backfill relacyjnych wartości atrybutów dla oferty 1.

> [!WARNING]
> Ten pakiet NIE został wykonany na środowisku produkcyjnym. Obowiązuje kategoryczny zakaz samodzielnego uruchamiania na bazie produkcyjnej bez formalnego zatwierdzenia (PRODUCTION_SQL_EXECUTION=PROHIBITED). Pakiet nie jest zadeklarowany jako gotowy do bezpośredniego wdrożenia bez audytu.

## 1. Cel i zakres
Celem jest ustrukturyzowanie danych technicznych wózków widłowych elektrycznych (kategoria 21, slug `wozki-widlowe-elektryczne`, parent_id=8) w modelu filtrów kategorii:
- **Konfiguracja filtrów:** 3 nowe definicje atrybutów (`lifting_height`, `drive_type`, `mast_type`), 21 tłumaczeń definicji (3 × 7 locale), 2 opcje enum (`electric`, `triplex`), 14 tłumaczeń opcji (2 × 7 locale), 4 przypisania do kategorii 21.
- **Backfill oferty 1:** 4 wiersze `offer_attribute_values` (2 × `value_number`, 2 × `option_id`).
- **Kolumna `technical_attributes` pozostaje bez zmian** (nie jest modyfikowana ani usuwana).

## 2. Zależność od LM-CAT-FILTER-50AB (współdzielona definicja `load_capacity`)
- Definicja atrybutu `load_capacity` (stable_key, `data_type='number'`, `is_active=true`) **już istnieje globalnie** — została utworzona przez pakiet 50AB.
- 54B **reużywa** tę definicję: nie tworzy jej, nie modyfikuje i **nie usuwa w rollbacku**.
- Pre-assertion pakietu 54B wymaga jej istnienia jako `number` + `active`; brak definicji przerywa precheck/apply błędem (`apply LM-CAT-FILTER-50AB first`).

## 3. Zweryfikowane fakty produkcyjne (audyt read-only)
- **Kategoria 21:** slug `wozki-widlowe-elektryczne`, parent_id=8. Brak jakichkolwiek `category_attribute_assignments`.
- **Kategoria 25:** slug `elektryczne-wozki-paletowe`, parent_id=10.
- **Oferta 1:** category_id=21, publication_status=`published`, offer_model=`rfq`, conversion_type=`rfq`, price_on_request=true, is_active=true, title=`Elektryczny wózek widłowy 1.5t LogiTrans ET-15`. Brak jakichkolwiek `offer_attribute_values`.
- **Oferta 1 — technical_attributes (JSONB, 4 klucze):** `"Udźwig (kg)"='1500'`, `"Wysokość podnoszenia (mm)"='4500'`, `"Napęd"='Elektryczny'`, `"Typ masztu"='Triplex'`.
- **Oferta 8:** category_id=25 — pakiet nigdy jej nie dotyka; apply FAIL, gdyby oferta 8 miała category_id=21 lub nie istniała.

## 4. Manifest docelowych wartości (oferta 1)
| Atrybut (stable_key) | Typ | Slot | Wartość | Źródło (technical_attributes) |
|---|---|---|---|---|
| `load_capacity` | `number` | `value_number` | `1500` | `Udźwig (kg)` |
| `lifting_height` | `number` | `value_number` | `4500` | `Wysokość podnoszenia (mm)` |
| `drive_type` | `enum` | `option_id` → `electric` | opcja `electric` | `Napęd` = `Elektryczny` |
| `mast_type` | `enum` | `option_id` → `triplex` | opcja `triplex` | `Typ masztu` = `Triplex` |

Wszystkie 4 wartości backfillu zostały zweryfikowane na produkcji (audyt read-only). Constraint `chk_oav_value_exclusivity` wymusza dokładnie jeden wypełniony slot wartości na wiersz — post-assertions dodatkowo to weryfikują.

## 5. Przypisania kategorii 21 (category_attribute_assignments)
| Atrybut | sort_order | is_filterable | is_comparable | is_required | is_visible | unit_code |
|---|---|---|---|---|---|---|
| `load_capacity` | 10 | true | true | false | true | `kg` |
| `lifting_height` | 20 | true | true | false | true | `mm` |
| `drive_type` | 30 | true | true | false | true | NULL |
| `mast_type` | 40 | true | true | false | true | NULL |

Semantyka flag (audyt LM-CAT-FILTER-54B-R1): wartości techniczne są filtrowalne (`is_filterable=true`) i porównywalne (`is_comparable=true`), ale **nie są wymagane** (`is_required=false`) do utworzenia ani utrzymania oferty. Audyt repozytorium nie wykazał żadnego konsumenta runtime flagi `is_required` (flaga jest jedynie mapowana w read modelu `category-attribute-read-model-core.ts`, bez odczytu), więc brak istniejącego kontraktu biznesowego uzasadniającego `is_required=true`.

## 6. Model bezpieczeństwa i idempotencji
- **Naturalne klucze:** wszystko adresowane przez stable_key, slug kategorii i id oferty 1 — nigdy jawne ID wierszy runtime (bigserial).
- **Fail closed:** pre-assertions (precheck i apply) weryfikują strukturę tabel (to_regclass), kategorię 21 (slug + guard id=21, dokładnie 1 wiersz), snapshot oferty 1 (blokada `FOR SHARE` w apply), drift 4 kluczy `technical_attributes`, stan oferty 8 (category_id=25), konflikty semantyczne (data_type istniejących stable_key, opcje pod obcym atrybutem, unit_code istniejących przypisań) oraz drift istniejących OAV oferty 1 (zgodne wartości tolerowane, niezgodne → błąd, brak cichego nadpisywania).
- **True Idempotency:** backfill OAV używa `LEFT JOIN existing ... WHERE existing.id IS NULL` + `ON CONFLICT (offer_id, attribute_id) DO NOTHING`, co gwarantuje brak ponownego wywoływania `nextval()` i zachowanie `last_value` sekwencji przy re-run. Konfiguracja używa `ON CONFLICT DO UPDATE` po naturalnych kluczach.
- **Post-assertions przed COMMIT:** dokładne liczniki i stan końcowy (4 definicje z właściwymi typami, 21 tłumaczeń, 2 opcje, 14 tłumaczeń opcji, 4 przypisania z dokładnymi flagami/unit/sort, dokładnie 4 OAV z dokładnymi wartościami i ekskluzywnością slotów, oferta 8 nadal w kategorii 25, oferta 1 w kategorii 21).
- **Timeouty transakcji:** `lock_timeout='2s'`, `statement_timeout='30s'`, `idle_in_transaction_session_timeout='60s'`, `SET LOCAL TIME ZONE 'UTC'`.

## 7. Procedura wykonania (po formalnym zatwierdzeniu)
1. Uruchom `scripts/sql/production/lm-cat-filter-54b-forklift-filter-precheck.sql`
   - Transakcja READ ONLY, kończy się ROLLBACK. **Oczekiwany wynik:** `PASS`.
2. Uruchom `scripts/sql/production/lm-cat-filter-54b-forklift-filter-apply.sql`
   - Jedna transakcja BEGIN...COMMIT. **Oczekiwany wynik:** `COMMIT` bez błędów.
3. Uruchom `scripts/sql/production/lm-cat-filter-54b-forklift-filter-verify.sql`
   - Transakcja READ ONLY, kończy się ROLLBACK. **Oczekiwany wynik:** `PASS`.

## 8. Procedura rollbacku
Uruchom `scripts/sql/production/lm-cat-filter-54b-forklift-filter-rollback.sql` wyłącznie na jawne polecenie operatora.
- Usuwa **wyłącznie** rekordy utworzone przez 54B: 4 OAV oferty 1, 4 przypisania kategorii 21 (w tym przypisanie `load_capacity` → kat. 21, które należy do 54B), 14 tłumaczeń opcji, 2 opcje, 21 tłumaczeń definicji, 3 definicje (`lifting_height`, `drive_type`, `mast_type`).
- **NIGDY** nie usuwa współdzielonej definicji `load_capacity` (własność 50AB).
- Usunięcia z `GET DIAGNOSTICS ROW_COUNT` — dozwolone dokładnie N albo 0 przy pełnym stanie docelowym; stan pośredni lub drift wartości → błąd i brak jakichkolwiek usunięć.
- **Idempotencja:** drugi rollback to NOOP (0 usunięć, stan czysty → NOTICE, bez błędu).

## 9. Notka runbookowa — kolejność rollbacków 50AB/54B
54B dodaje przypisanie `load_capacity` do kategorii 21, czego kontrakt rollbacku 50AB nie przewidywał (rollback 50AB usuwa definicję `load_capacity`, której FK z przypisania kat. 21 by nie prześledził jako własnego). **Rollback 50AB po apply 54B wymaga wcześniejszego rollbacku 54B.**

## 10. Uruchomienie testów lokalnych
Testy działają na jednorazowej (disposable) bazie PostgreSQL na localhost; produkcja nie jest nigdy używana:
```powershell
pwsh -NoProfile -File .\scripts\sql\tests\lm-cat-filter-54b\run-all-lm-cat-filter-54b-tests.ps1
```
Oczekiwany wynik:
```text
LM54B_TESTS=20/20 PASS
LM54B_CLEANUP=PASS
```
