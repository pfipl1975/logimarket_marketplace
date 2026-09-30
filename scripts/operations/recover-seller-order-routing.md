# Exact E2 → E6 recovery runbook

This sprint prepares recovery only. No production execution is authorized here.
Owner reported Marketplace Order `1`; its exact Seller Order ID and classified physical database target must be established in a separate read-only precheck. Never infer the Seller ID or Partner ID from that report.

## Preconditions

- Confirm deployment includes the reviewed routing fix and required CI/Browser evidence.
- Classify the physical database as LOCAL, DISPOSABLE_DEV, SHARED_DEV, PRODUCTION or UNKNOWN. Independently verify the configured DATABASE_URL host against the approved target; do not print credentials or the URL.
- Confirm the exact Marketplace Order ID and Seller Order ID using read-only access. Partner ID is derived from the locked Seller Order; it is not accepted as a CLI override.
- Supply DATABASE_URL securely through the operator environment. The script does not load an env file, migrate, create fixtures, send notifications or modify schemas.

## Read-only precheck and dry-run

Replace every placeholder with the independently verified value; this example is not executable approval:

```powershell
npm.cmd exec tsx -- --conditions react-server scripts/operations/recover-seller-order-routing.ts --environment PRODUCTION --expected-host <VERIFIED_HOST> --marketplace-order-id 1 --seller-order-id <VERIFIED_SELLER_ORDER_ID>
```

Dry-run uses a PostgreSQL READ ONLY transaction and never takes write locks. `SAFE_TO_ROUTE` requires submitted status, no E6 timestamp, no decision, no routed outbox event, canonical parent/snapshots/items and current Seller Readiness. `ALREADY_ROUTED` is a complete pending state with exactly one routed intent and an unchanged 24-hour deadline. Unknown IDs, wrong parent, terminal status, partial state, invalid readiness or missing canonical evidence fail closed.

## Separately authorized execution

After Owner Review, obtain explicit authorization naming the environment, exact Marketplace Order ID and exact Seller Order ID. The CLI acknowledgement token records that decision; it does not grant authority by itself. SHARED_DEV and UNKNOWN writes are always refused. LOCAL/DISPOSABLE_DEV execution is restricted to loopback hosts.

```powershell
npm.cmd exec tsx -- --conditions react-server scripts/operations/recover-seller-order-routing.ts --environment PRODUCTION --expected-host <VERIFIED_HOST> --marketplace-order-id 1 --seller-order-id <VERIFIED_SELLER_ORDER_ID> --execute --authorization AUTHORIZE_E6_MARKETPLACE_ORDER_1_SELLER_ORDER_<VERIFIED_SELLER_ORDER_ID>
```

Execution rechecks the exact parent, orphan state, snapshots, outbox and current readiness under the canonical Seller Order → decision lock order. The shared routing helper uses the current database clock; the original checkout/created timestamp is never used for the deadline. Any routing/outbox/postcheck failure throws and rolls back the transaction.

## Postcheck

- Require `ALREADY_ROUTED`, `changed: true`, derived Partner ID. Repeating the same command must return `changed: false` and preserve timestamps.
- Repeat the read-only command: complete pending decision, E6 present, expires_at = E6 + 24 hours, exactly one routed intent.
- Verify Partner list and detail show the order, pending status and remaining decision time, with no generic list error. Before E7, contact/full invoice remain hidden.
- No accepted_at, resolved_at, deciding actor or decision source may be introduced by recovery. No contract forms until the Partner deliberately accepts E7.
- Notification intent is transactional; actual external delivery is outside this recovery operation.
- If any result is conflicting/ineligible/system error, stop. No partial repair, deadline reset, decision overwrite, legacy migration or bulk reroute is permitted.

No production dry-run or execution was performed during this implementation. The exact IDs/target, Owner authorization, precheck and runtime/browser postcheck must be recorded during the separate recovery task.
