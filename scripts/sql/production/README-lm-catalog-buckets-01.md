# LM-CATALOG-BUCKETS-01 — controlled catalog data package

Scope: introduce the approved **seventh section** `Maszyny i urządzenia`, its group `Osprzęt do maszyn budowlanych`, and exactly three leaf categories. These five slugs are independent of, and do not modify, `osprzet-do-wozkow-widlowych` or its descendants.

## Data/environment boundary

- Environment: **PRODUCTION** for the eventual release. Production writes **NOT AUTHORIZED by committing this PR**.
- Apply and rollback are staged SQL artifacts only. Do not run them against production until the Owner separately approves the exact project/environment, exact five-node mutation, exact purpose and release window.
- The scripts do not change schema, migrations, offers, partner records, offer publication or permissions.
- No technical-attribute assignments are included. Bucket parameter definitions/units and requiredness require a separate domain decision.
- No Docker prerequisite. Tests may execute apply/verify/rollback only against an expressly classified LOCAL or DISPOSABLE_DEV database.

## Release sequence (not executed by this PR)

1. On the approved environment, run `precheck.sql` using a least-privilege read-only connection; confirm **6 root categories**, **0 target rows**, and no conflicting slugs.
2. Record a snapshot of the five target slugs, original root count and current offer/category assignment counts. Require Owner release approval.
3. Run `apply.sql` once with tightly scoped DB credentials and timeouts. It is idempotent for either 0 or 5 matching nodes; mismatched/partial states fail closed.
4. Run `verify.sql` using a read-only connection. Confirm **7 root categories**, proper hierarchy, 0 new offers, existing forklift categories unchanged, and all seven locale pages.
5. Only if an explicit rollback decision is made: check target nodes existed **0 times before apply**, have no offers, attribute assignments or unexpected children; then run `rollback.sql`. The database also enforces referential integrity.

## New slug manifest

| Depth | slug | Polish label |
| --- | --- | --- |
| 0 | `maszyny-i-urzadzenia` | Maszyny i urządzenia |
| 1 | `osprzet-do-maszyn-budowlanych` | Osprzęt do maszyn budowlanych |
| 2 | `lyzki-do-koparek` | Łyżki do koparek |
| 2 | `lyzki-do-ladowarek` | Łyżki do ładowarek |
| 2 | `lyzki-skarpowe-i-profilujace` | Łyżki skarpowe i profilujące |

All labels and category introductions are provided by existing `src/messages/{locale}.json` for pl/en/de/fr/es/uk/zh. Public catalog pages use the existing server-authoritative hierarchy and return 0 offers until published offers are assigned by the normal moderated process.
