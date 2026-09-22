# ADR-0001: DEFERRABLE INITIALLY IMMEDIATE for Migration FK Constraints

**Status:** Accepted
**Sprint:** LM-CAT-FILTER-44-CLOSE
**Date:** 2026-07-12

---

## Context

The faceted-filter migration architecture uses two FK constraints that must
satisfy two conflicting requirements:

1. **Immediate enforcement** — insert-time FK checks must fire within the
   PL/pgSQL subtransaction of `lm44_test.assert_sqlstate()`. A DEFERRABLE
   INITIALLY DEFERRED constraint does not fire at the end of an inner
   `BEGIN...EXCEPTION` block; it defers to the outer COMMIT, making it
   invisible to the test harness.

2. **Controlled deferral** — the batch-rollback path must DELETE an
   `offer_attribute_values` row and NULL-detach the manifest pointer in the
   same explicit transaction. Without deferral the FK fires before the detach,
   making the atomic rollback impossible.

The two constraints involved are:

| Constraint | Table | References |
|---|---|---|
| `fk_mot_oav_target_current` | `migration_oav_targets` | `offer_attribute_values` |
| `fk_mott_oaov_target_current` | `migration_oaov_targets` | `offer_attribute_option_values` |

---

## Decision

Both constraints are declared with:

```sql
ALTER CONSTRAINT <name> DEFERRABLE INITIALLY IMMEDIATE;
```

This means:
- By default the constraint fires immediately after each statement, satisfying
  test-harness subtransaction semantics.
- Explicitly deferrable within any session using the exact constraint name:

```sql
SET CONSTRAINTS fk_mot_oav_target_current DEFERRED;
SET CONSTRAINTS fk_mott_oaov_target_current DEFERRED;
```

`SET CONSTRAINTS ALL DEFERRED` MUST NOT be used. Only the named constraints
required by the current operation should be deferred.

---

## Rationale

### Why not INITIALLY DEFERRED?

Inside `lm44_test.assert_sqlstate()` the statement runs in a PL/pgSQL inner
`BEGIN...EXCEPTION` block (a savepoint). PostgreSQL does not check DEFERRED
constraints at savepoint release — only at the outer COMMIT. The FK violation
is therefore invisible to the exception handler, producing a false success.

### Why not NOT DEFERRABLE?

The batch-rollback path requires a transient FK violation window. NOT DEFERRABLE
prevents any atomic DELETE + detach in a single transaction.

### Why name-specific SET CONSTRAINTS?

`SET CONSTRAINTS ALL DEFERRED` defers every deferrable constraint in scope,
including constraints that must remain immediate. Name-specific deferral is
surgical, self-documenting, and matches the exact constraint being managed.

---

## Consequences

- `pg_constraint.condeferrable = true`, `pg_constraint.condeferred = false`.
- Rollback transactions MUST use `SET CONSTRAINTS <exact-name> DEFERRED`.
- L06 (OAV) and L06b (OAOV) are implemented as Node.js pg-driver tests
  asserting `error.code === '23503'` and `error.constraint === '<name>'`.
- Drizzle ORM does not model DEFERRABLE mode; `ALTER CONSTRAINT` is a
  post-DDL step in migration SQL only and is absent from the snapshot.

---

## Related

- `drizzle/0001_rich_lord_hawal.sql` — ALTER CONSTRAINT statements
- `scripts/lm44-deferred-fk-test.mjs` — Node.js pg-driver L06/L06b
- `scripts/verify-lm-cat-filter-44-close.ps1` — full 122-test harness
