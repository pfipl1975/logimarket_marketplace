BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';
SET LOCAL TIME ZONE 'UTC';

DO $$
DECLARE
  v_target_cat_count integer;
  v_source_cat_count integer;
  
  v_category_id bigint;
  v_hash text;
  v_exists boolean;
BEGIN
  -- 1. Check target category 25
  SELECT count(*) INTO v_target_cat_count FROM public.categories WHERE id = 25 AND slug = 'elektryczne-wozki-paletowe';
  IF v_target_cat_count <> 1 THEN
    RAISE EXCEPTION 'LM55A precheck: target category 25 with slug elektryczne-wozki-paletowe does not exist' USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Check source category 21
  SELECT count(*) INTO v_source_cat_count FROM public.categories WHERE id = 21 AND slug = 'wozki-widlowe-elektryczne';
  IF v_source_cat_count <> 1 THEN
    RAISE EXCEPTION 'LM55A precheck: source category 21 with slug wozki-widlowe-elektryczne does not exist' USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Check offer 8 exists
  SELECT EXISTS(SELECT 1 FROM public.offers WHERE id = 8) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'LM55A precheck: offer 8 not found' USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Calculate and verify immutable-row hash of offer 8
  SELECT category_id,
         md5(
           (
             to_jsonb(o)
             - ARRAY['category_id', 'updated_at']::text[]
           )::text
         )
  INTO v_category_id, v_hash
  FROM public.offers o
  WHERE id = 8;

  IF v_category_id IS DISTINCT FROM 21 THEN
    RAISE EXCEPTION 'LM55A precheck: expected category_id 21, got %', v_category_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_hash IS DISTINCT FROM '809289f462b35e52e675630658979285' THEN
    RAISE EXCEPTION 'LM55A precheck: IMMUTABLE_ROW_DRIFT detected for offer 8' USING ERRCODE = 'check_violation';
  END IF;
END $$;

SELECT 'PASS' AS precheck_status;
ROLLBACK;
