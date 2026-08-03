# ESLint Debt Baseline

## Utworzenie
Data: 2026-08-03
Wersje: ESLint v9 (wbudowana w Next.js), eslint-config-next@16.2.9

## Powód
Zastosowano oficjalny mechanizm ESLint Bulk Suppressions, aby zapobiec regresjom, utrzymując jednocześnie dotychczasowy kod z długiem technicznym (brak konieczności masowych refaktorów blokujących inne prace). Pełne pakiety `eslint-config-next/core-web-vitals` oraz `eslint-config-next/typescript` pozostają aktywne w konfiguracji. 

## Statystyki Baseline
Liczba plików objętych długiem: 1
Liczba naruszeń (suppressions): 1

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
