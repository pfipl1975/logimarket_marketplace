# Rollback Runbook: LM-RFQ-WORKFLOW-DB-01B

This runbook surgically removes the RFQ schema additions introduced in sprint 01B without altering any business data or returning the database to baseline.

## Rollback Scope
- Drop `idx_rfq_leads_partner`
- Drop `idx_rfq_leads_offer`
- Drop `rfq_leads_partner_id_fkey`
- Drop `rfq_leads_offer_id_fkey`
- Drop `rfq_leads_status_check`

## Execution Steps

Execute the following SQL against the target database:

```sql
BEGIN;

-- 1. Drop Indexes
DROP INDEX IF EXISTS public.idx_rfq_leads_partner;
DROP INDEX IF EXISTS public.idx_rfq_leads_offer;

-- 2. Drop Constraints
ALTER TABLE public.rfq_leads
  DROP CONSTRAINT IF EXISTS rfq_leads_partner_id_fkey,
  DROP CONSTRAINT IF EXISTS rfq_leads_offer_id_fkey,
  DROP CONSTRAINT IF EXISTS rfq_leads_status_check;

COMMIT;
```

**Note:** Do not execute this rollback if you intend to run the Drizzle standard migration rollback, as the runtime environment uses a distinct deployment architecture. Do not roll back `status` default or any existing `rfq_leads` columns.
