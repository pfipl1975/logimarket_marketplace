Sprint: LM-LEGAL-UI-02B
Phase: RUNTIME_MIGRATION_PREPARATION

- Prepared controlled runtime migration `drizzle-runtime/0004_seller_registered_address.sql`
- Updated migration `_journal.json` index 4
- Updated `PRODUCTION_FINGERPRINT` to exact POST_0004 state
- Added `EXACT_EXISTING_POST_0004` runtime schema classification target
- Added static SQL check `seller-registered-address-runtime-migration.test.ts`
- Implemented deterministic Tax Identifiers sorting
- Completed pure fingerprint and engine tests adjustments
- DB_WRITES=0. No DB migrations executed.
- Ready for final Owner Database Migration Execution Authorization.
