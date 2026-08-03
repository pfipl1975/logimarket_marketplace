# ESLint Debt Baseline

## Utworzenie
Data: 2026-08-03
Wersje: ESLint 9.39.4, eslint-config-next 16.2.9

## Powód
Zastosowano oficjalny mechanizm ESLint Bulk Suppressions, aby zapobiec regresjom, utrzymując jednocześnie dotychczasowy kod z długiem technicznym (brak konieczności masowych refaktorów blokujących inne prace). Pełne pakiety `eslint-config-next/core-web-vitals` oraz `eslint-config-next/typescript` pozostają aktywne w konfiguracji. 

## Statystyki baseline

- Liczba plików objętych baseline: 32
- Liczba par plik/reguła: 41
- Łączna liczba suppressions: 81
- Kod aplikacji `src/`: 27 suppressions
- Skrypty `scripts/`: 44 suppressions
- Testy `tests/`: 10 suppressions

Licznik oznacza istniejące naruszenia zapisane przez oficjalny mechanizm
ESLint Bulk Suppressions. Nie oznacza wyłączonych reguł. Każde nowe
naruszenie ponad zapisany licznik ponownie powoduje niezerowy wynik
ESLint.

## Zakazy
- Ręczne zwiększanie liczników w pliku `eslint-suppressions.json` jest zabronione.
- Nowy dług lint (kolejne błędy i obejścia) jest kategorycznie zabroniony (tzw. ratchet mechanism).

## Procedura usuwania długu
1. Naprawić kod źródłowy.
2. Uruchomić `eslint --prune-suppressions` w celu usunięcia zdezaktualizowanych wpisów.
3. Uruchomić lint, testy i build w celu potwierdzenia poprawności.

## Plan kolejnych sprintów
- LM-DEV-ESLINT-02A — runtime application debt
- LM-DEV-ESLINT-02B — scripts and tests debt
- LM-DEV-ESLINT-02C — final suppression removal
