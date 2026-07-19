-- LM-CAT-DATA-55A verify. Read-only.
DO $$
DECLARE
  v_offer_8_cat_id bigint;
  v_offer_8_title text;
  v_offer_8_pub_status varchar(20);
  v_offer_8_offer_model varchar(20);
  v_offer_8_partner_id bigint;
  
  v_offer_1_cat_id bigint;
  
  v_cat_21_count integer;
  v_cat_25_count integer;
BEGIN
  -- 1. Inspect offer 8
  SELECT category_id, title, publication_status, offer_model, partner_id
  INTO v_offer_8_cat_id, v_offer_8_title, v_offer_8_pub_status, v_offer_8_offer_model, v_offer_8_partner_id
  FROM public.offers WHERE id = 8;
  
  IF v_offer_8_cat_id IS DISTINCT FROM 25 THEN
    RAISE EXCEPTION 'LM55A verify: offer 8 category_id is %, expected 25', v_offer_8_cat_id USING ERRCODE = 'check_violation';
  END IF;
  
  IF v_offer_8_title <> 'Elektryczny wózek paletowy LogiTrans L-18' THEN
    RAISE EXCEPTION 'LM55A verify: offer 8 title mutated: %', v_offer_8_title USING ERRCODE = 'check_violation';
  END IF;

  IF v_offer_8_pub_status <> 'draft' THEN
    RAISE EXCEPTION 'LM55A verify: offer 8 publication_status mutated: %', v_offer_8_pub_status USING ERRCODE = 'check_violation';
  END IF;

  IF v_offer_8_offer_model <> 'rfq' THEN
    RAISE EXCEPTION 'LM55A verify: offer 8 offer_model mutated: %', v_offer_8_offer_model USING ERRCODE = 'check_violation';
  END IF;

  IF v_offer_8_partner_id <> 2 THEN
    RAISE EXCEPTION 'LM55A verify: offer 8 partner_id mutated: %', v_offer_8_partner_id USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Inspect offer 1
  SELECT category_id INTO v_offer_1_cat_id FROM public.offers WHERE id = 1;
  IF v_offer_1_cat_id IS DISTINCT FROM 21 THEN
    RAISE EXCEPTION 'LM55A verify: offer 1 category_id is %, expected 21', v_offer_1_cat_id USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Check counts
  SELECT count(*) INTO v_cat_21_count FROM public.offers WHERE category_id = 21;
  SELECT count(*) INTO v_cat_25_count FROM public.offers WHERE category_id = 25;

  IF v_cat_21_count <> 1 THEN
    RAISE EXCEPTION 'LM55A verify: expected 1 offer in category 21, got %', v_cat_21_count USING ERRCODE = 'check_violation';
  END IF;

  IF v_cat_25_count <> 1 THEN
    RAISE EXCEPTION 'LM55A verify: expected 1 offer in category 25, got %', v_cat_25_count USING ERRCODE = 'check_violation';
  END IF;
END $$;

SELECT 'PASS' AS verification_status;
