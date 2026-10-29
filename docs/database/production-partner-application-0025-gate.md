# Production 0025 authorization gate — Owner review candidate

This code does not authorize execution. Production migration, deployment and promotion require separate Owner decisions. Do not use POST_0007 reconciliation or the historical 0000..0003 authorization for 0025.

The existing `npm run db:runtime:migrate` entrypoint accepts the dedicated literal `AUTHORIZED_PROD_PARTNER_APPLICATION_0025_ONLY` only with target `production`, expected project `tpjsiutclowwaxlopemn`, a distinct forbidden project and explicit expected pre-state `EXACT_EXISTING_POST_0024`. The URL must identify database `postgres` on the exact direct Supabase host or its project-bound session pooler (5432), with explicit `sslmode=verify-full` and `sslrootcert`. Use the previously approved CA and hidden interactive password input; credentials stay process-local and must never be printed or persisted. Transaction pooling and extra/duplicate connection parameters are refused.

Before any production connection, the gate validates the pinned digest covering all 26 journal entries and canonical LF SQL contents. The digest is a code-review trust anchor; do not regenerate it to bypass a refusal. No migration or journal file is modified.

A single pinned DB client holds a nonblocking session advisory lock. Its read-only repeatable-read preflight requires exact POST_0024 and 25 canonical applied hashes/timestamps. The standard Drizzle migrator receives a temporary folder containing only 0025. The full historical journal is used for validation, not replayed as DDL.

Post-checks require exact POST_0025, all 26 canonical applied entries, RLS/policy/trigger fingerprint, no Data API/PUBLIC grants on the three application tables or trigger functions, and three invoker functions with the fixed search path. All failures stop and report; there is no repair, journal rewrite or destructive rollback. A failure after Drizzle commits may leave 0025 committed and must be investigated by the Owner.

Replay on exact POST_0025 first verifies its journal and access controls, then refuses with `ALREADY_APPLIED_0025_NO_DDL`. It never invokes the migrator. The session connection is destroyed on exit, releasing the lock.

Core Legal Pack publication is not invoked or imported. Its existing publisher refuses POST_0025; the separately verified active pack must be preserved. Public intake remains disabled. This gate does not alter legal/privacy, retention, Vercel, application authorization or the approved SQL.

Future execution requires a new exact-SHA Owner authorization, fresh production metadata preflight, confirmed backup/recovery arrangements, approved production connection/TLS evidence, and an agreed post-check procedure. Promotion and public intake activation remain separate gates. There is deliberately no automatic execution command here.

## Isolated proof

The test file always runs authorization/chain negative tests. Its real PostgreSQL case runs only with explicit `PROD_0025_GATE_TEST_URL`, `PROD_0025_GATE_TEST_CLASSIFICATION=LOCAL` or `DISPOSABLE_DEV`, `NODE_ENV=test` and `ALLOW_DESTRUCTIVE_DB_TESTS=1`. The existing destructive-test guard requires loopback and database `logimarket_test`; SQL identity is checked before reset. The production-shaped synthetic URL is validated by the guard while an injected pool connects exclusively to that local test database. It is never used for a network connection. With no explicit fixture URL the real case is reported SKIP, not PASS.