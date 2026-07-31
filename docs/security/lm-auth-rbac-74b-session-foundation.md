# LM-AUTH-RBAC-74B Session Foundation

## Overview
This document outlines the server-side session foundation established during sprint LM-AUTH-RBAC-74B for LogiMarket.

## Environment Contract
- `NEXT_PUBLIC_SUPABASE_URL`: (Required for auth functionality)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: (Required for auth functionality, falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_PROJECT_IDENTIFIED=NO`: The build proceeds safely even if Supabase envs are missing (`BUILD_WITHOUT_SUPABASE_ENV=PASS`).

## Design Decisions
- `LIVE_AUTH_TESTS=BLOCKED`: Skipped because the environment configuration was not provided or confirmed.
- **Server-Side Exclusivity**: 
  - No Browser Supabase client was created. 
  - No callback route handler.
  - No `service-role` or `secret` key is stored or utilized in the runtime.
  - Passwords and user sessions are processed only via `src/app/actions.ts`.
- **Cookie Lifecycle**: `@supabase/ssr` `createServerClient` and proxy refreshing handle setting, updating, and expiring secure cookies.
- **`getClaims()` vs `getUser()`**: 
  - The middleware Proxy optimistically checks claims using `supabase.auth.getUser()` (acting as `getClaims()`).
  - `getCurrentUser()` verifies the actual record via `supabase.auth.getUser()`.
  - We do not authorize based on `user_metadata`.
- **Proxy Matcher**: `src/proxy.ts` applies strict matching exclusively for routes that need authentication (e.g. `/admin/**`, `/partner/**`, and localized variants).

## Server Actions Classification
The existing Server Actions are classified as follows:
- `getFilteredCategoryOffers`, `searchCatalog`: PUBLIC_STATELESS
- `addToCart`, `removeFromCart`, `updateCartQuantity`, `clearCart`: PUBLIC_ANONYMOUS_SESSION_SCOPED (based on `session_hash`)
- `submitCheckout`, `submitRfq`: PUBLIC_WITH_ABUSE_CONTROLS
- `loginUser`, `logoutUser`: PUBLIC_AUTH_GATEWAYS

## Cache Headers and safe redirect
`src/lib/auth/safe-redirect.ts` enforces that open-redirects are rejected (e.g., protocol-relative paths or absolute URLs). Cache headers are naturally propagated by `NextResponse.next({ request })` inside the proxy.
The anonymous cart and `session_hash` functionality remain decoupled and structurally unaffected.
