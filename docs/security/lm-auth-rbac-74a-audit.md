# LM-AUTH-RBAC-74A — Audit Report

## 17.1 Executive summary

**Aktualny stan auth:** Repozytorium nie posiada zaimplementowanej żadnej warstwy uwierzytelniania. Brak zależności, klientów Supabase oraz logiki logowania. Aplikacja operuje wyłącznie w domenie publicznej (anonimowej).

**Aktualny stan session handling:** Jedyne "sesje" (cart / rfq) to proste anonimowe tokeny 32-bajtowe (session_hash) generowane na backendzie dla koszyka. Brak bezpiecznych sesji uwierzytelniających (JWT).

**Aktualny stan RBAC:** Całkowity brak. Repozytorium nie implementuje zarządzania rolami (ani globalnego, ani zagnieżdżonego per partner).

**Aktualny stan RLS:** Całkowity brak wpisów w repozytorium. Nie znaleziono dyrektyw `ENABLE ROW LEVEL SECURITY` ani `CREATE POLICY`.

**Najwyższe ryzyka:**
W aktualnym stanie aplikacja nie posiada panelu administracyjnego ani panelu partnera, więc nie ma bezpośredniego zagrożenia nieautoryzowanym dostępem. Jednak implementacja Server Actions (`addToCart`, `submitCheckout`, `submitRfq`) działa w pełni bez jakiejkolwiek autoryzacji czy rate-limitingu (na poziomie kodu), co może narazić system na nadużycia anonimowe, spam i scraping. Wprowadzenie uwierzytelniania musi obejmować rygorystyczne zabezpieczenie każdego z tych punktów wejścia oraz nowych, tworzonych w kolejnych fazach.

**Rekomendacja dalszych faz:**
Architektura musi zostać zaimplementowana od zera, zaczynając od bezpiecznego zarządzania sesją (74B), poprzez wdrożenie struktur RLS i bazy (74C), a kończąc na implementacji autoryzacji per-akcja w Server Actions i trasach (74D).

## 17.2 Evidence inventory

| Obszar | Status | Dowód | Ryzyko | Wniosek |
| ------ | ------ | ----- | ------ | ------- |
| Supabase SSR | ABSENT | Brak w `package.json` i kodzie | BRAK | Wymaga wdrożenia w 74B |
| RLS Policies | ABSENT | Brak `CREATE POLICY` w kodzie | HIGH (dla przyszłych mutacji) | Wymaga wdrożenia w 74C |
| Auth Middleware | ABSENT | Brak `middleware.ts` / `proxy.ts` | HIGH (dla przyszłych tras) | Wymaga wdrożenia w 74D |
| Role DB | ABSENT | Brak w `src/lib/schema.ts` | MEDIUM | Wymaga wdrożenia w 74C |
| Server Actions Auth | ABSENT | `src/app/actions.ts` - brak walidacji sesji uwierzytelniającej | HIGH | Wymaga zabezpieczenia w 74D |

## 17.3 Odpowiedzi na 18 obowiązkowych pytań

1. **Czy Supabase Auth jest używany?**
   Nie. Brak odpowiednich paczek (`@supabase/ssr`, `supabase-js`) w `package.json` oraz użyć w repozytorium.
2. **Czy istnieje konfiguracja klienta i serwera Supabase?**
   Nie. Repozytorium nie posiada helperów ani instancji klienta.
3. **Czy istnieją middleware, proxy, auth helpers lub session refresh?**
   Nie. Pliki `middleware.ts` oraz `proxy.ts` nie istnieją.
4. **Czy istnieją trasy admin, partner, login lub odpowiedniki?**
   Nie. Struktura `src/app/` posiada wyłącznie trasy publiczne: `/(pl)` oraz `/(localized)`.
5. **Czy istnieją tabele użytkowników, ról, partner membership albo invitations?**
   Nie. W `src/lib/schema.ts` istnieje tylko tabela `partners` używana do powiązań ofert. Brak ról/członkostw.
6. **Czy istnieją RLS policies?**
   Nie. W kodzie SQL i TS nie znaleziono deklaracji RLS.
7. **Czy Server Actions wykonują autoryzację?**
   Nie. Wszystkie akcje są publiczne.
8. **Czy `actions.ts` pozwala na niezabezpieczone mutacje?**
   Tak. Funkcje takie jak `submitCheckout` (l. 297), `submitRfq` (l. 316) nie wymagają autoryzacji, choć dotykają tabel DB (jedynie anonimowy `session_hash`).
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
    Nie, repozytorium nie udostępnia takich zmiennych. Zmienna `.env` nie jest w śledzeniu GIT, a `NEXT_PUBLIC_SITE_URL` nie dotyczy auth bezpośrednio.
15. **Czy auth wpływa na routing i18n?**
    Tego na razie nie ma, ale będzie musiało być poprawnie zaprojektowane dla ewentualnych zlokalizowanych powiadomień błędów autoryzacyjnych.
16. **Czy istnieją zabezpieczenia przed open redirect?**
    `src/app/go/[id]/route.ts` przekierowuje za pomocą zaufanej wartości z bazy danych, co chroni przed typowym otwartym przekierowaniem przez parametry URL, o ile DB pozostaje nienaruszona.
17. **Czy role pochodzą z JWT, bazy, metadata czy hardcodowania?**
    Nie aplikowalne - role nie istnieją.
18. **Czy istnieją testy auth/RBAC?**
    Nie. Folder `tests` oraz `e2e` nie zawiera żadnych plików ani nie istnieje.

## 17.4 Server Actions security matrix

| Action | Mutacja | Public callable | Identity check | Authentication | Authorization | Ownership | Input validation | Revalidation | Redirect | Risk | Recommended phase |
| ------ | ------- | --------------- | -------------- | -------------- | ------------- | --------- | ---------------- | ------------ | -------- | ---- | ----------------- |
| `addToCart` | Zmienia stan koszyka | TAK | NIE | NIE | NIE | NIE | Podstawowa | `revalidatePath("/")` | NIE | LOW | 74D |
| `removeFromCart` | Usuwa stan koszyka | TAK | NIE | NIE | NIE | NIE | Podstawowa | `revalidatePath("/")` | NIE | LOW | 74D |
| `updateCartQuantity`| Zmienia stan koszyka | TAK | NIE | NIE | NIE | NIE | Podstawowa | `revalidatePath("/")` | NIE | LOW | 74D |
| `clearCart` | Czyści stan koszyka | TAK | NIE | NIE | NIE | NIE | BRAK | `revalidatePath("/")` | NIE | LOW | 74D |
| `submitCheckout` | Tworzy order i kasuje koszyk | TAK | NIE | NIE | NIE | NIE | Brak Zod | `revalidatePath("/")` | NIE | MEDIUM | 74D |
| `submitRfq` | Tworzy rfq_lead | TAK | NIE | NIE | NIE | NIE | Brak Zod | BRAK | NIE | MEDIUM | 74D |

## 17.5 Route protection matrix

| Route pattern | Public | Authentication required | Authorization required | Partner scope | Current protection | Gap |
| ------------- | -----: | ----------------------: | ---------------------: | ------------: | ------------------ | --- |
| `/` | YES | NO | NO | N/A | Implicit allow | N/A |
| `/katalog/...` | YES | NO | NO | N/A | Implicit allow | N/A |
| `/oferta/...` | YES | NO | NO | N/A | Implicit allow | N/A |
| `/admin/...` (przyszłe) | NO | YES | YES (`ADMIN`) | N/A | Brak | RLS + Middleware + Server actions |
| `/partner/...` (przyszłe) | NO | YES | YES (`PARTNER_*`) | YES | Brak | RLS + Middleware + Server actions |

## 17.6 Role and membership decision

Architektura oparta na zaufanym źródle w **bazie danych (Database Role Source)** w połączeniu z zoptymalizowanymi Custom Claims (jeśli Supabase na to pozwoli) stanowiłaby optymalny balans bezpieczeństwa i wydajności. Z racji braku pełnych Custom Claims w czystym Supabase w darmowych planach, role muszą być przechowywane jako zagnieżdżone relacje i zautoryzowane po stronie serwera (`SELECT` w DB / cache aplikacyjne).

- Globalna rola ADMIN
- Scoped Membership: `user_id` -> `partner_users (partner_id, role)`

Stan `user_metadata` **nie powinien** być używany jako autorytatywne źródło (może być edytowane przez klienta, o ile brakuje triggerów wymuszających bezpieczny obieg).

## 17.7 RLS decision gate

* Będzie potrzebne nowe RLS dla wprowadzanych tabel `users`, `roles`, `partner_members` itp. (Faza 74C).
* Dodatkowo zabezpieczenia mogą objąć tabele `offers`, chroniąc szkice ofert partnerów przed ujawnieniem publicznym (Faza 74C/74D).
* Będzie wymagana migracja.
* Audyt produkcyjny wykazał, że dane konfiguracyjne zostały wdrożone, ale RLS należy zaimplementować i włączyć eksplicite dla każdej nowej i wrażliwej istniejącej tabeli.
* Wymagany osobny sprint na przygotowanie schematów (74C).

## 17.8 Recommended architecture contract

- **DENY_BY_DEFAULT=YES**
- **SERVER_SIDE_AUTHORIZATION=REQUIRED**: Żadne poleganie na JWT poza bazowym uwierzytelnieniem sesji. Odczyt ról podczas akcji z `db`.
- **ACTION_LEVEL_AUTHORIZATION=REQUIRED**: Każda Server Action z mutacją powiązaną z uprawnieniami musi mieć weryfikację uprawnień z wyłączeniem obejścia z frontend'u.
- **OWNERSHIP_CHECKS=REQUIRED**: Akcje partnera (np. edycja) muszą weryfikować `partnerId` pochodzące nie z parametrów od klienta, ale z bazy w odniesieniu do sesji.
- **CROSS_PARTNER_ISOLATION=REQUIRED**
- **CLIENT_ROLE_STATE_TRUSTED=NO**
- **UI_HIDING_IS_AUTHORIZATION=NO**
- **AUTOMATIC_ROLE_ESCALATION=NO**
- **PARTNER_SELF_REGISTRATION=NO**
- **PARTNER_SELF_PUBLISHING=NO** (Wszystko przechodzi przez `ADMIN_APPROVAL`).

## 17.9 Proposed file scope for next phases

Tworzenie / Modyfikacja:
- `package.json` (dodanie supabase deps)
- `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts` (helpery)
- `middleware.ts`
- `src/db/schema.ts` (nowe tabele rol)
- `supabase/migrations/XXX_auth.sql`
- Nowe pliki autoryzacyjne w `src/app/actions/...`

## 17.10 Rollback plan

- **74B session foundation:** Usunięcie zależności supabase, usunięcie paczki z helpersami i usunięcie pliku middleware.ts. Nie wymaga zmiany DB.
- **74C schema/RBAC/RLS:** Standardowa migracja "down", polegająca na poleceniu DROP dla polityk RLS oraz nowo powstałych tabel (jeśli testowane lokalnie, lub wycofanie migracji dla produkcji).
- **74D enforcement:** Wymazanie autoryzacyjnych wrapperów w Server Actions, przywrócenie oryginalnych akcji pozbawionych autoryzacji z gita. Wyłączenie autoryzacyjnych redirectów z middleware'u.

## 17.11 Implementation gate

```txt
IMPLEMENTATION_GATE=READY_FOR_74B
```
Wszystkie niezbędne informacje zostały zabrane z całkowitą pewnością opartą o stan repozytorium. Projekt w fazie 74B może wdrożyć stabilne fundamenty bibliotek Supabase SSR.
