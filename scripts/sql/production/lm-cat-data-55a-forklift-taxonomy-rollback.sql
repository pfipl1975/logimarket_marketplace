BEGIN;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';
SET LOCAL TIME ZONE 'UTC';

DO $$
DECLARE
  v_slug_21 text;
  v_slug_25 text;
  
  -- Snapshot variables
  v_orig_category_id bigint;
  v_orig_updated_at timestamptz;
  v_orig_hash text;
  v_orig_immutable jsonb;
  
  v_updated_rows integer;
  
  -- Postcheck variables
  v_post_category_id bigint;
  v_post_updated_at timestamptz;
  v_post_immutable jsonb;
  
  v_post_slug_21 text;
  v_post_slug_25 text;
  v_post_offer_1_cat bigint;
BEGIN
  -- 1. Deterministyczne blokowanie kategorii (rosnąco po ID)
  PERFORM id FROM public.categories WHERE id IN (21, 25) ORDER BY id FOR UPDATE;
  
  -- Weryfikacja slugów kategorii po zablokowaniu
  SELECT slug INTO v_slug_21 FROM public.categories WHERE id = 21;
  IF v_slug_21 IS DISTINCT FROM 'wozki-widlowe-elektryczne' THEN
    RAISE EXCEPTION 'LM55A rollback: source category slug mismatch or category missing' USING ERRCODE = 'check_violation';
  END IF;
  
  SELECT slug INTO v_slug_25 FROM public.categories WHERE id = 25;
  IF v_slug_25 IS DISTINCT FROM 'elektryczne-wozki-paletowe' THEN
    RAISE EXCEPTION 'LM55A rollback: target category slug mismatch or category missing' USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Lock and fetch offer 8
  SELECT category_id,
         updated_at,
         md5(
           (
             to_jsonb(o)
             - ARRAY['category_id', 'updated_at']::text[]
           )::text
         ),
         (
           to_jsonb(o)
           - ARRAY['category_id', 'updated_at']::text[]
         )
  INTO v_orig_category_id, v_orig_updated_at, v_orig_hash, v_orig_immutable
  FROM public.offers o
  WHERE id = 8
  FOR UPDATE;

  -- 3. Wykrywanie braku rekordu przez IF NOT FOUND
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LM55A rollback: offer 8 not found' USING ERRCODE = 'check_violation';
  END IF;

  -- Weryfikacja metadanych oferty pod kątem dryfu przed zmianą
  IF v_orig_hash IS DISTINCT FROM '809289f462b35e52e675630658979285' THEN
    RAISE EXCEPTION 'LM55A rollback: DRIFT_DETECTED. Metadata mismatch (IMMUTABLE_ROW_DRIFT)' USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Obsługa trzech stanów
  IF v_orig_category_id = 21 THEN
    -- Stan ALREADY_ROLLED_BACK
    RAISE NOTICE 'LM55A rollback: ALREADY_ROLLED_BACK. Offer 8 is already in category 21.';
  ELSIF v_orig_category_id = 25 THEN
    -- Wykonaj UPDATE 25 -> 21
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
    -- Dryf kategorii (inna wartość)
    RAISE EXCEPTION 'LM55A rollback: DRIFT_DETECTED. Offer 8 is in category %, expected 21 or 25', v_orig_category_id USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Pełny postcheck przed COMMIT
  SELECT category_id,
         updated_at,
         (
           to_jsonb(o)
           - ARRAY['category_id', 'updated_at']::text[]
         )
  INTO v_post_category_id, v_post_updated_at, v_post_immutable
  FROM public.offers o
  WHERE id = 8;

  IF v_post_category_id IS DISTINCT FROM 21 THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: category_id is %, expected 21', v_post_category_id USING ERRCODE = 'check_violation';
  END IF;

  -- Walidacja wszystkich chronionych pól (invariance check przed/po przez IS NOT DISTINCT FROM)
  IF v_post_immutable IS DISTINCT FROM v_orig_immutable THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: immutable row changed (IMMUTABLE_ROW_DRIFT)' USING ERRCODE = 'check_violation';
  END IF;

  -- Sprawdzenie, czy updated_at zmienił się tylko przy rzeczywistym rollbacku
  IF v_orig_category_id = 25 AND v_post_updated_at IS NOT DISTINCT FROM v_orig_updated_at THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: updated_at was not updated' USING ERRCODE = 'check_violation';
  END IF;
  
  IF v_orig_category_id = 21 AND v_post_updated_at IS DISTINCT FROM v_orig_updated_at THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: updated_at changed on NOOP' USING ERRCODE = 'check_violation';
  END IF;

  -- Weryfikacja slugów kategorii w postchecku
  SELECT slug INTO v_post_slug_21 FROM public.categories WHERE id = 21;
  IF v_post_slug_21 IS DISTINCT FROM 'wozki-widlowe-elektryczne' THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: source category slug mutated' USING ERRCODE = 'check_violation';
  END IF;
  SELECT slug INTO v_post_slug_25 FROM public.categories WHERE id = 25;
  IF v_post_slug_25 IS DISTINCT FROM 'elektryczne-wozki-paletowe' THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: target category slug mutated' USING ERRCODE = 'check_violation';
  END IF;

  -- Weryfikacja oferty ID 1
  SELECT category_id INTO v_post_offer_1_cat FROM public.offers WHERE id = 1;
  IF v_post_offer_1_cat IS DISTINCT FROM 21 THEN
    RAISE EXCEPTION 'LM55A rollback postcheck: offer 1 category changed to %', v_post_offer_1_cat USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMIT;
