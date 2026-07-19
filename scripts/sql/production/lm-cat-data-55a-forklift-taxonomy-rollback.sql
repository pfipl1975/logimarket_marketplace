-- LM-CAT-DATA-55A rollback. Restores category for offer 8 from 25 to 21.
-- This script must be executed manually by the operator if needed.
BEGIN;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';

DO $$
DECLARE
  v_current_category_id bigint;
  v_title text;
  v_pub_status varchar(20);
  v_offer_model varchar(20);
  v_updated_rows integer;
BEGIN
  -- Lock and inspect offer 8
  SELECT category_id, title, publication_status, offer_model
  INTO v_current_category_id, v_title, v_pub_status, v_offer_model
  FROM public.offers
  WHERE id = 8
  FOR UPDATE;

  IF v_current_category_id IS NULL THEN
    RAISE EXCEPTION 'LM55A rollback: offer 8 not found' USING ERRCODE = 'check_violation';
  END IF;

  IF v_title <> 'Elektryczny wózek paletowy LogiTrans L-18' 
     OR v_pub_status IS DISTINCT FROM 'draft' 
     OR v_offer_model IS DISTINCT FROM 'rfq' THEN
    RAISE EXCEPTION 'LM55A rollback: metadata drift detected for offer 8' USING ERRCODE = 'check_violation';
  END IF;

  IF v_current_category_id = 21 THEN
    RAISE NOTICE 'LM55A rollback: ALREADY_ROLLED_BACK. Offer 8 is already in category 21.';
  ELSIF v_current_category_id = 25 THEN
    UPDATE public.offers
    SET category_id = 21,
        updated_at = now()
    WHERE id = 8 AND category_id = 25;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN
      RAISE EXCEPTION 'LM55A rollback: expected 1 row updated, got %', v_updated_rows USING ERRCODE = 'check_violation';
    END IF;
    RAISE NOTICE 'LM55A rollback: SUCCESS. Offer 8 category restored from 25 to 21.';
  ELSE
    RAISE EXCEPTION 'LM55A rollback: DRIFT_DETECTED. Offer 8 is in category %, expected 21 or 25', v_current_category_id USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMIT;
