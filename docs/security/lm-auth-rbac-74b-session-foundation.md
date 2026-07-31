# LM-AUTH-RBAC-74B Session Foundation

## Overview
This document outlines the server-side session foundation established during sprint LM-AUTH-RBAC-74B, hardened in R1/R2, and finalized in R3 for LogiMarket.
The scope covers the initialization of server-side Supabase Auth, proxy redirection, safe redirect handling, login error classification, and secure routing.

## Environment Contract
- `NEXT_PUBLIC_SUPABASE_URL`: Required for auth functionality.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Required for auth functionality (legacy anon key is deprecated).

## Build & Configurations
- `SUPABASE_PROJECT_IDENTIFIED=NO`
- `LIVE_LOGIN_TEST=BLOCKED`
- `LIVE_LOGOUT_TEST=BLOCKED`
- `@supabase/ssr`: version `0.12.4`
- `@supabase/supabase-js`: version `2.111.0`

## Server Client Architecture
- **Server-Side Exclusivity**: 
  - No Browser Supabase client was created. 
  - No callback route handler.
  - No `service-role` or `secret` key is stored or utilized in the runtime.
  - Caching is managed explicitly through `revalidatePath` and Supabase responses.
- **Routing Contract**:
  - `NEXTJS_FILE=src/proxy.ts` (Middleware proxy)
  - `PL_PROTECTED_PREFIXES=/admin,/partner` (NO_PL_PREFIX=YES)
  - `LOCALIZED_PREFIXES=/en,/de,/fr,/uk,/es,/zh`
  - `PROXY_FINAL_AUTHORIZATION=NO`
- **Cookie Lifecycle**: 
  - `@supabase/ssr` `createServerClient` and proxy refreshing handle setting, updating, and expiring secure cookies.
  - `session_hash` behavior remains unchanged and independent of Supabase auth.
- **Redirects & Headers**:
  - `createAuthRedirect` ensures that `Set-Cookie`, `Cache-Control`, `Expires`, and `Pragma` headers are correctly propagated from `supabaseResponse` to `NextResponse.redirect()`.
  - Safe redirect (`getSafeRedirectUrl`) blocks protocol-relative, absolute URLs, encoded bypasses, backslashes, schemes, and header injection.

## getClaims() Description
- weryfikuje podpis i wygaśnięcie JWT;
- często korzysta z lokalnej lub cache’owanej weryfikacji JWKS;
- może wymagać pobrania JWKS;
- przy symetrycznych kluczach może korzystać z weryfikacji przez Auth Server;
- nie zastępuje sprawdzenia membership i ownership.

## Login & Logout Flow
- **Login**: Server Action `loginUser` handles login. Uses Zod for validation.
- **Logout**: Server Action `logoutUser` signs out via Supabase.
- **Session Result States (`classifySessionError`)**:
  - `unauthenticated`: maps to `AuthSessionMissingError`, `session_not_found`, `session_expired`, `refresh_token_not_found`, `bad_jwt`, `user_not_found`.
  - `unavailable`: maps to network error, request timeout, unexpected failure, generic 403, unknown error.
- **Login Result States (`classifyLoginError`)**:
  - `INVALID_CREDENTIALS`: maps to `invalid_credentials`, `email_not_confirmed`, `phone_not_confirmed`, `user_banned`.
  - `AUTH_UNAVAILABLE`: maps to infrastructure errors (`unexpected_failure`, `request_timeout`, etc.) or unknown errors.
- **i18n**: Authentication error states (`INVALID_CREDENTIALS`, `AUTH_UNAVAILABLE`) are mapped to neutral, translated messages without exposing account existence.

## Server Actions Classification
```text
PUBLIC_STATELESS:
- getFilteredCategoryOffers
- searchCatalog

PUBLIC_ANONYMOUS_SESSION_SCOPED:
- addToCart
- removeFromCart
- updateCartQuantity
- clearCart

PUBLIC_WITH_ABUSE_CONTROLS:
- submitCheckout
- submitRfq

PUBLIC_AUTH_GATEWAYS:
- loginUser
- logoutUser

AUTHENTICATED:
- none implemented in 74B

PARTNER_SCOPED:
- none implemented in 74B

ADMIN_ONLY:
- none implemented in 74B
```

## Impact on Existing Features
- Public RFQ, Anonymous Cart, and Guest Checkout remain unchanged.
- No DB, schema, migrations, and RLS changes were made in this phase.

## Rollback & Next Steps
- Elements deferred to 74C: Roles, Membership, RLS, and final server-side authorization enforcement.

## Procedural History
- The first execution of 74B violated constraints by using `git add .`.
- R1, R2, and R3 exclusively use selective staging to enforce strict file control.
