# Runtime Migration Epoch — Operational Documentation

> **Branch**: `feat/lm-auth-rbac-74b-dev-epoch-08a`
> **Gate**: LM-AUTH-RBAC-74B-DEV-EPOCH-08A

## Overview

This document describes the runtime migration epoch introduced for the
LogiMarket marketplace. The epoch creates an auditable, production-exact
baseline of the 15 runtime tables that back the marketplace, enforces a
strict security boundary between legacy migrations and runtime migrations,
and provides controlled mechanisms for runner, grant verification, and
rollback.

---

## 1. Metadata Fingerprint

The runtime schema fingerprint is a deep structural snapshot of the public
schema captured from `pg_catalog` and `information_schema`. It covers:

| Attribute          | Source                                |
|--------------------|---------------------------------------|
| Tables             | `pg_class` (relkind='r')              |
| Columns            | `pg_attribute` + `pg_attrdef`         |
| Column types       | `format_type(atttypid, atttypmod)`    |
| Nullability        | `attnotnull`                          |
| Default values     | `pg_get_expr(adbin, adrelid)`         |
| Sequences          | `pg_class` (relkind='S')              |
| Sequence ownership | `pg_depend` (deptype='a')             |
| PK / FK / UNIQUE / CHECK | `pg_constraint`              |
| Explicit indexes   | `pg_index` (non-PK, non-UNIQUE)       |
| RLS enabled        | `relrowsecurity`                      |
| RLS forced         | `relforcerowsecurity`                 |
| Policy count       | `pg_policy`                           |
| Trigger count      | `pg_trigger` (non-internal)           |

**No business rows are ever read.** The fingerprint module accepts an injected
`Queryable` and never constructs a `pg.Pool` on import.

---

## 2. Target Classification

Before any migration DDL is executed, the runner classifies the target schema
into one of three states:

| State              | Condition                                                        |
|--------------------|------------------------------------------------------------------|
| `EMPTY`            | Zero public tables                                               |
| `EXACT_EXISTING`   | Exactly 15 runtime tables, full fingerprint matches production   |
| `PARTIAL_OR_DRIFTED` | Any other state (partial tables, column/type/constraint/index/RLS/policy/trigger difference) |

`PARTIAL_OR_DRIFTED` is intentionally broad:
- 1–14 tables present
- More than 15 public tables
- Correct table names but wrong column type or nullability
- Wrong default value
- Missing or extra FK / UNIQUE / CHECK
- Missing or extra explicit index
- Wrong sequence or sequence ownership
- RLS disabled on any table
- Policy count ≠ 0 on any table
- Trigger count ≠ 0 on any table

The classification is returned as `{ state, publicTableCount, differences }`.

---

## 3. Runner — Preflight and Post-Check

The runner (`scripts/database/run-runtime-migrations.ts`) enforces:

1. **Target guard** — validates all required env vars before opening any
   DB connection. The pool is created only inside `main()`.
2. **Metadata preflight** — fetches full structural fingerprint before DDL.
3. **Classification** — aborts with error if `PARTIAL_OR_DRIFTED`.
4. **Drizzle migration** — calls `migrate(db, { migrationsFolder, migrationsSchema, migrationsTable })`
   where `migrate` is imported from `drizzle-orm/node-postgres/migrator`
   (the bare `drizzle-orm/node-postgres` module does **not** export `migrate`)
   and `db` is a `drizzle()` `node-postgres` client over a `pg.Pool`.
   Manual `INSERT` into the journal is **forbidden**.
5. **Post-check** — fetches full fingerprint again after migration; requires
   `EXACT_EXISTING`. Throws if not exact.
6. **Grant post-check** — reads pg ACL counts and logs them safely.
7. **Pool cleanup** — `pool.end()` always called in `finally` block.

The runner never logs `DATABASE_URL` or project refs.

### Adoption of existing production schema

When the target is `EXACT_EXISTING`, Drizzle's migrator runs in adoption
mode: it inserts a journal entry for the baseline SQL without re-executing
DDL (the SQL is already present). The baseline SQL itself must perform only
validation — no additional DDL changes.

---

## 4. Grant Verifier

`scripts/database/verify-runtime-data-api-grants.ts` reads ACL metadata from:

```sql
aclexplode(COALESCE(relacl, acldefault(...)))
```

for both tables (`relkind='r'`) and sequences (`relkind='S'`). Both queries
are restricted via `ANY($1)` to the 15 approved runtime tables and the exact
15 approved runtime sequences — the sequence allowlist is taken verbatim from
the confirmed `sequenceName` ownership data in the production contract
(cross-checked against the baseline SQL by contract tests), never generated
from a table-name pattern and never from user input. It resolves grantee OIDs
to role names via `pg_roles`.

Reported counts:

| Metric                           | Expected (fresh DEV) |
|----------------------------------|----------------------|
| `ANON_TABLE_GRANT_COUNT`         | 0                    |
| `AUTHENTICATED_TABLE_GRANT_COUNT`| 0                    |
| `SERVICE_ROLE_TABLE_GRANT_COUNT` | (reported, not constrained) |
| `ANON_SEQUENCE_GRANT_COUNT`      | 0                    |
| `AUTHENTICATED_SEQUENCE_GRANT_COUNT` | 0               |

The verifier **never** executes `GRANT` or `REVOKE`. No writes.

---

## 5. Migration Hash

The expected SHA-256 hash of the baseline migration SQL is computed at runtime
by `readMigrationFiles({ migrationsFolder: 'drizzle-runtime' })` from
`drizzle-orm/migrator`. It is **not hard-coded** in multiple files.

```
BASELINE_TAG=0000_production_runtime_baseline
BASELINE_CREATED_AT=1785589560000  (UTC: 2026-08-01T13:06:00Z)
```

---

## 6. Rollback — Safe Conditions

`scripts/database/rollback-empty-development-baseline.ts` requires **all** of
the following preconditions before executing any DDL:

1. `RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION=AUTHORIZED_EMPTY_DEV_BASELINE_ROLLBACK`
2. `RUNTIME_MIGRATION_TARGET=development`
3. `RUNTIME_MIGRATION_EXPECTED_PROJECT_REF` ≠ `RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF`
4. `DATABASE_URL` must resolve to the expected DEV project ref
5. `DATABASE_URL` must NOT resolve to the forbidden (production) ref
6. Full fingerprint must be `EXACT_EXISTING`
7. Exactly 15 public tables — no additional tables
8. Policy count = 0 across all 15 tables
9. Runtime journal (`drizzle_runtime.__drizzle_migrations`) must contain exactly 1
   entry with:
   - hash = current expected hash (loaded from migration files at runtime)
   - `created_at` = 1785589560000
10. Each of the 15 approved tables must have **0 rows** (table names come from the
    approved contract — never from user input)

If any condition fails:

```
ROLLBACK_ALLOWED=NO
DDL_EXECUTED=NO
```

### Rollback DDL (when allowed)

All destructive DDL runs on **one `pg.PoolClient`** (`pool.connect()`) inside
**one transaction** — never via `pool.query()`, which could hop between
connections:

1. `BEGIN`
2. Drops 15 tables in explicit reverse dependency order — **NO CASCADE**.
3. Issues `DROP SEQUENCE IF EXISTS` for each of the 15 approved sequences.
4. Drops the runtime journal table explicitly:
   `DROP TABLE IF EXISTS drizzle_runtime."__drizzle_migrations"`.
5. Drops the now-empty schema: `DROP SCHEMA IF EXISTS drizzle_runtime` —
   **NO CASCADE**.
6. `COMMIT`

On any error the transaction is aborted with `ROLLBACK` and the error is
rethrown. `client.release()` runs in `finally`, and `pool.end()` runs in an
outer `finally`. **No operation uses CASCADE anywhere.** The rollback does
not touch `auth`, `storage`, `vault`, the legacy `drizzle` journal, or any
other schema.

> **Rollback MUST NOT be run outside an empty DEV environment.**

---

## 7. Blocked Operations

| Operation | Status |
|-----------|--------|
| `drizzle-kit generate` | Forbidden for runtime migrations |
| `drizzle-kit push` | Forbidden |
| `supabase db push` | Forbidden |
| Manual `INSERT` to journal | Forbidden |
| Running rollback on production | Blocked by production ref guard |
| Running rollback on non-empty tables | Blocked by row-count check |
| Running runner on PARTIAL_OR_DRIFTED schema | Blocked by pre-check |
| `CASCADE` in any rollback statement | Forbidden (DROP TABLE, DROP SCHEMA) |
| Rollback DDL via `pool.query()` (multi-connection) | Forbidden — single `PoolClient` + single transaction |

---

## 8. Gate 08B Authorization

Running migrations against DEV requires explicit authorization via:

```
RUNTIME_MIGRATION_WRITE_AUTHORIZATION=AUTHORIZED_DEV_BASELINE_WRITE
```

This gate is **separate** from Gate 08A (implementation) and is referred to as
**Gate 08B — Independent Review**. The runner must not be invoked without this
independent gate being passed.

---

## 9. Files

| File | Purpose |
|------|---------|
| `scripts/database/verify-runtime-schema-fingerprint.ts` | Pure functions + metadata provider |
| `scripts/database/verify-runtime-data-api-grants.ts` | ACL grant reader |
| `scripts/database/run-runtime-migrations.ts` | Migration runner entrypoint |
| `scripts/database/rollback-empty-development-baseline.ts` | Rollback entrypoint |
| `scripts/database/verify-runtime-migration-target.ts` | Target env-var guard |
| `scripts/database/runtime-migration-contract.ts` | Canonical schema contract |
| `drizzle-runtime/0000_production_runtime_baseline.sql` | Baseline DDL |
| `drizzle-runtime/meta/_journal.json` | Drizzle journal |
| `tests/database/runtime-migration-engine.test.ts` | Full test suite |
