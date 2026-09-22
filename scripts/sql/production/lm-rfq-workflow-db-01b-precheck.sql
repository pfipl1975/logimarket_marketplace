-- lm-rfq-workflow-db-01b-precheck.sql
-- Read-only production precheck for LM-RFQ-WORKFLOW-DB-01B

SELECT
  (SELECT count(*) FROM public.rfq_leads WHERE status NOT IN ('new', 'in_progress', 'responded', 'closed')) as invalid_status_count,
  (SELECT count(*) FROM public.rfq_leads r LEFT JOIN public.offers o ON r.offer_id = o.id WHERE o.id IS NULL) as orphan_offer_count,
  (SELECT count(*) FROM public.rfq_leads r LEFT JOIN public.partners p ON r.partner_id = p.id WHERE p.id IS NULL) as orphan_partner_count;
