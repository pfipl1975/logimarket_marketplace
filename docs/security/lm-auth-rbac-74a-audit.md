# LM-AUTH-RBAC-74A — Audit Report

## 17.1 Executive summary

**Aktualny stan auth:** Repozytorium nie posiada zaimplementowanej żadnej warstwy uwierzytelniania. Brak zależności, klientów Supabase oraz logiki logowania. Aplikacja operuje wyłącznie w domenie publicznej (anonimowej).

**Aktualny stan session handling:** Jedyne "sesje" (cart / rfq) to proste anonimowe tokeny 32-bajtowe (session_hash) generowane na backendzie dla koszyka. Brak bezpiecznych sesji uwierzytelniających (JWT).

**Aktualny stan RBAC:** Całkowity brak. Repozytorium nie implementuje zarządzania rolami (ani globalnego, ani zagnieżdżonego per partner).

**Aktualny stan RLS:** RLS_DEFINITIONS_IN_REPOSITORY=ABSENT.
PRODUCTION_DB_AUDIT_EXECUTED_IN_74A=NO.
PRODUCTION_RLS_STATE=UNVERIFIED.
Brak SQL RLS w repo nie dowodzi braku policies w produkcji. Sprint 73B potwierdzał dane katalogowe, nie stan Auth/RLS. Produkcyjny audyt Auth/RLS wymaga jednoznacznie zidentyfikowanego projektu i wymuszonego dostępu read-only.

**Najwyższe ryzyka:**
W aktualnym stanie aplikacja nie posiada panelu administracyjnego ani panelu partnera, więc nie ma bezpośredniego zagrożenia nieautoryzowanym dostępem. Jednak implementacja Server Actions (`addToCart`, `submitCheckout`, `submitRfq`) działa w pełni bez jakiejkolwiek autoryzacji czy rate-limitingu (na poziomie kodu), co może narazić system na nadużycia anonimowe, spam i scraping. Wprowadzenie uwierzytelniania musi obejmować rygorystyczne zabezpieczenie każdego z tych punktów wejścia oraz nowych, tworzonych w kolejnych fazach.

**Rekomendacja dalszych faz:**
Architektura musi zostać zaimplementowana od zera, zaczynając od bezpiecznego zarządzania sesją (74B), poprzez wdrożenie struktur RLS i bazy (74C), a kończąc na implementacji autoryzacji per-akcja w Server Actions i trasach (74D).

## 17.2 Evidence inventory

| Obszar | Status | Dowód | Ryzyko | Wniosek |
| ------ | ------ | ----- | ------ | ------- |
| Supabase SSR | ABSENT | Brak w `package.json` i kodzie | BRAK | Wymaga wdrożenia w 74B |
| RLS Policies | ABSENT | Brak `CREATE POLICY` w kodzie | HIGH (dla przyszłych mutacji) | Wymaga wdrożenia w 74C |
| Auth Proxy | ABSENT | Brak `src/proxy.ts` | HIGH (dla przyszłych tras) | Wymaga wdrożenia w 74B |
| Role DB | ABSENT | Brak w `src/lib/schema.ts` | MEDIUM | Wymaga wdrożenia w 74C |
| Server Actions Auth | ABSENT | `src/app/actions.ts` - brak walidacji sesji uwierzytelniającej | HIGH | Wymaga zabezpieczenia w 74D |

AUTH_PROXY_FOUNDATION_PHASE=74B
PROXY_SESSION_REFRESH_DEPENDS_ON_OFFICIAL_SUPABASE_SSR_PATTERN=YES
PROXY_OPTIMISTIC_ROUTE_CHECKS=74B
FINAL_ROLE_ENFORCEMENT=74C_OR_74D

## 17.3 Odpowiedzi na 18 obowiązkowych pytań

1. **Czy Supabase Auth jest używany?**
   Nie. Brak odpowiednich paczek (`@supabase/ssr`, `supabase-js`) w `package.json` oraz użyć w repozytorium.
2. **Czy istnieje konfiguracja klienta i serwera Supabase?**
   Nie. Repozytorium nie posiada helperów ani instancji klienta.
3. **Czy istnieją proxy, auth helpers lub session refresh?**
   Nie. Plik `src/proxy.ts` nie istnieje. Next.js 16 nie używa nazwy "middleware".
4. **Czy istnieją trasy admin, partner, login lub odpowiedniki?**
   Nie. Struktura `src/app/` posiada wyłącznie trasy publiczne: `/(pl)` oraz `/(localized)`.
5. **Czy istnieją tabele użytkowników, ról, partner membership albo invitations?**
   Nie. W `src/lib/schema.ts` istnieje tylko tabela `partners` używana do powiązań ofert. Brak ról/członkostw.
6. **Czy istnieją RLS policies?**
   RLS_DEFINITIONS_IN_REPOSITORY=ABSENT. Nie znaleziono deklaracji RLS w kodzie, a weryfikacja produkcyjna w 74A nie miała miejsca.
7. **Czy Server Actions wykonują autoryzację?**
   Nie. Wszystkie akcje są publiczne. Nie wszystkie jednak muszą wymagać ról.
8. **Czy `actions.ts` pozwala na niezabezpieczone mutacje?**
   Tak. Funkcje takie jak `submitCheckout` (l. 297), `submitRfq` (l. 316) dotykają tabel DB i polegają jedynie na anonimowym `session_hash`.
9. **Czy `/go/[id]` wymaga zmian?**
   Nie na tym etapie. Redirect jest wyliczany po stronie serwera z zaufanego atrybutu tabeli ofert `outboundUrl` po walidacji `isActive=true` i `publicationStatus="published"` (`src/app/go/[id]/route.ts`, l. 28).
10. **Czy istnieje mechanizm rozpoznawania użytkownika po stronie serwera?**
    Nie. Wyłącznie implementacja anonimowego identyfikatora koszyka (`getSessionHash`, l. 68-76).
11. **Czy sesje są przechowywane bezpiecznie w cookies?**
    Anonimowy koszyk tak: `session_hash` ma `httpOnly: true, sameSite: "lax"`. Sesji autoryzacyjnych brak.
12. **Czy istnieje `@supabase/ssr` albo inny mechanizm?**
    Nie.
13. **Czy istnieją stare lub nieużywane implementacje auth?**
    Nie.
14. **Czy istnieją zmienne środowiskowe związane z auth?**
    Nie, repozytorium nie udostępnia takich zmiennych.
15. **Czy auth wpływa na routing i18n?**
    Tego na razie nie ma, ale będzie musiało być poprawnie zaprojektowane dla ewentualnych zlokalizowanych powiadomień błędów autoryzacyjnych.
16. **Czy istnieją zabezpieczenia przed open redirect?**
    `src/app/go/[id]/route.ts` przekierowuje za pomocą zaufanej wartości z bazy danych, co chroni przed typowym otwartym przekierowaniem.
17. **Czy role pochodzą z JWT, bazy, metadata czy hardcodowania?**
    Nie aplikowalne - role nie istnieją.
18. **Czy istnieją testy auth/RBAC?**
    Nie. Folder `tests` oraz `e2e` nie zawiera żadnych plików.

## 17.4 Server Actions security matrix

| Action | Klasyfikacja | Mutacja |
| ------ | ------------ | ------- |
| `addToCart` | PUBLIC_ANONYMOUS_SESSION_SCOPED | Zmienia stan koszyka |
| `removeFromCart` | PUBLIC_ANONYMOUS_SESSION_SCOPED | Usuwa stan koszyka |
| `updateCartQuantity`| PUBLIC_ANONYMOUS_SESSION_SCOPED | Zmienia stan koszyka |
| `clearCart` | PUBLIC_ANONYMOUS_SESSION_SCOPED | Czyści stan koszyka |
| `submitCheckout` | PUBLIC_WITH_ABUSE_CONTROLS | Tworzy order i kasuje koszyk (wymaga Zod i abuse controls) |
| `submitRfq` | PUBLIC_WITH_ABUSE_CONTROLS | Tworzy rfq_lead (wymaga Zod i abuse controls) |

AUTH_FORCED_ON_ALL_EXISTING_ACTIONS=NO
PUBLIC_RFQ_MUST_REMAIN_SUPPORTED=YES
ANONYMOUS_CART_MUST_REMAIN_SUPPORTED=YES
GUEST_CHECKOUT_BEHAVIOR_MUST_NOT_CHANGE_WITHOUT_APPROVAL=YES

## 17.5 Route protection matrix

| Route pattern | Public | Authentication required | Authorization required | Partner scope | Current protection | Gap |
| ------------- | -----: | ----------------------: | ---------------------: | ------------: | ------------------ | --- |
| `/` | YES | NO | NO | N/A | Implicit allow | N/A |
| `/katalog/...` | YES | NO | NO | N/A | Implicit allow | N/A |
| `/oferta/...` | YES | NO | NO | N/A | Implicit allow | N/A |
| `/admin/...` (przyszłe) | NO | YES | YES (`ADMIN`) | N/A | Brak | Zob. niżej |
| `/partner/...` (przyszłe) | NO | YES | YES (`PARTNER_MEMBER` / `PARTNER_MANAGER`) | YES | Brak | Zob. niżej |

ROUTE_PREFILTER:
- Proxy optimistic redirect

PAGE_AND_DATA_ACCESS:
- protected Server Component
- DAL/session helper
- server-side user verification

MUTATIONS:
- authorization inside each protected Server Action

DATABASE:
- RLS defense in depth where applicable

W Next.js 16 nazwa "middleware" jest zdeprecjonowana, a `src/proxy.ts` będzie realizować jedynie wstępne przekierowanie lub odświeżenie cookies.
PROXY_IS_FIRST_LAYER_ONLY=YES
PROXY_IS_FINAL_AUTHORIZATION=NO
PROXY_IS_FULL_SESSION_MANAGEMENT=NO

## 17.6 Role and membership decision

```txt
AUTHENTICATION_STATES:
- PUBLIC
- AUTHENTICATED

GLOBAL_AUTHORIZATION:
- ADMIN

PARTNER_SCOPED_MEMBERSHIPS:
- PARTNER_MEMBER
- PARTNER_MANAGER
```
Warianty tabel do ewentualnej implementacji w 74C: `users`, `profiles`, `roles`, `user_roles`, `partner_members`. Decyzja o powołaniu każdej z nich zostanie podjęta w 74C.

CUSTOM_CLAIMS_AVAILABILITY=SUPPORTED_BY_SUPABASE_AUTH_HOOKS
CUSTOM_CLAIMS_SELECTED_FOR_74C=UNDECIDED
DATABASE_IS_AUTHORITATIVE_SOURCE=RECOMMENDED
JWT_CLAIMS_FRESHNESS_RISK=REQUIRES_DESIGN

USER_METADATA_AUTHORIZATION=FORBIDDEN

CLIENT_PARTNER_ID_TRUSTED=NO
USER_METADATA_TRUSTED=NO
JWT_PARTNER_ID_AS_SOLE_AUTHORIZATION=NO
DATABASE_MEMBERSHIP_CHECK_REQUIRED_FOR_SENSITIVE_ACTIONS=YES

## 17.7 RLS decision gate

* Będzie potrzebne nowe RLS dla chronionych tabel, o ile takie powstaną.
* 74C musi ustalić:
  - czy tabele są dostępne przez Supabase Data API,
  - jakie granty mają `anon` i `authenticated`,
  - jakim użytkownikiem łączy się Drizzle przez `pg`,
  - czy połączenie przestrzega RLS,
  - czy Data API powinno być dostępne dla danych marketplace,
  - czy część danych ma być w niewystawionym schemacie.

RLS_IS_DEFENSE_IN_DEPTH=YES
RLS_REPLACES_SERVER_ACTION_AUTHORIZATION=NO
DIRECT_PG_CONNECTION_SECURITY_REQUIRES_SEPARATE_AUDIT=YES

## 17.8 Recommended architecture contract

- **DENY_BY_DEFAULT=YES** (dla chronionych namespace'ów)
- **SERVER_SIDE_AUTHORIZATION=REQUIRED**: Żadne poleganie na JWT poza bazowym uwierzytelnieniem sesji.
- **ACTION_LEVEL_AUTHORIZATION=REQUIRED**: Każda chroniona Server Action musi weryfikować uprawnienia po stronie serwera.
- **OWNERSHIP_CHECKS=REQUIRED**: Akcje partnera weryfikują ownership na podstawie źródła serwerowego.
- **CROSS_PARTNER_ISOLATION=REQUIRED**
- **CLIENT_ROLE_STATE_TRUSTED=NO**
- **UI_HIDING_IS_AUTHORIZATION=NO**
- **AUTOMATIC_ROLE_ESCALATION=NO**
- **PARTNER_SELF_REGISTRATION=NO**
- **PARTNER_SELF_PUBLISHING=NO**

## 17.9 Proposed file scope for next phases

**74B:**
- Supabase SSR dependencies
- server/browser client foundation
- auth cookies
- login/logout/callback
- safe redirect
- src/proxy.ts jako pierwsza warstwa
- bez DB/schema/migrations/RLS
- bez ról
- bez paneli

**74C:**
- projekt źródła ról
- projekt partner membership
- projekt ownership
- osobno zatwierdzone schema/migrations/RLS
- testy lokalne i read-only production audit

**74D:**
- testy bezpieczeństwa
- direct Server Action invocation
- role escalation
- cross-partner isolation
- stale membership/JWT
- open redirect
- public marketplace regression

## 17.10 Rollback plan

- Rollback kodu i rollback DB są osobnymi procedurami.
- Przed destrukcyjnym rollbackiem należy ustalić, czy powstały dane.
- Wymagany jest backup lub eksport danych; preferowana jest migracja naprawcza lub odwracająca.
- Należy unikać polecenia "DROP TABLE" bez osobnego zatwierdzenia.
- Rollback nie może przywracać znanej niezabezpieczonej implementacji.

AUTOMATIC_PRODUCTION_DROP=NO
DATA_PRESERVATION_REQUIRED=YES
SEPARATE_DB_ROLLBACK_APPROVAL=YES

## 17.11 Implementation gate

```txt
IMPLEMENTATION_GATE=READY_FOR_74B
74B_DB_CHANGES_ALLOWED=NO
74B_SCHEMA_CHANGES_ALLOWED=NO
74B_MIGRATIONS_ALLOWED=NO
74B_RLS_CHANGES_ALLOWED=NO
74B_ROLE_IMPLEMENTATION_ALLOWED=NO
74B_ADMIN_PANEL_ALLOWED=NO
74B_PARTNER_PORTAL_ALLOWED=NO
74B_LIVE_SUPABASE_TESTS_REQUIRE_CONFIRMED_PROJECT=YES
```
