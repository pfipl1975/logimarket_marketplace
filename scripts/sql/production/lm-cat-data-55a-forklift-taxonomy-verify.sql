BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15000ms';
SET LOCAL lock_timeout = '3000ms';
SET LOCAL TIME ZONE 'UTC';

DO $$
DECLARE
  v_category_id bigint;
  v_hash text;

  v_offer_1_cat bigint;

  v_slug_21 text;
  v_slug_25 text;

  v_cat_21_count integer;
  v_cat_25_count integer;
BEGIN
  -- 1. Get and verify offer 8 details
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LM55A verify: offer 8 not found' USING ERRCODE = 'check_violation';
  END IF;

  IF v_category_id IS DISTINCT FROM 25 THEN
    RAISE EXCEPTION 'LM55A verify: expected category_id 25, got %', v_category_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_hash IS DISTINCT FROM '809289f462b35e52e675630658979285' THEN
    RAISE EXCEPTION 'LM55A verify: IMMUTABLE_ROW_DRIFT detected for offer 8' USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Inspect offer 1
  SELECT category_id INTO v_offer_1_cat FROM public.offers WHERE id = 1;
  IF v_offer_1_cat IS DISTINCT FROM 21 THEN
    RAISE EXCEPTION 'LM55A verify: expected offer 1 in category 21, got %', v_offer_1_cat USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Verify category slugs
  SELECT slug INTO v_slug_21 FROM public.categories WHERE id = 21;
  IF v_slug_21 IS DISTINCT FROM 'wozki-widlowe-elektryczne' THEN
    RAISE EXCEPTION 'LM55A verify: source category slug mismatch' USING ERRCODE = 'check_violation';
  END IF;

  SELECT slug INTO v_slug_25 FROM public.categories WHERE id = 25;
  IF v_slug_25 IS DISTINCT FROM 'elektryczne-wozki-paletowe' THEN
    RAISE EXCEPTION 'LM55A verify: target category slug mismatch' USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Count validation
  SELECT count(*) INTO v_cat_21_count FROM public.offers WHERE category_id = 21;
  SELECT count(*) INTO v_cat_25_count FROM public.offers WHERE category_id = 25;

  IF v_cat_21_count <> 1 THEN
    RAISE EXCEPTION 'LM55A verify: expected 1 offer in category 21, got %', v_cat_21_count USING ERRCODE = 'check_violation';
  END IF;

  IF v_cat_25_count <> 1 THEN
    RAISE EXCEPTION 'LM55A verify: expected 1 offer in category 25, got %', v_cat_25_count USING ERRCODE = 'check_violation';
  END IF;
END $$;

SELECT 'PASS' AS verify_status;
ROLLBACK;
