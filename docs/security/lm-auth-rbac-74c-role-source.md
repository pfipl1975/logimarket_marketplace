# LM-AUTH-RBAC-74C — Role Source Decision

## Status quo

- `anonymous` i `authenticated` są stanami uwierzytelnienia, nie rolami przechowywanymi w systemie.
- Jedynym podwyższonym uprawnieniem MVP jest **admin**.
- Nie istnieją role vendor, partner ani buyer w storage; nie istnieje tabela ról ani kolumna użytkownika w tabelach biznesowych.

## Źródło roli admin w MVP

- Źródłem jest server-only zmienna środowiskowa `ADMIN_USER_IDS` — rozdzielona przecinkami lista UUID użytkowników Supabase Auth.
- Parser: `src/lib/auth/admin-allowlist.ts` (`parseAdminUserIds`, `isAdminUserId`).
- Guard: `src/lib/auth/guards.ts` (`requireAdmin`), oparty o istniejące `getCurrentUser()` z `src/lib/auth/session.ts`.
- Błędy typowane: `src/lib/auth/authorization-errors.ts` (`UnauthorizedError`, `ForbiddenError`, `AuthInfrastructureError`, `AuthConfigurationError`).

## Dlaczego UUID, a nie e-mail

- UUID Supabase Auth jest niezmiennym identyfikatorem konta; e-mail może się zmienić i nie jest gwarantowanym kluczem tożsamości.
- E-mail jest danym osobowym i nie powinien być osadzany w konfiguracji autoryzacyjnej.
- Dopasowanie po UUID jest dokładne i pozbawione niejednoznaczności normalizacji adresów.

## Właściwości bezpieczeństwa

- Fail closed: brak lub pusta wartość `ADMIN_USER_IDS` oznacza zero administratorów; nieprawidłowy niepusty element oznacza `AuthConfigurationError`.
- Brak fallbacku do e-maili i brak użycia Supabase `user_metadata` jako źródła uprawnień.
- Brak odczytu zmiennych `NEXT_PUBLIC_*` — allowlista nigdy nie trafia do klienta.
- Komunikaty błędów nie zawierają UUID, listy adminów ani treści env.
- `requireAdmin` nie wykonuje redirectu; mapowanie błędów na odpowiedź należy do wywołującego (Server Component, Server Action, Route Handler).

## Brak zmian bazy danych

- Sprint nie zmienia `src/lib/schema.ts`, migracji ani RLS. Połączenie Drizzle/pg pozostaje bez zmian.
- Migracja źródła roli do tabeli DB (np. `user_roles`) może nastąpić później bez zmiany publicznego API `requireAdmin` — zmieni się wyłącznie implementacja pobierania allowlisty.

## Zakres publiczny bez zmian

- RFQ, cart, checkout i outbound `/go/[id]` pozostają publiczne (anonimowy `session_hash`) — decyzja właściciela D3.
- W tym sprincie `requireAdmin` nie jest podłączony do żadnego entrypointu; nie powstał panel admina ani żadna chroniona strona.

## Kontrakt dla przyszłych konsumentów

- Każdy przyszły admin Server Action oraz layout `/admin/*` musi wywołać `requireAdmin()` po stronie serwera.
- Proxy (`src/proxy.ts`) pozostaje wyłącznie pierwszą, optymistyczną warstwą (authn), nigdy finalną autoryzacją.
- Ukrywanie elementów UI nie jest mechanizmem autoryzacji.
