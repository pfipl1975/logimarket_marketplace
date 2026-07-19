-- LM-CAT-DATA-55A precheck. Read-only.
DO $$
DECLARE
  v_offer_count integer;
  v_target_cat_count integer;
  v_source_cat_count integer;
  v_offer_title text;
  v_current_category_id bigint;
  v_pub_status varchar(20);
  v_offer_model varchar(20);
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

  -- 3. Check offer 8
  SELECT count(*), max(title), max(category_id), max(publication_status), max(offer_model)
  INTO v_offer_count, v_offer_title, v_current_category_id, v_pub_status, v_offer_model
  FROM public.offers WHERE id = 8;

  IF v_offer_count <> 1 THEN
    RAISE EXCEPTION 'LM55A precheck: expected exactly one offer with ID 8, got %', v_offer_count USING ERRCODE = 'check_violation';
  END IF;

  IF v_offer_title <> 'Elektryczny wózek paletowy LogiTrans L-18' THEN
    RAISE EXCEPTION 'LM55A precheck: expected title "Elektryczny wózek paletowy LogiTrans L-18", got "%"', v_offer_title USING ERRCODE = 'check_violation';
  END IF;

  IF v_current_category_id IS DISTINCT FROM 21 THEN
    RAISE EXCEPTION 'LM55A precheck: expected category_id 21, got %', v_current_category_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_pub_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'LM55A precheck: expected publication_status "draft", got "%"', v_pub_status USING ERRCODE = 'check_violation';
  END IF;

  IF v_offer_model IS DISTINCT FROM 'rfq' THEN
    RAISE EXCEPTION 'LM55A precheck: expected offer_model "rfq", got "%"', v_offer_model USING ERRCODE = 'check_violation';
  END IF;
END $$;

SELECT 'PASS' AS precheck_status;
