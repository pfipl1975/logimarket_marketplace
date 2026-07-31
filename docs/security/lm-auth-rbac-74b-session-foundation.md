# LM-AUTH-RBAC-74B Session Foundation

## Overview
This document outlines the server-side session foundation established during sprint LM-AUTH-RBAC-74B and hardened in 74B-R1 for LogiMarket.

## Environment Contract
- `NEXT_PUBLIC_SUPABASE_URL`: (Required for auth functionality)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: (Required for auth functionality)

## Build & Configurations
- `SUPABASE_PROJECT_IDENTIFIED=NO`: The project has not been configured in Supabase yet.
- `LIVE_AUTH_TESTS=BLOCKED`: Skipped because the environment configuration was not provided or confirmed.
- `@supabase/ssr`: version `0.12.4`
- `@supabase/supabase-js`: version `2.111.0`

## Design Decisions
- **Server-Side Exclusivity**: 
  - No Browser Supabase client was created. 
  - No callback route handler.
  - No `service-role` or `secret` key is stored or utilized in the runtime.
  - Fail-closed behavior for protected namespaces (`/admin`, `/partner`).
  - Separation of Supabase auth cookies and `session_hash`.
  - No DB, schema, migrations, and RLS changes were made in this phase.
- **Cookie Lifecycle**: `@supabase/ssr` `createServerClient` and proxy refreshing handle setting, updating, and expiring secure cookies.

## Status Flags
- `PROXY_IDENTITY_CHECK=getClaims`
- `CURRENT_USER_LOOKUP=getUser`
- `CACHE_HEADERS_EXPLICITLY_PROPAGATED=YES`
- `PROXY_FINAL_AUTHORIZATION=NO`
- `SUPABASE_PROJECT_IDENTIFIED=NO`
- `LIVE_AUTH_TESTS=BLOCKED`

## Procedural Notes
- There was a procedural violation in the first execution of 74B by using `git add .`.
- Selective staging is exclusively used in R1.
