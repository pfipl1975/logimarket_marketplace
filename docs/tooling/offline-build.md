# Lokalne logi builda offline

## Cel
Znacznik `LOGIMARKET_OFFLINE_BUILD=1` jest wykorzystywany podczas lokalnych (lub w trybie CI) offline quality gates. Służy do wyciszania znanych powtarzalnych błędów połączeń z bazą danych (np. setki logów ECONNREFUSED podczas statycznego renderowania stron z listą kategorii).

## Sentinel bazy danych
Oczekiwany sentinel bazy danych w trybie offline to dokładnie 127.0.0.1:1. Błędy dla innych portów lub adresów nadal zgłoszą błąd.

## Ograniczenia Vercel
Znacznik `LOGIMARKET_OFFLINE_BUILD=1` **nie może** być ustawiany w Vercel.

## Klasyfikacja wyciszanych błędów
- Wyciszany jest wyłącznie dokładny, oczekiwany `ECONNREFUSED`.
- Wszystkie inne błędy nadal trafiają do `console.error`.
- Fallback nawigacji pozostaje aktywny.

## Prawidłowe zastosowanie i weryfikacja
Lokalny test builda offline należy wykonywać bezpiecznie przy użyciu zmiennych środowiskowych wycofywanych w klauzuli `finally`.

Pełna bezpieczna komenda PowerShell:
```powershell
$hadDatabaseUrl = Test-Path Env:DATABASE_URL
$previousDatabaseUrl = $env:DATABASE_URL
$hadOfflineFlag = Test-Path Env:LOGIMARKET_OFFLINE_BUILD
$previousOfflineFlag = $env:LOGIMARKET_OFFLINE_BUILD

try {
  $env:DATABASE_URL = "postgresql://offline:offline@127.0.0.1:1/offline?connect_timeout=1"
  $env:LOGIMARKET_OFFLINE_BUILD = "1"
  & npm.cmd run build
} finally {
  if ($hadDatabaseUrl) {
    $env:DATABASE_URL = $previousDatabaseUrl
  } else {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  }
  if ($hadOfflineFlag) {
    $env:LOGIMARKET_OFFLINE_BUILD = $previousOfflineFlag
  } else {
    Remove-Item Env:LOGIMARKET_OFFLINE_BUILD -ErrorAction SilentlyContinue
  }
}
```
Obowiązkowe jest przywrócenie poprzednich wartości zmiennych środowiskowych.
