# LM-LEGAL-UI-02B — RUNTIME MIGRATION PREPARATION

## PHASE: RUNTIME_MIGRATION_PREPARATION

Wykonano przygotowanie ręcznej migracji `0004_seller_registered_address.sql` oraz dokonano walidacji cyklu życia schematu bazy danych. Testy przeszły pomyślnie. Nie dokonano żadnych zapisów do prawdziwej bazy danych (DB_WRITES=0). PR został zaktualizowany.

### 1. ARTEFAKTY MIGRACJI (CODE-ONLY)
- Utworzono bezstanowy skrypt migracji w `drizzle-runtime/0004_seller_registered_address.sql` (tylko bezpieczne `ADD COLUMN IF NOT EXISTS`).
- Dodano wpis indeksowy 4 w `drizzle-runtime/meta/_journal.json`.

### 2. AKTUALIZACJA CONTRACTU ORAZ FINGERPRINTU
- W `scripts/database/runtime-migration-contract.ts` dodano definicję `FINAL_POST_0004_PRODUCTION_FINGERPRINT` dziedziczącą po `POST_0003` ze zaktualizowaną tablicą `seller_legal_identities`.
- Zmapowano `PRODUCTION_FINGERPRINT` na stan `POST_0004`.
- Zaktualizowano weryfikator `verify-runtime-schema-fingerprint.ts` do obsługi klasyfikacji `EXACT_EXISTING_POST_0004` (stan finalny) oraz `MIGRATABLE_POST_0003` (stan początkowy gotowy do migracji).

### 3. ZABEZPIECZENIA WALIDACYJNE I TESTY
- Wdrożono czysto-statyczny test jednostkowy `seller-registered-address-runtime-migration.test.ts`, który gwarantuje, że skrypt nie mutuje innych tabel i nie zawiera niedozwolonych modyfikatorów.
- Zaktualizowano reguły liczenia wierszy w `runtime-migration-journal.ts` – 4 wiersze dla MIGRATABLE, 5 dla EXACT.
- Pomyślnie zmodyfikowano 180+ wewnętrznych czystych testów w silniku (`runtime-migration-engine.test.ts`, `runtime-migration-classification.test.ts`, `runtime-migration-folder.test.ts`). Zakończone: 262 testy pozytywne, 0 błędów.

### 4. BIZNES
- DTO publicznego interfejsu otrzymało deterministyczne sortowanie wg `countryCode -> type -> value`.

### STAN KOŃCOWY
**HEAD:** `62673f878d691d0a95ef05291f154bb300d71d03`
**PR #75:** Zaktualizowany
**DB WRITES:** 0

Oczekuję na finalną decyzję (Execution Authorization) dla migracji do środowiska DEV.
