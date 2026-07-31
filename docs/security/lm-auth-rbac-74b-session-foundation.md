# LM-AUTH-RBAC-74B Session Foundation

## Overview
This document outlines the server-side session foundation established during sprint LM-AUTH-RBAC-74B, hardened in 74B-R1, and finalized in 74B-R2 for LogiMarket.
The scope of 74B covers the initialization of server-side Supabase Auth, proxy redirection, safe redirect handling, i18n auth errors, and secure routing.

## Environment Contract
- `NEXT_PUBLIC_SUPABASE_URL`: Required for auth functionality.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Required for auth functionality (legacy anon key is deprecated).

## Build & Configurations
- `SUPABASE_PROJECT_IDENTIFIED=NO`: The project has not been configured in Supabase yet.
- `LIVE_AUTH_TESTS=BLOCKED`: Skipped because the environment configuration was not provided or confirmed.
- `@supabase/ssr`: version `0.12.4`
- `@supabase/supabase-js`: version `2.111.0`

## Server Client Architecture
- **Server-Side Exclusivity**: 
  - No Browser Supabase client was created. 
  - No callback route handler.
  - No `service-role` or `secret` key is stored or utilized in the runtime.
  - Caching is managed explicitly through `revalidatePath` and Supabase responses.
- **Proxy Architecture**:
  - Middleware proxy intercepts requests to strictly defined protected routes (`/admin`, `/partner`, `/pl/admin`, etc.).
  - `getClaims()` is used in the proxy for fast session validation without network overhead.
  - `getUser()` is used in `getCurrentUser()` for authoritative user lookup.
- **Cookie Lifecycle**: 
  - `@supabase/ssr` `createServerClient` and proxy refreshing handle setting, updating, and expiring secure cookies.
  - `session_hash` behavior remains unchanged and independent of Supabase auth.
- **Redirects & Headers**:
  - `createAuthRedirect` ensures that `Set-Cookie`, `Cache-Control`, `Expires`, and `Pragma` headers are correctly propagated from `supabaseResponse` to `NextResponse.redirect()`.
  - Safe redirect (`getSafeRedirectUrl`) blocks protocol-relative, absolute URLs, encoded bypasses, backslashes, schemes, and header injection.

## Login & Logout Flow
- **Login**: Server Action `loginUser` handles login. Uses Zod for validation.
- **Logout**: Server Action `logoutUser` signs out via Supabase.
- **Result States (`getCurrentUser`)**:
  - `authenticated`: User exists and session is valid.
  - `unauthenticated`: No session, `AuthSessionMissingError`, or invalid token (401, 403).
  - `unavailable`: Network error, 500 server error, unconfigured environment, or unknown error.
- **i18n**: Authentication error states (`INVALID_CREDENTIALS`, `AUTH_UNAVAILABLE`) are mapped to neutral, translated messages via dictionary without exposing account existence.

## Server Actions Classification
- `PUBLIC_STATELESS`: No session needed (e.g., global UI state).
- `PUBLIC_ANONYMOUS_SESSION_SCOPED`: Actions relying on `session_hash`.
- `PUBLIC_WITH_ABUSE_CONTROLS`: Actions requiring rate limiting but no identity.
- `AUTHENTICATED`: Base authenticated actions.
- `PARTNER_SCOPED`: Actions for partner panel (future phase).
- `ADMIN_ONLY`: Actions for admin panel (future phase).

## Impact on Existing Features
- Public RFQ, Anonymous Cart, and Guest Checkout remain unchanged.
- No DB, schema, migrations, and RLS changes were made in this phase.
- Outbound functionality is unaffected.

## Tests & Limitations
- Pure unit tests implemented for proxy redirect logic, error classification, and safe redirect.
- Live login/logout flows have NOT been confirmed due to `LIVE_AUTH_TESTS=BLOCKED`.

## Rollback & Next Steps
- Rollback can be performed by reverting the 74B commits on the `main` branch.
- Elements deferred to 74C: Roles, Membership, RLS, and final server-side authorization enforcement.

## Procedural History
- The first execution of 74B violated constraints by using `git add .`.
- R1 and R2 exclusively use selective staging to enforce strict file control.
